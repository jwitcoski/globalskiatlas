/**
 * Apply generated resort prose to existing DynamoDB WikiPages (atlas-WikiPages).
 *
 * Expects a single JSON file from globalskiatlas_data:
 *   python scripts/generate_resort_copy_bedrock.py -i .../ski_areas_analyzed.parquet \\
 *     --batch-all --batch-out-combined resort_wiki_content.json [--batch-limit N]
 *
 * That file has format "globalskiatlas.resort_wiki_content_v1" with items[] each containing
 * pageId, contentMarkdown, title, ...
 *
 * This script runs UpdateCommand per item: SET content, updatedAt (does not create revisions).
 *
 * Usage:
 *   node scripts/wiki-bulk-update-resort-content.js path/to/resort_wiki_content.json [--dry-run] [--prefix atlas] [--delay-ms 50]
 *
 * Env: AWS_REGION, DYNAMODB_TABLE_PREFIX (default ywiki). Loads .env from project root if present.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

function getPrefix(argv) {
  const i = argv.indexOf('--prefix');
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.DYNAMODB_TABLE_PREFIX || 'ywiki';
}

function getDelayMs(argv) {
  const i = argv.indexOf('--delay-ms');
  if (i !== -1 && argv[i + 1]) {
    const n = parseInt(argv[i + 1], 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const positional = argv.filter((a) => !a.startsWith('--'));
  const jsonPath = positional.find((p) => fs.existsSync(p));
  if (!jsonPath) {
    console.error('Usage: node scripts/wiki-bulk-update-resort-content.js <resort_wiki_content.json> [--dry-run] [--prefix atlas] [--delay-ms 50]');
    process.exit(1);
  }

  const prefix = getPrefix(argv);
  const tableName = `${prefix}-WikiPages`;
  const region = process.env.AWS_REGION || 'us-east-1';
  const delayMs = getDelayMs(argv);

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  if (data.format !== 'globalskiatlas.resort_wiki_content_v1') {
    console.warn('Warning: unexpected format field:', data.format, '(continuing if items[] present)');
  }
  const items = data.items || [];
  if (items.length === 0) {
    console.log('No items in JSON; nothing to do.');
    process.exit(0);
  }

  const client = new DynamoDBClient({ region });
  const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

  let updated = 0;
  let missing = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const pageId = it.pageId;
    const content = it.contentMarkdown;
    if (!pageId || typeof content !== 'string') {
      console.error('Skip invalid item at index', i, it);
      failed += 1;
      continue;
    }
    const updatedAt = new Date().toISOString();
    if (dryRun) {
      console.log('[dry-run]', i + 1, '/', items.length, pageId, 'content length', content.length);
      updated += 1;
      if (delayMs) await sleep(delayMs);
      continue;
    }
    try {
      await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { pageId },
        UpdateExpression: 'SET #c = :c, #u = :u',
        ExpressionAttributeNames: { '#c': 'content', '#u': 'updatedAt' },
        ExpressionAttributeValues: { ':c': content, ':u': updatedAt },
        ConditionExpression: 'attribute_exists(pageId)',
      }));
      updated += 1;
      if ((i + 1) % 25 === 0 || i + 1 === items.length) {
        console.log('Updated', i + 1, '/', items.length, '…');
      }
    } catch (e) {
      if (e.name === 'ConditionalCheckFailedException') {
        console.warn('No row for pageId (ingest first):', pageId);
        missing += 1;
      } else {
        console.error('Update failed', pageId, e.message || e);
        failed += 1;
      }
    }
    if (delayMs) await sleep(delayMs);
  }

  console.log('Done. table=', tableName, 'updated=', updated, 'missingPage=', missing, 'failed=', failed, dryRun ? '(dry-run)' : '');
  const errCount = data.errors?.length;
  if (errCount) console.log('Note: source JSON listed', errCount, 'errors (not applied).');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

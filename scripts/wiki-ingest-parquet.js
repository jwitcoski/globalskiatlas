/**
 * One-time (or rerunnable) ingestion: read ski_areas_analyzed.parquet and populate DynamoDB WikiPages.
 * Revisions and comments are not created from parquet.
 *
 * Usage:
 *   node scripts/ingest-parquet-to-wiki.js [parquet-url-or-path]
 * Default URL: https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet
 *
 * Env: AWS_REGION, DYNAMODB_TABLE_PREFIX (default ywiki). Requires AWS credentials.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const defaultParquetUrl = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const prefix = process.env.DYNAMODB_TABLE_PREFIX || 'ywiki';
const tableName = `${prefix}-WikiPages`;
const region = process.env.AWS_REGION || 'us-east-1';
const BATCH_SIZE = 25;

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

function slug(str) {
  if (str == null || str === '') return 'unknown';
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function sizeBucket(skiableHa) {
  const h = Number(skiableHa);
  if (Number.isNaN(h) || h < 0) return 'unknown';
  if (h < 100) return 'small';
  if (h < 500) return 'medium';
  return 'large';
}

function str(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function buildContent(row) {
  const lines = [];
  const name = str(row.name);
  if (name) lines.push('# ' + name);
  lines.push('');
  const country = str(row.country);
  const state = str(row.state);
  const region = str(row.region);
  if (country || state || region) {
    lines.push('**Location:** ' + [country, state, region].filter(Boolean).join(', '));
    lines.push('');
  }
  const skiableHa = num(row.skiable_terrain_ha);
  const skiableAcres = num(row.skiable_terrain_acres);
  if (skiableHa != null || skiableAcres != null) {
    const parts = [];
    if (skiableHa != null) parts.push(skiableHa + ' ha');
    if (skiableAcres != null) parts.push(skiableAcres + ' acres');
    lines.push('**Skiable terrain:** ' + parts.join(', '));
    lines.push('');
  }
  const lifts = str(row.total_lifts);
  const trails = str(row.downhill_trails);
  if (lifts || trails) {
    const parts = [];
    if (lifts) parts.push(lifts + ' lifts');
    if (trails) parts.push(trails + ' trails');
    lines.push('**Lifts & trails:** ' + parts.join(', '));
    lines.push('');
  }
  const resortType = str(row.resort_type);
  if (resortType) {
    lines.push('**Resort type:** ' + resortType);
    lines.push('');
  }
  return lines.join('\n').trim() || '# ' + (name || 'Resort');
}

function rowToItem(row) {
  const name = str(row.name);
  const pageId = str(row.winter_sports_id) ? slug(row.winter_sports_id) : slug(name);
  const now = new Date().toISOString();
  const skiableHa = num(row.skiable_terrain_ha);
  const categorization = {
    country: str(row.country),
    state: str(row.state),
    region: str(row.region),
    size: sizeBucket(skiableHa),
  };
  const item = {
    pageId,
    title: name || pageId,
    content: buildContent(row),
    winterSportsId: str(row.winter_sports_id),
    winterSportsType: str(row.winter_sports_type),
    country: str(row.country),
    state: str(row.state),
    region: str(row.region),
    categorization,
    centroidLat: num(row.centroid_lat),
    centroidLon: num(row.centroid_lon),
    totalAreaHa: num(row.total_area_ha),
    totalAreaAcres: num(row.total_area_acres),
    skiableTerrainHa: num(row.skiable_terrain_ha),
    skiableTerrainAcres: num(row.skiable_terrain_acres),
    totalLifts: str(row.total_lifts),
    longestLiftMi: num(row.longest_lift_mi),
    downhillTrails: str(row.downhill_trails),
    longestTrailMi: num(row.longest_trail_mi),
    avgTrailMi: num(row.avg_trail_mi),
    trailsNovice: str(row.trails_novice),
    trailsEasy: str(row.trails_easy),
    trailsIntermediate: str(row.trails_intermediate),
    trailsAdvanced: str(row.trails_advanced),
    trailsExpert: str(row.trails_expert),
    trailsFreeride: str(row.trails_freeride),
    trailsExtreme: str(row.trails_extreme),
    gladedTerrain: str(row.gladed_terrain),
    snowPark: str(row.snow_park),
    sleddingTubing: str(row.sledding_tubing),
    liftTypes: str(row.lift_types),
    resortType: str(row.resort_type),
    createdAt: now,
    updatedAt: now,
    status: 'published',
  };
  return item;
}

async function downloadParquet(url) {
  const tmpPath = path.join(os.tmpdir(), 'ywiki-ingest-' + Date.now() + '.parquet');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function readParquetFile(filePath) {
  const { parquetRead, parquetSchema } = await import('hyparquet');
  const buffer = fs.readFileSync(filePath);
  const asyncBuffer = {
    byteLength: buffer.byteLength,
    slice: (start, end) => Promise.resolve(buffer.buffer.slice(
      buffer.byteOffset + start,
      buffer.byteOffset + (end !== undefined ? end : buffer.byteLength)
    )),
  };
  let rows = [];
  await parquetRead({
    file: asyncBuffer,
    rowFormat: 'object',
    onComplete: (data) => { rows = data; },
  });
  return rows;
}

async function writeBatch(items) {
  if (items.length === 0) return;
  const req = {
    RequestItems: {
      [tableName]: items.map((item) => ({
        PutRequest: { Item: item },
      })),
    },
  };
  await docClient.send(new BatchWriteCommand(req));
}

async function main() {
  const input = process.argv[2] || defaultParquetUrl;
  let filePath = input;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    console.log('Downloading parquet from', input);
    filePath = await downloadParquet(input);
  } else if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  console.log('Reading parquet:', filePath);
  const rows = await readParquetFile(filePath);
  console.log('Rows:', rows.length);

  const allItems = rows.map(rowToItem);
  // Deduplicate by pageId (last entry wins)
  const seen = new Map();
  for (const item of allItems) seen.set(item.pageId, item);
  const items = Array.from(seen.values());
  console.log('Unique pages:', items.length, '(deduped from', allItems.length, ')');

  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await writeBatch(batch);
    written += batch.length;
    if (written % 250 === 0 || written === items.length) {
      console.log('Written', written, '/', items.length);
    }
  }

  if (input.startsWith('http') && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
  console.log('Done. Table:', tableName);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

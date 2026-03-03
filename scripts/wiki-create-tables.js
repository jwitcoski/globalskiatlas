/**
 * Create DynamoDB tables for ywiki: WikiPages, WikiRevisions, WikiComments.
 * Requires AWS credentials (env, profile, or instance role).
 * Usage: node scripts/create-dynamodb-tables.js [--region us-east-1] [--prefix ywiki]
 *
 * Env: AWS_REGION, DYNAMODB_TABLE_PREFIX (default ywiki), optionally AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
 */
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const prefix = process.env.DYNAMODB_TABLE_PREFIX || 'ywiki';
const region = process.env.AWS_REGION || process.env.region || 'us-east-1';
const client = new DynamoDBClient({ region });

const tableNames = {
  pages: `${prefix}-WikiPages`,
  revisions: `${prefix}-WikiRevisions`,
  comments: `${prefix}-WikiComments`,
};

async function tableExists(name) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false;
    throw e;
  }
}

async function createPagesTable() {
  const name = tableNames.pages;
  if (await tableExists(name)) {
    console.log('Table already exists:', name);
    return;
  }
  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'country', AttributeType: 'S' },
      { AttributeName: 'state', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pageId', KeyType: 'HASH' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CountryStateIndex',
        KeySchema: [
          { AttributeName: 'country', KeyType: 'HASH' },
          { AttributeName: 'state', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  }));
  console.log('Created table:', name);
}

async function createRevisionsTable() {
  const name = tableNames.revisions;
  if (await tableExists(name)) {
    console.log('Table already exists:', name);
    return;
  }
  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'revisionId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pageId', KeyType: 'HASH' },
      { AttributeName: 'revisionId', KeyType: 'RANGE' },
    ],
  }));
  console.log('Created table:', name);
}

async function createCommentsTable() {
  const name = tableNames.comments;
  if (await tableExists(name)) {
    console.log('Table already exists:', name);
    return;
  }
  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pageId', AttributeType: 'S' },
      { AttributeName: 'commentId', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pageId', KeyType: 'HASH' },
      { AttributeName: 'commentId', KeyType: 'RANGE' },
    ],
  }));
  console.log('Created table:', name);
}

async function main() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prefix' && args[i + 1]) {
      const p = args[++i];
      tableNames.pages = p + '-WikiPages';
      tableNames.revisions = p + '-WikiRevisions';
      tableNames.comments = p + '-WikiComments';
    }
  }
  console.log('Region:', region);
  console.log('Tables:', tableNames.pages, tableNames.revisions, tableNames.comments);
  await createPagesTable();
  await createRevisionsTable();
  await createCommentsTable();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

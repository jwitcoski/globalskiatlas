/**
 * Wiki store for Lambda: DynamoDB only (no in-memory).
 * Same API as lib/wiki-store for getPage, putPage, listPages, etc.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const prefix = process.env.DYNAMODB_TABLE_PREFIX || 'atlas';
const region = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

const tables = {
  pages: () => `${prefix}-WikiPages`,
  revisions: () => `${prefix}-WikiRevisions`,
  comments: () => `${prefix}-WikiComments`,
};

function revisionId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

function commentId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

async function getPage(pageId) {
  if (!pageId) return null;
  const res = await docClient.send(new GetCommand({
    TableName: tables.pages(),
    Key: { pageId },
  }));
  return res.Item || null;
}

async function putPage(item) {
  await docClient.send(new PutCommand({
    TableName: tables.pages(),
    Item: item,
  }));
}

async function updatePageContent(pageId, content, updatedAt, updatedBy, currentRevisionId) {
  await docClient.send(new UpdateCommand({
    TableName: tables.pages(),
    Key: { pageId },
    UpdateExpression: 'SET content = :c, updatedAt = :u, updatedBy = :b, currentRevisionId = :r',
    ExpressionAttributeValues: {
      ':c': content,
      ':u': updatedAt,
      ':b': updatedBy || null,
      ':r': currentRevisionId || null,
    },
  }));
}

async function updatePageFields(pageId, updates) {
  if (!pageId || !updates || typeof updates !== 'object') return;
  const allowed = ['dataFlaggedWrong', 'fixedInOsm', 'fixedInOsmAt', 'visibleFactRanks', 'flaggedAt', 'flaggedBy', 'locked', 'lockedAt', 'lockedBy'];
  const setExpr = [];
  const names = {};
  const values = {};
  let i = 0;
  for (const key of Object.keys(updates)) {
    if (!allowed.includes(key)) continue;
    const n = '#f' + i;
    const v = ':v' + i;
    setExpr.push(n + ' = ' + v);
    names[n] = key;
    values[v] = updates[key];
    i++;
  }
  if (setExpr.length === 0) return;
  await docClient.send(new UpdateCommand({
    TableName: tables.pages(),
    Key: { pageId },
    UpdateExpression: 'SET ' + setExpr.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

function computeDiff(oldContent, newContent) {
  if (oldContent === newContent || (oldContent == null && newContent == null)) return null;
  const diff = require('diff');
  const oldStr = typeof oldContent === 'string' ? oldContent : '';
  const newStr = typeof newContent === 'string' ? newContent : '';
  const patch = diff.createPatch('body', oldStr, newStr, 'before', 'after', { context: 3 });
  return patch.length > 50000 ? patch.slice(0, 50000) + '\n... (truncated)' : patch;
}

async function createRevision(pageId, content, userId, summary, status, userDisplayName, oldContent) {
  const diffText = computeDiff(oldContent, content);
  const rev = {
    pageId,
    revisionId: revisionId(),
    content,
    timestamp: new Date().toISOString(),
    userId: userId || null,
    userDisplayName: userDisplayName || null,
    summary: summary || 'Edit',
    status: status || 'pending',
    diff: diffText || null,
  };
  await docClient.send(new PutCommand({
    TableName: tables.revisions(),
    Item: rev,
  }));
  return rev;
}

async function getRevision(pageId, revisionId) {
  if (!pageId || !revisionId) return null;
  const res = await docClient.send(new GetCommand({
    TableName: tables.revisions(),
    Key: { pageId, revisionId },
  }));
  return res.Item || null;
}

async function acceptRevision(pageId, revisionId, userId, opts = {}) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (!opts.adminOverride && rev.status !== 'pending') return null;
  await docClient.send(new UpdateCommand({
    TableName: tables.revisions(),
    Key: { pageId, revisionId },
    UpdateExpression: 'SET #s = :approved',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':approved': 'approved' },
  }));
  await updatePageContent(pageId, rev.content, new Date().toISOString(), userId, revisionId);
  return { ...rev, status: 'approved' };
}

async function rejectRevision(pageId, revisionId, opts = {}) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (!opts.adminOverride && rev.status !== 'pending') return null;
  await docClient.send(new UpdateCommand({
    TableName: tables.revisions(),
    Key: { pageId, revisionId },
    UpdateExpression: 'SET #s = :rejected',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':rejected': 'rejected' },
  }));
  return { ...rev, status: 'rejected' };
}

async function listRevisions(pageId, limit = 50) {
  const res = await docClient.send(new QueryCommand({
    TableName: tables.revisions(),
    KeyConditionExpression: 'pageId = :pid',
    ExpressionAttributeValues: { ':pid': pageId },
    Limit: limit,
    ScanIndexForward: false,
  }));
  return res.Items || [];
}

async function listComments(pageId, limit = 100) {
  const res = await docClient.send(new QueryCommand({
    TableName: tables.comments(),
    KeyConditionExpression: 'pageId = :pid',
    ExpressionAttributeValues: { ':pid': pageId },
    Limit: limit,
  }));
  return res.Items || [];
}

async function addComment(pageId, userId, content, parentCommentId, userDisplayName) {
  const comment = {
    pageId,
    commentId: commentId(),
    userId: userId || null,
    userDisplayName: userDisplayName || null,
    timestamp: new Date().toISOString(),
    content: content || '',
    parentCommentId: parentCommentId || null,
  };
  await docClient.send(new PutCommand({
    TableName: tables.comments(),
    Item: comment,
  }));
  return comment;
}

async function listPages() {
  const items = [];
  let lastKey;
  do {
    const params = {
      TableName: tables.pages(),
      ProjectionExpression: 'pageId, title, country, #st, #rg, resortType, skiableTerrainAcres, totalLifts, downhillTrails, book, resortSizeCategory, pageType',
      ExpressionAttributeNames: { '#st': 'state', '#rg': 'region' },
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await docClient.send(new ScanCommand(params));
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

module.exports = {
  getPage,
  putPage,
  updatePageContent,
  updatePageFields,
  createRevision,
  getRevision,
  acceptRevision,
  rejectRevision,
  listRevisions,
  listComments,
  addComment,
  listPages,
};

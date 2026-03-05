/**
 * Wiki store: DynamoDB when DYNAMODB_TABLE_PREFIX is set, otherwise in-memory.
 * Exposes getPage, putPage, createRevision, listRevisions, listComments, addComment.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const prefix = process.env.DYNAMODB_TABLE_PREFIX || '';
const region = process.env.AWS_REGION || 'us-east-1';
const useDynamo = Boolean(prefix);

function slug(str) {
  if (str == null || str === '') return '';
  return String(str).toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}

let docClient;
if (useDynamo) {
  const client = new DynamoDBClient({ region });
  docClient = DynamoDBDocumentClient.from(client);
}

const tables = {
  pages: () => `${prefix}-WikiPages`,
  revisions: () => `${prefix}-WikiRevisions`,
  comments: () => `${prefix}-WikiComments`,
};

// In-memory fallback
const memory = {
  pages: new Map(),
  revisions: new Map(),
  comments: new Map(),
};

function revisionId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

function commentId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

async function getPage(pageId) {
  if (!pageId) return null;
  if (useDynamo) {
    const tableName = tables.pages();
    const res = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { pageId },
    }));
    if (res.Item) return res.Item;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[wiki-store] GetItem missed: table=%s key=%j', tableName, { pageId });
    }
    // Fallback: requested pageId might be a slug like "big-bear-ski-resort-pennsylvania"
    // but stored key might differ (e.g. "big-bear-ski-area-pennsylvania"). Find by title+state.
    const parts = pageId.split('-');
    if (parts.length >= 2) {
      const stateSlug = parts[parts.length - 1];
      const stateName = stateSlug.charAt(0).toUpperCase() + stateSlug.slice(1).toLowerCase();
      const countriesToTry = ['United States of America', 'United States', 'USA', 'Canada'];
      for (const country of countriesToTry) {
        const qres = await docClient.send(new QueryCommand({
          TableName: tables.pages(),
          IndexName: 'CountryStateIndex',
          KeyConditionExpression: 'country = :c AND #st = :s',
          ExpressionAttributeNames: { '#st': 'state' },
          ExpressionAttributeValues: { ':c': country, ':s': stateName },
        }));
        const items = qres.Items || [];
        for (const item of items) {
          const built = slug(item.title) + '-' + slug(item.state);
          if (built === pageId) return item;
        }
      }
    }
    return null;
  }
  return memory.pages.get(pageId) || null;
}

async function putPage(item) {
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.pages(),
      Item: item,
    }));
    return;
  }
  memory.pages.set(item.pageId, item);
}

async function updatePageContent(pageId, content, updatedAt, updatedBy, currentRevisionId) {
  if (useDynamo) {
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
    return;
  }
  const p = memory.pages.get(pageId);
  if (p) {
    p.content = content;
    p.updatedAt = updatedAt;
    p.updatedBy = updatedBy;
    p.currentRevisionId = currentRevisionId;
  }
}

/** Update optional fields: dataFlaggedWrong, fixedInOsm, fixedInOsmAt, visibleFactRanks, etc. */
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
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.pages(),
      Key: { pageId },
      UpdateExpression: 'SET ' + setExpr.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }));
    return;
  }
  const p = memory.pages.get(pageId);
  if (p) {
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) p[key] = updates[key];
    }
  }
}

function computeDiff(oldContent, newContent) {
  if (oldContent === newContent || (oldContent == null && newContent == null)) return null;
  const diff = require('diff');
  const oldStr = typeof oldContent === 'string' ? oldContent : '';
  const newStr = typeof newContent === 'string' ? newContent : '';
  const patch = diff.createPatch('body', oldStr, newStr, 'before', 'after', { context: 3 });
  // Keep diff under ~50k chars to avoid huge DynamoDB items
  return patch.length > 50000 ? patch.slice(0, 50000) + '\n... (truncated)' : patch;
}

async function createRevision(pageId, content, userId, summary, status = 'pending', userDisplayName = null, oldContent = null) {
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
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.revisions(),
      Item: rev,
    }));
    return rev;
  }
  const list = memory.revisions.get(pageId) || [];
  list.unshift(rev);
  memory.revisions.set(pageId, list);
  return rev;
}

async function getRevision(pageId, revisionId) {
  if (!pageId || !revisionId) return null;
  if (useDynamo) {
    const res = await docClient.send(new GetCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
    }));
    return res.Item || null;
  }
  const list = memory.revisions.get(pageId) || [];
  return list.find((r) => r.revisionId === revisionId) || null;
}

async function acceptRevision(pageId, revisionId, userId, opts = {}) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (!opts.adminOverride && rev.status !== 'pending') return null;
  const now = new Date().toISOString();
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
      UpdateExpression: 'SET #s = :approved',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':approved': 'approved' },
    }));
    await updatePageContent(pageId, rev.content, now, userId, revisionId);
    return { ...rev, status: 'approved' };
  }
  rev.status = 'approved';
  const p = memory.pages.get(pageId);
  if (p) {
    p.content = rev.content;
    p.updatedAt = now;
    p.updatedBy = userId;
    p.currentRevisionId = revisionId;
  }
  return rev;
}

async function rejectRevision(pageId, revisionId, opts = {}) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (!opts.adminOverride && rev.status !== 'pending') return null;
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
      UpdateExpression: 'SET #s = :rejected',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':rejected': 'rejected' },
    }));
    return { ...rev, status: 'rejected' };
  }
  rev.status = 'rejected';
  return rev;
}

async function listRevisions(pageId, limit = 50) {
  if (useDynamo) {
    const res = await docClient.send(new QueryCommand({
      TableName: tables.revisions(),
      KeyConditionExpression: 'pageId = :pid',
      ExpressionAttributeValues: { ':pid': pageId },
      Limit: limit,
      ScanIndexForward: false,
    }));
    return res.Items || [];
  }
  const list = memory.revisions.get(pageId) || [];
  return list.slice(0, limit);
}

async function listComments(pageId, limit = 100) {
  if (useDynamo) {
    const res = await docClient.send(new QueryCommand({
      TableName: tables.comments(),
      KeyConditionExpression: 'pageId = :pid',
      ExpressionAttributeValues: { ':pid': pageId },
      Limit: limit,
    }));
    return res.Items || [];
  }
  const list = memory.comments.get(pageId) || [];
  return list.slice(0, limit);
}

async function addComment(pageId, userId, content, parentCommentId, userDisplayName = null) {
  const comment = {
    pageId,
    commentId: commentId(),
    userId: userId || null,
    userDisplayName: userDisplayName || null,
    timestamp: new Date().toISOString(),
    content: content || '',
    parentCommentId: parentCommentId || null,
  };
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.comments(),
      Item: comment,
    }));
    return comment;
  }
  const list = memory.comments.get(pageId) || [];
  list.push(comment);
  memory.comments.set(pageId, list);
  return comment;
}

async function listPages() {
  if (useDynamo) {
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
  return Array.from(memory.pages.values())
    .map(({ pageId, title, country, state, region, resortType, skiableTerrainAcres, totalLifts, downhillTrails, book, resortSizeCategory, pageType }) =>
      ({ pageId, title, country, state, region, resortType, skiableTerrainAcres, totalLifts, downhillTrails, book, resortSizeCategory, pageType }))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

module.exports = {
  useDynamo,
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

/**
 * Lambda handler for wiki API (API Gateway HTTP API).
 * Paths: /api/wiki/index, /api/wiki/:pageId, /api/wiki/:pageId/revisions, etc.
 * Set env: DYNAMODB_TABLE_PREFIX, AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_REGION, COGNITO_CLIENT_ID.
 */
const store = require('./store');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body == null ? {} : body),
  };
}

function getPath(event) {
  let raw = event.rawPath || event.requestContext?.http?.path || event.path || '';
  // Strip optional stage prefix (e.g. /default/api/wiki/index -> /api/wiki/index)
  raw = raw.replace(/^\/(\$default|default|prod|stage)(\/|$)/i, '$2');
  if (!raw.startsWith('/')) raw = '/' + raw;
  const path = raw.replace(/^\/api/, '').replace(/^\/+/, '').split('/').filter(Boolean);
  return path;
}

function getBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    return {};
  }
}

function getAuth(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

let jwksClient;
let jwtValidator;

function getJwtValidator() {
  if (jwksClient !== undefined) return jwtValidator;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.COGNITO_REGION || 'us-east-1';
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    jwksClient = null;
    jwtValidator = null;
    return null;
  }
  try {
    const { JwksClient } = require('jwks-rsa');
    const jwt = require('jsonwebtoken');
    const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    jwksClient = new JwksClient({ jwksUri, cache: true });
    const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    jwtValidator = { jwt, expectedIssuer, clientId };
  } catch (e) {
    jwksClient = null;
    jwtValidator = null;
  }
  return jwtValidator;
}

async function validateToken(token) {
  const v = getJwtValidator();
  if (!v) return null;
  try {
    const decoded = v.jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) return null;
    const key = await jwksClient.getSigningKey(decoded.header.kid);
    const payload = v.jwt.verify(token, key.getPublicKey(), {
      algorithms: ['RS256'],
      issuer: v.expectedIssuer,
      audience: v.clientId,
    });
    if (payload.token_use !== 'id') return null;
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload['cognito:username'] || payload.preferred_username,
    };
  } catch (_) {
    return null;
  }
}

function userDisplayName(principal) {
  if (!principal) return null;
  return principal.username || principal.email || principal.sub || null;
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return json(204, null);
  }

  const pathParts = getPath(event);
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();

  try {
    // GET /wiki/index
    if (pathParts[0] === 'wiki' && pathParts[1] === 'index') {
      const pages = await store.listPages();
      return json(200, { pages });
    }

    // GET /wiki/:pageId (single segment after wiki = page id, but not reserved words)
    if (pathParts[0] === 'wiki' && pathParts.length === 2 && pathParts[1] !== 'index') {
      const pageId = decodeURIComponent(pathParts[1]);
      const page = await store.getPage(pageId);
      return json(200, page || null);
    }

    // GET /wiki/:pageId/revisions
    if (pathParts[0] === 'wiki' && pathParts.length === 3 && pathParts[2] === 'revisions') {
      const pageId = decodeURIComponent(pathParts[1]);
      const limit = Math.min(parseInt(event.queryStringParameters?.limit, 10) || 50, 100);
      const revisions = await store.listRevisions(pageId, limit);
      return json(200, { revisions });
    }

    // GET /wiki/:pageId/comments
    if (pathParts[0] === 'wiki' && pathParts.length === 3 && pathParts[2] === 'comments') {
      const pageId = decodeURIComponent(pathParts[1]);
      const limit = Math.min(parseInt(event.queryStringParameters?.limit, 10) || 100, 200);
      const comments = await store.listComments(pageId, limit);
      return json(200, { comments });
    }

    // POST /wiki/:pageId/revisions/:revisionId/accept
    if (pathParts[0] === 'wiki' && pathParts.length === 5 && pathParts[2] === 'revisions' && pathParts[4] === 'accept') {
      const token = getAuth(event);
      const principal = token ? await validateToken(token) : null;
      if (!principal) return json(401, { error: 'Unauthorized', message: 'Valid Cognito token required' });
      const pageId = decodeURIComponent(pathParts[1]);
      const revisionId = decodeURIComponent(pathParts[3]);
      const body = getBody(event);
      const comment = (body.comment || '').trim();
      if (!comment) return json(400, { error: 'Bad Request', message: 'comment required' });
      const rev = await store.getRevision(pageId, revisionId);
      if (!rev) return json(404, { error: 'Not Found', message: 'Revision not found' });
      if (rev.status !== 'pending') return json(404, { error: 'Not Found', message: 'Revision not pending' });
      if (rev.userId === principal.sub) return json(403, { error: 'Forbidden', message: 'You cannot accept your own revision' });
      const accepted = await store.acceptRevision(pageId, revisionId, principal.sub);
      await store.addComment(pageId, principal.sub, 'Accepted: ' + comment, null, userDisplayName(principal));
      return json(200, accepted);
    }

    // POST /wiki/:pageId/revisions/:revisionId/reject
    if (pathParts[0] === 'wiki' && pathParts.length === 5 && pathParts[2] === 'revisions' && pathParts[4] === 'reject') {
      const token = getAuth(event);
      const principal = token ? await validateToken(token) : null;
      if (!principal) return json(401, { error: 'Unauthorized', message: 'Valid Cognito token required' });
      const pageId = decodeURIComponent(pathParts[1]);
      const revisionId = decodeURIComponent(pathParts[3]);
      const body = getBody(event);
      const comment = (body.comment || '').trim();
      if (!comment) return json(400, { error: 'Bad Request', message: 'comment required' });
      const rev = await store.rejectRevision(pageId, revisionId);
      if (!rev) return json(404, { error: 'Not Found', message: 'Revision not found or not pending' });
      await store.addComment(pageId, principal.sub, 'Rejected: ' + comment, null, userDisplayName(principal));
      return json(200, rev);
    }

    // POST /wiki/:pageId/comments
    if (pathParts[0] === 'wiki' && pathParts.length === 3 && pathParts[2] === 'comments') {
      const token = getAuth(event);
      const principal = token ? await validateToken(token) : null;
      if (!principal) return json(401, { error: 'Unauthorized', message: 'Valid Cognito token required' });
      const pageId = decodeURIComponent(pathParts[1]);
      const body = getBody(event);
      const content = (body.content || '').trim();
      if (!content) return json(400, { error: 'Bad Request', message: 'content required' });
      const comment = await store.addComment(pageId, principal.sub, content, body.parentCommentId || null, userDisplayName(principal));
      return json(201, comment);
    }

    // POST /wiki (create or propose edit)
    if (pathParts[0] === 'wiki' && pathParts.length === 1 && method === 'POST') {
      const token = getAuth(event);
      const principal = token ? await validateToken(token) : null;
      const body = getBody(event);
      const path = (body.path || '').replace(/^\/+/, '');
      const pageId = path || '';
      if (!pageId) return json(400, { error: 'Bad Request', message: 'path required' });
      const comment = (body.comment || '').trim();
      if (!comment) return json(400, { error: 'Bad Request', message: 'comment required (describe what you changed)' });
      const content = typeof body.content === 'string' ? body.content : '';
      const title = typeof body.title === 'string' ? body.title : pageId;
      const userId = principal ? principal.sub : null;
      const now = new Date().toISOString();
      const displayName = userDisplayName(principal);
      let page = await store.getPage(pageId);
      if (!page) {
        page = { pageId, title, content, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, status: 'published', currentRevisionId: null };
        await store.putPage(page);
        const rev = await store.createRevision(pageId, content, userId, comment, 'approved', displayName, '');
        await store.updatePageContent(pageId, content, now, userId, rev.revisionId);
        await store.addComment(pageId, userId, 'Edit: ' + comment, null, displayName);
        return json(200, null);
      }
      const rev = await store.createRevision(pageId, content, userId, comment, 'pending', displayName, page.content || '');
      await store.addComment(pageId, userId, 'Proposed: ' + comment, null, displayName);
      return json(202, { revisionId: rev.revisionId, status: 'pending', message: 'Change proposed; pending accept/reject' });
    }

    return json(404, { error: 'Not Found', path: event.rawPath || event.path, pathParts: getPath(event) });
  } catch (err) {
    console.error('Wiki API error', err);
    return json(500, { error: 'Internal Server Error' });
  }
};

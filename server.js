/**
 * Global Ski Atlas — Express server.
 * Serves all static frontend files at / and the wiki API at /wiki/*.
 * Wiki UI pages live in ./wiki/ and are served at /wiki/*.
 * Cognito: set in .env or project.local.properties.
 * DynamoDB: set DYNAMODB_TABLE_PREFIX (e.g. "atlas") and AWS_REGION in .env.
 */
const fs = require('fs');
const path = require('path');

// Load project.local.properties (Cognito overrides, same format as ywiki)
const localPropsPath = path.join(__dirname, 'project.local.properties');
if (fs.existsSync(localPropsPath)) {
  const content = fs.readFileSync(localPropsPath, 'utf8');
  const map = { userPoolId: 'COGNITO_USER_POOL_ID', region: 'COGNITO_REGION', clientId: 'COGNITO_CLIENT_ID', domain: 'COGNITO_DOMAIN' };
  content.split(/\r?\n/).forEach((line) => {
    const m = line.trim().match(/^\s*cognito\.(userPoolId|region|clientId|domain)\s*=\s*(.*)$/);
    if (m && map[m[1]]) {
      const val = m[2].trim();
      if (val) process.env[map[m[1]]] = process.env[map[m[1]]] || val;
    }
  });
}

require('dotenv').config();

const express = require('express');
const { createServer } = require('http');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// --- Cognito config ----------------------------------------------------------
const cognito = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  region:     process.env.COGNITO_REGION || 'us-east-1',
  clientId:   process.env.COGNITO_CLIENT_ID || '',
  domain:     process.env.COGNITO_DOMAIN || '',
};
const domainUrl = cognito.domain
  ? (cognito.domain.includes('://') ? cognito.domain : `https://${cognito.domain}.auth.${cognito.region}.amazonaws.com`)
  : '';
const isCognitoConfigured = !!(cognito.userPoolId && cognito.clientId);

// --- Wiki store (DynamoDB if DYNAMODB_TABLE_PREFIX set, else in-memory) ------
const wikiStore = require('./lib/wiki-store');

// --- JWT validation ----------------------------------------------------------
let jwtValidator = null;
if (isCognitoConfigured) {
  try {
    const { JwksClient } = require('jwks-rsa');
    const jwt = require('jsonwebtoken');
    const jwksUri = `https://cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}/.well-known/jwks.json`;
    const jwksClient = new JwksClient({ jwksUri, cache: true });
    const expectedIssuer = `https://cognito-idp.${cognito.region}.amazonaws.com/${cognito.userPoolId}`;
    jwtValidator = {
      async validate(bearerToken) {
        if (!bearerToken || !bearerToken.startsWith('Bearer ')) return null;
        const token = bearerToken.slice(7).trim();
        if (!token) return null;
        try {
          const decoded = jwt.decode(token, { complete: true });
          if (!decoded || !decoded.header.kid) return null;
          const key = await jwksClient.getSigningKey(decoded.header.kid);
          const pubKey = key.getPublicKey();
          const payload = jwt.verify(token, pubKey, {
            algorithms: ['RS256'],
            issuer: expectedIssuer,
            audience: cognito.clientId,
          });
          if (payload.token_use !== 'id') return null;
          return {
            sub: payload.sub,
            email: payload.email,
            username: payload['cognito:username'] || payload.preferred_username,
          };
        } catch (err) {
          return null;
        }
      },
    };
  } catch (err) {
    console.warn('Cognito JWT validation disabled:', err.message);
  }
}

async function requireCognito(req, res, next) {
  if (!isCognitoConfigured) return next();
  if (!jwtValidator) return next();
  const principal = await jwtValidator.validate(req.headers.authorization);
  if (principal) {
    req.cognitoPrincipal = principal;
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Valid Cognito token required' });
}

function userDisplayName(principal) {
  if (!principal) return null;
  return principal.username || principal.email || principal.sub || null;
}

// --- Wiki API handlers (used for both /wiki and /api/wiki) --------------------
async function handleWikiIndex(req, res) {
  try {
    const pages = await wikiStore.listPages();
    res.json({ pages });
  } catch (err) {
    console.error('GET wiki/index', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiGetPage(req, res) {
  const pageId = req.params.pageId;
  try {
    const entry = await wikiStore.getPage(pageId);
    res.json(entry || null);
  } catch (err) {
    console.error('GET wiki page', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiRevisions(req, res) {
  const pageId = req.params.pageId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  try {
    const items = await wikiStore.listRevisions(pageId, limit);
    res.json({ revisions: items });
  } catch (err) {
    console.error('GET wiki revisions', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiComments(req, res) {
  const pageId = req.params.pageId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
  try {
    const items = await wikiStore.listComments(pageId, limit);
    res.json({ comments: items });
  } catch (err) {
    console.error('GET wiki comments', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiPostPage(req, res) {
  const entry = req.body;
  if (!entry || typeof entry.path !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'path required' });
  }
  const pageId = entry.path.replace(/^\/+/, '');
  if (!pageId) return res.status(400).json({ error: 'Bad Request', message: 'path required' });
  const comment = typeof entry.comment === 'string' ? entry.comment.trim() : '';
  if (!comment) return res.status(400).json({ error: 'Bad Request', message: 'comment required (describe what you changed)' });
  const content = typeof entry.content === 'string' ? entry.content : '';
  const title = typeof entry.title === 'string' ? entry.title : pageId;
  const userId = req.cognitoPrincipal ? req.cognitoPrincipal.sub : null;
  const now = new Date().toISOString();
  const displayName = userDisplayName(req.cognitoPrincipal);
  try {
    let page = await wikiStore.getPage(pageId);
    if (!page) {
      page = { pageId, title, content, createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, status: 'published', currentRevisionId: null };
      await wikiStore.putPage(page);
      const rev = await wikiStore.createRevision(pageId, content, userId, comment, 'approved', displayName, '');
      await wikiStore.updatePageContent(pageId, content, now, userId, rev.revisionId);
      await wikiStore.addComment(pageId, userId, 'Edit: ' + comment, null, displayName);
      return res.status(200).end();
    }
    const rev = await wikiStore.createRevision(pageId, content, userId, comment, 'pending', displayName, page.content || '');
    await wikiStore.addComment(pageId, userId, 'Proposed: ' + comment, null, displayName);
    res.status(202).json({ revisionId: rev.revisionId, status: 'pending', message: 'Change proposed; pending accept/reject' });
  } catch (err) {
    console.error('POST wiki', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiAcceptRevision(req, res) {
  const { pageId, revisionId } = req.params;
  const comment = typeof req.body === 'object' && typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
  if (!comment) return res.status(400).json({ error: 'Bad Request', message: 'comment required' });
  const userId = req.cognitoPrincipal ? req.cognitoPrincipal.sub : null;
  const displayName = userDisplayName(req.cognitoPrincipal);
  try {
    const rev = await wikiStore.getRevision(pageId, revisionId);
    if (!rev) return res.status(404).json({ error: 'Not Found', message: 'Revision not found' });
    if (rev.status !== 'pending') return res.status(404).json({ error: 'Not Found', message: 'Revision not pending' });
    if (rev.userId && rev.userId === userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You cannot accept your own revision; another user must accept it.' });
    }
    const accepted = await wikiStore.acceptRevision(pageId, revisionId, userId);
    await wikiStore.addComment(pageId, userId, 'Accepted: ' + comment, null, displayName);
    res.json(accepted);
  } catch (err) {
    console.error('POST accept revision', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function handleWikiRejectRevision(req, res) {
  const { pageId, revisionId } = req.params;
  const comment = typeof req.body === 'object' && typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
  if (!comment) return res.status(400).json({ error: 'Bad Request', message: 'comment required' });
  const userId = req.cognitoPrincipal ? req.cognitoPrincipal.sub : null;
  const displayName = userDisplayName(req.cognitoPrincipal);
  try {
    const rev = await wikiStore.rejectRevision(pageId, revisionId);
    if (!rev) return res.status(404).json({ error: 'Not Found', message: 'Revision not found or not pending' });
    await wikiStore.addComment(pageId, userId, 'Rejected: ' + comment, null, displayName);
    res.json(rev);
  } catch (err) {
    console.error('POST reject revision', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// --- API routes (before static middleware) -----------------------------------
app.get('/version', (req, res) => {
  const pkg = require('./package.json');
  res.type('text/plain').send(pkg.version || '0.0.0');
});

app.get('/auth/config', (req, res) => {
  res.json({
    configured: isCognitoConfigured,
    region:     cognito.region,
    userPoolId: cognito.userPoolId || '',
    clientId:   cognito.clientId || '',
    domain:     domainUrl,
  });
});

// Mount /api/wiki so GET /api/wiki/index is always matched before :pageId
const apiWikiRouter = require('express').Router({ mergeParams: true });
apiWikiRouter.get('/index', handleWikiIndex);
apiWikiRouter.get('/:pageId/revisions', handleWikiRevisions);
apiWikiRouter.get('/:pageId/comments', handleWikiComments);
apiWikiRouter.get('/:pageId', handleWikiGetPage);
app.use('/api/wiki', apiWikiRouter);

async function handleWikiPostComment(req, res) {
  const pageId = req.params.pageId;
  const { content, parentCommentId } = req.body || {};
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'content required' });
  }
  const userId = req.cognitoPrincipal ? req.cognitoPrincipal.sub : null;
  const displayName = userDisplayName(req.cognitoPrincipal);
  try {
    const comment = await wikiStore.addComment(pageId, userId, content.trim(), parentCommentId, displayName);
    res.status(201).json(comment);
  } catch (err) {
    console.error('POST wiki comments', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

app.post('/wiki/:pageId/comments', requireCognito, handleWikiPostComment);
app.post('/api/wiki/:pageId/comments', requireCognito, handleWikiPostComment);

app.post('/wiki', requireCognito, handleWikiPostPage);
app.post('/api/wiki', requireCognito, handleWikiPostPage);

app.post('/wiki/:pageId/revisions/:revisionId/accept', requireCognito, handleWikiAcceptRevision);
app.post('/api/wiki/:pageId/revisions/:revisionId/accept', requireCognito, handleWikiAcceptRevision);

app.post('/wiki/:pageId/revisions/:revisionId/reject', requireCognito, handleWikiRejectRevision);
app.post('/api/wiki/:pageId/revisions/:revisionId/reject', requireCognito, handleWikiRejectRevision);

app.get('/wiki/index', handleWikiIndex);
app.get('/wiki/:pageId/revisions', handleWikiRevisions);
app.get('/wiki/:pageId/comments', handleWikiComments);

// --- Wiki UI static files (before catch-all GET /wiki*) ---------------------
// Serves /wiki/resort.html, /wiki/browse.html, /wiki/js/*, /wiki/css/*
app.use('/wiki', express.static(path.join(__dirname, 'wiki')));

// Redirect /wiki and /wiki/ to the browse page
app.get('/wiki', (req, res) => res.redirect(302, '/wiki/browse.html'));

// Catch-all: GET /wiki/:pageId → return page JSON from DynamoDB/memory
app.get('/wiki*', async (req, res) => {
  const wikiPath = req.path.slice(5) || '';
  const key = wikiPath.replace(/^\/+/, '');
  if (!key) return res.redirect(302, '/wiki/browse.html');
  try {
    const entry = await wikiStore.getPage(key);
    res.json(entry || null);
  } catch (err) {
    console.error('GET /wiki', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Root static files (existing GlobalSkiAtlas_2 HTML/CSS/JS) --------------
app.use(express.static(__dirname, {
  index: 'index.html',
  dotfiles: 'ignore',
  // Don't serve node_modules or lib as static files
}));

// 404 fallback
app.use((req, res) => {
  console.warn('404', req.method, req.url);
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// --- Start -------------------------------------------------------------------
const server = createServer(app);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port %s is in use. Set PORT to another number (e.g. PORT=3001 npm run start:server).', PORT);
  } else {
    console.error(err);
  }
  process.exit(1);
});
server.listen(PORT, () => {
  console.log('Global Ski Atlas server on http://localhost:' + PORT);
  if (wikiStore.useDynamo) {
    console.log('Wiki store: DynamoDB (prefix=%s)', process.env.DYNAMODB_TABLE_PREFIX);
  } else {
    console.log('Wiki store: in-memory (set DYNAMODB_TABLE_PREFIX to use DynamoDB)');
  }
  if (isCognitoConfigured) {
    console.log('Cognito configured: region=%s, userPoolId=%s', cognito.region, cognito.userPoolId);
  } else {
    console.log('Cognito not configured; auth disabled.');
  }
});

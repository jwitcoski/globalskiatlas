/**
 * Queue add/update/delete resort jobs.
 * Caller must already have a validated wiki session.
 * RESORT_JOB_SECRET stays in this process; the browser never sees it.
 * RESORT_JOB_API_BASE is the queue origin, no trailing path.
 */

function bad(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function optionalString(input, key) {
  if (input[key] == null) return '';
  return String(input[key]).trim();
}

function buildJobBody(input) {
  const src = input && typeof input === 'object' ? input : {};
  const action = String(src.action || '').trim();
  if (action === 'add') {
    const name = optionalString(src, 'name');
    if (!name) throw bad(400, 'name required');
    const body = { action: 'add', name };
    ['state', 'country', 'lat', 'lon'].forEach((key) => {
      const value = optionalString(src, key);
      if (value) body[key] = value;
    });
    return body;
  }
  if (action === 'delete' || action === 'update') {
    const winterSportsId = optionalString(src, 'winter_sports_id');
    const region = optionalString(src, 'region');
    if (!winterSportsId || !region) throw bad(400, 'winter_sports_id and region required');
    return { action, winter_sports_id: winterSportsId, region };
  }
  throw bad(400, 'action must be add, update, or delete');
}

function queueConfig(env) {
  const base = String((env && env.RESORT_JOB_API_BASE) || '').replace(/\/+$/, '');
  const secret = String((env && env.RESORT_JOB_SECRET) || '');
  if (!base || !secret) throw bad(503, 'Resort job queue is not configured');
  return { base, secret };
}

async function forwardResortJob({ method, jobId, body, fetchImpl, env }) {
  const { base, secret } = queueConfig(env);
  const url = method === 'GET'
    ? base + '/resort-jobs/' + encodeURIComponent(jobId)
    : base + '/resort-jobs';
  const res = await fetchImpl(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + secret,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = {};
  if (text) {
    try { parsed = JSON.parse(text); } catch (_) { parsed = { error: 'Bad upstream response' }; }
  }
  return { status: res.status, body: parsed };
}

async function handleResortJobRequest({ method, pathParts, token, body, validateToken, fetchImpl, env }) {
  if (!pathParts || pathParts[0] !== 'wiki' || pathParts[1] !== 'resort-jobs') return null;
  const principal = token ? await validateToken(token) : null;
  if (!principal) return { status: 401, body: { error: 'Unauthorized', message: 'Valid Cognito token required' } };
  try {
    if (method === 'POST' && pathParts.length === 2) {
      const job = buildJobBody(body);
      return await forwardResortJob({ method: 'POST', body: job, fetchImpl, env });
    }
    if (method === 'GET' && pathParts.length === 3) {
      const jobId = decodeURIComponent(pathParts[2]);
      if (!/^[\w.-]{1,128}$/.test(jobId)) return { status: 400, body: { error: 'Bad Request', message: 'bad job id' } };
      return await forwardResortJob({ method: 'GET', jobId, fetchImpl, env });
    }
    return { status: 404, body: { error: 'Not Found' } };
  } catch (err) {
    const status = err.status || 500;
    return { status, body: { error: status === 400 ? 'Bad Request' : 'Error', message: err.message } };
  }
}

module.exports = { buildJobBody, forwardResortJob, handleResortJobRequest };

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
    const winterSportsId = optionalString(src, 'winter_sports_id');
    if (!name) throw bad(400, 'name required');
    if (!/^\d+$/.test(winterSportsId)) throw bad(400, 'winter_sports_id required');
    return { action: 'add', winter_sports_id: winterSportsId, name };
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

function jobSummary(job) {
  const src = job && typeof job === 'object' ? job : {};
  return {
    jobId: String(src.jobId || ''),
    action: String(src.action || ''),
    name: String(src.name || ''),
    winter_sports_id: String(src.winter_sports_id || ''),
    region: String(src.region || ''),
    state: String(src.state || ''),
    country: String(src.country || ''),
  };
}

async function listQueuedJobs({ env }) {
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
  const bucket = String((env && env.RESORT_JOB_BUCKET) || 'globalskiatlas-backend-k8s-output');
  const prefix = String((env && env.RESORT_JOB_PREFIX) || 'resort-jobs/inbox/');
  const client = new S3Client({ region: (env && env.AWS_REGION) || 'us-east-1' });
  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  const keys = (listed.Contents || []).map((item) => item.Key).filter((key) => key && key.endsWith('.json'));
  const jobs = [];
  for (const Key of keys) {
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key }));
    const text = await obj.Body.transformToString();
    jobs.push(jobSummary(JSON.parse(text)));
  }
  return jobs;
}

async function handleResortJobRequest({ method, pathParts, token, body, validateToken, fetchImpl, env, listJobs, findExisting }) {
  if (!pathParts || pathParts[0] !== 'wiki' || pathParts[1] !== 'resort-jobs') return null;
  const principal = token ? await validateToken(token) : null;
  if (!principal) return { status: 401, body: { error: 'Unauthorized', message: 'Valid Cognito token required' } };
  try {
    if (method === 'GET' && pathParts.length === 2) {
      const jobs = await (listJobs || listQueuedJobs)({ env });
      return { status: 200, body: { jobs } };
    }
    if (method === 'POST' && pathParts.length === 2) {
      const job = buildJobBody(body);
      if (job.action === 'add' && typeof findExisting === 'function') {
        const existing = await findExisting(job.winter_sports_id);
        if (existing) {
          return {
            status: 409,
            body: {
              error: 'Conflict',
              message: (existing.title || 'This resort') + ' is already in the atlas.',
              pageId: existing.pageId || '',
              title: existing.title || '',
            },
          };
        }
      }
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

module.exports = { buildJobBody, forwardResortJob, handleResortJobRequest, jobSummary, listQueuedJobs };

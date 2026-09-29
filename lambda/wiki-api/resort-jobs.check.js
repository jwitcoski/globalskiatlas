const assert = require('assert');
const { buildJobBody, forwardResortJob, handleResortJobRequest, jobSummary } = require('./resort-jobs');

const add = buildJobBody({
  action: 'add',
  name: ' Breckenridge ',
  winter_sports_id: '531005985',
  state: 'Colorado',
  country: 'United States of America',
  lat: '39.48',
  lon: '-106.07',
  region: 'north-america/us/colorado',
  extra: 'nope',
});
assert.deepStrictEqual(add, {
  action: 'add',
  winter_sports_id: '531005985',
  name: 'Breckenridge',
});
assert.throws(() => buildJobBody({ action: 'add', name: 'Only' }), /winter_sports_id required/);
assert.throws(() => buildJobBody({ action: 'add', name: '  ', winter_sports_id: '1' }), /name required/);
assert.throws(() => buildJobBody({ action: 'add', name: 'Breckenridge', winter_sports_id: 'way/1' }), /winter_sports_id required/);

assert.deepStrictEqual(buildJobBody({
  action: 'delete',
  winter_sports_id: '1054264463',
  region: 'north-america/us/connecticut',
}), {
  action: 'delete',
  winter_sports_id: '1054264463',
  region: 'north-america/us/connecticut',
});
assert.deepStrictEqual(buildJobBody({
  action: 'update',
  winter_sports_id: '531005985',
  region: 'north-america/us/colorado',
}), {
  action: 'update',
  winter_sports_id: '531005985',
  region: 'north-america/us/colorado',
});

async function run() {
  const denied = await handleResortJobRequest({
    method: 'POST',
    pathParts: ['wiki', 'resort-jobs'],
    token: null,
    body: { action: 'add', name: 'X' },
    validateToken: async () => null,
    fetchImpl: async () => { throw new Error('must not call queue'); },
    env: { RESORT_JOB_API_BASE: 'https://jobs.example', RESORT_JOB_SECRET: 'sekrit' },
  });
  assert.strictEqual(denied.status, 401);

  let seen;
  const queued = await handleResortJobRequest({
    method: 'POST',
    pathParts: ['wiki', 'resort-jobs'],
    token: 'user-jwt',
    body: { action: 'add', name: 'Breckenridge', winter_sports_id: '531005985', state: 'Colorado', lat: '39.48' },
    validateToken: async (token) => (token === 'user-jwt' ? { sub: 'abc' } : null),
    fetchImpl: async (url, opts) => {
      seen = { url, opts };
      return { status: 202, text: async () => JSON.stringify({ jobId: 'job-1', status: 'queued' }) };
    },
    env: { RESORT_JOB_API_BASE: 'https://jobs.example/', RESORT_JOB_SECRET: 'sekrit' },
  });
  assert.strictEqual(queued.status, 202);
  assert.strictEqual(queued.body.jobId, 'job-1');
  assert.strictEqual(seen.url, 'https://jobs.example/resort-jobs');
  assert.strictEqual(seen.opts.headers.Authorization, 'Bearer sekrit');
  assert.ok(!JSON.stringify(seen).includes('user-jwt'));
  assert.deepStrictEqual(JSON.parse(seen.opts.body), {
    action: 'add',
    winter_sports_id: '531005985',
    name: 'Breckenridge',
  });

  let queuedExisting = false;
  const conflict = await handleResortJobRequest({
    method: 'POST',
    pathParts: ['wiki', 'resort-jobs'],
    token: 'user-jwt',
    body: { action: 'add', name: 'Killington Resort', winter_sports_id: '123' },
    validateToken: async () => ({ sub: 'abc' }),
    fetchImpl: async () => { queuedExisting = true; return { status: 202, text: async () => '{}' }; },
    findExisting: async (id) => (id === '123' ? { pageId: 'killington-resort', title: 'Killington Resort' } : null),
    env: { RESORT_JOB_API_BASE: 'https://jobs.example/', RESORT_JOB_SECRET: 'sekrit' },
  });
  assert.strictEqual(conflict.status, 409);
  assert.strictEqual(queuedExisting, false);
  assert.strictEqual(conflict.body.pageId, 'killington-resort');

  const polled = await forwardResortJob({
    method: 'GET',
    jobId: 'job-1',
    fetchImpl: async (url, opts) => {
      assert.strictEqual(url, 'https://jobs.example/resort-jobs/job-1');
      assert.strictEqual(opts.headers.Authorization, 'Bearer sekrit');
      return { status: 200, text: async () => JSON.stringify({ jobId: 'job-1', status: 'succeeded' }) };
    },
    env: { RESORT_JOB_API_BASE: 'https://jobs.example', RESORT_JOB_SECRET: 'sekrit' },
  });
  assert.strictEqual(polled.body.status, 'succeeded');

  const unconfigured = await handleResortJobRequest({
    method: 'POST',
    pathParts: ['wiki', 'resort-jobs'],
    token: 'user-jwt',
    body: { action: 'update', winter_sports_id: '1', region: 'north-america/us/colorado' },
    validateToken: async () => ({ sub: 'abc' }),
    fetchImpl: async () => { throw new Error('must not call queue'); },
    env: {},
  });
  assert.strictEqual(unconfigured.status, 503);

  assert.strictEqual(jobSummary({ action: 'add', name: 'test', jobId: 'abc', extra: 1 }).name, 'test');
  const listed = await handleResortJobRequest({
    method: 'GET',
    pathParts: ['wiki', 'resort-jobs'],
    token: 'user-jwt',
    validateToken: async () => ({ sub: 'abc' }),
    fetchImpl: async () => { throw new Error('must not call queue'); },
    env: {},
    listJobs: async () => [{ jobId: 'abc', action: 'add', name: 'test' }],
  });
  assert.strictEqual(listed.status, 200);
  assert.strictEqual(listed.body.jobs[0].name, 'test');
  console.log('resort-jobs.check ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

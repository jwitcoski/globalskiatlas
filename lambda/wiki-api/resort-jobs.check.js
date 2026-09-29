const assert = require('assert');
const { buildJobBody, forwardResortJob, handleResortJobRequest } = require('./resort-jobs');

const add = buildJobBody({
  action: 'add',
  name: ' Resort Name ',
  state: 'Pennsylvania',
  country: 'United States of America',
  lat: '40.07',
  lon: '-75.27',
  extra: 'nope',
});
assert.deepStrictEqual(add, {
  action: 'add',
  name: 'Resort Name',
  state: 'Pennsylvania',
  country: 'United States of America',
  lat: '40.07',
  lon: '-75.27',
});
assert.deepStrictEqual(buildJobBody({ action: 'add', name: 'Only' }), { action: 'add', name: 'Only' });
assert.throws(() => buildJobBody({ action: 'add', name: '  ' }), /name required/);

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
    body: { action: 'add', name: 'Montage', state: '', lat: '40.07' },
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
  assert.deepStrictEqual(JSON.parse(seen.opts.body), { action: 'add', name: 'Montage', lat: '40.07' });

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
  console.log('resort-jobs.check ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

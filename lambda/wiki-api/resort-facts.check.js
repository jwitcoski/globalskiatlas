const assert = require('assert');
const { GetCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const facts = require('./resort-facts');

const rows = [
  { winterSportsId: '1', country: 'United States', state: 'Vermont', name: 'Jay Peak', pageId: 'jay-peak-resort-vermont', passes: new Set(['Ikon', 'Jay Peak Card']), night_skiing: true, lift_ticket_usd: 40, lift_ticket_raw: '49 EUR', price_band: '$$', copy_status: 'complete', website: 'https://en.wikipedia.org/wiki/Jay_Peak' },
  { winterSportsId: '2', country: 'United States', state: 'Vermont', passes: new Set(['Ikon']), night_skiing: false, lift_ticket_usd: 80, copy_status: 'insufficient_data', tier: 'medium' },
  { winterSportsId: '3', country: 'United States', state: 'Vermont', night_skiing: 'no', passes: new Set(['Epic']), copy_status: 'skipped' },
  { winterSportsId: '4', country: 'France', lift_ticket_raw: '$34.00 CAD (day)', lift_ticket_usd: 25, website: 'https://www.example-resort.fr' },
  { winterSportsId: '5', country: 'France', glacier: false },
];

const stats = facts.computeStats(rows);
assert.strictEqual(stats.nightSkiing.true, 1);
assert.strictEqual(stats.nightSkiing.false, 2);
assert.strictEqual(stats.nightSkiing.unknown, 2);
assert.strictEqual(stats.nightSkiing.pct, 1 / 3);
assert.strictEqual(stats.passShare.both, 1);
assert.strictEqual(stats.passShare.ikonOnly, 1);
assert.strictEqual(stats.passShare.otherPass, 1);
assert.strictEqual(stats.passShare.unknownPasses, 2);
assert.strictEqual(stats.passShare.localOnly, 0);
assert.strictEqual(stats.passShare.denominator, 2);
assert.strictEqual(stats.medianLiftTicketUsdByCountry['United States'], 60);
assert.strictEqual(stats.medianLiftTicketUsdByCountry.France, 25);
assert.deepStrictEqual(stats.insufficientDataByState, { Vermont: 1 });
assert.strictEqual(facts.computeStats([{ night_skiing: null }, {}]).nightSkiing.pct, null);

const projected = facts.projectFact(rows[0]);
assert.strictEqual(projected.website, undefined);
assert.strictEqual(projected.lift_ticket_raw, '49 EUR');
assert.strictEqual(projected.lift_ticket_usd, 40);
assert.deepStrictEqual(projected.passes, ['Ikon', 'Jay Peak Card']);
assert.strictEqual(projected.night_skiing, true);
assert.strictEqual(facts.projectFact(rows[1]).night_skiing, false);
assert.strictEqual('snowtubing' in facts.projectFact(rows[4]), false);
assert.strictEqual(facts.projectFact(rows[4]).glacier, false);
assert.strictEqual(facts.projectFact(rows[3]).website, 'https://www.example-resort.fr');
assert.deepStrictEqual(facts.priceStrip(rows[3]), {
  price_band: null,
  lift_ticket_raw: '$34.00 CAD (day)',
  sourceUrl: null,
  evidence: null,
});
assert.strictEqual(facts.priceStrip({ lift_ticket_usd: 10 }).lift_ticket_raw, null);

assert.strictEqual(facts.planRead({ state: 'Vermont', country: 'United States' }).index, 'state-index');
assert.strictEqual(facts.planRead({ country: 'France' }).index, 'country-index');
assert.strictEqual(facts.planRead({ pageId: 'jay-peak-resort-vermont' }).index, 'pageId-index');
assert.strictEqual(facts.planRead({}).op, 'scan');
const filter = facts.buildFilter({ amenity: 'night_skiing', pass: 'Ikon', tier: 'medium' }, 'state');
assert.ok(filter.FilterExpression.includes('contains('));
assert.ok(filter.FilterExpression.includes('OR'));
assert.ok(Object.values(filter.ExpressionAttributeValues).includes(true));
assert.ok(Object.values(filter.ExpressionAttributeValues).includes('Ikon'));
assert.strictEqual(facts.matchFact({ night_skiing: false, passes: ['Ikon'] }, { amenity: 'night_skiing' }), false);
assert.strictEqual(facts.matchFact({ night_skiing: true }, { amenity: 'night_skiing' }), true);
assert.strictEqual(facts.matchFact({}, { amenity: 'night_skiing' }), false);

assert.strictEqual(facts.parseFactsQuery({ amenity: 'vertical' }).error != null, true);
assert.deepStrictEqual(facts.parseFactsQuery({ state: 'Vermont', pass: 'Ikon', price_band: '$$' }).query, {
  state: 'Vermont', pass: 'Ikon', price_band: '$$',
});

const cleared = facts.buildLockUpdate('1', 'night_skiing', null, { now: '2026-11-22T00:00:00.000Z', table: 'atlas-ResortFacts' });
assert.ok(cleared.UpdateExpression.includes('REMOVE #f'));
assert.strictEqual(cleared.ExpressionAttributeValues[':src'], 'user');
assert.strictEqual(cleared.ExpressionAttributeValues[':locked'], true);
assert.strictEqual(cleared.ExpressionAttributeValues[':v'], undefined);
const storedFalse = facts.buildLockUpdate('1', 'night_skiing', false, { now: '2026-11-22T00:00:00.000Z', table: 'atlas-ResortFacts' });
assert.strictEqual(storedFalse.ExpressionAttributeValues[':v'], false);
assert.ok(storedFalse.UpdateExpression.includes('#f = :v'));
const passes = facts.normalizeEdit('passes', 'Ikon, Vermont Pass');
assert.deepStrictEqual(passes.value, ['Ikon', 'Vermont Pass']);
assert.ok(facts.buildLockUpdate('1', 'passes', passes.value, { now: 't', table: 't' }).ExpressionAttributeValues[':v'] instanceof Set);
assert.ok(facts.normalizeEdit('website', 'https://www.tripadvisor.com/x').error);
assert.strictEqual(facts.normalizeEdit('copy_status', 'complete').error != null, true);
assert.strictEqual(facts.normalizeEdit('lift_ticket_usd', 12).value, 12);

function fakeDoc(items) {
  return {
    updates: [],
    async send(cmd) {
      const input = cmd.input;
      if (cmd instanceof ScanCommand) return { Items: items };
      if (cmd instanceof QueryCommand) {
        const keyName = input.ExpressionAttributeNames['#k'];
        const keyValue = input.ExpressionAttributeValues[':k'];
        return { Items: items.filter((item) => item[keyName] === keyValue) };
      }
      if (cmd instanceof GetCommand) {
        return { Item: items.find((item) => item.winterSportsId === input.Key.winterSportsId) || null };
      }
      if (cmd instanceof UpdateCommand) {
        this.updates.push(input);
        const item = items.find((row) => row.winterSportsId === input.Key.winterSportsId);
        if (!item) {
          const err = new Error('missing');
          err.name = 'ConditionalCheckFailedException';
          throw err;
        }
        return {};
      }
      throw new Error('unexpected ' + cmd.constructor.name);
    },
  };
}

async function run() {
  const doc = fakeDoc(rows);
  const listed = await facts.handleResortFactsRequest({
    method: 'GET',
    pathParts: ['wiki', 'resorts', 'facts'],
    query: { state: 'Vermont', amenity: 'night_skiing' },
    docClient: doc,
  });
  assert.strictEqual(listed.status, 200);
  assert.strictEqual(listed.body.count, 1);
  assert.strictEqual(listed.body.resorts[0].winterSportsId, '1');
  assert.strictEqual(listed.body.resorts[0].lift_ticket_raw, '49 EUR');
  assert.strictEqual(listed.body.stats.nightSkiing.pct, 1);

  const empty = await facts.handleResortFactsRequest({
    method: 'GET',
    pathParts: ['resorts', 'facts', 'stats'],
    query: {},
    docClient: fakeDoc([]),
  });
  assert.strictEqual(empty.status, 200);
  assert.strictEqual(empty.body.stats.count, 0);
  assert.strictEqual(empty.body.stats.nightSkiing.pct, null);
  assert.deepStrictEqual(empty.body.stats.medianLiftTicketUsdByCountry, {});

  const denied = await facts.handleResortFactsRequest({
    method: 'POST',
    pathParts: ['resorts', 'facts', '1'],
    body: { field: 'night_skiing', value: false },
    token: null,
    validateToken: async () => null,
    docClient: doc,
  });
  assert.strictEqual(denied.status, 401);

  const missing = await facts.handleResortFactsRequest({
    method: 'POST',
    pathParts: ['wiki', 'resorts', 'facts', '999'],
    body: { field: 'famous_for', value: 'tram' },
    token: 't',
    validateToken: async () => ({ sub: 'user' }),
    docClient: doc,
  });
  assert.strictEqual(missing.status, 404);

  const ignored = await facts.handleResortFactsRequest({
    method: 'GET',
    pathParts: ['wiki', 'index'],
    docClient: doc,
  });
  assert.strictEqual(ignored, null);
  console.log('resort-facts.check: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

const assert = require('assert');
const { jobBody, existingPage } = require('./add-resort');

assert.deepStrictEqual(jobBody({ id: '531005985', name: 'Breckenridge' }), {
  action: 'add',
  winter_sports_id: '531005985',
  name: 'Breckenridge'
});
assert.throws(() => jobBody(null), /outline required/);
assert.throws(() => jobBody({ id: '531005985', name: '  ' }), /outline required/);

const pages = [{ pageId: 'killington-resort', title: 'Killington Resort', winterSportsId: '123' }];
assert.strictEqual(existingPage(pages, '123').pageId, 'killington-resort');
assert.strictEqual(existingPage(pages, '999'), null);

console.log('add-resort.check ok');

const assert = require('assert');
const { nominatimSearchUrl, featuresFromNominatim, photonWinterIds, searchWinterSports, handleResortSearchRequest } = require('./resort-search');

const url = nominatimSearchUrl(' Breckenridge ');
assert.ok(url.startsWith('https://nominatim.openstreetmap.org/search?'));
assert.ok(url.includes('q=Breckenridge'));
assert.ok(url.includes('polygon_geojson=1'));
assert.ok(url.includes('extratags=1'));
assert.strictEqual(nominatimSearchUrl(' '), '');

const polygon = { type: 'Polygon', coordinates: [[[-106.07, 39.48], [-106.06, 39.49], [-106.05, 39.47], [-106.07, 39.48]]] };
const features = featuresFromNominatim([
  { osm_type: 'way', osm_id: 531005985, category: 'landuse', type: 'winter_sports', name: 'Breckenridge', geojson: polygon },
  { osm_type: 'relation', osm_id: 112177, category: 'boundary', type: 'administrative', name: 'Breckenridge', geojson: polygon },
  { osm_type: 'way', osm_id: 530998526, category: 'leisure', type: 'sports_centre', name: 'Steamboat Ski Resort', extratags: { landuse: 'winter_sports' }, geojson: polygon },
  { osm_type: 'way', osm_id: 1, category: 'leisure', type: 'sports_centre', name: 'Not a ski area', extratags: {}, geojson: polygon },
]);
assert.deepStrictEqual(features.map((f) => f.id), ['531005985', '530998526']);

const ids = photonWinterIds([
  { properties: { osm_type: 'W', osm_id: 530998526, osm_key: 'leisure', osm_value: 'sports_centre', name: 'Steamboat Ski Resort' } },
  { properties: { osm_type: 'W', osm_id: 1433580539, osm_key: 'landuse', osm_value: 'winter_sports', name: 'Steamboat Gulch Sledding & Tubing Hill' } },
  { properties: { osm_type: 'N', osm_id: 9, osm_key: 'landuse', osm_value: 'winter_sports', name: 'Steamboat Peak' } },
  { properties: { osm_type: 'W', osm_id: 8, osm_key: 'leisure', osm_value: 'sports_centre', name: 'Other Centre' } },
], 'steamboat');
assert.deepStrictEqual(ids, ['W530998526', 'W1433580539']);

const calls = [];
function fakeFetch(target) {
  calls.push(target);
  if (target.includes('/search?')) {
    return Promise.resolve({ ok: true, json: async () => [] });
  }
  if (target.includes('osm_tag=landuse')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        features: [{ properties: { osm_type: 'W', osm_id: 1154306823, osm_key: 'landuse', osm_value: 'winter_sports', name: 'Black Mountain' } }],
      }),
    });
  }
  if (target.includes('photon.komoot.io')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        features: [{ properties: { osm_type: 'W', osm_id: 530998526, osm_key: 'leisure', osm_value: 'sports_centre', name: 'Steamboat Ski Resort' } }],
      }),
    });
  }
  if (target.includes('/lookup?')) {
    assert.ok(target.includes('osm_ids=W530998526'));
    return Promise.resolve({
      ok: true,
      json: async () => [{
        osm_type: 'way', osm_id: 530998526, category: 'leisure', type: 'sports_centre',
        name: 'Steamboat Ski Resort', extratags: { landuse: 'winter_sports' }, geojson: polygon,
        display_name: 'Steamboat Ski Resort, Colorado, United States',
      }],
    });
  }
  throw new Error(target);
}

searchWinterSports('steamboat', fakeFetch).then(async (found) => {
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].id, '530998526');
  assert.strictEqual(found[0].name, 'Steamboat Ski Resort');
  const ok = await handleResortSearchRequest({
    method: 'GET', pathParts: ['wiki', 'resort-search'], token: 't', query: 'steamboat',
    validateToken: async () => ({ sub: 'u' }), fetchImpl: fakeFetch,
  });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.features[0].id, '530998526');

  const black = await searchWinterSports('black', (target) => {
    if (target.includes('/search?')) return Promise.resolve({ ok: true, json: async () => [] });
    if (target.includes('osm_tag=landuse')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          features: [
            { properties: { osm_type: 'W', osm_id: 1154306823, osm_key: 'landuse', osm_value: 'winter_sports', name: 'Black Mountain' } },
            { properties: { osm_type: 'W', osm_id: 1335354188, osm_key: 'landuse', osm_value: 'winter_sports', name: 'Blacktail Mountain Ski Area' } },
          ],
        }),
      });
    }
    if (target.includes('photon.komoot.io')) return Promise.resolve({ ok: true, json: async () => ({ features: [] }) });
    if (target.includes('/lookup?')) {
      assert.ok(target.includes('W1154306823'));
      assert.ok(target.includes('W1335354188'));
      return Promise.resolve({
        ok: true,
        json: async () => [
          { osm_type: 'way', osm_id: 1154306823, category: 'landuse', type: 'winter_sports', name: 'Black Mountain', geojson: polygon },
          { osm_type: 'way', osm_id: 1335354188, category: 'landuse', type: 'winter_sports', name: 'Blacktail Mountain Ski Area', geojson: polygon },
        ],
      });
    }
    throw new Error(target);
  });
  assert.deepStrictEqual(black.map((row) => row.name), ['Black Mountain', 'Blacktail Mountain Ski Area']);
  console.log('resort-search.check ok');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

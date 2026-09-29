/**
 * Name search for landuse=winter_sports ways and relations.
 * Nominatim is the polygon source. Photon fills partial names Nominatim ranks as towns
 * (Steamboat Ski Resort is leisure=sports_centre plus extratags.landuse=winter_sports).
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const PHOTON = 'https://photon.komoot.io/api/';
const MATCH_CAP = 40;
const LOOKUP_CAP = 40;
const UA = 'GlobalSkiAtlas/1.0 (wiki add a missing resort)';

function nominatimSearchUrl(name) {
  const q = String(name || '').trim().replace(/\s+/g, ' ');
  if (q.length < 2) return '';
  return NOMINATIM + '/search?' + new URLSearchParams({
    format: 'jsonv2',
    polygon_geojson: '1',
    extratags: '1',
    limit: String(MATCH_CAP),
    q,
  }).toString();
}

function isWinterSports(row) {
  if (!row) return false;
  if (row.category === 'landuse' && row.type === 'winter_sports') return true;
  const extra = row.extratags || {};
  return extra.landuse === 'winter_sports';
}

function featuresFromNominatim(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const out = [];
  const seen = {};
  for (let i = 0; i < list.length && out.length < MATCH_CAP; i++) {
    const row = list[i];
    if (!isWinterSports(row)) continue;
    if (row.osm_type !== 'way' && row.osm_type !== 'relation') continue;
    const id = String(row.osm_id == null ? '' : row.osm_id);
    const name = String(row.name || '').trim();
    const geo = row.geojson;
    if (!/^\d+$/.test(id) || !name || seen[id] || !geo) continue;
    if (geo.type !== 'Polygon' && geo.type !== 'MultiPolygon' && geo.type !== 'LineString' && geo.type !== 'MultiLineString') continue;
    seen[id] = true;
    const display = String(row.display_name || '');
    let place = display;
    if (name && display.toLowerCase().indexOf(name.toLowerCase()) === 0) {
      place = display.slice(name.length).replace(/^,\s*/, '');
    }
    out.push({ id, name, place, geojson: geo });
  }
  return out;
}

function photonWinterIds(features, query) {
  const needle = String(query || '').trim().toLowerCase();
  const ids = [];
  const seen = {};
  (features || []).forEach((feature) => {
    const props = (feature && feature.properties) || {};
    const type = String(props.osm_type || '');
    const id = String(props.osm_id == null ? '' : props.osm_id);
    const name = String(props.name || '');
    if ((type !== 'W' && type !== 'R') || !/^\d+$/.test(id)) return;
    if (!needle || name.toLowerCase().indexOf(needle) === -1) return;
    const winter = props.osm_key === 'landuse' && props.osm_value === 'winter_sports';
    const centre = props.osm_key === 'leisure' && props.osm_value === 'sports_centre';
    if (!winter && !centre) return;
    const prefixed = type + id;
    if (seen[prefixed]) return;
    seen[prefixed] = true;
    ids.push(prefixed);
  });
  return ids.slice(0, LOOKUP_CAP);
}

function photonUrl(query, tag) {
  const params = { q: query, limit: '50', lang: 'en' };
  if (tag) params.osm_tag = tag;
  return PHOTON + '?' + new URLSearchParams(params).toString();
}

function rankName(name, query) {
  const n = String(name || '').toLowerCase();
  const q = String(query || '').trim().toLowerCase();
  if (n === q) return 0;
  if (q && n.indexOf(q) === 0) return 1;
  if (q && n.indexOf(q) !== -1) return 2;
  return 3;
}

async function readJson(fetchImpl, url) {
  const resp = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!resp.ok) throw new Error(String(resp.status));
  return resp.json();
}

async function searchWinterSports(query, fetchImpl) {
  const q = String(query || '').trim().replace(/\s+/g, ' ');
  const searchUrl = nominatimSearchUrl(q);
  if (!searchUrl || typeof fetchImpl !== 'function') return [];
  const [nomRows, photonOpen, photonTagged] = await Promise.all([
    readJson(fetchImpl, searchUrl).catch(() => []),
    readJson(fetchImpl, photonUrl(q)).catch(() => ({ features: [] })),
    readJson(fetchImpl, photonUrl(q, 'landuse:winter_sports')).catch(() => ({ features: [] })),
  ]);
  const features = featuresFromNominatim(nomRows);
  const have = {};
  features.forEach((feature) => { have[feature.id] = true; });
  const photonFeatures = []
    .concat((photonOpen && photonOpen.features) || [])
    .concat((photonTagged && photonTagged.features) || []);
  const ids = photonWinterIds(photonFeatures, q).filter((prefixed) => !have[prefixed.slice(1)]);
  if (ids.length) {
    const lookup = NOMINATIM + '/lookup?' + new URLSearchParams({
      osm_ids: ids.join(','),
      format: 'jsonv2',
      polygon_geojson: '1',
      extratags: '1',
    }).toString();
    const looked = await readJson(fetchImpl, lookup).catch(() => []);
    featuresFromNominatim(looked).forEach((feature) => {
      if (have[feature.id]) return;
      have[feature.id] = true;
      features.push(feature);
    });
  }
  const needle = q.toLowerCase();
  const named = features.filter((feature) => feature.name.toLowerCase().indexOf(needle) !== -1);
  named.sort((a, b) => rankName(a.name, q) - rankName(b.name, q) || a.name.localeCompare(b.name));
  return named.slice(0, MATCH_CAP);
}

async function handleResortSearchRequest({ method, pathParts, token, query, validateToken, fetchImpl }) {
  if (!pathParts || pathParts[0] !== 'wiki' || pathParts[1] !== 'resort-search') return null;
  if (method !== 'GET' || pathParts.length !== 2) return { status: 404, body: { error: 'Not Found' } };
  try {
    const features = await searchWinterSports(query, fetchImpl);
    return { status: 200, body: { features } };
  } catch (_) {
    return { status: 502, body: { error: 'Bad Gateway', message: 'OpenStreetMap search failed' } };
  }
}

module.exports = {
  nominatimSearchUrl,
  featuresFromNominatim,
  photonWinterIds,
  searchWinterSports,
  handleResortSearchRequest,
};

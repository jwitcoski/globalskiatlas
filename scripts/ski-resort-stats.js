/**
 * Resort comparison index (trails, lifts, acreage) from MapTiler catalog.
 */
import {
  getProp,
  COUNTRY_KEYS,
  STATE_KEYS,
  LIFTS_KEYS,
  NAME_KEYS,
  SKIABLE_TERRAIN_ACRES_KEYS,
  SKIABLE_TERRAIN_HA_KEYS
} from './utils.js';
import {
  categorizeFromTrailCount,
  CATEGORY_LABELS,
  getTrailCount,
  isNotDownhill,
  RESORT_CATEGORY,
  TRAILS_MEGA_GE,
  TRAILS_MEDIUM_LT,
  TRAILS_SMALL_LT
} from './resort-categories.js';

const HA_TO_ACRES = 2.471054;

function normCountry(c) {
  if (!c) return '';
  const s = String(c).trim();
  if (/^united states/i.test(s)) return 'USA';
  return s;
}

function stateKey(country, state) {
  const c = normCountry(country);
  const st = state ? String(state).trim() : '';
  return st ? `${c}|${st}` : c;
}

function getSkiableAcres(props) {
  let acres = getProp(props, SKIABLE_TERRAIN_ACRES_KEYS);
  if (acres != null && acres !== '') {
    const n = Number(acres);
    if (Number.isFinite(n) && n > 0) return n;
  }
  let ha = getProp(props, SKIABLE_TERRAIN_HA_KEYS);
  if (ha != null && ha !== '') {
    const n = Number(ha);
    if (Number.isFinite(n) && n > 0) return n * HA_TO_ACRES;
  }
  return 0;
}

function getLifts(props) {
  const v = getProp(props, LIFTS_KEYS);
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function resortKey(props) {
  const id = getProp(props, ['id', 'ref', 'area_id', 'resort_id']);
  if (id != null && id !== '') return String(id);
  const name = getProp(props, NAME_KEYS);
  return String(name || '').toLowerCase().trim();
}

export function parseResortRecord(properties, geometry, displayName = '') {
  const trails = getTrailCount(properties);
  const lifts = getLifts(properties);
  const acres = getSkiableAcres(properties);
  const country = getProp(properties, COUNTRY_KEYS);
  const state = getProp(properties, STATE_KEYS);
  const category = categorizeFromTrailCount(trails);
  const coords = geometry?.coordinates;
  return {
    key: resortKey(properties),
    name: displayName || getProp(properties, NAME_KEYS) || 'Resort',
    trails,
    lifts,
    acres,
    country: country ? String(country).trim() : '',
    countryNorm: normCountry(country),
    state: state ? String(state).trim() : '',
    stateKey: stateKey(country, state),
    category,
    lat: coords?.[1] ?? null,
    lon: coords?.[0] ?? null
  };
}

function buildSorted(values) {
  const sorted = values.filter((n) => n > 0).sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    sorted,
    avg: sorted.length ? sum / sorted.length : 0,
    max: sorted.length ? sorted[sorted.length - 1] : 0
  };
}

function addToGroup(map, key, record) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(record);
}

/** @param {{ geometry, properties }[]} catalogRows */
export function buildResortStatsIndex(catalogRows, nameForProps = (p) => getProp(p, NAME_KEYS) || '') {
  const all = [];
  const byCountry = new Map();
  const byState = new Map();
  const byKey = new Map();

  for (const row of catalogRows) {
    if (!row.geometry || row.geometry.type !== 'Point') continue;
    const props = row.properties || row;
    if (isNotDownhill(props)) continue;
    const r = parseResortRecord(props, row.geometry, nameForProps(props));
    all.push(r);
    byKey.set(r.key, r);
    addToGroup(byCountry, r.countryNorm, r);
    if (r.state) addToGroup(byState, r.stateKey, r);
  }

  const trailsAll = buildSorted(all.map((r) => r.trails));
  const liftsAll = buildSorted(all.map((r) => r.lifts));
  const acresAll = buildSorted(all.map((r) => r.acres));

  const byCountryStats = Object.fromEntries(
    [...byCountry.entries()].map(([k, list]) => [k, {
      resorts: list,
      trails: buildSorted(list.map((r) => r.trails)),
      lifts: buildSorted(list.map((r) => r.lifts)),
      acres: buildSorted(list.map((r) => r.acres).filter((n) => n > 0))
    }])
  );

  const byStateStats = Object.fromEntries(
    [...byState.entries()].map(([k, list]) => [k, {
      resorts: list,
      trails: buildSorted(list.map((r) => r.trails)),
      lifts: buildSorted(list.map((r) => r.lifts)),
      acres: buildSorted(list.map((r) => r.acres).filter((n) => n > 0))
    }])
  );

  return {
    loadedAt: Date.now(),
    count: all.length,
    all,
    byKey,
    trails: trailsAll,
    lifts: liftsAll,
    acres: acresAll,
    byCountry: byCountryStats,
    byState: byStateStats
  };
}

export function percentileRank(sorted, value) {
  if (!sorted?.length || value <= 0) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return { rank: lo + 1, total: sorted.length, pct: Math.round((lo / sorted.length) * 100) };
}

export function findResortInIndex(index, properties) {
  if (!index) return null;
  const key = resortKey(properties);
  return index.byKey.get(key) || null;
}

export function compareResort(record, index) {
  if (!record || !index) return null;
  const country = index.byCountry[record.countryNorm];
  const state = index.byState[record.stateKey];

  return {
    trails: {
      global: percentileRank(index.trails.sorted, record.trails),
      country: country ? percentileRank(country.trails.sorted, record.trails) : null,
      state: state ? percentileRank(state.trails.sorted, record.trails) : null
    },
    lifts: {
      global: record.lifts > 0 ? percentileRank(index.lifts.sorted, record.lifts) : null,
      country: record.lifts > 0 && country ? percentileRank(country.lifts.sorted, record.lifts) : null,
      state: record.lifts > 0 && state ? percentileRank(state.lifts.sorted, record.lifts) : null
    },
    acres: record.acres > 0 ? {
      global: percentileRank(index.acres.sorted, record.acres),
      country: country?.acres?.sorted?.length ? percentileRank(country.acres.sorted, record.acres) : null,
      state: state?.acres?.sorted?.length ? percentileRank(state.acres.sorted, record.acres) : null
    } : null,
    avgTrailsGlobal: index.trails.avg,
    avgLiftsGlobal: index.lifts.avg,
    avgAcresGlobal: index.acres.avg
  };
}

export function categoryBadgeHtml(category, escapeHtml) {
  const labels = {
    [RESORT_CATEGORY.MEGA_RESORT]: ['#1d4ed8', 'Mega resort'],
    [RESORT_CATEGORY.MULTIPLE_MOUNTAINS]: ['#2d8a3e', 'Large'],
    [RESORT_CATEGORY.SKI_MOUNTAIN]: ['#e6c229', 'Medium'],
    [RESORT_CATEGORY.SMALL_HILL]: ['#c44d34', 'Small hill']
  };
  const [color, label] = labels[category] || ['#64748b', 'Resort'];
  return `<span class="sr-badge" style="background:${color}22;color:${color};border:1px solid ${color}55">${escapeHtml(label)}</span>`;
}

export { CATEGORY_LABELS, TRAILS_MEGA_GE, TRAILS_MEDIUM_LT, TRAILS_SMALL_LT };

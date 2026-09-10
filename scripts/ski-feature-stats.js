/**
 * Global trail/lift length index for percentile comparisons (background load).
 */
import { SKI_PMTILES_SOURCES } from './pmtiles-core.js';
import { loadLiftsLineFeatures, loadPistesLineFeatures } from './geoparquet-browser.js';
import {
  analyzeFeature,
  getAerialway,
  getDifficulty,
  getPisteType
} from './ski-feature-utils.js';

function isDownhillPiste(props) {
  const t = getPisteType(props);
  return t === '' || t === 'downhill' || t === 'freeride' || t === 'yes';
}

const LIFT_EXCLUDE = new Set(['zip_line', 'goods', 'pylon', 'station', 'mast']);

function percentile(sorted, value) {
  if (!sorted.length || value <= 0) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo + 1;
  const pct = Math.round((lo / sorted.length) * 100);
  return { rank, total: sorted.length, percentile: pct, longerThanPct: pct };
}

function buildGroup(items) {
  const points = items.filter((p) => p && p.km > 0.001);
  const sorted = points.map((p) => p.km).sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    sorted,
    points,
    avgKm: sorted.length ? sum / sorted.length : 0,
    maxKm: sorted.length ? sorted[sorted.length - 1] : 0
  };
}

function addToMap(map, key, point) {
  if (!key || !point || point.km <= 0.001) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(point);
}

function addToNestedMap(outer, outerKey, innerKey, point) {
  if (!outerKey || !innerKey || !point || point.km <= 0.001) return;
  if (!outer.has(outerKey)) outer.set(outerKey, new Map());
  addToMap(outer.get(outerKey), innerKey, point);
}

function nestedMapToGroups(outer) {
  const out = {};
  for (const [outerKey, inner] of outer.entries()) {
    out[outerKey] = Object.fromEntries([...inner.entries()].map(([k, v]) => [k, buildGroup(v)]));
  }
  return out;
}

/** Build stats index from raw GeoJSON features (parquet, PMTiles, or map query). */
export function buildStatsIndexFromFeatures(pisteFeats, liftFeats) {
  const pistesAll = [];
  const pistesByDiff = new Map();
  const pistesByResort = new Map();
  const pistesByState = new Map();
  const pistesByCountry = new Map();
  const pistesByStateDiff = new Map();
  const pistesByCountryDiff = new Map();
  const pistesByKey = new Map();

  for (const f of pisteFeats) {
    if (!f.geometry) continue;
    const a = analyzeFeature('piste', f);
    if (!isDownhillPiste(a.props)) continue;
    if (a.lengthKm <= 0.01) continue;
    const diff = getDifficulty(a.props) || 'unknown';
    const pt = { km: a.lengthKm, cat: diff };
    pistesAll.push(pt);
    pistesByKey.set(a.key, a);
    const numericId = String(a.key).replace(/^(?:piste|lift):(?:way:|node:|relation:)?/i, '');
    if (/^\d+$/.test(numericId)) {
      pistesByKey.set(`piste:${numericId}`, a);
      pistesByKey.set(`piste:way:${numericId}`, a);
    }
    addToMap(pistesByDiff, diff, pt);
    const resort = a.resort || 'Unknown resort';
    addToMap(pistesByResort, resort, pt);
    if (a.state) {
      addToMap(pistesByState, a.stateKey, pt);
      addToNestedMap(pistesByStateDiff, a.stateKey, diff, pt);
    }
    if (a.countryNorm) {
      addToMap(pistesByCountry, a.countryNorm, pt);
      addToNestedMap(pistesByCountryDiff, a.countryNorm, diff, pt);
    }
  }

  const liftsAll = [];
  const liftsByType = new Map();
  const liftsByResort = new Map();
  const liftsByState = new Map();
  const liftsByCountry = new Map();
  const liftsByStateType = new Map();
  const liftsByCountryType = new Map();
  const liftsByKey = new Map();

  for (const f of liftFeats) {
    if (!f.geometry) continue;
    const a = analyzeFeature('lift', f);
    const aw = getAerialway(a.props);
    if (LIFT_EXCLUDE.has(aw)) continue;
    if (a.lengthKm <= 0.005) continue;
    const liftType = aw || 'unknown';
    const pt = { km: a.lengthKm, cat: liftType };
    liftsAll.push(pt);
    liftsByKey.set(a.key, a);
    const numericId = String(a.key).replace(/^(?:piste|lift):(?:way:|node:|relation:)?/i, '');
    if (/^\d+$/.test(numericId)) {
      liftsByKey.set(`lift:${numericId}`, a);
      liftsByKey.set(`lift:way:${numericId}`, a);
    }
    addToMap(liftsByType, liftType, pt);
    const resort = a.resort || 'Unknown resort';
    addToMap(liftsByResort, resort, pt);
    if (a.state) {
      addToMap(liftsByState, a.stateKey, pt);
      addToNestedMap(liftsByStateType, a.stateKey, liftType, pt);
    }
    if (a.countryNorm) {
      addToMap(liftsByCountry, a.countryNorm, pt);
      addToNestedMap(liftsByCountryType, a.countryNorm, liftType, pt);
    }
  }

  const mapToGroups = (m) => Object.fromEntries([...m.entries()].map(([k, v]) => [k, buildGroup(v)]));

  return {
    loadedAt: Date.now(),
    pistes: {
      all: buildGroup(pistesAll),
      byDifficulty: mapToGroups(pistesByDiff),
      byResort: mapToGroups(pistesByResort),
      byState: mapToGroups(pistesByState),
      byCountry: mapToGroups(pistesByCountry),
      byStateDifficulty: nestedMapToGroups(pistesByStateDiff),
      byCountryDifficulty: nestedMapToGroups(pistesByCountryDiff)
    },
    lifts: {
      all: buildGroup(liftsAll),
      byType: mapToGroups(liftsByType),
      byResort: mapToGroups(liftsByResort),
      byState: mapToGroups(liftsByState),
      byCountry: mapToGroups(liftsByCountry),
      byStateType: nestedMapToGroups(liftsByStateType),
      byCountryType: nestedMapToGroups(liftsByCountryType)
    },
    pistesByKey,
    liftsByKey
  };
}

/**
 * Stats from tiles already loaded on the visible map (instant resort comparisons).
 * @param {maptilersdk.Map} map
 */
export function buildViewportStatsIndex(map) {
  if (!map?.querySourceFeatures) return null;
  const pisteFeats = [];
  const liftFeats = [];
  const pull = (source, layer) => {
    try {
      return map.querySourceFeatures(source, { sourceLayer: layer }) || [];
    } catch (_) {
      return [];
    }
  };
  for (const source of [SKI_PMTILES_SOURCES.overview, SKI_PMTILES_SOURCES.resort]) {
    if (!map.getSource?.(source)) continue;
    pisteFeats.push(...pull(source, 'pistes'));
    liftFeats.push(...pull(source, 'lifts'));
  }
  if (!pisteFeats.length && !liftFeats.length && typeof map.queryRenderedFeatures === 'function') {
    const layers = ['pistes', 'lifts'].filter((id) => map.getLayer?.(id));
    if (layers.length) {
      try {
        for (const feature of map.queryRenderedFeatures({ layers })) {
          if (feature.layer?.id === 'lifts') liftFeats.push(feature);
          else pisteFeats.push(feature);
        }
      } catch (_) { /* ignore */ }
    }
  }
  if (!pisteFeats.length && !liftFeats.length) return null;
  const index = buildStatsIndexFromFeatures(pisteFeats, liftFeats);
  index.viewportOnly = true;
  return index;
}

export function isGlobalStatsReady(index) {
  if (!index) return false;
  return (index.pistes?.all?.count ?? 0) > 0 || (index.lifts?.all?.count ?? 0) > 0;
}

/**
 * Load worldwide stats from GeoParquet (full dataset — PMTiles tile grid misses sparse tiles).
 * @returns {Promise<object>} stats index
 */
export async function loadSkiFeatureStatsIndex() {
  const [pisteFeats, liftFeats] = await Promise.all([
    loadPistesLineFeatures(),
    loadLiftsLineFeatures()
  ]);
  return buildStatsIndexFromFeatures(pisteFeats, liftFeats);
}

let statsPromise = null;
let statsIndex = null;
let statsLoading = false;

/** Start background load; safe to call multiple times. */
export function ensureSkiFeatureStatsIndex(onReady) {
  if (!statsPromise) {
    statsLoading = true;
    statsPromise = loadSkiFeatureStatsIndex()
      .then((idx) => {
        statsIndex = isGlobalStatsReady(idx) ? idx : null;
        statsLoading = false;
        const trails = idx?.pistes?.all?.count ?? 0;
        const lifts = idx?.lifts?.all?.count ?? 0;
        if (!statsIndex) {
          console.warn('[ski-feature-stats] empty index (0 trails, 0 lifts) — check GeoParquet URLs / CORS');
        } else if (globalThis.__GSA_DEBUG) {
          console.log('[ski-feature-stats] loaded from GeoParquet', { trails, lifts });
        }
        return statsIndex;
      })
      .catch((err) => {
        console.warn('[ski-feature-stats] load failed:', err);
        statsLoading = false;
        statsPromise = null;
        return null;
      });
  }
  if (typeof onReady === 'function') {
    statsPromise.then((idx) => {
      if (idx && isGlobalStatsReady(idx)) onReady(idx);
    });
  }
  return statsPromise;
}

export function getSkiFeatureStatsIndex() {
  return statsIndex;
}

export function isSkiFeatureStatsLoading() {
  return statsLoading;
}

export function comparePiste(lengthKm, meta, index) {
  if (!index || lengthKm <= 0) return null;
  const diff = meta.difficulty || 'unknown';
  const resort = meta.resort || '';
  const global = percentile(index.pistes.all.sorted, lengthKm);
  const byDiff = index.pistes.byDifficulty[diff];
  const diffCmp = byDiff ? percentile(byDiff.sorted, lengthKm) : null;
  const byResort = resort ? index.pistes.byResort[resort] : null;
  const resortCmp = byResort ? percentile(byResort.sorted, lengthKm) : null;
  const byState = meta.state ? index.pistes.byState?.[meta.stateKey] : null;
  const stateCmp = byState ? percentile(byState.sorted, lengthKm) : null;
  const byCountry = meta.countryNorm ? index.pistes.byCountry?.[meta.countryNorm] : null;
  const countryCmp = byCountry ? percentile(byCountry.sorted, lengthKm) : null;
  return {
    global,
    diff: diffCmp,
    resort: resortCmp,
    state: stateCmp,
    country: countryCmp,
    avgGlobalKm: index.pistes.all.avgKm
  };
}

export function compareLift(lengthKm, meta, index) {
  if (!index || lengthKm <= 0) return null;
  const aw = meta.aerialway || 'unknown';
  const resort = meta.resort || '';
  const global = percentile(index.lifts.all.sorted, lengthKm);
  const byType = index.lifts.byType[aw];
  const typeCmp = byType ? percentile(byType.sorted, lengthKm) : null;
  const byResort = resort ? index.lifts.byResort[resort] : null;
  const resortCmp = byResort ? percentile(byResort.sorted, lengthKm) : null;
  const byState = meta.state ? index.lifts.byState?.[meta.stateKey] : null;
  const stateCmp = byState ? percentile(byState.sorted, lengthKm) : null;
  const byCountry = meta.countryNorm ? index.lifts.byCountry?.[meta.countryNorm] : null;
  const countryCmp = byCountry ? percentile(byCountry.sorted, lengthKm) : null;
  return {
    global,
    type: typeCmp,
    resort: resortCmp,
    state: stateCmp,
    country: countryCmp,
    avgGlobalKm: index.lifts.all.avgKm
  };
}

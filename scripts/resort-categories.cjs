/**
 * Node/CJS mirror of scripts/resort-categories.js (atlas-aligned trail thresholds).
 */
const TRAILS_SMALL_LT = 10;
const TRAILS_MEDIUM_LT = 30;
const TRAILS_MEGA_GE = 100;

const RESORT_TYPE_KEYS = ['resort_type', 'Resort Type'];
const NOT_DOWNHILL = 'not a downhill ski resort';

function getProp(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function isNotDownhill(row) {
  const v = getProp(row, RESORT_TYPE_KEYS);
  return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
}

function numField(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function categorizeFromTrailCount(trails) {
  const t = Number(trails);
  if (Number.isNaN(t) || t < 0) return 'unknown';
  if (t >= TRAILS_MEGA_GE) return 'mega_resort';
  if (t >= TRAILS_MEDIUM_LT) return 'multiple_mountains';
  if (t >= TRAILS_SMALL_LT) return 'ski_mountain';
  return 'small_hill';
}

function categorizeResortFromRow(row) {
  if (!row || isNotDownhill(row)) return 'unknown';
  const trails = numField(row.downhill_trails ?? row.number_of_downhill_trails ?? row.trails);
  const lifts = numField(row.total_lifts ?? row.lifts ?? row.number_of_lifts);
  if (trails == null || lifts == null || trails < 0 || lifts < 0) return 'unknown';
  return categorizeFromTrailCount(trails);
}

module.exports = {
  TRAILS_SMALL_LT,
  TRAILS_MEDIUM_LT,
  TRAILS_MEGA_GE,
  categorizeFromTrailCount,
  categorizeResortFromRow
};

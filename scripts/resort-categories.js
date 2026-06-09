/**
 * Resort size categories — aligned with the print atlas page allocation:
 *   Small hill  (< 10 trails)  — ¼ page
 *   Medium      (10–29 trails) — ½ page
 *   Large       (30–99 trails) — 1 page
 *   Mega resort (100+ trails)  — 2-page spread
 */
import {
  getProp,
  RESORT_TYPE_KEYS,
  NOT_DOWNHILL,
  COLOR_BY_KEYS,
  SIZE_BY_KEYS
} from './utils.js';

export const TRAILS_SMALL_LT = 10;
export const TRAILS_MEDIUM_LT = 30;
/** Top tier for 2-page atlas spreads (atlas copy does not specify; 100+ matches prior mega tier). */
export const TRAILS_MEGA_GE = 100;

export const RESORT_CATEGORY = {
  SMALL_HILL: 'small_hill',
  SKI_MOUNTAIN: 'ski_mountain',
  MULTIPLE_MOUNTAINS: 'multiple_mountains',
  MEGA_RESORT: 'mega_resort',
  UNKNOWN: 'unknown'
};

export const CATEGORY_LABELS = {
  small_hill: 'Small hill',
  ski_mountain: 'Medium',
  multiple_mountains: 'Large',
  mega_resort: 'Mega resort',
  unknown: 'Not a downhill ski hill'
};

export const MAP_TIER_LEGEND = {
  small: `Small hill (< ${TRAILS_SMALL_LT} trails)`,
  medium: `Medium (${TRAILS_SMALL_LT}–${TRAILS_MEDIUM_LT - 1} trails)`,
  large: `Large (${TRAILS_MEDIUM_LT}–${TRAILS_MEGA_GE - 1} trails)`,
  mega: `Mega resort (${TRAILS_MEGA_GE}+ trails)`
};

export const BOOK_PAGE_ALLOCATION = {
  small_hill: 0.25,
  ski_mountain: 0.5,
  multiple_mountains: 1,
  mega_resort: 2,
  unknown: 0
};

export function isNotDownhill(props) {
  const v = getProp(props, RESORT_TYPE_KEYS);
  return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
}

export function getTrailCount(props) {
  const v = getProp(props, COLOR_BY_KEYS);
  const n = typeof v === 'number' ? v : Number(v);
  return (!v || Number.isNaN(n)) ? 0 : n;
}

export function getAcres(props) {
  const v = getProp(props, SIZE_BY_KEYS);
  const n = typeof v === 'number' ? v : Number(v);
  return (!v || Number.isNaN(n)) ? 0 : n;
}

/** Wiki / book category slug from downhill trail count. */
export function categorizeFromTrailCount(trails) {
  const t = Number(trails);
  if (Number.isNaN(t) || t < 0) return RESORT_CATEGORY.UNKNOWN;
  if (t >= TRAILS_MEGA_GE) return RESORT_CATEGORY.MEGA_RESORT;
  if (t >= TRAILS_MEDIUM_LT) return RESORT_CATEGORY.MULTIPLE_MOUNTAINS;
  if (t >= TRAILS_SMALL_LT) return RESORT_CATEGORY.SKI_MOUNTAIN;
  return RESORT_CATEGORY.SMALL_HILL;
}

/** Wiki ingest row (parquet fields). Returns unknown if not downhill or missing trails/lifts. */
export function categorizeResortFromRow(row) {
  if (!row || isNotDownhill(row)) return RESORT_CATEGORY.UNKNOWN;
  const trails = numField(row.downhill_trails ?? row.number_of_downhill_trails ?? row.trails);
  const lifts = numField(row.total_lifts ?? row.lifts ?? row.number_of_lifts);
  if (trails == null || lifts == null || trails < 0 || lifts < 0) return RESORT_CATEGORY.UNKNOWN;
  return categorizeFromTrailCount(trails);
}

function numField(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function getMapSizeTier(props) {
  if (isNotDownhill(props)) return 'small';
  const cat = categorizeFromTrailCount(getTrailCount(props));
  const MAP = {
    [RESORT_CATEGORY.SMALL_HILL]: 'small',
    [RESORT_CATEGORY.SKI_MOUNTAIN]: 'medium',
    [RESORT_CATEGORY.MULTIPLE_MOUNTAINS]: 'large',
    [RESORT_CATEGORY.MEGA_RESORT]: 'mega'
  };
  return MAP[cat] || 'small';
}

export const MAP_TIER_COLORS = {
  small: '#c44d34',
  medium: '#e6c229',
  large: '#2d8a3e',
  mega: '#1d4ed8'
};

export function getMapTierColor(tier) {
  if (tier === 'mega') return MAP_TIER_COLORS.mega;
  if (tier === 'large') return MAP_TIER_COLORS.large;
  if (tier === 'medium') return MAP_TIER_COLORS.medium;
  return MAP_TIER_COLORS.small;
}

export function getMapTierColorForProps(props) {
  if (isNotDownhill(props)) return '#999999';
  return getMapTierColor(getMapSizeTier(props));
}

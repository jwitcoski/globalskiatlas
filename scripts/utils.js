/**
 * Shared helpers for ski resort maps (popups, tooltips, property lookup).
 */
export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function getProp(props, keyList) {
  if (!props) return undefined;
  for (const k of keyList) {
    if (Object.prototype.hasOwnProperty.call(props, k)) return props[k];
  }
  return undefined;
}

export const RESORT_TYPE_KEYS = ['resort_type', 'Resort Type'];
export const NOT_DOWNHILL = 'not a downhill ski resort';
export const SIZE_BY_KEYS = ['total_area_acres', 'Total Area Acres', 'area_acres'];
/** Skiable terrain (acres) – prefer skiable-specific then fallback to total area. */
export const SKIABLE_TERRAIN_ACRES_KEYS = ['skiable_terrain_acres', 'total_area_acres', 'Total Area Acres', 'area_acres'];
/** Skiable terrain (hectares). */
export const SKIABLE_TERRAIN_HA_KEYS = ['skiable_terrain_ha', 'total_area_ha', 'area_ha'];
export const COLOR_BY_KEYS = ['downhill_trails', 'number_of_downhill_trails', 'Downhill Trails', 'trails'];
export const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
export const ID_KEYS = ['id', 'ref', 'area_id', 'resort_id', 'skiresort_id'];
export const COUNTRY_KEYS = ['country', 'Country', 'country_name', 'addr:country'];
export const STATE_KEYS = ['state', 'State', 'addr:state', 'province', 'addr:province', 'state_province', 'region'];

/** Fold diacritics for accent-insensitive search (e.g. Š→S, é→e). */
export function foldDiacritics(str) {
  if (str == null || str === '') return '';
  return String(str).normalize('NFD').replace(/\p{M}/gu, '');
}

/** Lowercase, spaces to hyphens, strip non-alphanumeric except hyphen. Matches wiki-ingest pageId. */
export function slug(str) {
  if (str == null || str === '') return '';
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}
export const LIFTS_KEYS = ['total_lifts', 'lifts', 'number_of_lifts'];

const HA_TO_ACRES = 2.471054;

/** Format skiable terrain as "X acres (Y ha)". Returns null if no value. */
export function formatSkiableTerrain(acresVal, haVal) {
  let acres = acresVal != null && acresVal !== '' ? Number(acresVal) : null;
  let ha = haVal != null && haVal !== '' ? Number(haVal) : null;
  if (Number.isNaN(acres)) acres = null;
  if (Number.isNaN(ha)) ha = null;
  if (acres == null && ha == null) return null;
  if (acres == null && ha != null) acres = ha * HA_TO_ACRES;
  if (ha == null && acres != null) ha = acres / HA_TO_ACRES;
  const acresStr = Math.round(acres).toLocaleString();
  const haStr = ha.toFixed(1).replace(/\.0$/, '');
  return acresStr + ' acres (' + haStr + ' ha)';
}

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
export const COLOR_BY_KEYS = ['downhill_trails', 'number_of_downhill_trails', 'Downhill Trails', 'trails'];
export const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
export const ID_KEYS = ['id', 'ref', 'area_id', 'resort_id', 'skiresort_id'];
export const COUNTRY_KEYS = ['country', 'Country', 'country_name', 'addr:country'];
export const LIFTS_KEYS = ['total_lifts', 'lifts', 'number_of_lifts'];

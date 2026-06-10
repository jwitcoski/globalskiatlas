/**
 * Curated MapTiler basemaps for the ski atlas main map.
 */
import { initMapTilerSdk } from './map-core.js';

export const BASEMAP_STORAGE_KEY = 'gsa-basemap';

export const BASEMAP_OPTIONS = [
  { id: 'winter', label: 'Winter' },
  { id: 'winter-dark', label: 'Winter (dark)' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Satellite + labels' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'topo', label: 'Topographic' },
  { id: 'streets', label: 'Streets' },
  { id: 'light', label: 'Light backdrop' }
];

export function getSavedBasemapId() {
  try {
    const saved = localStorage.getItem(BASEMAP_STORAGE_KEY);
    if (saved && BASEMAP_OPTIONS.some((o) => o.id === saved)) return saved;
  } catch (_) { /* private browsing */ }
  return 'winter';
}

/** @param {string} basemapId */
export function getBasemapStyle(basemapId) {
  const M = initMapTilerSdk().MapStyle;
  switch (basemapId) {
    case 'winter-dark':
      return M.WINTER.DARK;
    case 'satellite':
      return M.SATELLITE;
    case 'hybrid':
      return M.HYBRID;
    case 'outdoor':
      return M.OUTDOOR;
    case 'topo':
      return M.TOPO;
    case 'streets':
      return M.STREETS;
    case 'light':
      return M.BACKDROP.LIGHT;
    default:
      return M.WINTER;
  }
}

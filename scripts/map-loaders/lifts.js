/**
 * Lifts loader: load lift lines and return GeoJSON FeatureCollection.
 * Respects maxFeatures cap; supports future viewport API.
 */
import { loadParquetAsRows } from '../parquet-wasm-loader.js';
import { config } from '../map-config.js';

const { LIFTS_PARQUET_URL } = config;
const MAX_FEATURES = config.MAX_FEATURES_PER_LAYER ?? 10000;

const LIFT_LINE_TYPES = new Set([
  'gondola', 'cable_car', 'chair_lift', 'mixed_lift', 'drag_lift',
  't-bar', 'j_bar', 'platter', 'rope_tow', 'magic_carpet', 'zip_line', 'goods', 'canopy'
]);

function isLiftLine(row) {
  const { geometry, properties } = row;
  if (!geometry || (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString')) return false;
  const type = String(properties.aerialway || properties.Aerialway || '').toLowerCase().trim();
  return LIFT_LINE_TYPES.has(type);
}

function toFeature(row) {
  const { geometry, properties } = row;
  const p = properties || {};
  const out = { ...p, _aerialway: String(p.aerialway || p.Aerialway || ''), _name: String(p.name || p.Name || ''), _ski_area: String(p['Ski Area'] || p.ski_area || '') };
  return { type: 'Feature', geometry, properties: out };
}

/**
 * Load lifts as GeoJSON FeatureCollection.
 * @param {{ parquetUrl?: string, viewportApiUrl?: string, bbox?: string, maxFeatures?: number }} options
 * @returns {Promise<{ type: 'FeatureCollection', features: object[], truncated?: boolean }>}
 */
export async function loadLifts(options = {}) {
  const parquetUrl = options.parquetUrl ?? LIFTS_PARQUET_URL;
  const maxFeatures = options.maxFeatures ?? MAX_FEATURES;

  if (options.viewportApiUrl && options.bbox) {
    const url = `${options.viewportApiUrl}?bbox=${encodeURIComponent(options.bbox)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Lifts viewport API failed: ${resp.status}`);
    const data = await resp.json();
    const features = Array.isArray(data.features) ? data.features : (data.type === 'FeatureCollection' ? data.features : []);
    const capped = features.slice(0, maxFeatures);
    return { type: 'FeatureCollection', features: capped, truncated: features.length > maxFeatures };
  }

  if (!parquetUrl) throw new Error('Lifts: no parquetUrl and no config.LIFTS_PARQUET_URL');

  const rows = await loadParquetAsRows(parquetUrl);
  const features = [];
  const chunkSize = 20000;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rows.length);
    for (let j = i; j < end; j++) {
      if (isLiftLine(rows[j])) features.push(toFeature(rows[j]));
      if (features.length >= maxFeatures) break;
    }
    if (features.length >= maxFeatures) break;
    if (end < rows.length) await new Promise(r => setTimeout(r, 0));
  }

  const truncated = features.length >= maxFeatures;
  return { type: 'FeatureCollection', features, truncated };
}

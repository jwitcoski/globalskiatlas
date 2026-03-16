/**
 * Pistes loader: load piste/trail lines and return GeoJSON FeatureCollection.
 * Respects maxFeatures cap; supports future viewport API.
 */
import { loadParquetAsRows } from '../parquet-wasm-loader.js';
import { config } from '../map-config.js';

const { PISTES_PARQUET_URL } = config;
const MAX_FEATURES = config.MAX_FEATURES_PER_LAYER ?? 10000;

const PISTE_DIFF_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];

function getPisteDifficulty(props) {
  for (const k of PISTE_DIFF_KEYS) {
    if (props[k] != null) return String(props[k]).toLowerCase().trim();
  }
  if (typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) return m[1].toLowerCase().trim();
  }
  return '';
}

function pisteDiffColor(d) {
  if (d === 'easy' || d === 'novice') return '#22c55e';
  if (d === 'intermediate' || d === 'medium') return '#2563eb';
  if (d === 'advanced' || d === 'hard') return '#1a1a1a';
  if (d === 'expert' || d === 'freeride' || d === 'extreme') return '#991b1b';
  return '#64748b';
}

function isPisteRow(row) {
  const { geometry, properties } = row;
  if (!geometry) return false;
  const ok = geometry.type === 'LineString' || geometry.type === 'MultiLineString' || geometry.type === 'Polygon';
  return ok && !!(properties.osm_way_id || properties.osm_id);
}

function toFeature(row) {
  const { geometry, properties } = row;
  const p = properties || {};
  const diff = getPisteDifficulty(p);
  const out = { ...p, _difficulty: diff, _color: pisteDiffColor(diff), _name: String(p.name || p.Name || ''), _ski_area: String(p['Ski Area'] || p.ski_area || '') };
  return { type: 'Feature', geometry, properties: out };
}

/**
 * Load pistes as GeoJSON FeatureCollection.
 * @param {{ parquetUrl?: string, viewportApiUrl?: string, bbox?: string, maxFeatures?: number }} options
 * @returns {Promise<{ type: 'FeatureCollection', features: object[], truncated?: boolean }>}
 */
export async function loadPistes(options = {}) {
  const parquetUrl = options.parquetUrl ?? PISTES_PARQUET_URL;
  const maxFeatures = options.maxFeatures ?? MAX_FEATURES;

  if (options.viewportApiUrl && options.bbox) {
    const url = `${options.viewportApiUrl}?bbox=${encodeURIComponent(options.bbox)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Pistes viewport API failed: ${resp.status}`);
    const data = await resp.json();
    const features = Array.isArray(data.features) ? data.features : (data.type === 'FeatureCollection' ? data.features : []);
    const capped = features.slice(0, maxFeatures);
    return { type: 'FeatureCollection', features: capped, truncated: features.length > maxFeatures };
  }

  if (!parquetUrl) throw new Error('Pistes: no parquetUrl and no config.PISTES_PARQUET_URL');

  const rows = await loadParquetAsRows(parquetUrl);
  const features = [];
  const chunkSize = 20000;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rows.length);
    for (let j = i; j < end; j++) {
      if (isPisteRow(rows[j])) features.push(toFeature(rows[j]));
      if (features.length >= maxFeatures) break;
    }
    if (features.length >= maxFeatures) break;
    if (end < rows.length) await new Promise(r => setTimeout(r, 0));
  }

  const truncated = features.length >= maxFeatures;
  return { type: 'FeatureCollection', features, truncated };
}

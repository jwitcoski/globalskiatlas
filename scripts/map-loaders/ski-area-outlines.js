/**
 * Ski area outlines loader: load resort boundary polygons from ski_areas.parquet.
 * Returns GeoJSON FeatureCollection for fill/line layers.
 */
import { loadParquetAsRows } from '../parquet-wasm-loader.js';
import { config } from '../map-config.js';
import { getProp } from '../utils.js';

const { SKI_AREAS_OUTLINES_PARQUET_URL } = config;
const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
const ID_KEYS = ['id', 'ref', 'area_id', 'resort_id', 'skiresort_id'];
const COUNTRY_KEYS = ['country', 'Country', 'country_name', 'addr:country'];

function normalizeProperties(props) {
  const _name = String(getProp(props, NAME_KEYS) ?? '').trim();
  const _id = getProp(props, ID_KEYS) != null ? String(getProp(props, ID_KEYS)) : '';
  const _country = String(getProp(props, COUNTRY_KEYS) ?? '').trim();
  return { ...props, _name, _id, _country, name: _name || props.name, id: _id || props.id, ref: _id || props.ref };
}

/**
 * Load ski area outlines (polygons).
 * @param {{ parquetUrl?: string, viewportApiUrl?: string, bbox?: string, maxFeatures?: number }} options
 * @returns {Promise<{ type: 'FeatureCollection', features: object[] }>}
 */
export async function loadSkiAreaOutlines(options = {}) {
  const parquetUrl = options.parquetUrl ?? SKI_AREAS_OUTLINES_PARQUET_URL;
  const maxFeatures = options.maxFeatures ?? config.MAX_FEATURES_PER_LAYER ?? 10000;

  if (!parquetUrl) {
    throw new Error('Ski area outlines: no parquetUrl and no config.SKI_AREAS_OUTLINES_PARQUET_URL');
  }

  const rows = await loadParquetAsRows(parquetUrl);
  const features = [];

  for (const { geometry, properties } of rows) {
    if (!geometry) continue;
    const type = geometry.type;
    if (type !== 'Polygon' && type !== 'MultiPolygon') continue;

    features.push({
      type: 'Feature',
      geometry,
      properties: normalizeProperties(properties || {})
    });

    if (features.length >= maxFeatures) break;
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Ski areas loader: load ski area points (ski_areas_analyzed.parquet) and return
 * normalized rows for use by map scripts. Single source for ski area point data.
 */
import { loadParquetAsRows } from '../parquet-wasm-loader.js';
import { config } from '../map-config.js';

const { SKI_AREAS_PARQUET_URL } = config;

/**
 * Load ski area points.
 * @param {{ parquetUrl?: string, viewportApiUrl?: string }} options
 *   - parquetUrl: override; defaults to config.SKI_AREAS_PARQUET_URL
 *   - viewportApiUrl: reserved for future viewport/bbox API
 * @returns {Promise<{ rows: Array<{ geometry: object, properties: object }> }>}
 */
export async function loadSkiAreas(options = {}) {
  const parquetUrl = options.parquetUrl ?? SKI_AREAS_PARQUET_URL;
  if (!parquetUrl) {
    throw new Error('Ski areas: no parquetUrl and no config.SKI_AREAS_PARQUET_URL');
  }
  const rows = await loadParquetAsRows(parquetUrl);
  return { rows };
}

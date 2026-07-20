/**
 * Map-core: shared MapTiler SDK map creation for ski atlas maps.
 * Single place for map bootstrap, style, and controls.
 * Dependencies: map-config.js; page must load maptiler-sdk UMD before modules run.
 */
import { config } from './map-config.js';
import { initPmtilesProtocol } from './pmtiles-core.js';

/** @returns {typeof maptilersdk} */
export function initMapTilerSdk() {
  if (typeof maptilersdk === 'undefined') {
    throw new Error('MapTiler SDK not loaded — include maptiler-sdk.umd.min.js before map modules.');
  }
  maptilersdk.config.apiKey = config.MAPTILER_KEY;
  return maptilersdk;
}

/**
 * Create a map with common options and controls.
 * @param {Object} options
 * @param {string} options.containerId - ID of the DOM element (e.g. 'map')
 * @param {string|Object} [options.style] - MapStyle enum, style URL, or inline style object
 * @param {[number, number]} [options.center] - Initial center [lng, lat]
 * @param {number} [options.zoom] - Initial zoom
 * @param {number} [options.minZoom] - Minimum zoom
 * @param {number} [options.maxZoom] - Maximum zoom
 * @param {boolean} [options.noControl] - If true, do not add NavigationControl
 * @returns {Promise<{ map: maptilersdk.Map }>}
 */
export async function createMapLibre(options = {}) {
  const sdk = initMapTilerSdk();
  await initPmtilesProtocol(sdk);
  const {
    containerId = 'map',
    style: styleOption,
    center = [0, 30],
    zoom = 2.5,
    minZoom = 2,
    maxZoom = 18,
    noControl = false
  } = options;

  const style = styleOption ?? sdk.MapStyle.WINTER;

  const map = new sdk.Map({
    container: containerId,
    style,
    center,
    zoom,
    minZoom,
    maxZoom,
    navigationControl: !noControl
  });

  await new Promise(resolve => map.once('load', resolve));

  return { map };
}

/** Minimal raster basemap style for small embedded maps. */
export function buildRasterBasemapStyle() {
  const sdk = initMapTilerSdk();
  return {
    version: 8,
    sources: {
      raster: {
        type: 'raster',
        tiles: [`https://api.maptiler.com/maps/winter-v4/256/{z}/{x}/{y}.png?key=${config.MAPTILER_KEY}`],
        tileSize: 256
      }
    },
    layers: [{ id: 'raster', type: 'raster', source: 'raster', minzoom: 0, maxzoom: 22 }]
  };
}

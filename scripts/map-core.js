/**
 * Map-core: shared MapLibre map creation for ski atlas maps.
 * Single place for map bootstrap, style URL, and controls.
 * Dependencies: map-config.js; assumes maplibregl is loaded by the page.
 */
import { config } from './map-config.js';

const { MAP_STYLE_URL } = config;

/**
 * Create a MapLibre map with common options and controls.
 * @param {Object} options
 * @param {string} options.containerId - ID of the DOM element (e.g. 'map')
 * @param {string} [options.styleUrl] - Map style URL; defaults to config.MAP_STYLE_URL (ignored if options.style is set)
 * @param {Object} [options.style] - Inline style object (e.g. for minimal raster maps); takes precedence over styleUrl
 * @param {[number, number]} [options.center] - Initial center [lng, lat]
 * @param {number} [options.zoom] - Initial zoom
 * @param {number} [options.minZoom] - Minimum zoom
 * @param {number} [options.maxZoom] - Maximum zoom
 * @param {boolean} [options.noControl] - If true, do not add NavigationControl
 * @returns {Promise<{ map: maplibregl.Map }>}
 */
export async function createMapLibre(options = {}) {
  const {
    containerId = 'map',
    styleUrl = MAP_STYLE_URL,
    style: styleObject,
    center = [0, 30],
    zoom = 2.5,
    minZoom = 2,
    maxZoom = 18,
    noControl = false
  } = options;

  const map = new maplibregl.Map({
    container: containerId,
    style: styleObject || styleUrl,
    center,
    zoom,
    minZoom,
    maxZoom
  });

  if (!noControl) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  await new Promise(resolve => map.once('load', resolve));

  return { map };
}

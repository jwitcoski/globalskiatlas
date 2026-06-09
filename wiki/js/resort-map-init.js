/**
 * Wiki resort live map — MapTiler SDK + PMTiles.
 * Call window.initResortMap(lat, lon, pageId, zoom) from script.js.
 */
import { createMapLibre } from '../../scripts/map-core.js';
import { addSkiPmtilesToMap, SKI_PMTILES_LAYERS } from '../../scripts/pmtiles-core.js';

export async function initResortMap(lat, lon, pageId, zoom) {
  var aside = document.getElementById('resort-map-aside');
  var container = document.getElementById('resort-map-gl');
  if (!aside || !container) return;
  aside.style.display = '';

  if (pageId) {
    window._resortStaticMapPageId = pageId;
    if (typeof setResortStaticMaps === 'function') setResortStaticMaps(pageId);
  }

  var useZoom = zoom != null && !isNaN(Number(zoom)) ? Number(zoom) : 11;

  if (lat == null || lon == null || typeof maptilersdk === 'undefined') {
    var tabLive = document.getElementById('tab-live');
    if (tabLive) tabLive.style.display = 'none';
    if (typeof switchMapTab === 'function') switchMapTab('static');
    return;
  }

  if (window.RESORT_MAP_INSTANCE) {
    window.RESORT_MAP_INSTANCE.remove();
    window.RESORT_MAP_INSTANCE = null;
    container.innerHTML = '';
  }

  const { map: m } = await createMapLibre({
    containerId: 'resort-map-gl',
    center: [lon, lat],
    zoom: useZoom,
    noControl: true
  });

  await addSkiPmtilesToMap(m, {
    liftsColor: '#f87171',
    pistesWidth: 3
  });

  window.RESORT_MAP_INSTANCE = m;

  if (useZoom >= 10) {
    new maptilersdk.Marker({ color: '#1a365d' }).setLngLat([lon, lat]).addTo(m);
  }

  m.flyTo({ center: [lon, lat], zoom: Math.max(useZoom, 13), duration: 800 });
}

window.initResortMap = function (lat, lon, pageId, zoom) {
  initResortMap(lat, lon, pageId, zoom).catch(function (err) {
    console.warn('[resort-map-init]', err);
  });
};

export { SKI_PMTILES_LAYERS };

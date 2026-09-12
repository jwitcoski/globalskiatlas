/**
 * Wiki resort live map — MapTiler SDK + PMTiles.
 * Call window.initResortMap(lat, lon, pageId, zoom, extras) from script.js.
 */
import { createMapLibre } from '../../scripts/map-core.js';
import { addSkiPmtilesToMap, SKI_PMTILES_LAYERS } from '../../scripts/pmtiles-core.js';
import { initSkiResortMap } from '../../scripts/ski-resort-map-ml.js?v=28';

function waitForMaptilerSdk(ms = 4000) {
  if (typeof maptilersdk !== 'undefined') return Promise.resolve(true);
  return new Promise((resolve) => {
    const started = Date.now();
    const t = setInterval(() => {
      if (typeof maptilersdk !== 'undefined') {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - started > ms) {
        clearInterval(t);
        resolve(false);
      }
    }, 50);
  });
}

function setRegionMapChrome(aside, isRegion) {
  if (!aside) return;
  aside.classList.toggle('resort-map-aside--region', !!isRegion);
}

export async function initResortMap(lat, lon, pageId, zoom, extras) {
  var aside = document.getElementById('resort-map-aside');
  var container = document.getElementById('resort-map-gl');
  if (!aside || !container) return;
  aside.style.display = '';

  if (pageId) {
    window._resortStaticMapPageId = pageId;
    if (typeof setResortStaticMaps === 'function') setResortStaticMaps(pageId);
  }

  var region = extras && extras.region ? extras.region : null;
  var useZoom = zoom != null && !isNaN(Number(zoom)) ? Number(zoom) : (region ? 3 : 11);

  const sdkReady = await waitForMaptilerSdk();
  if (lat == null || lon == null || !sdkReady) {
    var tabLive = document.getElementById('tab-live');
    if (tabLive) tabLive.style.display = 'none';
    if (typeof switchMapTab === 'function') switchMapTab('clay');
    return;
  }

  if (window.RESORT_MAP_INSTANCE) {
    window.RESORT_MAP_INSTANCE.remove();
    window.RESORT_MAP_INSTANCE = null;
    container.innerHTML = '';
  }

  if (region) {
    setRegionMapChrome(aside, true);
    window._gsaRegionMap = true;
    window._gsaEnhanceParams = null;
    const { map } = await initSkiResortMap({
      containerId: 'resort-map-gl',
      includeRoadTripButton: false,
      loadAds: false,
      noControl: false,
      skipOlympics: true,
      region,
      center: [lon, lat],
      zoom: 3,
      legendEl: document.getElementById('resort-map-legend'),
    });
    window.RESORT_MAP_INSTANCE = map;
    const refitAdmin = () => {
      try { map.resize(); } catch (_) { /* ignore */ }
      if (typeof map._gsaFitAdmin === 'function') map._gsaFitAdmin();
    };
    requestAnimationFrame(() => {
      refitAdmin();
      requestAnimationFrame(refitAdmin);
    });
    return;
  }

  setRegionMapChrome(aside, false);
  window._gsaRegionMap = false;

  const { map: m } = await createMapLibre({
    containerId: 'resort-map-gl',
    center: [lon, lat],
    zoom: useZoom,
    noControl: true
  });

  await addSkiPmtilesToMap(m, {
    pistesWidth: 3
  });

  window.RESORT_MAP_INSTANCE = m;

  if (useZoom >= 10) {
    new maptilersdk.Marker({ color: '#1a365d' }).setLngLat([lon, lat]).addTo(m);
  }

  m.flyTo({ center: [lon, lat], zoom: Math.max(useZoom, 13), duration: 800 });

  if (window._gsaEnhanceParams && typeof window.enhanceResortMap === 'function') {
    window.enhanceResortMap(window._gsaEnhanceParams);
  }
}

window.initResortMap = function (lat, lon, pageId, zoom, extras) {
  initResortMap(lat, lon, pageId, zoom, extras).catch(function (err) {
    console.warn('[resort-map-init]', err);
  });
};

export { SKI_PMTILES_LAYERS };

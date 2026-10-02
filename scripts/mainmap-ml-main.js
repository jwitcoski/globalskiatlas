/**
 * Interactive ski atlas map – MapLibre GL JS entry point.
 * Used by mainmap.html (resort search, popups, trails/lifts; no road trip planner).
 */
import { initSkiResortMap } from "./ski-resort-map-ml.js?v=34";
import { initBasemapSwitcher } from './basemap-switcher.js?v=1';

(async function main() {
  try {
    const params = new URLSearchParams(location.search);
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    const z = Number(params.get('z'));
    const focus = Number.isFinite(lat) && Number.isFinite(lng);
    const { map, restoreOverlays } = await initSkiResortMap({
      includeRoadTripButton: false,
      ...(focus ? { center: [lng, lat], zoom: Number.isFinite(z) ? z : 16 } : {})
    });
    if (focus) {
      const view = { center: [lng, lat], zoom: Number.isFinite(z) ? z : 16 };
      map.jumpTo(view);
      // The winter style applies its own world camera after load. Snap back once.
      map.once('moveend', () => map.jumpTo(view));
    }
    initBasemapSwitcher(map, { restoreOverlays });
  } catch (err) {
    console.warn('[mainmap-ml-main] failed to initialise:', err);
  }
})();

/**
 * Interactive ski atlas map – MapLibre GL JS entry point.
 * Used by mainmap.html (resort search, popups, trails/lifts; no road trip planner).
 */
import { initSkiResortMap } from './ski-resort-map-ml.js?v=19';
import { initBasemapSwitcher } from './basemap-switcher.js?v=1';

(async function main() {
  try {
    const { map, restoreOverlays } = await initSkiResortMap({ includeRoadTripButton: false });
    initBasemapSwitcher(map, { restoreOverlays });
  } catch (err) {
    console.warn('[mainmap-ml-main] failed to initialise:', err);
  }
})();

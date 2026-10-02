/**
 * Road Trip Ski Map – MapLibre GL JS entry point.
 * Used by TripPlannerMap.html and TravelMap.html.
 */
import { initSkiResortMap }    from './ski-resort-map-ml.js?v=36';
import { initRoadTripPlanner } from './road-trip-planner-ml.js?v=8';
import { initBasemapSwitcher } from './basemap-switcher.js?v=1';

(async function main() {
  try {
    const { map, searchResorts, escapeHtml, restoreOverlays: restoreSkiOverlays, highlightTripResorts } =
      await initSkiResortMap({ includeRoadTripButton: true, tripAddOnly: true });

    let restoreRoadTripOverlays = null;
    try {
      const rtp = initRoadTripPlanner({ map, searchResorts, escapeHtml, highlightTripResorts });
      restoreRoadTripOverlays = rtp?.restoreOverlays ?? null;
    } catch (rtpErr) {
      console.warn('[roadtripskimap-ml-main] road trip planner failed:', rtpErr);
    }

    initBasemapSwitcher(map, {
      restoreOverlays: async () => {
        await restoreSkiOverlays();
        if (restoreRoadTripOverlays) restoreRoadTripOverlays();
      }
    });
  } catch (err) {
    console.warn('[roadtripskimap-ml-main] failed to initialise:', err);
  }
})();

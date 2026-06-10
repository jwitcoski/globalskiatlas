/**
 * Road Trip Ski Map – MapLibre GL JS entry point.
 * Used by TravelMap.html.
 */
import { initSkiResortMap }    from './ski-resort-map-ml.js?v=7';
import { initRoadTripPlanner } from './road-trip-planner-ml.js?v=2';

(async function main() {
  try {
    const { map, searchResorts, escapeHtml } = await initSkiResortMap({ includeRoadTripButton: true });
    try {
      initRoadTripPlanner({ map, searchResorts, escapeHtml });
    } catch (rtpErr) {
      console.warn('[roadtripskimap-ml-main] road trip planner failed:', rtpErr);
    }
  } catch (err) {
    console.warn('[roadtripskimap-ml-main] failed to initialise:', err);
  }
})();

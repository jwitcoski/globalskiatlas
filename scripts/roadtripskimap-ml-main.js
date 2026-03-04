/**
 * Road Trip Ski Map – MapLibre GL JS entry point.
 * Used by TravelMap.html.
 */
import { initSkiResortMap }    from './ski-resort-map-ml.js';
import { initRoadTripPlanner } from './road-trip-planner-ml.js';

(async function main() {
  try {
    const { map, searchResorts, escapeHtml } = await initSkiResortMap({ includeRoadTripButton: true });
    initRoadTripPlanner({ map, searchResorts, escapeHtml });
  } catch (err) {
    console.warn('[roadtripskimap-ml-main] failed to initialise:', err);
  }
})();

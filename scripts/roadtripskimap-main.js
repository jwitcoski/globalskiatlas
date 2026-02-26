/**
 * Road Trip Ski Map – entry point.
 * Loads ski resort map with Road Trip button in popups, then initializes the road trip planner.
 */
import { initSkiResortMap } from './ski-resort-map.js';
import { initRoadTripPlanner } from './road-trip-planner.js';

(async function main() {
  try {
    const { map, searchResorts, escapeHtml } = await initSkiResortMap({ includeRoadTripButton: true });
    initRoadTripPlanner({ map, searchResorts, escapeHtml });
  } catch (err) {
    console.warn('Ski areas / road trip failed to load:', err);
  }
})();

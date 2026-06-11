/**
 * Homepage hero map – waits for layout, then resizes after GSAP reveal.
 */
import { initSkiResortMap } from './ski-resort-map-ml.js?v=19';
import { initBasemapSwitcher } from './basemap-switcher.js?v=1';

function whenLayoutReady() {
  return new Promise((resolve) => {
    const hero = document.querySelector('.hero-map-embed');
    if (!hero) {
      resolve();
      return;
    }
    const check = () => {
      if (hero.getBoundingClientRect().height > 0) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

(async function main() {
  try {
    await whenLayoutReady();
    const { map, restoreOverlays } = await initSkiResortMap({ includeRoadTripButton: false });
    initBasemapSwitcher(map, { restoreOverlays });

    const resize = () => map.resize();
    window.addEventListener('load', () => {
      resize();
      setTimeout(resize, 500);
    });
    window.addEventListener('resize', resize);
  } catch (err) {
    console.warn('[index-hero-map] failed to initialise:', err);
  }
})();

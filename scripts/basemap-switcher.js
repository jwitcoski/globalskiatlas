/**
 * Basemap picker — swaps MapTiler style and re-applies ski overlays.
 */
import { BASEMAP_OPTIONS, getBasemapStyle, getSavedBasemapId, BASEMAP_STORAGE_KEY } from './basemap-options.js';

/**
 * @param {maptilersdk.Map} map
 * @param {{ restoreOverlays?: () => Promise<void>|void, containerId?: string }} [options]
 */
export function initBasemapSwitcher(map, options = {}) {
  const container = document.getElementById(options.containerId || 'basemapControl');
  if (!container || !map) return;

  let currentId = getSavedBasemapId();
  let switching = false;

  const label = document.createElement('label');
  label.htmlFor = 'basemapSelect';
  label.textContent = 'Basemap';

  const select = document.createElement('select');
  select.id = 'basemapSelect';
  select.setAttribute('aria-label', 'Choose basemap');

  for (const opt of BASEMAP_OPTIONS) {
    const el = document.createElement('option');
    el.value = opt.id;
    el.textContent = opt.label;
    if (opt.id === currentId) el.selected = true;
    select.appendChild(el);
  }

  container.replaceChildren(label, select);

  select.addEventListener('change', async () => {
    const nextId = select.value;
    if (nextId === currentId || switching) {
      select.value = currentId;
      return;
    }

    switching = true;
    select.disabled = true;
    try {
      map.setStyle(getBasemapStyle(nextId));
      await new Promise((resolve, reject) => {
        const onLoad = () => { cleanup(); resolve(); };
        const onError = (e) => { cleanup(); reject(e?.error || e); };
        const cleanup = () => {
          map.off('style.load', onLoad);
          map.off('error', onError);
        };
        map.once('style.load', onLoad);
        map.once('error', onError);
      });
      try {
        localStorage.setItem(BASEMAP_STORAGE_KEY, nextId);
      } catch (_) { /* ignore */ }
      currentId = nextId;
      if (options.restoreOverlays) await options.restoreOverlays();
    } catch (err) {
      console.warn('[basemap-switcher] style change failed:', err);
      select.value = currentId;
    } finally {
      select.disabled = false;
      switching = false;
    }
  });
}

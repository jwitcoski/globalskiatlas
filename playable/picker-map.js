import { initSkiResortMap } from "../scripts/ski-resort-map-ml.js?v=25";
import { initBasemapSwitcher } from "../scripts/basemap-switcher.js?v=1";
import { detachBoundaryOverlay } from "../scripts/pmtiles-core.js?v=bound2";

let pickerMap = null;
let onResize = null;

function waitForSdk() {
  if (typeof maptilersdk !== "undefined") return Promise.resolve(maptilersdk);
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      if (typeof maptilersdk !== "undefined") {
        clearInterval(id);
        resolve(maptilersdk);
      } else if (Date.now() - t0 > 8000) {
        clearInterval(id);
        reject(new Error("MapTiler SDK failed to load"));
      }
    }, 40);
  });
}

export function destroyPickerMap() {
  if (onResize) {
    removeEventListener("resize", onResize);
    onResize = null;
  }
  const map = pickerMap;
  pickerMap = null;
  const tip = document.getElementById("vt-tooltip");
  if (tip) tip.remove();
  if (!map) return;

  /* Mark destroyed + cancel pmtiles sync BEFORE any DOM/GL teardown. */
  try {
    detachBoundaryOverlay(map);
  } catch {
    /* already gone */
  }
  try {
    map.stop?.();
  } catch {
    /* already gone */
  }
  try {
    /* Remove listeners that schedule boundary sync / resize work. */
    map._listeners = {};
    map._oneTimeListeners = {};
  } catch {
    /* private fields differ by MapLibre version */
  }
  /*
   * Avoid WEBGL_lose_context (MapLibre logs "Unexpected loss of WebGL context").
   * Avoid map.remove() (MapTiler setStyle("") warning). Just empty the container.
   */
  try {
    map.getContainer?.()?.replaceChildren();
  } catch {
    /* container already gone */
  }
}

export async function showPickerMap(container, resorts, onPick) {
  destroyPickerMap();
  if (!container) throw new Error("Picker map container missing");
  await waitForSdk();

  const { map, restoreOverlays } = await initSkiResortMap({
    containerId: container.id || "picker-map",
    includeRoadTripButton: false,
    loadAds: false,
    playableResorts: resorts,
    playableDotsOnly: true,
    onPlayablePick: onPick,
  });
  pickerMap = map;
  initBasemapSwitcher(map, { restoreOverlays });
  const compact = matchMedia("(pointer: coarse)").matches || innerWidth < 720 || innerHeight < 520;
  const legendFold = document.getElementById("legendFold");
  const basemapFold = document.getElementById("basemapFold");
  if (legendFold) legendFold.open = !compact;
  if (basemapFold) basemapFold.open = !compact;
  const onFold = () => {
    if (pickerMap && !pickerMap.__destroyed) pickerMap.resize();
  };
  legendFold?.addEventListener("toggle", onFold);
  basemapFold?.addEventListener("toggle", onFold);
  map.on?.("click", () => {
    if (compact) {
      if (legendFold?.open) legendFold.open = false;
      if (basemapFold?.open) basemapFold.open = false;
    }
  });
  onResize = () => {
    if (pickerMap && !pickerMap.__destroyed) pickerMap.resize();
  };
  addEventListener("resize", onResize);
  requestAnimationFrame(() => {
    if (pickerMap && !pickerMap.__destroyed) {
      pickerMap.resize();
      requestAnimationFrame(() => {
        if (pickerMap && !pickerMap.__destroyed) pickerMap.resize();
      });
    }
  });
  return map;
}

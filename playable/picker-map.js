import { initSkiResortMap } from "../scripts/ski-resort-map-ml.js?v=22";
import { initBasemapSwitcher } from "../scripts/basemap-switcher.js?v=1";

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
  /* MapTiler Map.remove() calls setStyle("") and warns. Drop the GL context instead. */
  try {
    map.stop?.();
  } catch {
    /* already gone */
  }
  try {
    const canvas = map.getCanvas?.();
    const gl = canvas?.getContext?.("webgl2") || canvas?.getContext?.("webgl");
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch {
    /* no GL */
  }
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
  const onFold = () => pickerMap?.resize();
  legendFold?.addEventListener("toggle", onFold);
  basemapFold?.addEventListener("toggle", onFold);
  map.on?.("click", () => {
    if (compact) {
      if (legendFold?.open) legendFold.open = false;
      if (basemapFold?.open) basemapFold.open = false;
    }
  });
  onResize = () => pickerMap?.resize();
  addEventListener("resize", onResize);
  requestAnimationFrame(() => {
    map.resize();
    requestAnimationFrame(() => map.resize());
  });
  return map;
}

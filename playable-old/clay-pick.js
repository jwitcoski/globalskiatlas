/** Full-screen clay resort while the ski terrain loads. */

import { initHeroMontageMap } from "../scripts/hero-montage-map.js";

let live = null;

export async function showClayPicker(stage, resortId, onTrailPick) {
  hideClayPicker();
  if (!stage || !resortId) return;
  live = await initHeroMontageMap(stage, {
    resortId,
    lockResort: true,
    skipNearest: true,
    onTrailPick,
  });
}

export function hideClayPicker() {
  live?.dispose?.();
  live = null;
}

/** Scenic lobby fly-by helpers — auto mode is a centered OrbitControls tour. */

export function createFlyby() {
  return {
    active: false,
    auto: false,
    zoomT: 0,
    zoomFar: true,
  };
}

/** Lock framing on the mountain center before a drone tour. */
export function prepFlybyTour(camera, orbit, map, island, frameOverview) {
  if (!camera || !orbit || !map?.bounds) return false;
  frameOverview?.(camera, orbit, map, island);
  orbit.enableRotate = false;
  orbit.enablePan = false;
  orbit.enableZoom = false;
  orbit.autoRotate = true;
  // Same ballpark as trailer aerial — slow, readable.
  orbit.autoRotateSpeed = 0.42;
  orbit.enabled = true;
  return true;
}

export function clearFlybyTour(orbit) {
  if (!orbit) return;
  orbit.autoRotate = false;
  orbit.autoRotateSpeed = 2;
  orbit.enableRotate = true;
  orbit.enablePan = true;
  orbit.enableZoom = false;
}

/**
 * Gentle zoom pulse while auto-rotating. Stays in a scenic mid/far band —
 * never nose-dives onto a single piste.
 */
export function tickFlybyZoom(state, camera, orbit, dt, setZoomTo) {
  if (!state?.auto || !camera || !orbit || !setZoomTo) return;
  state.zoomT += dt;
  if (state.zoomT < 11) return;
  state.zoomT = 0;
  const dist = camera.position.distanceTo(orbit.target) || 1;
  const lo = orbit.minDistance || dist * 0.4;
  const hi = orbit.maxDistance || dist * 2.5;
  const near = lo + (hi - lo) * 0.34;
  const far = lo + (hi - lo) * 0.72;
  state.zoomFar = !state.zoomFar;
  setZoomTo(state.zoomFar ? far : near);
}

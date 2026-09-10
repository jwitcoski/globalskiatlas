/** Camera orbit, zoom, pointer input, and responsive framing for clay scenes. */

import * as THREE from "three";

export function createOrbitController({ camera, canvas, container, renderer, getBounds, reduceMotion = false }) {
  let az = 0.55;
  let polar = 0.78;
  let zoom = 1;
  let dragging = false;
  let lastPointer = null;
  let resumeSpinAt = 0;
  const idleResumeMs = 5000;
  const spinSpeed = 0.12;
  const polarMin = 0.18;
  const polarMax = 1.35;
  const zoomMin = 0.45;
  const zoomMax = 2.6;

  function markInteracted() {
    resumeSpinAt = performance.now() + idleResumeMs;
  }

  function syncFromBounds() {
    const { radius } = getBounds();
    az = 0.55;
    polar = 0.78;
    const aspect = Math.max(0.5, camera.aspect || 1);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * aspect);
    const fitFov = Math.min(vFov, hFov);
    const needDist = (Math.max(1, radius) * 1.18) / Math.sin(fitFov * 0.5);
    const baseDist = Math.max(1, radius * 1.72);
    zoom = THREE.MathUtils.clamp(needDist / baseDist, zoomMin, zoomMax);
  }

  function reset() {
    syncFromBounds();
    resumeSpinAt = performance.now() + idleResumeMs;
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    canvas.style.cursor = "grabbing";
    markInteracted();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || !lastPointer) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    az -= dx * 0.005;
    polar = THREE.MathUtils.clamp(polar + dy * 0.004, polarMin, polarMax);
    markInteracted();
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    lastPointer = null;
    canvas.style.cursor = "grab";
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    markInteracted();
  }

  function onWheel(e) {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * Math.exp(e.deltaY * 0.00115), zoomMin, zoomMax);
    markInteracted();
  }

  function onDoubleClick(e) {
    e.preventDefault();
    reset();
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function advance(dt, now) {
    const autoSpin = !reduceMotion && !dragging && now >= resumeSpinAt;
    if (autoSpin) az += dt * spinSpeed;
    return autoSpin;
  }

  function frame(t = 0) {
    const { center, radius } = getBounds();
    const dist = Math.max(1, radius * 1.72 * zoom);
    const autoSpin = !reduceMotion && !dragging && performance.now() >= resumeSpinAt;
    const bob = autoSpin ? Math.sin(t * 0.35) * radius * 0.012 * zoom : 0;
    const horiz = Math.cos(polar) * dist;
    camera.position.set(
      center.x + Math.cos(az) * horiz,
      center.y + Math.sin(polar) * dist + bob,
      center.z + Math.sin(az) * horiz,
    );
    camera.lookAt(center.x, center.y, center.z);
  }

  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.setAttribute("aria-label", "Drag to orbit the 3D map; scroll to zoom");
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  syncFromBounds();

  return {
    resize,
    syncFromBounds,
    reset,
    advance,
    frame,
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
    },
  };
}

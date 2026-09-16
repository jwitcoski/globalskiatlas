/** Pointer picking and selection highlighting for clay trail/lift entities. */

import * as THREE from "three";

const TAP_PX = 10;

function findEntityObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.entity) return current;
    current = current.parent;
  }
  return null;
}

function setHighlight(object, mode) {
  if (!object?.userData?.entity) return;
  object.userData.selected = mode === "select";
  if (typeof object.userData.setPickHighlight === "function") {
    object.userData.setPickHighlight(Boolean(mode));
    return;
  }
  const on = Boolean(mode);
  const select = mode === "select";
  object.traverse((child) => {
    if (!child.isMesh || !child.material || Array.isArray(child.material)) return;
    if (on) {
      if (!child.userData._pickOrigMat) {
        child.userData._pickOrigMat = child.material;
        child.material = child.material.clone();
      }
      const m = child.material;
      m.transparent = true;
      m.depthWrite = false;
      m.depthTest = false;
      m.opacity = select ? 0.95 : 0.45;
      if (m.color) m.color.setHex(select ? 0xfff1a8 : 0xffffff);
      if ("emissive" in m) {
        m.emissive.setHex(select ? 0xffc107 : 0xe2e8f0);
        m.emissiveIntensity = select ? 1.15 : 0.4;
      }
      child.renderOrder = select ? 32 : 22;
      return;
    }
    if (!child.userData._pickOrigMat) return;
    if (child.material !== child.userData._pickOrigMat) child.material.dispose();
    child.material = child.userData._pickOrigMat;
    delete child.userData._pickOrigMat;
    if (object.name === "montage-trail-pick" || object.name === "montage-lift-pick") child.renderOrder = 10;
  });
}

export function createClayEntityPicker({ canvas, camera, getPickables, onSelect, onHover }) {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line = { ...raycaster.params.Line, threshold: 0.35 };
  const pointer = new THREE.Vector2();
  let selected = null;
  let hovered = null;
  let press = null;
  let pointerCount = 0;
  let lastTapAt = 0;

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function hit(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const objects = getPickables?.() || [];
    const intersections = raycaster.intersectObjects(objects, true);
    return intersections.length ? findEntityObject(intersections[0].object) : null;
  }

  function select(next) {
    if (selected && selected !== next) setHighlight(selected, false);
    selected = next;
    if (selected) setHighlight(selected, "select");
    if (!selected) canvas.style.cursor = "grab";
    onSelect?.(selected?.userData?.entity || null);
  }

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerCount += 1;
    if (pointerCount > 1) {
      press = null;
      return;
    }
    press = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function onPointerMove(event) {
    if (event.pointerType !== "mouse") {
      if (hovered) {
        if (hovered !== selected) setHighlight(hovered, false);
        hovered = null;
        onHover?.(null, event);
      }
      return;
    }
    const next = hit(event);
    if (next !== hovered) {
      if (hovered !== selected) setHighlight(hovered, false);
      hovered = next;
      if (hovered && hovered !== selected) setHighlight(hovered, "hover");
      canvas.style.cursor = next ? "pointer" : "grab";
      onHover?.(next?.userData?.entity || null, event);
    }
  }

  function onPointerUp(event) {
    pointerCount = Math.max(0, pointerCount - 1);
    if (!press || press.id !== event.pointerId) {
      press = null;
      return;
    }
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    press = null;
    if (moved > TAP_PX) return;
    lastTapAt = performance.now();
    select(hit(event));
  }

  function onClick(event) {
    if (performance.now() - lastTapAt < 450) return;
    select(hit(event));
  }

  function onPointerCancel() {
    pointerCount = Math.max(0, pointerCount - 1);
    press = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("click", onClick);

  return {
    clear() {
      setHighlight(selected, false);
      selected = null;
      hovered = null;
      canvas.style.cursor = "grab";
      onSelect?.(null);
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("click", onClick);
    },
  };
}

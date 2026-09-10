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

function setHighlight(object, selected) {
  if (!object?.userData?.entity) return;
  object.userData.selected = selected;
  object.traverse((child) => {
    const material = child.material;
    if (!material || Array.isArray(material)) return;
    if (selected) {
      child.userData.previousPickOpacity = material.opacity;
      material.opacity = 0;
      material.transparent = true;
    } else if (child.userData.previousPickOpacity != null) {
      material.opacity = child.userData.previousPickOpacity;
      delete child.userData.previousPickOpacity;
    }
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
    if (selected && selected !== hovered) setHighlight(selected, true);
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
      if (hovered !== selected) setHighlight(hovered, true);
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

/** Pointer picking and selection highlighting for clay trail/lift entities. */

import * as THREE from "three";

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
  const pointer = new THREE.Vector2();
  let selected = null;
  let hovered = null;

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

  function onPointerMove(event) {
    const next = hit(event);
    if (next !== hovered) {
      if (hovered !== selected) setHighlight(hovered, false);
      hovered = next;
      if (hovered !== selected) setHighlight(hovered, true);
      canvas.style.cursor = next ? "pointer" : "grab";
      onHover?.(next?.userData?.entity || null, event);
    }
  }

  function onClick(event) {
    const next = hit(event);
    if (selected && selected !== next) setHighlight(selected, false);
    selected = next;
    if (selected && selected !== hovered) setHighlight(selected, true);
    if (!selected) canvas.style.cursor = "grab";
    onSelect?.(selected?.userData?.entity || null);
  }

  canvas.addEventListener("pointermove", onPointerMove);
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
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
    },
  };
}

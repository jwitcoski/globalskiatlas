/** Shared helpers for Pepper's Ghost framing. Kept tiny and testable. */

/** Horizontal mirror for a 45° bowl reflection (left/right flip). */
export function mirrorCssScaleX(enabled) {
  return enabled ? "scaleX(-1)" : "none";
}

/**
 * Fit a mesh into a target span (hero units), centered at origin.
 * Returns { root, span } where root is a THREE.Group.
 */
export function fitMeshToSpan(THREE, mesh, targetSpan = 100) {
  const root = new THREE.Group();
  root.name = "ghost-terrain-root";
  root.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);

  const sized = new THREE.Box3().setFromObject(mesh);
  const size = sized.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  root.scale.setScalar(targetSpan / span);
  root.updateMatrixWorld(true);
  return { root, span, size };
}

/** Exaggerate mesh Y relative to its lowest vertex (clay-style). */
export function exaggerateHeights(mesh, factor = 2) {
  const pos = mesh?.geometry?.attributes?.position;
  if (!pos || !(factor > 0) || factor === 1) return;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) pos.setY(i, minY + (pos.getY(i) - minY) * factor);
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

/** Bright snow-facing material for black-stage holograms. */
export function hologramSnowMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    roughness: 0.72,
    metalness: 0.04,
    emissive: 0x1a2430,
    emissiveIntensity: 0.18,
  });
}

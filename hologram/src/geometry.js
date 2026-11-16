/** Shared helpers for Pepper's Ghost framing. Kept tiny and testable. */

/** Horizontal mirror for a 45° bowl reflection (left/right flip). */
export function mirrorCssScaleX(enabled) {
  return enabled ? "scaleX(-1)" : "none";
}

/**
 * Camera distance that keeps a sphere inside both the vertical and horizontal FOV.
 * margin > 1 leaves black stage around the island.
 */
export function cameraFitDistance(radius, fovDeg, aspect, margin = 1.45) {
  const vHalf = ((fovDeg * Math.PI) / 180) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(aspect, 0.05));
  const dist = radius / Math.min(Math.sin(vHalf), Math.sin(hHalf));
  return dist * margin;
}

/** RGB 0–1. Elevation tints the snow; a fixed light direction puts gray in the folds. */
export function terrainVertexColor(elev, nx, ny, nz) {
  const t = Math.min(1, Math.max(0, elev));
  const low = [0.34, 0.42, 0.5];
  const mid = [0.62, 0.72, 0.8];
  const high = [0.94, 0.97, 1];
  const a = t < 0.55 ? low : mid;
  const b = t < 0.55 ? mid : high;
  const u = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
  const lx = 0.35;
  const ly = 0.82;
  const lz = 0.45;
  const len = Math.hypot(lx, ly, lz);
  const ndotl = Math.max(0, (nx * lx + ny * ly + nz * lz) / len);
  const shade = 0.22 + 0.78 * ndotl;
  const slope = 1 - Math.min(1, Math.abs(ny));
  return [0, 1, 2].map((i) => (a[i] + (b[i] - a[i]) * u) * shade * (1 - slope * 0.28));
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

/** Paint elevation + slope into vertex colors. Mesh has POSITION and NORMAL only. */
export function shadeTerrainColors(THREE, geometry) {
  const pos = geometry?.attributes?.position;
  const nrm = geometry?.attributes?.normal;
  if (!pos || !nrm) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const spanY = Math.max(1e-6, maxY - minY);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const elev = (pos.getY(i) - minY) / spanY;
    const [r, g, b] = terrainVertexColor(elev, nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Vertex colors carry the relief. Basic material ignores lights so it cannot blow out to white. */
export function hologramSnowMaterial(THREE) {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

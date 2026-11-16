import { fitMeshToSpan, hologramSnowMaterial } from "./geometry.js";

/** Offline fallback so the sandbox still demos without clay_scenes. */
export function makeProceduralIsland(THREE, targetSpan = 100) {
  const geo = new THREE.SphereGeometry(40, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) / 40;
    const ridge = Math.sin(x * 0.18) * Math.cos(z * 0.14) * 7;
    const peak = Math.max(0, 1 - r) ** 1.6 * 22;
    pos.setY(i, Math.max(0.4, pos.getY(i) * 0.35 + peak + ridge));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, hologramSnowMaterial(THREE));
  mesh.name = "procedural-island";
  const { root } = fitMeshToSpan(THREE, mesh, targetSpan);
  root.userData.resortId = "procedural";
  root.userData.manifest = { display_name: "Procedural Island" };
  return { root, manifest: root.userData.manifest };
}

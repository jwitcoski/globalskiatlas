/** Ice-blue path decals on the OSM centerline — flat on the snow, like trail stamps. */

import { alongPolyline, polylineLen } from "./gates.js?v=vis18";

const CHEV_STEP = 7.6;
const SHOW_BACK = 10;
const SHOW_AHEAD = 110;
const ICE = 0x8ec9e8;

function chevronGeo(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 3.1);
  shape.lineTo(-3.4, -2.15);
  shape.lineTo(-2.15, -2.15);
  shape.lineTo(0, 1.15);
  shape.lineTo(2.15, -2.15);
  shape.lineTo(3.4, -2.15);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, steps: 1 });
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function placeChev(dummy, p, elevFn, scale) {
  const y0 = elevFn(p.x, p.z);
  const y1 = elevFn(p.x + p.tx * 2.4, p.z + p.tz * 2.4);
  const pitch = Math.atan2(y0 - y1, 2.4);
  dummy.position.set(p.x, y0 + 0.07, p.z);
  dummy.rotation.set(pitch, Math.atan2(p.tx, p.tz), 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
}

export function clearTrailMarks(root) {
  if (!root) return;
  root.removeFromParent();
  root.traverse((o) => {
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    else o.material?.dispose?.();
  });
}

export function addTrailMarks(THREE, scene, pts, elevFn) {
  const root = new THREE.Group();
  root.name = "trail-chevrons";
  root.userData.pts = pts;
  if (!pts || pts.length < 2) {
    scene.add(root);
    return root;
  }
  const len = polylineLen(pts);
  const n = Math.max(0, Math.floor((len - 10) / CHEV_STEP));
  if (!n) {
    scene.add(root);
    return root;
  }
  const geo = chevronGeo(THREE);
  const mat = new THREE.MeshBasicMaterial({
    color: ICE,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  const dummy = new THREE.Object3D();
  dummy.rotation.order = "YXZ";
  for (let i = 0; i < n; i++) {
    const p = alongPolyline(pts, 4 + i * CHEV_STEP);
    placeChev(dummy, p, elevFn, 1);
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
  root.userData.mesh = mesh;
  root.userData.n = n;
  root.userData.step = CHEV_STEP;
  root.userData.dummy = dummy;
  root.userData.elevFn = elevFn;
  scene.add(root);
  return root;
}

export function updateTrailMarks(root, along, skierPos) {
  const mesh = root?.userData?.mesh;
  const dummy = root?.userData?.dummy;
  const pts = root?.userData?.pts;
  const elevFn = root?.userData?.elevFn;
  if (!mesh || !dummy || !pts) return;
  const n = root.userData.n;
  const step = root.userData.step;
  const sx = skierPos?.x ?? 0;
  const sz = skierPos?.z ?? 0;
  for (let i = 0; i < n; i++) {
    const s = 4 + i * step;
    const ahead = s - along;
    const p = alongPolyline(pts, s);
    const near = Math.hypot(p.x - sx, p.z - sz);
    let scale = 0.001;
    if (near <= SHOW_AHEAD || (ahead >= -SHOW_BACK && ahead <= SHOW_AHEAD)) {
      scale = ahead >= -3 && ahead < 55 ? 1 : 0.82;
    }
    placeChev(dummy, p, elevFn, scale);
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

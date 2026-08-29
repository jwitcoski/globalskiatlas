/** Green path chevrons + oval mogul pimples. Visual only; physics overlay is separate. */

const CHEV_STEP = 12;
const MOGUL_STEP = 20;
const MOGUL_SIDE = 3.1;

function alongPts(pts, dist) {
  let left = Math.max(0, dist);
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const az = pts[i - 1].z;
    const bx = pts[i].x;
    const bz = pts[i].z;
    const seg = Math.hypot(bx - ax, bz - az) || 1e-6;
    if (left <= seg) {
      const t = left / seg;
      const tx = (bx - ax) / seg;
      const tz = (bz - az) / seg;
      return { x: ax + tx * left, z: az + tz * left, tx, tz };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  const seg = Math.hypot(last.x - prev.x, last.z - prev.z) || 1;
  return { x: last.x, z: last.z, tx: (last.x - prev.x) / seg, tz: (last.z - prev.z) / seg };
}

function polyLen(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return n;
}

function makeChevron(THREE) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3dcf6a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const arm = new THREE.BoxGeometry(1.85, 0.08, 0.22);
  const L = new THREE.Mesh(arm, mat);
  const R = new THREE.Mesh(arm, mat);
  L.rotation.y = 0.52;
  R.rotation.y = -0.52;
  L.position.set(-0.55, 0, 0.35);
  R.position.set(0.55, 0, 0.35);
  g.add(L, R);
  return g;
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
  if (!pts || pts.length < 2) {
    scene.add(root);
    return root;
  }
  const len = polyLen(pts);
  const chevMatParent = makeChevron(THREE);
  for (let s = 8; s < len - 12; s += CHEV_STEP) {
    const p = alongPts(pts, s);
    const mark = chevMatParent.clone();
    mark.position.set(p.x, elevFn(p.x, p.z) + 1.55, p.z);
    mark.rotation.y = Math.atan2(p.tx, p.tz) + Math.PI;
    root.add(mark);
  }

  const mogGeo = new THREE.SphereGeometry(1, 10, 8);
  const mogMat = new THREE.MeshLambertMaterial({ color: 0xd8dee4 });
  let slot = 0;
  for (let s = 14; s < len - 16; s += MOGUL_STEP) {
    const p = alongPts(pts, s);
    const nx = -p.tz;
    const nz = p.tx;
    const side = slot % 2 === 0 ? -1 : 1;
    slot += 1;
    const x = p.x + nx * MOGUL_SIDE * side;
    const z = p.z + nz * MOGUL_SIDE * side;
    const mesh = new THREE.Mesh(mogGeo, mogMat);
    mesh.position.set(x, elevFn(x, z) + 0.55, z);
    mesh.scale.set(3.6, 2.15, 2.5);
    mesh.rotation.y = Math.atan2(p.tx, p.tz);
    root.add(mesh);
  }
  scene.add(root);
  return root;
}

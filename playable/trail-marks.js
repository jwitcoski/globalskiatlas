/** Ice-blue path decals on the OSM centerline, plus low boundary fences on both piste edges. */

import { alongPolyline, polylineLen } from "./gates.js?v=vis18";
import { snowHalfM } from "./snow.js?v=snow17";

const CHEV_STEP = 7.6;
const SHOW_BACK = 10;
const SHOW_AHEAD = 110;
const ICE = 0x8ec9e8;
const FENCE_STEP = 6;
const POST_H = 1.1;
const RAIL_Y = 0.85;
const FENCE_COLOR = 0xe8742c;
const HIT_R = 0.55;
const MAX_DEBRIS = 60;
const REST = 0.25;
const MU = 0.45;
const SUB_DT = 1 / 120;

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
  addFences(THREE, root, pts, len);
  placeFences(root, 0, pts[0]);
  scene.add(root);
  return root;
}

function addFences(THREE, root, pts, len) {
  const samples = [];
  for (let s = 4; s <= len - 4; s += FENCE_STEP) samples.push(alongPolyline(pts, s));
  const m = samples.length;
  if (m < 2) return;
  const mat = new THREE.MeshLambertMaterial({ color: FENCE_COLOR });
  const postGeo = new THREE.CylinderGeometry(0.05, 0.06, POST_H, 5);
  postGeo.translate(0, POST_H / 2, 0);
  const railGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
  const posts = new THREE.InstancedMesh(postGeo, mat, m * 2);
  const rails = new THREE.InstancedMesh(railGeo, mat, (m - 1) * 2);
  posts.frustumCulled = rails.frustumCulled = false;
  root.add(posts, rails);
  root.userData.fence = {
    THREE,
    root,
    samples,
    posts,
    rails,
    mat,
    debrisGeo: { post: new THREE.CylinderGeometry(0.05, 0.06, POST_H, 5), rail: railGeo },
    xyz: new Float32Array(m * 6),
    shown: new Uint8Array(m),
    railOn: new Uint8Array((m - 1) * 2),
    brokenPost: new Uint8Array(m * 2),
    brokenRail: new Uint8Array((m - 1) * 2),
    debris: [],
    prev: null,
    dummy: new THREE.Object3D(),
    tmp: { r: new THREE.Vector3(), vp: new THREE.Vector3(), rn: new THREE.Vector3(), t: new THREE.Vector3(), dq: new THREE.Quaternion() },
  };
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function orient(px, pz, qx, qz, rx, rz) {
  return (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
}

function crosses(p0x, p0z, p1x, p1z, ax, az, bx, bz) {
  return orient(ax, az, bx, bz, p0x, p0z) * orient(ax, az, bx, bz, p1x, p1z) < 0 && orient(p0x, p0z, p1x, p1z, ax, az) * orient(p0x, p0z, p1x, p1z, bx, bz) < 0;
}

/** Skier vs rails and posts in plan view. Swept from last frame's position so fast skiers can't tunnel. Never touches vel. */
function hitFences(f, elevFn, pos, vel) {
  const { xyz, railOn, brokenPost, shown } = f;
  const prev = f.prev && Math.hypot(pos.x - f.prev.x, pos.z - f.prev.z) < 5 ? f.prev : { x: pos.x, z: pos.z };
  f.prev = { x: pos.x, z: pos.z };
  if (pos.y - elevFn(pos.x, pos.z) > POST_H + 0.4) return;
  for (let k = 0; k < railOn.length; k++) {
    if (!railOn[k] || f.brokenRail[k]) continue;
    const a = k * 3;
    const b = (k + 2) * 3;
    if (segDist(pos.x, pos.z, xyz[a], xyz[a + 2], xyz[b], xyz[b + 2]) > HIT_R && !crosses(prev.x, prev.z, pos.x, pos.z, xyz[a], xyz[a + 2], xyz[b], xyz[b + 2])) continue;
    breakRail(f, k, vel, 1);
    const nearA = Math.hypot(pos.x - xyz[a], pos.z - xyz[a + 2]) < Math.hypot(pos.x - xyz[b], pos.z - xyz[b + 2]);
    breakPost(f, nearA ? k : k + 2, vel, 0.8);
  }
  for (let p = 0; p < brokenPost.length; p++) {
    if (brokenPost[p] || !shown[p >> 1]) continue;
    if (Math.hypot(pos.x - xyz[p * 3], pos.z - xyz[p * 3 + 2]) < HIT_R) breakPost(f, p, vel, 1);
  }
}

function breakPost(f, p, vel, strength) {
  if (f.brokenPost[p]) return;
  f.brokenPost[p] = 1;
  const { THREE, xyz } = f;
  const c = new THREE.Vector3(xyz[p * 3], xyz[p * 3 + 1] + POST_H / 2, xyz[p * 3 + 2]);
  spawnDebris(f, f.debrisGeo.post, c, new THREE.Quaternion(), new THREE.Vector3(0, 1, 0), POST_H / 2, 1, vel, strength);
  // A snapped post drops the rails it was holding.
  for (const k of [p - 2, p]) if (k >= 0 && k < f.railOn.length) breakRail(f, k, vel, strength * 0.35);
}

function breakRail(f, k, vel, strength) {
  if (f.brokenRail[k]) return;
  f.brokenRail[k] = 1;
  if (!f.railOn[k]) return;
  const { THREE, xyz, dummy } = f;
  const a = new THREE.Vector3(xyz[k * 3], xyz[k * 3 + 1] + RAIL_Y, xyz[k * 3 + 2]);
  const b = new THREE.Vector3(xyz[(k + 2) * 3], xyz[(k + 2) * 3 + 1] + RAIL_Y, xyz[(k + 2) * 3 + 2]);
  const d = a.distanceTo(b);
  dummy.position.copy(a);
  dummy.lookAt(b);
  for (const t of [0.25, 0.75]) {
    spawnDebris(f, f.debrisGeo.rail, a.clone().lerp(b, t), dummy.quaternion, new THREE.Vector3(0, 0, 1), d / 4, d / 2, vel, strength);
  }
}

/** Rigid rod along local `axis` with half-length h; mass 1, inertia h²/3 about its perpendicular axes. */
function spawnDebris(f, geo, pos, quat, axis, h, lenScale, vel, strength) {
  const { THREE } = f;
  const mesh = new THREE.Mesh(geo, f.mat);
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
  mesh.scale.z = lenScale;
  f.root.add(mesh);
  const rnd = () => Math.random() * 2 - 1;
  const kick = (0.6 + Math.random() * 0.4) * strength;
  f.debris.push({
    mesh,
    axis,
    h,
    I: Math.max(0.02, (h * h) / 3),
    v: new THREE.Vector3(vel.x * kick + rnd() * 1.5, (1.5 + Math.random() * 2.5) * strength, vel.z * kick + rnd() * 1.5),
    w: new THREE.Vector3(rnd(), rnd(), rnd()).multiplyScalar(7 * strength),
    rest: 0,
  });
  if (f.debris.length > MAX_DEBRIS) f.debris.shift().mesh.removeFromParent();
}

// ponytail: contacts only at the rod's two end points against an up normal, no piece-vs-piece collisions;
// sample the terrain normal and add pairwise capsule tests if debris ever needs to pile up.
function stepDebris(f, dt, elevFn) {
  if (!f.debris.length || !(dt > 0)) return;
  const { r, vp, rn, t, dq } = f.tmp;
  const steps = Math.ceil(dt / SUB_DT);
  const h = dt / steps;
  for (const b of f.debris) {
    if (b.rest > 30) continue;
    const { mesh, v, w } = b;
    for (let s = 0; s < steps; s++) {
      v.y -= 9.81 * h;
      mesh.position.addScaledVector(v, h);
      const ang = w.length() * h;
      if (ang > 1e-6) mesh.quaternion.premultiply(dq.setFromAxisAngle(t.copy(w).normalize(), ang));
      let touched = false;
      for (let end = -1; end <= 1; end += 2) {
        r.copy(b.axis).applyQuaternion(mesh.quaternion).multiplyScalar(b.h * end);
        const pen = elevFn(mesh.position.x + r.x, mesh.position.z + r.z) + 0.03 - (mesh.position.y + r.y);
        if (pen <= 0) continue;
        touched = true;
        mesh.position.y += pen;
        vp.crossVectors(w, r).add(v);
        if (vp.y >= 0) continue;
        // Normal impulse with n = up: j = -(1+e)·vn / (1/m + |r×n|²/I).
        rn.set(-r.z, 0, r.x);
        const jn = (-(1 + REST) * vp.y) / (1 + rn.lengthSq() / b.I);
        v.y += jn;
        w.addScaledVector(rn, jn / b.I);
        t.set(vp.x, 0, vp.z);
        const vt = t.length();
        if (vt > 1e-4) {
          t.divideScalar(vt);
          rn.crossVectors(r, t);
          const jt = Math.min(MU * jn, vt / (1 + rn.lengthSq() / b.I));
          v.addScaledVector(t, -jt);
          w.addScaledVector(rn, -jt / b.I);
        }
      }
      b.rest = touched && v.lengthSq() < 0.05 && w.lengthSq() < 0.1 ? b.rest + 1 : 0;
      if (b.rest > 30) {
        v.set(0, 0, 0);
        w.set(0, 0, 0);
        break;
      }
    }
  }
}

export function repairFences(root) {
  const f = root?.userData?.fence;
  if (!f) return;
  f.brokenPost.fill(0);
  f.brokenRail.fill(0);
  f.prev = null;
  for (const b of f.debris) b.mesh.removeFromParent();
  f.debris.length = 0;
}

/** Posts sit at the on-piste half-width (same edge score.js judges), so they track the snow level. */
function placeFences(root, along, skierPos) {
  const f = root.userData.fence;
  if (!f) return;
  const { samples, posts, rails, xyz, shown, railOn, brokenPost, brokenRail, dummy } = f;
  const elevFn = root.userData.elevFn;
  const half = snowHalfM();
  const sx = skierPos?.x ?? 0;
  const sz = skierPos?.z ?? 0;
  const m = samples.length;
  for (let i = 0; i < m; i++) {
    const p = samples[i];
    const ahead = p.along - along;
    shown[i] = Math.hypot(p.x - sx, p.z - sz) <= SHOW_AHEAD || (ahead >= -SHOW_BACK && ahead <= SHOW_AHEAD) ? 1 : 0;
    for (let side = 0; side < 2; side++) {
      const sgn = side ? -1 : 1;
      const x = p.x - p.tz * half * sgn;
      const z = p.z + p.tx * half * sgn;
      const y = elevFn(x, z);
      const k = (i * 2 + side) * 3;
      xyz[k] = x;
      xyz[k + 1] = y;
      xyz[k + 2] = z;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(shown[i] && !brokenPost[i * 2 + side] ? 1 : 0.001);
      dummy.updateMatrix();
      posts.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  for (let i = 0; i < m - 1; i++) {
    for (let side = 0; side < 2; side++) {
      const a = (i * 2 + side) * 3;
      const b = ((i + 1) * 2 + side) * 3;
      const dx = xyz[b] - xyz[a];
      const dy = xyz[b + 1] - xyz[a + 1];
      const dz = xyz[b + 2] - xyz[a + 2];
      dummy.position.set(xyz[a] + dx / 2, xyz[a + 1] + dy / 2 + RAIL_Y, xyz[a + 2] + dz / 2);
      dummy.lookAt(xyz[b], xyz[b + 1] + RAIL_Y, xyz[b + 2]);
      // Sharp bends fling outer-edge posts apart; skip those spans instead of floating a long rail.
      const d = Math.hypot(dx, dy, dz);
      let on = shown[i] && shown[i + 1] && d < FENCE_STEP * 2 ? 1 : 0;
      railOn[i * 2 + side] = on;
      if (brokenRail[i * 2 + side]) on = 0;
      dummy.scale.set(on ? 1 : 0.001, on ? 1 : 0.001, on ? d : 0.001);
      dummy.updateMatrix();
      rails.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  rails.instanceMatrix.needsUpdate = true;
}

export function updateTrailMarks(root, along, skierPos, vel, dt) {
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
  const f = root.userData.fence;
  if (f && skierPos && vel) {
    hitFences(f, elevFn, skierPos, vel);
    stepDebris(f, dt, elevFn);
  }
  placeFences(root, along, skierPos);
}

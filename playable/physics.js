/** Arcade ski on DEM. Gravity is fall-line only (none on flats). Custom, not Rapier. */

import { analogAxes } from "./input.js?v=s1";

const G_FALL = 32;
const TURN = 0.98;
const TURN_DAMP = 0.04;
const DRAG = 0.11;
const BRAKE = 5.2;
const TUCK = 6.5;
const MAX_SPD = 30;
/** Pole-plant when W is held but the skis are stalled or sliding backward. */
const POLE_ENGAGE = 2.5;
const POLE_PUSH = 19;
const POLE_MAX = 4.0;
/** Rise/run ahead of the tips. ~18° — steeper than that is a wall, not a roller. */
const POLE_MAX_RISE = 0.33;
const POLE_MIN_NY = 0.78;
/** Pelvis height above DEM; ski bottoms sit ~8 cm into snow. */
export const RIDE = 0.92;
const EDGE = 6;

/** Carve vs skid: sideways velocity bleeds off, forward velocity is kept. */
const SKID_BASE = 2.4;
const SKID_EDGE = 3.6;
const TRAVERSE_DRAG = 0.85;
const BARE_DRAG = 8; // ponytail: dumps speed in ~1s; tune if it feels like a wall
const POWDER_SKID = 1.4;

/** Short ballistic pops over DEM rollers — never a flight sim. */
const G_AIR = 24;
const MAX_AIR_S = 1.7;
/**
 * Launch only when the skier is *leaving* the snow (convex lip), not when the
 * DEM simply drops along a steady downhill. Steady pitch: vel.y ≈ groundVel.
 */
const LAUNCH_MIN = 0.04;
const LAUNCH_SEP = 0.85;
const LAUNCH_SPD = 6.5;
const LAUNCH_CONVEX = 0.06;
const AIR_COOL = 0.35;
const JUMP_COOL = 0.55;
const JUMP_VY = 2.35;
const AIR_TURN = 0.42;
const AIR_DRAG = 0.05;
const LAND_HARD = 6;

const _n = { v: null };
const _fwd = { v: null };
const _lat = { v: null };
const _up = { v: null };
const _right = { v: null };
const _mat = { m: null };
const _want = { v: null };
const _look = { v: null };
const _fall = { v: null };
const _axis = { v: null };

function v3(THREE, slot) {
  if (!slot.v) slot.v = new THREE.Vector3();
  return slot.v;
}

function slopeNormal(THREE, hf, x, z, out) {
  const n = hf.normal(THREE, x, z, out);
  if (n.y < 0.28) {
    n.y = 0.28;
    n.normalize();
  }
  return n;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function fallLine(THREE, n, out) {
  /* Heightfield normals lean downhill, so (n.x, n.z) is the fall line. */
  out.set(n.x, 0, n.z);
  if (out.lengthSq() < 1e-8) out.set(0, 0, 1);
  out.normalize();
  out.addScaledVector(n, -out.dot(n));
  if (out.lengthSq() < 1e-8) out.set(0, 0, 1);
  return out.normalize();
}

function gradeSin(n) {
  return Math.sqrt(Math.max(0, 1 - n.y * n.y));
}

function clampToDem(pos, hf) {
  const b = hf.playBounds || hf.bounds;
  const edge = hf.playBounds ? 0 : EDGE;
  pos.x = Math.min(b.maxX - edge, Math.max(b.minX + edge, pos.x));
  pos.z = Math.min(b.maxZ - edge, Math.max(b.minZ + edge, pos.z));
}

export const READY_POSE = {
  torsoPitch: 18,
  headPitch: -6,
  kneeBend: 28,
  shoulderAbduct: 20,
  shoulderFlex: 24,
  elbowBend: 90,
  poleAngle: 45,
  poleOut: 10,
};
export const TUCK_POSE = {
  torsoPitch: 42,
  headPitch: 12,
  kneeBend: 48,
  shoulderAbduct: 16,
  shoulderFlex: 40,
  elbowBend: 100,
  poleAngle: 52,
  poleOut: 8,
};
/** Live tuning. manual true uses tuckAmount instead of the speed blend. */
export const poseTune = {
  manual: false,
  tuckAmount: 0,
  torsoPitch: READY_POSE.torsoPitch,
  shoulderAbduct: READY_POSE.shoulderAbduct,
  shoulderFlex: READY_POSE.shoulderFlex,
  elbowBend: READY_POSE.elbowBend,
};
const TUCK_CAP = 0.6;
const TUCK_TAU = 0.2;
const DEG = Math.PI / 180;
const ARM_SWAY = 5 * DEG;

/**
 * Low-poly skier read from the chase camera: separate joints, colored jacket,
 * dark pants. `orientSkier` still poses torso, legs, head, arms, poles, and skis.
 * Ski tails stay near local z = -0.9 so spray can find them.
 */
export function makeSkier(THREE, scene, opts = {}) {
  const g = new THREE.Group();
  g.name = opts.name || "skier";

  const jacketColor = opts.jacketColor ?? opts.suit ?? 0xd8342e;
  const COLORS = {
    jacket: jacketColor,
    pants: 0x2c3138,
    pantsDark: 0x1a1e24,
    boot: 0x14171c,
    buckle: 0x8d949c,
    glove: 0x121418,
    helmet: 0xf4f6f8,
    goggle: 0x14181c,
    visor: 0x0c1014,
    ski: 0x2a2e33,
    skiStripe: opts.ski ?? jacketColor,
    skiBase: 0x141618,
    pole: 0x2e3238,
    grip: 0x141618,
    basket: 0x3a3e44,
    bib: 0x111214,
    seam: 0x1a1e24,
  };
  const mat = (color, rough = 0.82) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, flatShading: true });
  const jacket = mat(COLORS.jacket, 0.78);
  const pants = mat(COLORS.pants, 0.88);
  const pantsDark = mat(COLORS.pantsDark, 0.9);
  const bootMat = mat(COLORS.boot, 0.86);
  const gloveMat = mat(COLORS.glove, 0.8);
  const shell = mat(COLORS.helmet, 0.72);
  const dark = mat(COLORS.goggle, 0.84);
  const skiTop = mat(COLORS.ski, 0.7);
  const skiStripe = mat(COLORS.skiStripe, 0.74);
  const skiBase = mat(COLORS.skiBase, 0.8);

  function makePivot(name) {
    const p = new THREE.Group();
    p.name = name;
    return p;
  }
  function makeLimb(name, geo, material) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function flattenSki(ski) {
    g.updateWorldMatrix(true, true);
    const parentQ = new THREE.Quaternion();
    ski.parent.getWorldQuaternion(parentQ);
    ski.quaternion.copy(parentQ.invert());
    const e = new THREE.Euler().setFromQuaternion(ski.quaternion, "XYZ");
    ski.rotation.copy(e);
    ski.userData.flat = { x: e.x, y: e.y, z: e.z };
    g.updateWorldMatrix(true, true);
    const wp = new THREE.Vector3();
    ski.getWorldPosition(wp);
    const target = wp.clone();
    target.y = -0.76;
    ski.parent.worldToLocal(target);
    ski.position.copy(target);
    ski.userData.rest = { x: ski.position.x, y: ski.position.y };
  }
  function aimPole(pole, side) {
    g.updateWorldMatrix(true, true);
    const wrist = pole.parent;
    const parentQ = new THREE.Quaternion();
    wrist.getWorldQuaternion(parentQ);
    const below = (READY_POSE.poleAngle * Math.PI) / 180;
    const out = (READY_POSE.poleOut * Math.PI) / 180;
    const dir = new THREE.Vector3(
      side * Math.sin(out) * Math.cos(below),
      -Math.sin(below),
      -Math.cos(out) * Math.cos(below),
    ).normalize();
    dir.applyQuaternion(parentQ.invert());
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    pole.quaternion.copy(q);
    const e = new THREE.Euler().setFromQuaternion(pole.quaternion, "XYZ");
    pole.rotation.copy(e);
    pole.userData.restX = e.x;
    pole.userData.restZ = e.z;
  }

  /* Torso hinge stays upright for orientSkier. The rig inside holds the ski lean. */
  const torso = new THREE.Group();
  torso.name = "torso";
  const rig = makePivot("rig");
  rig.rotation.x = 0;
  rig.position.z = -0.1;

  const coat = makeLimb("torsoMesh", new THREE.CylinderGeometry(0.34, 0.27, 0.52, 10), jacket);
  coat.position.y = 0.32;
  const hem = makeLimb("hem", new THREE.CylinderGeometry(0.38, 0.32, 0.12, 10), jacket);
  hem.position.y = 0.06;
  const collar = makeLimb("collar", new THREE.TorusGeometry(0.15, 0.07, 6, 14), jacket);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.58;
  const hood = makeLimb("hood", new THREE.SphereGeometry(0.18, 10, 8), jacket);
  hood.position.set(0, 0.62, -0.14);
  hood.scale.set(1.15, 0.72, 0.9);
  const seam = makeLimb("seam", new THREE.BoxGeometry(0.045, 0.44, 0.025), mat(COLORS.seam, 0.9));
  seam.position.set(0, 0.32, -0.28);
  const bib = makeLimb("bib", new THREE.CircleGeometry(0.1, 14), mat(COLORS.bib, 0.9));
  bib.position.set(0, 0.4, -0.29);
  bib.rotation.y = Math.PI;

  const head = makePivot("head");
  head.position.y = 0.78;
  const helmet = makeLimb("helmet", new THREE.SphereGeometry(0.253, 16, 12), shell);
  helmet.scale.set(1.05, 0.92, 1.08);
  helmet.position.y = 0.16;
  const rim = makeLimb("rim", new THREE.TorusGeometry(0.2, 0.028, 6, 16, Math.PI), shell);
  rim.position.set(0, 0.08, -0.04);
  rim.rotation.y = Math.PI;
  rim.rotation.x = 1.2;
  const earG = new THREE.SphereGeometry(0.07, 8, 6);
  const earL = makeLimb("earL", earG, shell);
  const earR = makeLimb("earR", earG, shell);
  earL.position.set(-0.2, 0.1, 0);
  earR.position.set(0.2, 0.1, 0);
  earL.scale.set(0.7, 1.1, 0.85);
  earR.scale.set(0.7, 1.1, 0.85);
  const strap = makeLimb("strap", new THREE.TorusGeometry(0.2, 0.02, 6, 18), dark);
  strap.position.set(0, 0.1, 0.02);
  strap.rotation.x = Math.PI / 2;
  strap.scale.set(1.02, 1.02, 0.85);
  const visor = makeLimb("visor", new THREE.BoxGeometry(0.28, 0.09, 0.03), mat(COLORS.visor, 0.35));
  visor.position.set(0, 0.1, 0.2);
  head.add(helmet, rim, earL, earR, strap, visor);

  function arm(side) {
    const s = side < 0 ? "L" : "R";
    const deg = Math.PI / 180;
    const shoulder = makePivot("shoulder" + s);
    shoulder.name = side < 0 ? "armL" : "armR";
    shoulder.position.set(side * 0.28, 0.5, 0.02);
    shoulder.rotation.x = -READY_POSE.shoulderFlex * deg;
    shoulder.rotation.z = side * READY_POSE.shoulderAbduct * deg;
    shoulder.userData.baseX = shoulder.rotation.x;
    shoulder.userData.baseZ = shoulder.rotation.z;
    const upper = makeLimb("upperArm" + s, new THREE.CylinderGeometry(0.11, 0.1, 0.32, 8), jacket);
    upper.position.y = -0.16;
    const elbow = makePivot("elbow" + s);
    elbow.position.y = -0.32;
    elbow.rotation.x = -READY_POSE.elbowBend * deg;
    elbow.rotation.z = side * 8 * deg;
    const forearm = makeLimb("forearm" + s, new THREE.CylinderGeometry(0.1, 0.09, 0.28, 8), jacket);
    forearm.position.y = -0.14;
    const wrist = makePivot("wrist" + s);
    wrist.position.y = -0.28;
    const cuff = makeLimb("cuff" + s, new THREE.CylinderGeometry(0.078, 0.062, 0.12, 8), gloveMat);
    cuff.position.y = 0.04;
    const hand = makeLimb("hand" + s, new THREE.BoxGeometry(0.16, 0.12, 0.18), gloveMat);
    hand.position.set(0, -0.07, 0.02);
    wrist.add(cuff, hand);
    const pole = makePivot("pole" + s);
    pole.position.set(0, -0.06, 0.02);
    const shaft = makeLimb("shaft" + s, new THREE.CylinderGeometry(0.02, 0.015, 1.15, 6), mat(COLORS.pole, 0.76));
    shaft.position.y = -0.62;
    const grip = makeLimb("grip" + s, new THREE.CylinderGeometry(0.028, 0.026, 0.14, 6), mat(COLORS.grip, 0.84));
    grip.position.y = -0.02;
    const basket = makeLimb("basket" + s, new THREE.TorusGeometry(0.065, 0.012, 5, 10), mat(COLORS.basket, 0.8));
    basket.position.y = -1.05;
    basket.rotation.x = Math.PI / 2;
    pole.add(grip, shaft, basket);
    pole.userData.side = side;
    wrist.add(pole);
    elbow.add(forearm, wrist);
    shoulder.add(upper, elbow);
    shoulder.userData.restRot = { x: 0, y: 0, z: 0 };
    return { shoulder, elbow, wrist, pole };
  }
  const leftArm = arm(-1);
  const rightArm = arm(1);
  const armL = leftArm.shoulder;
  const armR = rightArm.shoulder;
  const poleL = leftArm.pole;
  const poleR = rightArm.pole;
  rig.add(coat, hem, collar, hood, seam, bib, head, armL, armR);
  torso.add(rig);

  /* Legs scale on Y in the crouch. Knee bend lives on the knee pivot. */
  const legs = new THREE.Group();
  legs.name = "legs";
  function leg(side) {
    const s = side < 0 ? "L" : "R";
    const hip = makePivot("hip" + s);
    hip.name = side < 0 ? "legL" : "legR";
    hip.position.set(side * 0.22, 0.02, -0.02);
    hip.rotation.x = 0.42;
    const thigh = makeLimb("thigh" + s, new THREE.CylinderGeometry(0.14, 0.11, 0.38, 8), pants);
    thigh.position.y = -0.18;
    const knee = makePivot("knee" + s);
    knee.position.set(0, -0.36, 0.04);
    knee.rotation.x = 0.55;
    knee.userData.restX = 0.55;
    const bulge = makeLimb("kneeBulge" + s, new THREE.SphereGeometry(0.105, 8, 6), pantsDark);
    bulge.scale.set(1.05, 0.65, 1.2);
    const shin = makeLimb("shin" + s, new THREE.CylinderGeometry(0.105, 0.09, 0.32, 8), pants);
    shin.position.y = -0.16;
    const ankle = makePivot("ankle" + s);
    ankle.position.y = -0.32;
    ankle.rotation.x = -0.8;
    const drape = makeLimb("pantHem" + s, new THREE.CylinderGeometry(0.12, 0.135, 0.12, 8), pantsDark);
    drape.position.y = 0.04;
    const boot = makeLimb("boot" + s, new THREE.BoxGeometry(0.18, 0.26, 0.36), bootMat);
    boot.position.set(0, -0.12, 0.05);
    const buckle = makeLimb("buckle" + s, new THREE.BoxGeometry(0.19, 0.035, 0.06), mat(COLORS.buckle, 0.45));
    buckle.position.set(0, 0.0, 0.18);
    ankle.add(drape, boot, buckle);
    const ski = makePivot(side < 0 ? "leftSki" : "rightSki");
    ski.position.set(0, -0.1, 0.08);
    ski.userData.rest = { x: 0, y: -0.1 };
    const board = makeLimb("board", new THREE.BoxGeometry(0.2, 0.08, 1.9), skiTop);
    const edge = makeLimb("edge", new THREE.BoxGeometry(0.2, 0.016, 1.9), skiBase);
    edge.position.y = -0.03;
    const stripe = makeLimb("stripe", new THREE.BoxGeometry(0.06, 0.012, 1.55), skiStripe);
    stripe.position.y = 0.046;
    const tip = makeLimb("tip", new THREE.BoxGeometry(0.18, 0.04, 0.26), skiTop);
    tip.position.set(0, 0.08, 1.02);
    tip.rotation.x = -0.4;
    const tail = makeLimb("tail", new THREE.BoxGeometry(0.14, 0.03, 0.16), skiTop);
    tail.position.set(0, 0.01, -0.98);
    const binding = makeLimb("binding", new THREE.BoxGeometry(0.15, 0.06, 0.32), bootMat);
    binding.position.set(0, 0.06, 0);
    ski.add(edge, board, stripe, tip, tail, binding);
    ankle.add(ski);
    knee.add(bulge, shin, ankle);
    hip.add(thigh, knee);
    return { hip, knee, ankle, ski };
  }
  const leftLeg = leg(-1);
  const rightLeg = leg(1);
  legs.add(leftLeg.hip, rightLeg.hip);
  const skiL = leftLeg.ski;
  const skiR = rightLeg.ski;

  g.add(torso, legs);
  aimPole(poleL, -1);
  aimPole(poleR, 1);
  flattenSki(skiL);
  flattenSki(skiR);
  g.userData.torso = torso;
  g.userData.legs = legs;
  g.userData.head = head;
  g.userData.skiL = skiL;
  g.userData.skiR = skiR;
  g.userData.poleL = poleL;
  g.userData.poleR = poleR;
  g.userData.armL = armL;
  g.userData.armR = armR;
  g.userData.joints = {
    shoulderL: leftArm.shoulder,
    elbowL: leftArm.elbow,
    wristL: leftArm.wrist,
    shoulderR: rightArm.shoulder,
    elbowR: rightArm.elbow,
    wristR: rightArm.wrist,
    hipL: leftLeg.hip,
    kneeL: leftLeg.knee,
    ankleL: leftLeg.ankle,
    hipR: rightLeg.hip,
    kneeR: rightLeg.knee,
    ankleR: rightLeg.ankle,
  };
  g.userData.pose = { crouch: 0, splay: 0, fold: 0 };
  g.traverse((o) => {
    o.renderOrder = 20;
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  if (opts.add !== false) scene.add(g);
  return g;
}

export function spawnOnSlope(THREE, hf, pos, vel, east, north, elev, aim) {
  const x = east;
  const z = -north;
  pos.set(x, (elev ?? hf.sample(x, z)) + RIDE, z);
  clampToDem(pos, hf);
  pos.y = hf.sample(pos.x, pos.z) + RIDE;
  const n = slopeNormal(THREE, hf, pos.x, pos.z, v3(THREE, _n));
  const dir = v3(THREE, _fwd);
  if (aim && (Math.abs(aim.x) + Math.abs(aim.z) > 1e-6)) dir.set(aim.x, 0, aim.z);
  else dir.set(n.x, 0, n.z);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  dir.addScaledVector(n, -dir.dot(n)).normalize();
  const heading = Math.atan2(dir.x, dir.z);
  vel.copy(dir).multiplyScalar(6);
  return heading;
}

const SKIER_R = 0.42;
const TREE_REST = 0.85;
const TREE_KICK = 2.4;

export function collideTrees(pos, vel, hash) {
  if (!hash?.xzr?.length) return { hit: false, crash: false, impact: 0, gap: Infinity };
  const px = pos.x;
  const pz = pos.z;
  const ix0 = Math.floor(px / hash.cell);
  const iz0 = Math.floor(pz / hash.cell);
  let hit = false;
  let impact = 0;
  let gap = Infinity;
  let hitNx = 0;
  let hitNz = 0;
  let hitIdx = -1;
  const data = hash.xzr;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const bin = hash.buckets.get(`${ix0 + dx},${iz0 + dz}`);
      if (!bin) continue;
      for (const i of bin) {
        const tx = data[i];
        const tz = data[i + 1];
        const tr = data[i + 2];
        const ex = px - tx;
        const ez = pz - tz;
        const min = SKIER_R + tr;
        const d2 = ex * ex + ez * ez;
        if (d2 < 1e-10) continue;
        if (d2 >= min * min) {
          gap = Math.min(gap, Math.sqrt(d2) - min);
          continue;
        }
        const d = Math.sqrt(d2);
        gap = 0;
        const nx = ex / d;
        const nz = ez / d;
        const pen = min - d;
        pos.x += nx * pen;
        pos.z += nz * pen;
        hitNx = nx;
        hitNz = nz;
        hitIdx = i;
        const vn = vel.x * nx + vel.z * nz;
        if (vn < 0) {
          impact = Math.max(impact, -vn);
          vel.x -= vn * (1 + TREE_REST) * nx;
          vel.z -= vn * (1 + TREE_REST) * nz;
          vel.x += nx * TREE_KICK;
          vel.z += nz * TREE_KICK;
          vel.y *= 0.45;
        }
        hit = true;
      }
    }
  }
  return { hit, crash: false, impact, gap, nx: hitNx, nz: hitNz, idx: hitIdx };
}

function mergeHits(a, b) {
  const npcHit = b?.npc ? b : a?.npc ? a : null;
  return {
    hit: !!(a?.hit || b?.hit),
    crash: !!(a?.crash || b?.crash),
    impact: Math.max(a?.impact || 0, b?.impact || 0),
    gap: Math.min(a?.gap ?? Infinity, b?.gap ?? Infinity),
    npc: npcHit?.npc || null,
    nx: npcHit?.nx || b?.nx || a?.nx || 0,
    nz: npcHit?.nz || b?.nz || a?.nz || 0,
  };
}

export function collideCylinders(pos, vel, list) {
  if (!list?.length) return { hit: false, crash: false, impact: 0, gap: Infinity };
  const hash = { cell: 12, buckets: new Map(), xzr: [] };
  for (const o of list) {
    if (!o || o.r == null) continue;
    const i = hash.xzr.length;
    hash.xzr.push(o.x, o.z, o.r);
    const ix = Math.floor(o.x / hash.cell);
    const iz = Math.floor(o.z / hash.cell);
    const key = `${ix},${iz}`;
    let bin = hash.buckets.get(key);
    if (!bin) {
      bin = [];
      hash.buckets.set(key, bin);
    }
    bin.push(i);
  }
  const r = collideTrees(pos, vel, hash);
  if (r.hit && r.idx >= 0) {
    const o = list[Math.floor(r.idx / 3)];
    r.npc = o?.mesh || null;
    r.crash = true;
  }
  return r;
}

const FALL_DOWN = 0.5;
const FALL_LIE = 0.22;
const FALL_UP = 0.48;
const FALL_S = FALL_DOWN + FALL_LIE + FALL_UP;
const FALL_RIDE = 0.22;
const IFRAME_S = 1.2;

export function beginFall(THREE, skier, hf, side = 1) {
  if (!skier || skier.userData.fall) return;
  const n = slopeNormal(THREE, hf, skier.position.x, skier.position.z, v3(THREE, _n));
  const s = side >= 0 ? 1 : -1;
  skier.userData.fall = {
    t: 0,
    side: s,
    q0: skier.quaternion.clone(),
  };
  const fwd = v3(THREE, _fwd).set(0, 0, 1).applyQuaternion(skier.quaternion);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-8) fwd.set(n.x, 0, n.z);
  fwd.normalize();
  fwd.addScaledVector(n, -fwd.dot(n)).normalize();
  const right = v3(THREE, _right).crossVectors(n, fwd);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  else right.normalize();
  fwd.crossVectors(right, n).normalize();
  const bodyUp = v3(THREE, _up).copy(right).multiplyScalar(s);
  const bodyRight = v3(THREE, _lat).crossVectors(bodyUp, fwd);
  if (bodyRight.lengthSq() < 1e-8) bodyRight.copy(n);
  else bodyRight.normalize();
  bodyUp.crossVectors(fwd, bodyRight).normalize();
  if (!_mat.m) _mat.m = new THREE.Matrix4();
  _mat.m.makeBasis(bodyRight, bodyUp, fwd);
  skier.userData.fall.q1 = new THREE.Quaternion().setFromRotationMatrix(_mat.m);
}

export function clearFall(skier) {
  if (!skier?.userData) return;
  skier.userData.fall = null;
  if (skier.userData.pose) skier.userData.pose.tuck = 0;
}

/** Tumble, lie, then stand up. Returns true while the sequence is still playing. */
export function tickFallPose(THREE, skier, hf, dt) {
  const f = skier.userData.fall;
  if (!f || !hf) return false;
  f.t += dt;
  const t = f.t;
  let e = 1;
  if (t <= FALL_DOWN) {
    const u = Math.min(1, t / FALL_DOWN);
    e = u * u * (3 - 2 * u);
  } else if (t <= FALL_DOWN + FALL_LIE) {
    e = 1;
  } else {
    const u = Math.min(1, (t - FALL_DOWN - FALL_LIE) / FALL_UP);
    const s = u * u * (3 - 2 * u);
    e = 1 - s;
  }
  if (f.q0 && f.q1) skier.quaternion.copy(f.q0).slerp(f.q1, e);
  const ground = hf.sample(skier.position.x, skier.position.z);
  skier.position.y = ground + RIDE + (FALL_RIDE - RIDE) * e;
  return t < FALL_S;
}

export function standUp(THREE, skier, hf, vel) {
  clearFall(skier);
  if (!skier || !hf) return;
  skier.userData.fallIframes = IFRAME_S;
  const n = slopeNormal(THREE, hf, skier.position.x, skier.position.z, v3(THREE, _n));
  const fall = fallLine(THREE, n, v3(THREE, _fall));
  skier.position.y = hf.sample(skier.position.x, skier.position.z) + RIDE;
  if (vel) vel.copy(fall).multiplyScalar(6.2);
}

export function makeAirState() {
  return { on: false, vy: 0, t: 0, height: 0, cool: 0, tuckHeld: false, ox: 0, oz: 0 };
}

export function resetAirState(air) {
  if (!air) return;
  air.on = false;
  air.vy = 0;
  air.t = 0;
  air.height = 0;
  air.cool = 0;
  air.tuckHeld = false;
  air.ox = 0;
  air.oz = 0;
}

function readTurn(keys) {
  const ax = analogAxes();
  const keyLeft = keys.has("KeyA") || keys.has("ArrowLeft");
  const keyRight = keys.has("KeyD") || keys.has("ArrowRight");
  let turn = ax.steer;
  if (keyLeft && !keyRight) turn = 1;
  else if (keyRight && !keyLeft) turn = -1;
  else if (keyLeft && keyRight) turn = 0;
  return Math.max(-1, Math.min(1, turn));
}

function wantTuck(keys) {
  return keys.has("KeyW") || keys.has("ArrowUp") || analogAxes().tuck > 0.35;
}

function wantBrake(keys) {
  return keys.has("KeyS") || keys.has("ArrowDown") || analogAxes().brake > 0.35;
}

function wantJump(keys) {
  return keys.has("Space");
}

function popAir(air, pos, vy) {
  air.on = true;
  air.t = 0;
  air.ox = pos.x;
  air.oz = pos.z;
  air.vy = vy;
  air.height = 0.28;
}

const SHOVE_S = 0.4;
const SHOVE_HIT_AT = 0.1;

export function startShove(skier, side = 1) {
  if (!skier?.userData || (skier.userData.shoveT || 0) > 0) return false;
  skier.userData.shoveT = SHOVE_S;
  skier.userData.shoveSide = side >= 0 ? 1 : -1;
  skier.userData.shoveHit = false;
  return true;
}

export function shoveShouldHit(skier) {
  const t = skier.userData?.shoveT || 0;
  return t > 0 && !skier.userData.shoveHit && SHOVE_S - t >= SHOVE_HIT_AT;
}

export function markShoveHit(skier) {
  if (skier?.userData) skier.userData.shoveHit = true;
}

function shoveStroke(u) {
  if (u < 0.28) {
    const t = smooth01(u / 0.28);
    return { poleX: lerp(1.24, 0.15, t), poleZ: lerp(0.14, 1.05, t), armX: lerp(0, -1.25, t), armZ: lerp(0, -0.55, t) };
  }
  if (u < 0.48) {
    const t = smooth01((u - 0.28) / 0.2);
    return { poleX: lerp(0.15, 0.85, t), poleZ: lerp(1.05, -0.95, t), armX: lerp(-1.25, 0.2, t), armZ: lerp(-0.55, 0.35, t) };
  }
  const t = smooth01((u - 0.48) / 0.52);
  return { poleX: lerp(0.85, 1.24, t), poleZ: lerp(-0.95, 0.14, t), armX: lerp(0.2, 0, t), armZ: lerp(0.35, 0, t) };
}

/** Split velocity into along-ski and sideways, then bleed only the sideways part. */
function carve(THREE, vel, fwd, edged, powder, dt) {
  const along = vel.dot(fwd);
  const lat = v3(THREE, _lat).copy(vel).addScaledVector(fwd, -along);
  const skidLen = lat.length();
  if (skidLen < 1e-6) return 0;
  const rate = (edged ? SKID_EDGE : SKID_BASE) + (powder ? POWDER_SKID : 0);
  lat.multiplyScalar(Math.exp(-rate * dt));
  vel.copy(fwd).multiplyScalar(along).add(lat);
  return skidLen;
}

function stepAir(THREE, { pos, vel, heading, keys, hf, dt, trees, air, extras }) {
  const turn = readTurn(keys);
  if (Math.abs(turn) > 0.04) heading += turn * AIR_TURN * dt;

  air.t += dt;
  air.vy -= G_AIR * dt;
  vel.y = 0;
  vel.multiplyScalar(Math.max(0, 1 - AIR_DRAG * dt));

  pos.x += vel.x * dt;
  pos.z += vel.z * dt;
  pos.y += air.vy * dt;
  clampToDem(pos, hf);
  const treeHit = mergeHits(collideTrees(pos, vel, trees), collideCylinders(pos, vel, extras));
  if (treeHit.impact >= 7) treeHit.crash = true;

  const ground = hf.sample(pos.x, pos.z);
  air.height = Math.max(0, pos.y - RIDE - ground);
  heading = wrapAngle(heading);

  const forced = air.t >= MAX_AIR_S;
  if (pos.y - RIDE > ground && !forced) {
    vel.y = air.vy;
    return {
      heading,
      ground,
      speed: vel.length(),
      steer: turn,
      treeHit,
      air: true,
      landed: 0,
      airTime: air.t,
      airDist: Math.hypot(pos.x - (air.ox || pos.x), pos.z - (air.oz || pos.z)),
    };
  }

  const impact = Math.max(0, -air.vy);
  const airTime = air.t;
  const airDist = Math.hypot(pos.x - (air.ox || pos.x), pos.z - (air.oz || pos.z));
  pos.y = ground + RIDE;
  vel.y = 0;
  const n = slopeNormal(THREE, hf, pos.x, pos.z, v3(THREE, _n));
  vel.addScaledVector(n, -vel.dot(n));
  if (impact > LAND_HARD) {
    vel.multiplyScalar(Math.max(0.45, 1 - (impact - LAND_HARD) * 0.035));
  }
  /* Kill any bounce back up the hill from a soft landing. */
  const fall = fallLine(THREE, n, v3(THREE, _fall));
  if (vel.dot(fall) < 0) {
    const uphill = -vel.dot(fall);
    vel.addScaledVector(fall, uphill);
  }
  air.on = false;
  air.vy = 0;
  air.t = 0;
  air.height = 0;
  air.cool = AIR_COOL;
  return { heading, ground, speed: vel.length(), steer: turn, treeHit, air: false, landed: impact, airTime, airDist };
}

export function stepSki(THREE, { pos, vel, heading, keys, hf, dt, trees, air, onPiste = true, extras }) {
  if (air?.cool > 0) air.cool = Math.max(0, air.cool - dt);
  if (air?.on) return stepAir(THREE, { pos, vel, heading, keys, hf, dt, trees, air, extras });

  const n = slopeNormal(THREE, hf, pos.x, pos.z, v3(THREE, _n));
  const fall = fallLine(THREE, n, v3(THREE, _fall));
  const grade = gradeSin(n);
  vel.addScaledVector(fall, G_FALL * grade * dt);

  const turn = readTurn(keys);
  const speed = vel.length();
  const yawRate = TURN / (1 + speed * TURN_DAMP);
  if (Math.abs(turn) > 0.04) {
    const yaw = turn * yawRate * dt;
    heading += yaw;
    if (speed > 0.25) {
      vel.applyAxisAngle(v3(THREE, _axis).copy(n), yaw);
    } else {
      vel.addScaledVector(fall, 3 * dt);
    }
  }

  const fwd = v3(THREE, _fwd).set(Math.sin(heading), 0, Math.cos(heading));
  fwd.addScaledVector(n, -fwd.dot(n));
  if (fwd.lengthSq() < 1e-8) fwd.copy(fall);
  fwd.normalize();

  const powder = !onPiste;
  const skid = carve(THREE, vel, fwd, Math.abs(turn) > 0.12 && speed > 0.8, powder, dt);

  const autoTuck = speed > 11 && grade > 0.05;
  const wantFwd = wantTuck(keys) || autoTuck;
  const braking = wantBrake(keys);
  const along = vel.dot(fwd);
  let pole = false;
  if (onPiste && wantFwd && !braking && along < POLE_ENGAGE) {
    const look = 2.4;
    const yHere = hf.sample(pos.x, pos.z);
    const yAhead = hf.sample(pos.x + fwd.x * look, pos.z + fwd.z * look);
    const rise = (yAhead - yHere) / look;
    const cliff = rise > POLE_MAX_RISE || n.y < POLE_MIN_NY;
    if (!cliff) {
      pole = true;
      const boost = POLE_PUSH * (along < 0 ? 1.35 : 1 - Math.max(0, along) / POLE_ENGAGE);
      vel.addScaledVector(fwd, boost * dt);
      const next = vel.dot(fwd);
      if (next > POLE_MAX) vel.addScaledVector(fwd, POLE_MAX - next);
    }
  } else if (onPiste && wantFwd && !braking) {
    vel.addScaledVector(fwd, TUCK * dt);
  }
  if (braking) vel.multiplyScalar(Math.max(0, 1 - BRAKE * dt));
  const across = 1 - Math.max(0, fwd.dot(fall));
  const drag = DRAG + TRAVERSE_DRAG * across * across + (powder ? BARE_DRAG : 0);
  vel.multiplyScalar(Math.max(0, 1 - drag * dt));
  vel.addScaledVector(n, -vel.dot(n));
  if (vel.length() > MAX_SPD) vel.setLength(MAX_SPD);

  const y0 = pos.y - RIDE;
  const vy0 = vel.y;
  pos.addScaledVector(vel, dt);
  clampToDem(pos, hf);
  const treeHit = collideTrees(pos, vel, trees);
  const extraHit = collideCylinders(pos, vel, extras);
  if (treeHit.impact >= 7) treeHit.crash = true;
  const merged = mergeHits(treeHit, extraHit);
  Object.assign(treeHit, merged);
  const ground = hf.sample(pos.x, pos.z);
  const climb = ground - y0;
  const step = Math.max(vel.length() * dt, 0.04);
  if (climb > 0.28 && vel.length() > 6) {
    const face = climb / step;
    if (face > 0.48) {
      const slam = Math.min(0.88, (face - 0.42) * 0.85 + (vel.length() - 6) * 0.028);
      vel.multiplyScalar(1 - slam);
    }
  }

  heading = wrapAngle(heading);
  const sep = pos.y - RIDE - ground;
  const groundVel = (ground - y0) / Math.max(dt, 1e-4);
  const leaving = vy0 - groundVel;
  const look = 3.8;
  const yAhead = hf.sample(pos.x + fwd.x * look, pos.z + fwd.z * look);
  const slopeAhead = (yAhead - ground) / look;
  const horiz = Math.hypot(vel.x, vel.z) || 1;
  const slopeNow = vel.y / horiz;
  const convex = slopeNow - slopeAhead;
  const tucked = wantTuck(keys) || autoTuck;
  const tuckPop = !!(air?.tuckHeld && !tucked && vel.length() > 10 && convex > 0.04 && slopeAhead < -0.02);
  if (air) air.tuckHeld = tucked;
  if (air && air.cool <= 0 && wantJump(keys) && !treeHit.hit && climb <= 0.14) {
    popAir(air, pos, JUMP_VY + Math.min(0.8, vel.length() * 0.03));
    air.cool = JUMP_COOL;
    pos.y = ground + RIDE + 0.22;
    return { heading, ground, speed: vel.length(), steer: turn, treeHit, air: true, landed: 0, skid };
  }
  const lip =
    (sep > LAUNCH_MIN && leaving > LAUNCH_SEP) ||
    (convex > LAUNCH_CONVEX && slopeAhead < -0.03) ||
    tuckPop;
  if (air && air.cool <= 0 && climb <= 0 && vel.length() > LAUNCH_SPD && !treeHit.hit && lip) {
    popAir(air, pos, Math.min(4.4, Math.max(1.15, tuckPop ? 2.6 : Math.max(leaving * 0.42, convex * horiz * 0.55))));
    air.height = Math.max(sep, 0.2);
    return { heading, ground, speed: vel.length(), steer: turn, treeHit, air: true, landed: 0, skid };
  }

  pos.y = ground + RIDE;
  const n2 = slopeNormal(THREE, hf, pos.x, pos.z, v3(THREE, _n));
  vel.addScaledVector(n2, -vel.dot(n2));
  return { heading, ground, speed: vel.length(), steer: turn, treeHit, air: false, landed: 0, skid, pole };
}

const POSE_K = 0.18;
/** Hip-to-boot reach of the authored legs, and how far the hips drop in a full tuck. */
const LEG_LEN = 0.85;
const CROUCH_M = 0.16;

function ease(cur, want) {
  return cur + (want - cur) * POSE_K;
}

function smooth01(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Double-pole: reach forward, plant both baskets, then push them back. ~1.4 s. */
const POLE_CYCLE = 1.4;

function poleStroke(u) {
  if (u < 0.3) {
    const t = smooth01(u / 0.3);
    return { poleX: lerp(0.85, -0.48, t), fold: lerp(0.1, 0.16, t), plant: t };
  }
  if (u < 0.42) {
    return { poleX: -0.48, fold: 0.18, plant: 1 };
  }
  if (u < 0.84) {
    const t = smooth01((u - 0.42) / 0.42);
    return { poleX: lerp(-0.48, 1.18, t), fold: lerp(0.18, 0.62, t), plant: 1 - t };
  }
  const t = smooth01((u - 0.84) / 0.16);
  return { poleX: lerp(1.18, 0.85, t), fold: lerp(0.62, 0.1, t), plant: 0 };
}

/** Lean into the carve, fold over the tuck, wedge on the brake, curl up in the air. */
function posture(skier, steer, lean, opts) {
  const pose = skier.userData.pose;
  const torso = skier.userData.torso;
  if (!pose || !torso) return;
  const dt = opts.dt || 1 / 60;
  const air = !!opts.air;
  const brake = !!opts.brake;
  const tuck = !!opts.tuck && !opts.pole;
  const shoving = (skier.userData.shoveT || 0) > 0;
  const poling = !!opts.pole && !shoving;

  let stroke = { poleX: 1.24, fold: 0.18, plant: 0 };
  if (shoving) {
    const u = 1 - skier.userData.shoveT / SHOVE_S;
    skier.userData.shoveT = Math.max(0, skier.userData.shoveT - dt);
    stroke = shoveStroke(Math.min(1, Math.max(0, u)));
  } else if (poling) {
    skier.userData.poleT = (skier.userData.poleT || 0) + dt;
    stroke = poleStroke(((skier.userData.poleT % POLE_CYCLE) + POLE_CYCLE) % POLE_CYCLE / POLE_CYCLE);
  } else {
    skier.userData.poleT = 0;
  }

  const speed = opts.speed || 0;
  const turning = Math.abs(steer) > 0.28;
  let wantTuckAmt = 0;
  if (!brake && !air && !turning && !poling && speed > 16) {
    wantTuckAmt = Math.min(TUCK_CAP, (speed - 16) / 14);
  }
  if (tuck && !brake) wantTuckAmt = Math.max(wantTuckAmt, TUCK_CAP);
  if (poseTune.manual) wantTuckAmt = Math.min(1, Math.max(0, poseTune.tuckAmount));
  const damp = 1 - Math.exp(-dt / TUCK_TAU);
  pose.tuck = (pose.tuck || 0) + (wantTuckAmt - (pose.tuck || 0)) * damp;
  const tuckAmt = pose.tuck;

  const readyPitch = poseTune.torsoPitch;
  const readyAbd = poseTune.shoulderAbduct;
  const readyFlex = poseTune.shoulderFlex;
  const readyElbow = poseTune.elbowBend;
  const pitch = lerp(readyPitch, TUCK_POSE.torsoPitch, tuckAmt);
  const abduct = lerp(readyAbd, TUCK_POSE.shoulderAbduct, tuckAmt);
  const flex = lerp(readyFlex, TUCK_POSE.shoulderFlex, tuckAmt);
  const elbowBend = lerp(readyElbow, TUCK_POSE.elbowBend, tuckAmt);
  const headPitch = lerp(READY_POSE.headPitch, TUCK_POSE.headPitch, tuckAmt);

  const wantCrouch = air ? 0.55 : 0.1 + tuckAmt * 0.35;
  const wantSplay = brake ? 1 : Math.min(1, Math.abs(steer) * 0.5 + (skier.userData.skid || 0) * 0.07);
  const wantAir = air ? 1 : 0;

  pose.crouch = ease(pose.crouch, wantCrouch);
  pose.splay = ease(pose.splay, wantSplay);
  pose.air = ease(pose.air || 0, wantAir);

  const drop = pose.crouch * CROUCH_M;
  const edge = Math.max(-ARM_SWAY, Math.min(ARM_SWAY, lean * 0.35));
  torso.rotation.x = pitch * DEG;
  torso.rotation.z = -edge;
  torso.position.y = -drop;
  torso.position.z = tuckAmt * 0.04;

  const legs = skier.userData.legs;
  if (legs) {
    legs.position.y = -drop;
    legs.scale.y = 1 - drop / LEG_LEN;
  }
  const head = skier.userData.head;
  if (head) head.rotation.x = headPitch * DEG;

  const splay = pose.splay * 0.13;
  const lift = pose.air;
  for (const [node, side] of [
    [skier.userData.skiL, -1],
    [skier.userData.skiR, 1],
  ]) {
    if (!node) continue;
    const flat = node.userData.flat;
    if (flat) {
      node.rotation.x = flat.x - lift * 0.2;
      node.rotation.y = flat.y + side * splay;
      node.rotation.z = flat.z - lean * 0.35;
    } else {
      node.rotation.y = side * splay;
      node.rotation.z = -lean * 0.35;
      node.rotation.x = -lift * 0.2;
    }
    if (node.userData.rest) {
      node.position.x = node.userData.rest.x;
      node.position.y = node.userData.rest.y + lift * 0.05;
    } else {
      node.position.y = -0.99 + lift * 0.09;
      node.position.x = side * (0.32 + pose.splay * 0.06);
    }
  }
  const joints = skier.userData.joints;
  if (joints?.hipL && joints?.hipR) {
    joints.hipL.rotation.z = edge;
    joints.hipR.rotation.z = edge;
    const extra = tuckAmt * (TUCK_POSE.kneeBend - READY_POSE.kneeBend) * DEG;
    joints.kneeL.rotation.x = (joints.kneeL.userData.restX || 0.55) + extra;
    joints.kneeR.rotation.x = (joints.kneeR.userData.restX || 0.55) + extra;
  }
  if (joints?.shoulderL && joints?.elbowL) {
    joints.shoulderL.rotation.x = -flex * DEG;
    joints.shoulderR.rotation.x = -flex * DEG;
    joints.shoulderL.rotation.z = -abduct * DEG;
    joints.shoulderR.rotation.z = abduct * DEG;
    joints.elbowL.rotation.x = -elbowBend * DEG;
    joints.elbowR.rotation.x = -elbowBend * DEG;
  }

  const poleL = skier.userData.poleL;
  const poleR = skier.userData.poleR;
  const k = shoving ? 0.38 : poling ? 0.22 : 0.14;
  if (poleL && poleR) {
    const restXL = poleL.userData.restX || 1.24;
    const restXR = poleR.userData.restX || 1.24;
    const restZL = poleL.userData.restZ || -0.14;
    const restZR = poleR.userData.restZ || 0.14;
    const leftHit = shoving && (skier.userData.shoveSide || 1) < 0;
    const rightHit = shoving && !leftHit;
    const cap = (v) => Math.max(-ARM_SWAY, Math.min(ARM_SWAY, v));
    const wantXL = restXL + cap(leftHit || poling ? stroke.poleX - restXL : 0);
    const wantXR = restXR + cap(rightHit || poling ? stroke.poleX - restXR : 0);
    const wantZL = restZL + cap(leftHit ? -stroke.poleZ : 0);
    const wantZR = restZR + cap(rightHit ? stroke.poleZ : 0);
    poleL.rotation.x += (wantXL - poleL.rotation.x) * k;
    poleR.rotation.x += (wantXR - poleR.rotation.x) * k;
    poleL.rotation.z += (wantZL - poleL.rotation.z) * k;
    poleR.rotation.z += (wantZR - poleR.rotation.z) * k;
  }
  const armL = skier.userData.armL;
  const armR = skier.userData.armR;
  if (armL && armR) {
    const wantArmL = -flex * DEG;
    const wantArmR = -flex * DEG;
    const wantZL = -abduct * DEG;
    const wantZR = abduct * DEG;
    armL.rotation.x += (wantArmL - armL.rotation.x) * k;
    armR.rotation.x += (wantArmR - armR.rotation.x) * k;
    armL.rotation.z += (wantZL - armL.rotation.z) * k;
    armR.rotation.z += (wantZR - armR.rotation.z) * k;
  }
}

export function orientSkier(THREE, skier, pos, heading, vel, hf, steer = 0, opts = {}) {
  const n = slopeNormal(THREE, hf, pos.x, pos.z, v3(THREE, _n));
  const up = v3(THREE, _up).set(0, 1, 0).lerp(n, 0.72).normalize();
  const fwd = v3(THREE, _fwd).set(Math.sin(heading), 0, Math.cos(heading));
  fwd.addScaledVector(up, -fwd.dot(up));
  if (fwd.lengthSq() < 1e-8) fwd.set(n.x, 0, n.z);
  fwd.normalize();
  const right = v3(THREE, _right).crossVectors(up, fwd);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  else right.normalize();
  fwd.crossVectors(right, up).normalize();
  const fast = Math.min(1, (opts.speed || vel.length()) / 26);
  const wantLean = opts.air ? 0 : steer * (0.16 + fast * 0.22);
  const lean = (skier.userData.lean || 0) + (wantLean - (skier.userData.lean || 0)) * POSE_K;
  skier.userData.lean = lean;
  right.addScaledVector(up, lean);
  right.normalize();
  up.crossVectors(fwd, right).normalize();
  right.crossVectors(up, fwd).normalize();
  if (!_mat.m) _mat.m = new THREE.Matrix4();
  _mat.m.makeBasis(right, up, fwd);
  skier.quaternion.setFromRotationMatrix(_mat.m);
  posture(skier, steer, lean, opts);
}

export function chaseCam(THREE, camera, pos, heading, vel, hf) {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const wantYaw = heading;
  let yaw = camera.userData.skiYaw;
  if (yaw == null || Number.isNaN(yaw)) yaw = wantYaw;
  yaw += wrapAngle(wantYaw - yaw) * 0.1;
  camera.userData.skiYaw = yaw;
  const back = v3(THREE, _fwd).set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const baseY = hf?.sampleBase ? hf.sampleBase(pos.x, pos.z) : pos.y - RIDE;
  const want = v3(THREE, _want);
  const camH = coarse ? 8.4 : 7.4;
  const camBack = coarse ? 16 : 18;
  want.set(pos.x, baseY + camH, pos.z).addScaledVector(back, camBack);
  if (hf?.sampleBase) want.y = Math.max(want.y, hf.sampleBase(want.x, want.z) + 4.2);
  const snap = !camera.userData.skiRig || camera.position.distanceToSquared(want) > 2500;
  camera.userData.skiRig = true;
  if (snap) camera.position.copy(want);
  else camera.position.lerp(want, 0.085);
  const look = v3(THREE, _look);
  const lookAhead = coarse ? -14 : -10;
  look.set(pos.x, baseY + 1.15, pos.z).addScaledVector(back, lookAhead);
  if (!camera.userData.skiLook) camera.userData.skiLook = look.clone();
  else camera.userData.skiLook.lerp(look, 0.095);
  const L = camera.userData.skiLook;
  camera.lookAt(L.x, L.y, L.z);
}

export function isoCam(THREE, camera, pos, heading, vel, hf) {
  const wantYaw = heading;
  let yaw = camera.userData.skiYaw;
  if (yaw == null || Number.isNaN(yaw)) yaw = wantYaw;
  yaw += wrapAngle(wantYaw - yaw) * 0.08;
  camera.userData.skiYaw = yaw;
  const back = v3(THREE, _fwd).set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const baseY = hf?.sampleBase ? hf.sampleBase(pos.x, pos.z) : pos.y - RIDE;
  const want = v3(THREE, _want);
  want.set(pos.x, baseY + 25, pos.z).addScaledVector(back, 16);
  if (hf?.sampleBase) want.y = Math.max(want.y, hf.sampleBase(want.x, want.z) + 12);
  const snap = !camera.userData.skiRig || camera.position.distanceToSquared(want) > 2500;
  camera.userData.skiRig = true;
  if (snap) camera.position.copy(want);
  else camera.position.lerp(want, 0.07);
  const look = v3(THREE, _look);
  look.set(pos.x, baseY + 0.6, pos.z).addScaledVector(back, -10);
  if (!camera.userData.skiLook) camera.userData.skiLook = look.clone();
  else camera.userData.skiLook.lerp(look, 0.08);
  const L = camera.userData.skiLook;
  camera.lookAt(L.x, L.y, L.z);
}

/** Speed reads as FOV: slow is calm, fast is wide, tucking adds a little more. */
export function punchFov(camera, tucked, dt, speed = 0) {
  const t = Math.min(1, Math.max(0, speed / MAX_SPD));
  const coarse = matchMedia("(pointer: coarse)").matches;
  const target = (coarse ? 62 : 58) + t * 11 + (tucked ? 3 : 0);
  camera.fov += (target - camera.fov) * Math.min(1, dt * 5);
  camera.updateProjectionMatrix();
}

const TRAUMA_DECAY = 1.7;
const SHAKE_PITCH = 0.035;
const SHAKE_YAW = 0.03;
const SHAKE_ROLL = 0.05;

export function makeCamShake() {
  return { trauma: 0, t: 0 };
}

export function addTrauma(shake, amount) {
  if (!shake || !(amount > 0)) return;
  shake.trauma = Math.min(1, shake.trauma + amount);
}

/**
 * Rotation-only shake. lookAt rewrites camera orientation every frame, so these
 * offsets cannot accumulate; only call this right after a camera update.
 */
export function applyCamShake(camera, shake, dt) {
  if (!shake) return;
  shake.t += dt;
  shake.trauma = Math.max(0, shake.trauma - TRAUMA_DECAY * dt);
  if (shake.trauma <= 0.002) return;
  const s = shake.trauma * shake.trauma;
  const t = shake.t * 32;
  camera.rotateX(Math.sin(t * 1.7) * s * SHAKE_PITCH);
  camera.rotateY(Math.sin(t * 2.3 + 1.1) * s * SHAKE_YAW);
  camera.rotateZ(Math.sin(t * 1.31 + 2.7) * s * SHAKE_ROLL);
}

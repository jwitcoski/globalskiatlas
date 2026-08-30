/** Arcade ski on DEM. Gravity is fall-line only (none on flats). Custom, not Rapier. */

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
const POWDER_DRAG = 0.42;
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

function std(THREE, color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: extra.metalness ?? 0,
    roughness: extra.roughness ?? 0.72,
    envMapIntensity: extra.env ?? 0.55,
    flatShading: extra.flat !== false,
    ...extra.rest,
  });
}

/**
 * Stylized low-poly alpine racer: red/white race suit, white helmet on mirrored
 * goggles, long yellow skis. Built as named joints so `orientSkier` can pose it
 * (lean, tuck, brake, air) and so `skiTails` can still find the ski tails.
 */
export function makeSkier(THREE, scene, opts = {}) {
  const g = new THREE.Group();
  g.name = opts.name || "skier";

  const suit = std(THREE, opts.suit ?? 0xd8342e, { roughness: 0.6 });
  const panel = std(THREE, 0xf1f3f6, { roughness: 0.64 });
  const dark = std(THREE, 0x1b1e23, { roughness: 0.5, env: 0.75 });
  const shell = std(THREE, 0xf6f8fa, { roughness: 0.3, metalness: 0.06, env: 0.95 });
  const skiTop = std(THREE, opts.ski ?? 0xf2c02e, { roughness: 0.28, metalness: 0.16, env: 1 });
  const skiBase = std(THREE, 0x15171c, { roughness: 0.22, metalness: 0.3, env: 1 });
  const skin = std(THREE, 0xd2a887, { roughness: 0.72 });
  const metal = std(THREE, 0x8d949c, { roughness: 0.34, metalness: 0.6, env: 1 });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x101820,
    metalness: 0.85,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.6,
  });

  /* --- hips: everything above the boots, so tuck/lean rotate here --- */
  const torso = new THREE.Group();
  torso.name = "torso";

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.26), suit);
  pelvis.name = "pelvis";
  pelvis.position.y = 0.02;

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.5, 8), suit);
  chest.name = "chest";
  chest.position.y = 0.36;
  const bib = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.17, 8, 1, true), panel);
  bib.position.y = 0.44;
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.26), suit);
  shoulders.position.y = 0.6;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.14), dark);
  pack.position.set(0, 0.4, -0.24);

  const head = new THREE.Group();
  head.name = "head";
  head.position.y = 0.72;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.09, 6), skin);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), shell);
  helmet.name = "helmet";
  helmet.position.y = 0.19;
  helmet.scale.set(1.04, 0.94, 1.1);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.1), shell);
  brim.position.set(0, 0.2, 0.19);
  brim.rotation.x = 0.18;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI, 0.9, 0.7), visorMat);
  visor.name = "visor";
  visor.position.set(0, 0.17, 0.02);
  visor.rotation.y = Math.PI;
  visor.scale.set(1.06, 0.85, 1.14);
  head.add(neck, helmet, brim, visor);

  const armG = new THREE.CylinderGeometry(0.062, 0.05, 0.44, 6);
  const gloveG = new THREE.BoxGeometry(0.11, 0.1, 0.14);
  function arm(side) {
    const root = new THREE.Group();
    root.name = side < 0 ? "armL" : "armR";
    root.position.set(side * 0.26, 0.56, 0.02);
    const upper = new THREE.Mesh(armG, suit);
    upper.position.set(side * 0.06, -0.18, 0.14);
    upper.rotation.set(-0.85, 0, side * -0.24);
    const glove = new THREE.Mesh(gloveG, dark);
    glove.position.set(side * 0.11, -0.32, 0.36);
    root.add(upper, glove);
    root.userData.upper = upper;
    root.userData.glove = glove;
    root.userData.restRot = { x: 0, y: 0, z: 0 };
    return root;
  }
  const armL = arm(-1);
  const armR = arm(1);

  /* Racer tuck: poles ride under the arms, tips swept back and clear of the snow. */
  const poleG = new THREE.CylinderGeometry(0.014, 0.011, 1.2, 5);
  const basketG = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 6);
  function pole(side) {
    const root = new THREE.Group();
    root.name = side < 0 ? "poleL" : "poleR";
    root.position.set(side * 0.31, 0.22, 0.16);
    root.rotation.set(1.24, 0, side * 0.14);
    root.userData.restX = 1.24;
    root.userData.restZ = side * 0.14;
    const shaft = new THREE.Mesh(poleG, metal);
    shaft.position.y = -0.5;
    const basket = new THREE.Mesh(basketG, dark);
    basket.position.y = -1.0;
    root.add(shaft, basket);
    return root;
  }

  const poleL = pole(-1);
  const poleR = pole(1);
  torso.add(pelvis, chest, bib, shoulders, pack, head, armL, armR, poleL, poleR);

  /* --- legs: scaled on Y for the crouch so the boots stay over the skis --- */
  const legs = new THREE.Group();
  legs.name = "legs";
  const thighG = new THREE.CylinderGeometry(0.105, 0.088, 0.36, 6);
  const calfG = new THREE.CylinderGeometry(0.086, 0.072, 0.3, 6);
  const bootG = new THREE.BoxGeometry(0.14, 0.16, 0.3);
  const cuffG = new THREE.BoxGeometry(0.15, 0.08, 0.2);
  function leg(side) {
    const root = new THREE.Group();
    root.name = side < 0 ? "legL" : "legR";
    root.position.set(side * 0.13, -0.08, 0);
    const thigh = new THREE.Mesh(thighG, suit);
    thigh.name = "thigh";
    thigh.position.set(0, -0.19, 0.03);
    const calf = new THREE.Mesh(calfG, panel);
    calf.name = "calf";
    calf.position.set(0, -0.52, 0.01);
    const boot = new THREE.Mesh(bootG, dark);
    boot.name = "boot";
    boot.position.set(0, -0.77, 0.05);
    const cuff = new THREE.Mesh(cuffG, skiTop);
    cuff.position.set(0, -0.68, 0.02);
    root.add(thigh, calf, boot, cuff);
    return root;
  }
  legs.add(leg(-1), leg(1));

  /* --- skis: siblings of the body so they stay welded to the snow line --- */
  const skiL = new THREE.Group();
  const skiR = new THREE.Group();
  skiL.name = "skiL";
  skiR.name = "skiR";
  const boardG = new THREE.BoxGeometry(0.115, 0.026, 1.9);
  const edgeG = new THREE.BoxGeometry(0.125, 0.012, 1.9);
  const tipG = new THREE.BoxGeometry(0.1, 0.022, 0.2);
  const bindG = new THREE.BoxGeometry(0.13, 0.05, 0.34);
  function buildSki(group, x) {
    const board = new THREE.Mesh(boardG, skiTop);
    board.position.y = 0.012;
    const edge = new THREE.Mesh(edgeG, skiBase);
    edge.position.y = -0.006;
    const tip = new THREE.Mesh(tipG, skiTop);
    tip.position.set(0, 0.055, 0.98);
    tip.rotation.x = -0.4;
    const tail = new THREE.Mesh(tipG, skiTop);
    tail.position.set(0, 0.035, -0.97);
    tail.rotation.x = 0.24;
    const binding = new THREE.Mesh(bindG, dark);
    binding.position.set(0, 0.05, 0.05);
    group.add(board, edge, tip, tail, binding);
    group.position.set(x, -0.99, 0.12);
  }
  buildSki(skiL, -0.19);
  buildSki(skiR, 0.19);

  g.add(torso, legs, skiL, skiR);
  g.userData.torso = torso;
  g.userData.legs = legs;
  g.userData.head = head;
  g.userData.skiL = skiL;
  g.userData.skiR = skiR;
  g.userData.poleL = poleL;
  g.userData.poleR = poleR;
  g.userData.armL = armL;
  g.userData.armR = armR;
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
  return { hit, crash: false, impact, gap };
}

function mergeHits(a, b) {
  return {
    hit: !!(a?.hit || b?.hit),
    crash: false,
    impact: Math.max(a?.impact || 0, b?.impact || 0),
    gap: Math.min(a?.gap ?? Infinity, b?.gap ?? Infinity),
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
  return collideTrees(pos, vel, hash);
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
  let turn = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) turn += 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) turn -= 1;
  return turn;
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
  if (turn !== 0) heading += turn * AIR_TURN * dt;

  air.t += dt;
  air.vy -= G_AIR * dt;
  vel.y = 0;
  vel.multiplyScalar(Math.max(0, 1 - AIR_DRAG * dt));

  pos.x += vel.x * dt;
  pos.z += vel.z * dt;
  pos.y += air.vy * dt;
  clampToDem(pos, hf);
  const treeHit = mergeHits(collideTrees(pos, vel, trees), collideCylinders(pos, vel, extras));

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
  if (turn !== 0) {
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
  const skid = carve(THREE, vel, fwd, turn !== 0 && speed > 0.8, powder, dt);

  const wantFwd = keys.has("KeyW") || keys.has("ArrowUp");
  const braking = keys.has("KeyS") || keys.has("ArrowDown");
  const along = vel.dot(fwd);
  let pole = false;
  if (wantFwd && !braking && along < POLE_ENGAGE) {
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
  } else if (wantFwd && !braking) {
    vel.addScaledVector(fwd, TUCK * dt);
  }
  if (braking) vel.multiplyScalar(Math.max(0, 1 - BRAKE * dt));
  const across = 1 - Math.max(0, fwd.dot(fall));
  const drag = DRAG + TRAVERSE_DRAG * across * across + (powder ? POWDER_DRAG : 0);
  vel.multiplyScalar(Math.max(0, 1 - drag * dt));
  vel.addScaledVector(n, -vel.dot(n));
  if (vel.length() > MAX_SPD) vel.setLength(MAX_SPD);

  const y0 = pos.y - RIDE;
  const vy0 = vel.y;
  pos.addScaledVector(vel, dt);
  clampToDem(pos, hf);
  const treeHit = collideTrees(pos, vel, trees);
  const extraHit = collideCylinders(pos, vel, extras);
  Object.assign(treeHit, mergeHits(treeHit, extraHit));
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
  const tucked = keys.has("KeyW") || keys.has("ArrowUp");
  const tuckPop = !!(air?.tuckHeld && !tucked && vel.length() > 10 && convex > 0.04 && slopeAhead < -0.02);
  if (air) air.tuckHeld = tucked;
  const lip =
    (sep > LAUNCH_MIN && leaving > LAUNCH_SEP) ||
    (convex > LAUNCH_CONVEX && slopeAhead < -0.03) ||
    tuckPop;
  if (air && air.cool <= 0 && climb <= 0 && vel.length() > LAUNCH_SPD && !treeHit.hit && lip) {
    air.on = true;
    air.t = 0;
    air.ox = pos.x;
    air.oz = pos.z;
    air.vy = Math.min(4.4, Math.max(1.15, tuckPop ? 2.6 : Math.max(leaving * 0.42, convex * horiz * 0.55)));
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
  const fast = Math.min(1, (opts.speed || 0) / 26);
  const air = !!opts.air;
  const brake = !!opts.brake;
  const tuck = !!opts.tuck && !opts.pole;
  const poling = !!opts.pole;

  let stroke = { poleX: 1.24, fold: 0.18, plant: 0 };
  if (poling) {
    skier.userData.poleT = (skier.userData.poleT || 0) + dt;
    stroke = poleStroke(((skier.userData.poleT % POLE_CYCLE) + POLE_CYCLE) % POLE_CYCLE / POLE_CYCLE);
  } else {
    skier.userData.poleT = 0;
  }

  const wantCrouch = air ? 0.9 : poling ? 0.28 + stroke.fold * 0.2 : brake ? 0.4 : tuck ? 1 : 0.22 + fast * 0.34;
  const wantFold = air ? 0.55 : poling ? stroke.fold : brake ? 0.08 : tuck ? 1 : 0.24 + fast * 0.34;
  const wantSplay = brake ? 1 : Math.min(1, Math.abs(steer) * 0.5 + (skier.userData.skid || 0) * 0.07);
  const wantAir = air ? 1 : 0;

  pose.crouch = ease(pose.crouch, wantCrouch);
  pose.fold = ease(pose.fold, wantFold);
  pose.splay = ease(pose.splay, wantSplay);
  pose.air = ease(pose.air || 0, wantAir);

  /* Hips sink by `drop`; the legs shorten by the same amount so the boots stay on the skis. */
  const drop = pose.crouch * CROUCH_M;
  torso.rotation.x = 0.14 + pose.fold * 0.72;
  torso.rotation.z = -lean * 0.5;
  torso.position.y = -drop;
  torso.position.z = pose.fold * 0.07;

  const legs = skier.userData.legs;
  if (legs) {
    legs.position.y = -drop;
    legs.scale.y = 1 - drop / LEG_LEN;
    legs.rotation.x = pose.fold * 0.08;
  }
  const head = skier.userData.head;
  if (head) head.rotation.x = -pose.fold * 0.58;

  const splay = pose.splay * 0.13;
  const lift = pose.air;
  for (const [node, side] of [
    [skier.userData.skiL, -1],
    [skier.userData.skiR, 1],
  ]) {
    if (!node) continue;
    node.rotation.y = side * splay;
    node.rotation.z = -lean * 0.45;
    node.rotation.x = -lift * 0.24;
    node.position.y = -0.99 + lift * 0.09;
    node.position.x = side * (0.19 + pose.splay * 0.06);
  }

  const poleL = skier.userData.poleL;
  const poleR = skier.userData.poleR;
  const k = poling ? 0.22 : 0.14;
  if (poleL && poleR) {
    const restXL = poleL.userData.restX || 1.24;
    const restXR = poleR.userData.restX || 1.24;
    const wantX = poling ? stroke.poleX : restXL;
    poleL.rotation.x += (wantX - poleL.rotation.x) * k;
    poleR.rotation.x += ((poling ? stroke.poleX : restXR) - poleR.rotation.x) * k;
    poleL.rotation.z += ((poleL.userData.restZ || -0.14) - poleL.rotation.z) * k;
    poleR.rotation.z += ((poleR.userData.restZ || 0.14) - poleR.rotation.z) * k;
  }
  const armL = skier.userData.armL;
  const armR = skier.userData.armR;
  if (armL && armR) {
    const reach = poling ? 1.05 - stroke.poleX : 0;
    const wantArmX = poling ? -0.15 - reach * 0.55 : 0;
    armL.rotation.x += (wantArmX - armL.rotation.x) * k;
    armR.rotation.x += (wantArmX - armR.rotation.x) * k;
    armL.rotation.z += ((poling ? 0.12 : 0) - armL.rotation.z) * k;
    armR.rotation.z += ((poling ? -0.12 : 0) - armR.rotation.z) * k;
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
  const wantYaw = heading;
  let yaw = camera.userData.skiYaw;
  if (yaw == null || Number.isNaN(yaw)) yaw = wantYaw;
  yaw += wrapAngle(wantYaw - yaw) * 0.1;
  camera.userData.skiYaw = yaw;
  const back = v3(THREE, _fwd).set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const baseY = hf?.sampleBase ? hf.sampleBase(pos.x, pos.z) : pos.y - RIDE;
  const want = v3(THREE, _want);
  want.set(pos.x, baseY + 7.4, pos.z).addScaledVector(back, 18);
  if (hf?.sampleBase) want.y = Math.max(want.y, hf.sampleBase(want.x, want.z) + 4.2);
  const snap = !camera.userData.skiRig || camera.position.distanceToSquared(want) > 2500;
  camera.userData.skiRig = true;
  if (snap) camera.position.copy(want);
  else camera.position.lerp(want, 0.085);
  const look = v3(THREE, _look);
  look.set(pos.x, baseY + 1.15, pos.z).addScaledVector(back, -10);
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
  const target = 58 + t * 11 + (tucked ? 3 : 0);
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

/**
 * T-bar surface lift geometry, catenary cables, and uphill rider towing.
 */

import * as THREE from "three";
import { PALETTE } from "./config.js";
import {
  rng,
  lineParts,
  polylineLen,
  alongPolyline,
  sampleAlongPolyline,
  horizTangentAt,
  sideVector,
  clipPointRuns,
  downsampleLine,
} from "./math-utils.js";
import { gamePoint } from "./trails.js";
import { makeClayRider, RIDER_SUITS, RIDER_SKIS } from "./skiers.js";
import { snowParkFeatureSeed } from "./snowpark.js";

function cableHeightProfile(t, cableH, stationH) {
  const ramp = 0.14;
  let u = 1;
  if (t < ramp) u = t / ramp;
  else if (t > 1 - ramp) u = (1 - t) / ramp;
  u = Math.max(0, Math.min(1, u));
  u = u * u * (3 - 2 * u);
  return stationH + (cableH - stationH) * u;
}

export const SURFACE_LIFT_TYPES = new Set([
  "magic_carpet",
  "t_bar",
  "j_bar",
  "platter",
  "drag_lift",
  "draglift",
  "rope_tow",
  "tape_lift",
  "button_lift",
  "poma",
  "surface_lift",
  "carpet",
]);

export const TBAR_LIFT_TYPES = new Set([
  "t_bar",
  "j_bar",
  "platter",
  "drag_lift",
  "draglift",
  "button_lift",
  "poma",
  "surface_lift",
]);

export function isSurfaceLift(type) {
  return SURFACE_LIFT_TYPES.has(type);
}

export function isTBarLift(type) {
  return TBAR_LIFT_TYPES.has(type);
}


/* ─── T-bar / drag-lift system ─────────────────────────────────────────── */

export const MAX_TBAR_LIFTS = 10;
export const MAX_TBAR_CARRIERS = 160;

export function createTBarAssets(unitScale = 1) {
  const s = Math.max(1, unitScale);
  const towerH = 2.45 * s;
  const terminalH = 3.2 * s;
  const laneHalf = 0.55 * s;
  const hangerLen = 1.25 * s;
  const cableR = Math.max(0.028 * s, 0.035);
  const hipY = 0.52 * Math.min(11, Math.max(1.35, 0.4 * s));

  const steelMat = new THREE.MeshLambertMaterial({ color: 0x2a3038, flatShading: true });
  const steelDark = new THREE.MeshLambertMaterial({ color: 0x15191f, flatShading: true });
  const housingMat = new THREE.MeshLambertMaterial({ color: 0x4b5563, flatShading: true });
  const pulleyMat = new THREE.MeshLambertMaterial({ color: 0x1f2937, flatShading: true });
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });
  const barMat = new THREE.MeshLambertMaterial({ color: 0x374151, flatShading: true });

  const towerColGeo = new THREE.CylinderGeometry(0.09 * s, 0.13 * s, towerH, 6);
  towerColGeo.translate(0, towerH / 2, 0);
  const towerArmGeo = new THREE.BoxGeometry(laneHalf * 2.35, 0.1 * s, 0.1 * s);
  towerArmGeo.translate(0, towerH * 0.92, 0);
  const sheaveGeo = new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.08 * s, 8);
  sheaveGeo.rotateZ(Math.PI / 2);

  const termColGeo = new THREE.CylinderGeometry(0.14 * s, 0.2 * s, terminalH, 6);
  termColGeo.translate(0, terminalH / 2, 0);
  const termArmGeo = new THREE.BoxGeometry(laneHalf * 2.8, 0.14 * s, 0.14 * s);
  termArmGeo.translate(0, terminalH * 0.88, 0);
  const housingGeo = new THREE.BoxGeometry(1.1 * s, 0.85 * s, 1.35 * s);
  housingGeo.translate(0, 0.55 * s, -0.55 * s);
  const pulleyGeo = new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 0.18 * s, 12);
  pulleyGeo.rotateZ(Math.PI / 2);
  pulleyGeo.translate(0, terminalH * 0.78, 0.15 * s);

  const hangerGeo = new THREE.CylinderGeometry(0.022 * s, 0.022 * s, hangerLen, 4);
  hangerGeo.translate(0, -hangerLen / 2, 0);
  const tStemGeo = new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.28 * s, 4);
  tStemGeo.translate(0, -hangerLen - 0.08 * s, 0);
  const tBarGeo = new THREE.BoxGeometry(0.55 * s, 0.045 * s, 0.045 * s);
  tBarGeo.translate(0, -hangerLen - 0.22 * s, 0);

  return {
    s,
    towerH,
    terminalH,
    laneHalf,
    hangerLen,
    cableR,
    hipY,
    midClearance: towerH * 0.9,
    stationClearance: Math.max(0.85 * s, hipY + 0.35 * s),
    steelMat,
    steelDark,
    housingMat,
    pulleyMat,
    cableMat,
    barMat,
    towerColGeo,
    towerArmGeo,
    sheaveGeo,
    termColGeo,
    termArmGeo,
    housingGeo,
    pulleyGeo,
    hangerGeo,
    tStemGeo,
    tBarGeo,
  };
}

function createTBarTower(position, yaw, assets) {
  const g = new THREE.Group();
  g.name = "tbar-tower";
  g.position.copy(position);
  g.rotation.y = yaw;
  const col = new THREE.Mesh(assets.towerColGeo, assets.steelMat);
  const arm = new THREE.Mesh(assets.towerArmGeo, assets.steelDark);
  const sheaveL = new THREE.Mesh(assets.sheaveGeo, assets.steelDark);
  const sheaveR = new THREE.Mesh(assets.sheaveGeo, assets.steelDark);
  sheaveL.position.set(-assets.laneHalf, assets.towerH * 0.92, 0);
  sheaveR.position.set(assets.laneHalf, assets.towerH * 0.92, 0);
  col.frustumCulled = false;
  arm.frustumCulled = false;
  sheaveL.frustumCulled = false;
  sheaveR.frustumCulled = false;
  g.add(col, arm, sheaveL, sheaveR);
  return g;
}

function createTBarTerminal(position, yaw, type, assets) {
  const g = new THREE.Group();
  g.name = type === "top" ? "tbar-terminal-top" : "tbar-terminal-bottom";
  g.position.copy(position);
  g.rotation.y = yaw;
  const col = new THREE.Mesh(assets.termColGeo, assets.steelMat);
  const arm = new THREE.Mesh(assets.termArmGeo, assets.steelDark);
  const housing = new THREE.Mesh(assets.housingGeo, assets.housingMat);
  const pulley = new THREE.Mesh(assets.pulleyGeo, assets.pulleyMat);
  if (type === "top") housing.position.z *= -1;
  col.frustumCulled = false;
  arm.frustumCulled = false;
  housing.frustumCulled = false;
  pulley.frustumCulled = false;
  g.add(col, arm, housing, pulley);
  g.scale.set(0.5, 1, 0.5);
  return g;
}

function createTBarCable(points, assets) {
  if (!points || points.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
  const segs = Math.min(96, Math.max(16, points.length * 3));
  const tube = new THREE.TubeGeometry(curve, segs, assets.cableR, 4, false);
  const mesh = new THREE.Mesh(tube, assets.cableMat);
  mesh.name = "tbar-cable";
  mesh.frustumCulled = false;
  return mesh;
}

function createTBarCarrier(assets) {
  const g = new THREE.Group();
  g.name = "tbar-carrier";
  const hanger = new THREE.Mesh(assets.hangerGeo, assets.barMat);
  const stem = new THREE.Mesh(assets.tStemGeo, assets.barMat);
  const bar = new THREE.Mesh(assets.tBarGeo, assets.barMat);
  hanger.frustumCulled = false;
  stem.frustumCulled = false;
  bar.frustumCulled = false;
  g.add(hanger, stem, bar);
  return g;
}

function createTBarRider(unitScale, board, suit, ski) {
  return makeClayRider(unitScale, board, suit, ski);
}

export function orientLiftGround(ground) {
  if (!ground?.length) return ground || [];
  if (ground[0].y <= ground[ground.length - 1].y) return ground;
  return ground.slice().reverse();
}

/** Adaptive tower spacing in mesh meters (~40–70m), tighter on steep ground. */
function tbarTowerStep(ground, totalLen) {
  if (!(totalLen > 1) || ground.length < 2) return 55;
  let rise = 0;
  let horiz = 0;
  for (let i = 1; i < ground.length; i++) {
    const a = ground[i - 1];
    const b = ground[i];
    rise += Math.abs(b.y - a.y);
    horiz += Math.hypot(b.x - a.x, b.z - a.z);
  }
  const slope = horiz > 1 ? rise / horiz : 0;
  let step = 62 - slope * 55;
  if (totalLen < 180) step = Math.min(step, 48);
  if (totalLen > 900) step = Math.max(step, 58);
  return Math.max(40, Math.min(70, step));
}

function sampleTowerStations(ground, step) {
  const total = polylineLen(ground);
  if (!(total > step * 1.4)) return [];
  const out = [];
  const margin = Math.max(step * 0.55, 28);
  let next = margin;
  while (next < total - margin) {
    const p = alongPolyline(ground, next);
    if (p) out.push({ dist: next, p: new THREE.Vector3(p.x, p.y, p.z) });
    next += step;
  }
  return out;
}

function buildSaggedSpan(a, b, samples, sag) {
  const pts = [];
  for (let k = 1; k < samples; k++) {
    const t = k / samples;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

/**
 * Closed T-bar cable loop: uphill lane → top turnaround → downhill lane → bottom turnaround.
 * Control points include tower supports with catenary-like sag between them.
 */
function buildTBarCableLoop(ground, assets, towerDists) {
  const total = polylineLen(ground);
  if (!(total > 8) || ground.length < 2) return null;
  const lane = assets.laneHalf;
  const supports = [0, ...(towerDists || []), total];
  const unique = [];
  for (const d of supports) {
    if (!unique.length || Math.abs(d - unique[unique.length - 1]) > 4) unique.push(d);
  }
  if (unique[unique.length - 1] < total - 1) unique.push(total);

  function cableAt(dist, sideSign) {
    const p = alongPolyline(ground, dist);
    if (!p) return null;
    const tNorm = dist / total;
    const clear = cableHeightProfile(tNorm, assets.midClearance, assets.stationClearance);
    const tan = new THREE.Vector3(p.tx, 0, p.tz);
    if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
    else tan.normalize();
    const side = sideVector(tan);
    return new THREE.Vector3(p.x + side.x * lane * sideSign, p.y + clear, p.z + side.z * lane * sideSign);
  }

  function lanePoints(sideSign) {
    const pts = [];
    for (let i = 0; i < unique.length; i++) {
      const a = cableAt(unique[i], sideSign);
      if (!a) continue;
      if (pts.length) {
        const prev = pts[pts.length - 1];
        const span = prev.distanceTo(a);
        const sag = Math.min(span * 0.042, assets.s * 0.32);
        pts.push(...buildSaggedSpan(prev, a, Math.max(3, Math.round(span / 14)), sag));
      }
      pts.push(a);
    }
    return pts;
  }

  const up = lanePoints(-1);
  const down = lanePoints(1).reverse();
  if (up.length < 2 || down.length < 2) return null;

  function turnaround(endDist, fromSide, toSide) {
    const p = alongPolyline(ground, endDist);
    if (!p) return [];
    const tan = new THREE.Vector3(p.tx, 0, p.tz);
    if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
    else tan.normalize();
    const side = sideVector(tan);
    const clear = cableHeightProfile(endDist / total, assets.midClearance, assets.stationClearance);
    const center = new THREE.Vector3(p.x, p.y + clear, p.z);
    const outward = endDist > total * 0.5 ? tan.clone() : tan.clone().negate();
    const arc = [];
    const n = 7;
    for (let i = 1; i < n; i++) {
      const ang = (Math.PI * i) / n;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const start = side.clone().multiplyScalar(fromSide * lane);
      const out = outward.clone().multiplyScalar(lane);
      if (fromSide === -toSide) {
        const q = start.clone().multiplyScalar(c).addScaledVector(out, sn);
        arc.push(new THREE.Vector3(center.x + q.x, center.y, center.z + q.z));
      } else {
        const end = side.clone().multiplyScalar(toSide * lane);
        const q = start
          .clone()
          .multiplyScalar(1 - ang / Math.PI)
          .addScaledVector(end, ang / Math.PI)
          .addScaledVector(out, sn);
        arc.push(new THREE.Vector3(center.x + q.x, center.y, center.z + q.z));
      }
    }
    return arc;
  }

  const topArc = turnaround(total, -1, 1);
  const botArc = turnaround(0, 1, -1);
  const loop = [...up, ...topArc, ...down, ...botArc];
  return loop.length >= 8 ? loop : null;
}

/**
 * Build one OSM T-bar / drag lift: terminals, towers, sagged cable loop, animated carriers + riders.
 * @param {object} liftFeature GeoJSON feature with aerialway drag_lift / t_bar / etc.
 * @param {{center, sample, unitScale, clipRing, assets}} ctx
 * @returns {{ group: THREE.Group, anim: object|null }|null}
 */
export function createTBarLift(liftFeature, ctx) {
  const { center, sample, unitScale, clipRing, assets } = ctx;
  if (!assets) return null;

  const group = new THREE.Group();
  group.name = "tbar-lift";

  let best = null;
  for (const coords of lineParts(liftFeature.geometry)) {
    const groundRaw = [];
    for (const coord of downsampleLine(coords, 28)) {
      const p = gamePoint(coord[0], coord[1], center, sample, 0);
      if (p) groundRaw.push(p);
    }
    const runs = clipPointRuns(groundRaw, clipRing);
    let ground = groundRaw;
    if (clipRing?.length) {
      if (!runs.length) continue;
      ground = runs.reduce((a, b) => (b.length > a.length ? b : a));
    }
    ground = orientLiftGround(ground);
    if (ground.length < 2) continue;
    const len = polylineLen(ground);
    if (!best || len > best.len) best = { ground, len };
  }
  if (!best || best.len < 35) return null;

  const ground = best.ground;
  const total = best.len;
  const step = tbarTowerStep(ground, total);
  const stations = sampleTowerStations(ground, step);
  const towerDists = stations.map((s) => s.dist);
  const loopPts = buildTBarCableLoop(ground, assets, towerDists);
  if (!loopPts) return null;

  const curve = new THREE.CatmullRomCurve3(loopPts, true, "catmullrom", 0.4);
  const segs = Math.min(96, Math.max(24, loopPts.length * 2));
  const tube = new THREE.TubeGeometry(curve, segs, assets.cableR, 4, true);
  const cableMesh = new THREE.Mesh(tube, assets.cableMat);
  cableMesh.name = "tbar-cable";
  cableMesh.frustumCulled = false;
  group.add(cableMesh);

  const bottom = ground[0];
  const top = ground[ground.length - 1];
  const bottomTan = horizTangentAt(ground, 0);
  const topTan = horizTangentAt(ground, ground.length - 1);
  group.add(createTBarTerminal(bottom, Math.atan2(bottomTan.x, bottomTan.z), "bottom", assets));
  group.add(createTBarTerminal(top, Math.atan2(topTan.x, topTan.z), "top", assets));

  for (const st of stations) {
    const p = alongPolyline(ground, st.dist);
    if (!p) continue;
    const tan = new THREE.Vector3(p.tx, 0, p.tz);
    if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
    else tan.normalize();
    group.add(createTBarTower(new THREE.Vector3(p.x, p.y, p.z), Math.atan2(tan.x, tan.z), assets));
  }

  const loopLen = curve.getLength();
  const carrierStep = Math.max(8, Math.min(15, 11 + (total > 600 ? 2 : 0)));
  let nCarriers = Math.max(6, Math.round(loopLen / carrierStep));
  nCarriers = Math.min(nCarriers, 28);
  const speed = 3.6 * Math.max(1, Math.sqrt(Math.max(1, assets.s * 0.35)));

  const hangers = new THREE.InstancedMesh(assets.hangerGeo, assets.barMat, nCarriers);
  const stems = new THREE.InstancedMesh(assets.tStemGeo, assets.barMat, nCarriers);
  const bars = new THREE.InstancedMesh(assets.tBarGeo, assets.barMat, nCarriers);
  hangers.frustumCulled = false;
  stems.frustumCulled = false;
  bars.frustumCulled = false;
  hangers.count = nCarriers;
  stems.count = nCarriers;
  bars.count = nCarriers;
  group.add(hangers, stems, bars);

  const seed = snowParkFeatureSeed(liftFeature);
  const list = [];
  const tmp = new THREE.Vector3();
  const tan = new THREE.Vector3();
  for (let k = 0; k < nCarriers; k++) {
    const u = k / nCarriers;
    curve.getPointAt(u, tmp);
    curve.getTangentAt(u, tan);
    /* Uphill strand: traveling with positive elevation change along the loop. */
    const climbing = tan.y > 0.02 || (Math.abs(tan.y) <= 0.02 && u < 0.45);
    let rider = null;
    if (climbing && rng(seed * 0.017 + k * 1.91) < 0.4) {
      const board = rng(seed * 0.031 + k * 2.7) > 0.62;
      rider = createTBarRider(
        unitScale,
        board,
        RIDER_SUITS[k % RIDER_SUITS.length],
        RIDER_SKIS[k % RIDER_SKIS.length],
      );
      group.add(rider);
    }
    list.push({
      u,
      climbing,
      rider,
      board: !!rider?.userData && rider.name?.includes("boarder"),
    });
  }

  const anim = {
    curve,
    loopLen,
    list,
    hangers,
    stems,
    bars,
    sample,
    hangerLen: assets.hangerLen,
    hipY: assets.hipY,
    speed,
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    sc: new THREE.Vector3(1, 1, 1),
    cablePos: new THREE.Vector3(),
    tan: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    zAxis: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
  };
  updateTBarLift(anim, 0);
  return { group, anim };
}

export function updateTBarLift(pack, dt) {
  if (!pack?.list?.length || !pack.curve) return;
  const {
    curve,
    list,
    hangers,
    stems,
    bars,
    sample,
    hangerLen,
    hipY,
    speed,
    loopLen,
    m,
    q,
    sc,
    cablePos,
    tan,
    forward,
    zAxis,
    up,
  } = pack;
  const du = loopLen > 1 ? (speed * dt) / loopLen : 0;

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (dt > 0) {
      c.u += du;
      if (c.u >= 1) c.u -= 1;
      if (c.u < 0) c.u += 1;
    }
    curve.getPointAt(c.u, cablePos);
    curve.getTangentAt(c.u, tan);
    forward.set(tan.x, 0, tan.z);
    if (forward.lengthSq() < 1e-8) forward.set(1, 0, 0);
    else forward.normalize();
    /* Hang vertically — yaw only to face travel; no pitch with the slope. */
    q.setFromUnitVectors(zAxis, forward);
    m.compose(cablePos, q, sc);
    hangers.setMatrixAt(i, m);
    stems.setMatrixAt(i, m);
    bars.setMatrixAt(i, m);

    const rider = c.rider;
    if (!rider) continue;
    const climbing = tan.y > 0.015;
    rider.visible = climbing;
    if (!climbing) continue;
    const snow = sample ? sample(cablePos.x, cablePos.z) : null;
    const y =
      snow != null ? snow + (rider.userData.ride || 0.4) : cablePos.y - hangerLen - hipY * 0.15;
    /* Slightly behind the T so the bar reads at hip/back. */
    rider.position.set(
      cablePos.x - forward.x * hipY * 0.15,
      y,
      cablePos.z - forward.z * hipY * 0.15,
    );
    rider.rotation.order = "YXZ";
    rider.rotation.y = Math.atan2(forward.x, forward.z);
    rider.rotation.x = 0.08;
    rider.rotation.z = 0;
  }
  hangers.instanceMatrix.needsUpdate = true;
  stems.instanceMatrix.needsUpdate = true;
  bars.instanceMatrix.needsUpdate = true;
  void up;
}

export function updateTBarLifts(packs, dt) {
  if (!packs?.length) return;
  for (const pack of packs) updateTBarLift(pack, dt);
}

/**
 * Low-poly magic-carpet / tape-lift conveyor: belt, contrast rails, and end stations.
 */

import * as THREE from "three";
import {
  rng,
  lineParts,
  polylineLen,
  alongPolyline,
  clipPointRuns,
  downsampleLine,
} from "./math-utils.js";
import { gamePoint, appendRibbon, meshFromPositions } from "./trails.js";
import { makeClayRider, RIDER_SUITS, RIDER_SKIS } from "./skiers.js";
import { snowParkFeatureSeed } from "./snowpark.js";
import { orientLiftGround } from "./lifts-tbar.js";

export const MAGIC_CARPET_TYPES = new Set([
  "magic_carpet",
  "carpet",
  "tape_lift",
]);

export function isMagicCarpetLift(type) {
  return MAGIC_CARPET_TYPES.has(type);
}

export const MAX_CARPET_LIFTS = 18;

function slopeQuaternion(tan, q) {
  const yaw = Math.atan2(tan.x, tan.z);
  const pitch = -Math.atan2(tan.y, Math.max(1e-6, Math.hypot(tan.x, tan.z)));
  q.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  return q;
}

export function createCarpetAssets(unitScale = 1) {
  const s = Math.max(1, unitScale);
  const beltW = 0.42 * s;
  const railW = 0.055 * s;
  const treadGeo = new THREE.BoxGeometry(beltW * 0.86, 0.035 * s, 0.09 * s);
  treadGeo.translate(0, 0.05 * s, 0);
  const postGeo = new THREE.BoxGeometry(0.1 * s, 0.85 * s, 0.1 * s);
  postGeo.translate(0, 0.425 * s, 0);
  const lintelGeo = new THREE.BoxGeometry(beltW + 0.28 * s, 0.08 * s, 0.08 * s);
  lintelGeo.translate(0, 0.9 * s, 0);
  const padGeo = new THREE.BoxGeometry(beltW + 0.32 * s, 0.07 * s, 0.85 * s);
  padGeo.translate(0, 0.035 * s, 0);
  const bumperGeo = new THREE.BoxGeometry(beltW + 0.16 * s, 0.12 * s, 0.09 * s);
  bumperGeo.translate(0, 0.14 * s, 0.52 * s);

  return {
    s,
    beltW,
    railW,
    beltLift: 0.07 * s,
    railLift: 0.16 * s,
    treadStep: 0.62 * s,
    treadGeo,
    postGeo,
    lintelGeo,
    padGeo,
    bumperGeo,
    beltMat: new THREE.MeshLambertMaterial({
      color: 0x2b2d32,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    treadMat: new THREE.MeshLambertMaterial({ color: 0x111214, flatShading: true }),
    railMat: new THREE.MeshLambertMaterial({ color: 0xf97316, flatShading: true }),
    frameMat: new THREE.MeshLambertMaterial({ color: 0x2563eb, flatShading: true }),
    padMat: new THREE.MeshLambertMaterial({ color: 0xe2e8f0, flatShading: true }),
  };
}

function createCarpetStation(pos, tan, kind, assets) {
  const g = new THREE.Group();
  g.name = kind === "top" ? "carpet-station-top" : "carpet-station-bottom";
  const q = new THREE.Quaternion();
  slopeQuaternion(tan, q);
  g.position.copy(pos);
  g.quaternion.copy(q);

  const pad = new THREE.Mesh(assets.padGeo, assets.padMat);
  const left = new THREE.Mesh(assets.postGeo, assets.railMat);
  const right = new THREE.Mesh(assets.postGeo, assets.railMat);
  const lintel = new THREE.Mesh(assets.lintelGeo, assets.frameMat);
  const bumper = new THREE.Mesh(assets.bumperGeo, assets.railMat);
  const half = assets.beltW * 0.5 + 0.1 * assets.s;
  left.position.x = -half;
  right.position.x = half;
  /* Bottom arch faces downhill so the opening reads as the load zone. */
  if (kind === "bottom") bumper.position.z = -0.52 * assets.s;
  g.add(pad, left, right, lintel, bumper);
  return g;
}

function offsetPath(pts, sideSign, halfWidth, yLift) {
  const out = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length; i++) {
    let dir;
    if (i === 0) dir = new THREE.Vector3().subVectors(pts[1], pts[0]);
    else if (i === pts.length - 1) dir = new THREE.Vector3().subVectors(pts[i], pts[i - 1]);
    else dir = new THREE.Vector3().subVectors(pts[i + 1], pts[i - 1]);
    if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
    else dir.normalize();
    const side = new THREE.Vector3().crossVectors(up, dir);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    else side.normalize();
    out.push(new THREE.Vector3(
      pts[i].x + side.x * halfWidth * sideSign,
      pts[i].y + yLift,
      pts[i].z + side.z * halfWidth * sideSign,
    ));
  }
  return out;
}

function liftedPath(pts, yLift) {
  return pts.map((p) => new THREE.Vector3(p.x, p.y + yLift, p.z));
}

/**
 * Build one OSM magic carpet along the slope: rubber belt, orange rails, blue/orange stations.
 */
export function createMagicCarpetLift(liftFeature, ctx) {
  const { center, sample, unitScale, clipRing, assets } = ctx;
  if (!assets) return null;

  const group = new THREE.Group();
  group.name = "magic-carpet-lift";

  let best = null;
  for (const coords of lineParts(liftFeature.geometry)) {
    const groundRaw = [];
    for (const coord of downsampleLine(coords, 36)) {
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
  if (!best || best.len < 10) return null;

  const ground = best.ground;
  const total = best.len;
  const beltPts = liftedPath(ground, assets.beltLift);
  const beltPos = [];
  appendRibbon(beltPos, beltPts, assets.beltW);
  const belt = meshFromPositions(beltPos, assets.beltMat);
  if (belt) {
    belt.name = "carpet-belt";
    group.add(belt);
  }

  const railHalf = assets.beltW * 0.5 + assets.railW * 0.35;
  for (const sign of [-1, 1]) {
    const railPts = offsetPath(ground, sign, railHalf, assets.railLift);
    const railPos = [];
    appendRibbon(railPos, railPts, assets.railW);
    const rail = meshFromPositions(railPos, assets.railMat);
    if (rail) {
      rail.name = sign < 0 ? "carpet-rail-left" : "carpet-rail-right";
      group.add(rail);
    }
  }

  const bottomTan = new THREE.Vector3().subVectors(ground[1] || ground[0], ground[0]);
  const topTan = new THREE.Vector3().subVectors(
    ground[ground.length - 1],
    ground[ground.length - 2] || ground[0],
  );
  group.add(createCarpetStation(ground[0], bottomTan, "bottom", assets));
  group.add(createCarpetStation(ground[ground.length - 1], topTan, "top", assets));

  const nTread = Math.max(4, Math.min(72, Math.round(total / assets.treadStep)));
  const treads = new THREE.InstancedMesh(assets.treadGeo, assets.treadMat, nTread);
  treads.name = "carpet-treads";
  treads.frustumCulled = false;
  treads.count = nTread;
  group.add(treads);

  const seed = snowParkFeatureSeed(liftFeature);
  const riders = [];
  const nRiders = total > 28 ? Math.min(5, 1 + Math.floor(total / 55)) : 0;
  for (let i = 0; i < nRiders; i++) {
    if (rng(seed * 0.019 + i * 1.7) < 0.35) continue;
    const rider = makeClayRider(
      unitScale,
      rng(seed * 0.04 + i * 2.1) > 0.7,
      RIDER_SUITS[i % RIDER_SUITS.length],
      RIDER_SKIS[i % RIDER_SKIS.length],
    );
    group.add(rider);
    riders.push({
      mesh: rider,
      along0: ((i + 0.35) / Math.max(1, nRiders + 1)) * total * 0.85 + total * 0.08,
    });
  }

  const anim = {
    ground,
    total,
    treads,
    nTread,
    riders,
    sample,
    beltLift: assets.beltLift,
    speed: 1.35 * Math.max(1, Math.sqrt(Math.max(1, assets.s * 0.45))),
    phase: 0,
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    sc: new THREE.Vector3(1, 1, 1),
    tan: new THREE.Vector3(),
    pos: new THREE.Vector3(),
  };
  updateCarpetLift(anim, 0);
  return { group, anim };
}

export function updateCarpetLift(pack, dt) {
  if (!pack?.treads || !pack.ground) return;
  const { ground, total, treads, nTread, riders, sample, beltLift, speed, m, q, sc, tan, pos } = pack;
  if (!(total > 1) || nTread < 1) return;
  if (dt > 0) pack.phase = (pack.phase + speed * dt) % total;

  const step = total / nTread;
  for (let i = 0; i < nTread; i++) {
    let dist = pack.phase + i * step;
    dist %= total;
    if (dist < 0) dist += total;
    const p = alongPolyline(ground, dist);
    const p2 = alongPolyline(ground, Math.min(total - 1e-3, dist + Math.min(0.5, step * 0.4)));
    if (!p || !p2) continue;
    tan.set(p2.x - p.x, p2.y - p.y, p2.z - p.z);
    slopeQuaternion(tan, q);
    pos.set(p.x, p.y + beltLift, p.z);
    m.compose(pos, q, sc);
    treads.setMatrixAt(i, m);
  }
  treads.instanceMatrix.needsUpdate = true;

  for (const rider of riders) {
    let dist = pack.phase + rider.along0;
    dist %= total;
    if (dist < 0) dist += total;
    const p = alongPolyline(ground, dist);
    if (!p) continue;
    const snow = sample ? sample(p.x, p.z) : p.y;
    const mesh = rider.mesh;
    mesh.position.set(p.x, (snow ?? p.y) + (mesh.userData.ride || 0.38), p.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = Math.atan2(p.tx, p.tz);
    mesh.rotation.x = 0.06;
    mesh.rotation.z = 0;
  }
}

export function updateCarpetLifts(packs, dt) {
  if (!packs?.length) return;
  for (const pack of packs) updateCarpetLift(pack, dt);
}

/**
 * Terrain park features, jump kickers, rail boxes, and freestyle park riders.
 */

import * as THREE from "three";
import { PALETTE } from "./config.js";
import {
  rng,
  localXZ,
  lineParts,
  polygonParts,
  ringParts,
  downsampleLine,
  smoothTrailPts,
  polylineLen,
  alongPolyline,
  distToRingEdges,
  clipPointRuns,
  insideIslandRing,
  featureOsmWayId,
  featureLiftOsmId,
} from "./math-utils.js";
import { gamePoint, isSnowParkFeature, trailGeomScore } from "./trails.js";
import { makeClayRider, RIDER_SUITS, RIDER_SKIS } from "./skiers.js";

export function snowParkFeatureSeed(feature) {
  const id =
    featureOsmWayId(feature) ||
    featureLiftOsmId(feature) ||
    String(feature?.properties?.name || feature?.properties?.id || "park");
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

const PARK_RAILS = ["rail", "flat_rail", "rainbow"];
const PARK_BOXES = ["box", "cbox"];
const PARK_JUMPS = ["kicker_small", "tabletop_small", "kicker_med", "tabletop_med"];
const PARK_EXTRAS = ["roller", "hip"];

function isLargeJumpKind(kind) {
  return kind === "kicker_med" || kind === "tabletop_med";
}

/** Approx along-track footprint in mesh meters (matches create* geometry). */
function parkFeatureLengthM(kind, s) {
  switch (kind) {
    case "tabletop_med":
      return 8.6 * s;
    case "tabletop_small":
      return 5.9 * s;
    case "kicker_med":
      return 7.8 * s;
    case "kicker_small":
      return 5.4 * s;
    case "rainbow":
      return 4.9 * s;
    case "hip":
      return 2.8 * s;
    case "roller":
      return 2.2 * s;
    case "cbox":
      return 3.2 * s;
    case "box":
      return 2.6 * s;
    case "flat_rail":
      return 3.2 * s;
    case "rail":
    default:
      return 2.8 * s;
  }
}

/**
 * Along-piste clearance in mesh meters. Features are exaggerated with unitScale,
 * so gaps must be several footprints — a flat 50–85 m leaves a Lego pile.
 */
function parkMinSpacingAlong(kind, s) {
  const foot = parkFeatureLengthM(kind, s);
  if (isLargeJumpKind(kind)) return Math.max(240, foot * 3.4);
  if (isJumpKind(kind)) return Math.max(180, foot * 3.1);
  return Math.max(140, foot * 3.0);
}

/**
 * Deterministic sparse plan: 1–2 rails, 1–2 boxes, 1–2 jumps, optional roller/hip.
 * Progression = open snow between accents, not a dense feature pile.
 */
function pickParkFeaturePlan(seed, count) {
  const n = Math.max(2, Math.min(7, count | 0));
  const pool = [];
  const pushPick = (arr, maxN) => {
    const want = Math.min(maxN, arr.length);
    const order = arr
      .map((k, i) => ({ k, r: rng(seed * 1.7 + i * 11.3 + n) }))
      .sort((a, b) => a.r - b.r);
    for (let i = 0; i < want; i++) pool.push(order[i].k);
  };
  /* Budgets scale with park size. */
  if (n <= 2) {
    pushPick(PARK_RAILS, 1);
    pushPick(PARK_JUMPS.filter((k) => !isLargeJumpKind(k)), 1);
  } else if (n === 3) {
    pushPick(PARK_RAILS, 1);
    pushPick(PARK_JUMPS.filter((k) => !isLargeJumpKind(k)), 1);
    pushPick(PARK_BOXES, 1);
  } else if (n === 4) {
    pushPick(PARK_RAILS, 1);
    pushPick(PARK_JUMPS, 1);
    pushPick(PARK_BOXES, 1);
    if (rng(seed * 2.1) > 0.45) pushPick(PARK_EXTRAS, 1);
    else pushPick(PARK_RAILS, 1);
  } else {
    pushPick(PARK_RAILS, n >= 6 ? 2 : 1);
    pushPick(PARK_BOXES, n >= 6 ? 2 : 1);
    pushPick(PARK_JUMPS, 2);
    if (n >= 5 && rng(seed * 3.3) > 0.35) pushPick(PARK_EXTRAS, 1);
  }
  while (pool.length > n) pool.pop();
  while (pool.length < n) {
    const fill = PARK_RAILS.concat(PARK_BOXES).concat(PARK_JUMPS.filter((k) => !isLargeJumpKind(k)));
    pool.push(fill[(seed + pool.length * 5) % fill.length]);
  }

  /* Order into a readable run: jib → small jump → box → larger jump … */
  const rails = pool.filter((k) => PARK_RAILS.includes(k));
  const boxes = pool.filter((k) => PARK_BOXES.includes(k));
  const jumps = pool.filter((k) => PARK_JUMPS.includes(k));
  const extras = pool.filter((k) => PARK_EXTRAS.includes(k));
  jumps.sort((a, b) => Number(isLargeJumpKind(a)) - Number(isLargeJumpKind(b)));

  const ordered = [];
  const take = (arr) => (arr.length ? arr.shift() : null);
  while (ordered.length < n && (rails.length || boxes.length || jumps.length || extras.length)) {
    const next =
      take(rails) ||
      take(jumps) ||
      take(boxes) ||
      take(extras);
    if (!next) break;
    /* Never stack two large jumps back-to-back. */
    if (
      isLargeJumpKind(next) &&
      ordered.length &&
      isLargeJumpKind(ordered[ordered.length - 1])
    ) {
      const swap = take(rails) || take(boxes) || take(extras);
      if (swap) {
        ordered.push(swap);
        jumps.push(next);
        continue;
      }
    }
    ordered.push(next);
  }
  return ordered.slice(0, n);
}

function parkSnowMat() {
  return new THREE.MeshLambertMaterial({
    color: 0xf1f5f9,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.22,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  });
}

function parkSnowShadeMat() {
  return new THREE.MeshLambertMaterial({
    color: 0xdbe4ee,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.12,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

function parkMetalMat() {
  return new THREE.MeshLambertMaterial({
    color: 0x6b7280,
    emissive: 0x374151,
    emissiveIntensity: 0.18,
    flatShading: true,
  });
}

function parkMetalHiMat() {
  return new THREE.MeshLambertMaterial({
    color: 0x9ca3af,
    emissive: 0x4b5563,
    emissiveIntensity: 0.14,
    flatShading: true,
  });
}

function parkLegMat() {
  return new THREE.MeshLambertMaterial({
    color: 0x1f2937,
    flatShading: true,
  });
}

function orientParkGroup(g, tan) {
  g.rotation.order = "YXZ";
  g.rotation.y = Math.atan2(tan.x, tan.z);
  const slope = Math.atan2(-(tan.y || 0), Math.hypot(tan.x, tan.z) || 1);
  g.rotation.x = THREE.MathUtils.clamp(slope * 0.85, -0.55, 0.35);
}

function createRail(s, lenScale = 1) {
  const g = new THREE.Group();
  g.name = "park-rail";
  const len = (2.8 + lenScale * 0.6) * s;
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * s, 0.1 * s, len, 6),
    parkMetalHiMat(),
  );
  rail.rotation.x = Math.PI * 0.5;
  rail.position.y = 0.55 * s;
  rail.frustumCulled = false;
  const legGeo = new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.55 * s, 4);
  const legMat = parkLegMat();
  for (const z of [-len * 0.38, len * 0.38]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(0, 0.28 * s, z);
    leg.frustumCulled = false;
    g.add(leg);
  }
  g.add(rail);
  g.userData.park = { kind: "rail", length: len, height: 0.55 * s };
  return g;
}

function createFlatDownRail(s) {
  const g = createRail(s, 1.15);
  g.name = "park-flat-down-rail";
  g.rotation.x = 0.18;
  g.userData.park.kind = "flat_rail";
  g.userData.park.height = 0.45 * s;
  return g;
}

function createBox(s, curved = false) {
  const g = new THREE.Group();
  g.name = curved ? "park-cbox" : "park-box";
  const len = (curved ? 3.2 : 2.6) * s;
  const w = (curved ? 0.85 : 0.95) * s;
  const h = 0.42 * s;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), parkMetalMat());
  deck.position.y = 0.55 * s;
  deck.frustumCulled = false;
  if (curved) deck.rotation.z = 0.22;
  const legMat = parkLegMat();
  for (const z of [-len * 0.35, len * 0.35]) {
    for (const x of [-w * 0.28, w * 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.5 * s, 0.1 * s), legMat);
      leg.position.set(x, 0.25 * s, z);
      leg.frustumCulled = false;
      g.add(leg);
    }
  }
  g.add(deck);
  g.userData.park = { kind: curved ? "cbox" : "box", length: len, height: 0.75 * s };
  return g;
}

function createRainbowRail(s) {
  const g = new THREE.Group();
  g.name = "park-rainbow";
  const rad = 1.55 * s;
  const tube = 0.11 * s;
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(rad, tube, 6, 18, Math.PI),
    parkMetalHiMat(),
  );
  arc.rotation.z = Math.PI;
  arc.position.y = 0.12 * s;
  arc.frustumCulled = false;
  const legMat = parkLegMat();
  for (const x of [-rad, rad]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.35 * s, 4), legMat);
    leg.position.set(x, 0.18 * s, 0);
    leg.frustumCulled = false;
    g.add(leg);
  }
  g.add(arc);
  g.userData.park = { kind: "rainbow", length: rad * Math.PI, height: rad + 0.2 * s };
  return g;
}

function createRoller(s) {
  const g = new THREE.Group();
  g.name = "park-roller";
  const snow = parkSnowMat();
  const shade = parkSnowShadeMat();
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.95 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), snow);
  hump.scale.set(1.35, 0.72, 1.1);
  hump.position.y = 0.05 * s;
  hump.frustumCulled = false;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4 * s, 0.12 * s, 2.1 * s), shade);
  pad.position.y = 0.04 * s;
  pad.frustumCulled = false;
  g.add(pad, hump);
  g.userData.park = { kind: "roller", length: 2.2 * s, height: 0.85 * s };
  return g;
}

function createHip(s) {
  const g = new THREE.Group();
  g.name = "park-hip";
  const snow = parkSnowMat();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 1.7 * s, 2.8 * s), snow);
  wall.position.set(0.55 * s, 0.85 * s, 0);
  wall.rotation.z = -0.35;
  wall.frustumCulled = false;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s, 0.35 * s, 2.6 * s), parkSnowShadeMat());
  lip.position.set(0.95 * s, 1.55 * s, 0);
  lip.frustumCulled = false;
  g.add(wall, lip);
  g.userData.park = { kind: "hip", length: 2.8 * s, height: 1.7 * s };
  return g;
}

/** Packed-snow tabletop: approach → lip → deck → landing. */
function createTabletopJump(s, medium = false) {
  const g = new THREE.Group();
  g.name = medium ? "park-tabletop-med" : "park-tabletop-small";
  const snow = parkSnowMat();
  const shade = parkSnowShadeMat();
  const w = (medium ? 3.2 : 2.4) * s;
  const deckL = (medium ? 1.6 : 1.05) * s;
  const lipH = (medium ? 2.4 : 1.7) * s;
  const approachL = (medium ? 2.4 : 1.7) * s;
  const landL = (medium ? 3.2 : 2.3) * s;
  const gap = (medium ? 1.4 : 0.85) * s;

  const approach = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.35 * s, approachL), shade);
  approach.position.set(0, 0.25 * s, approachL * 0.5 + deckL * 0.5 + gap * 0.5);
  approach.rotation.x = -0.22;
  approach.frustumCulled = false;

  const lip = new THREE.Mesh(new THREE.BoxGeometry(w, lipH, 0.85 * s), snow);
  lip.position.set(0, lipH * 0.42, deckL * 0.5 + gap * 0.35);
  lip.rotation.x = -0.55;
  lip.frustumCulled = false;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.55 * s, deckL), snow);
  deck.position.set(0, lipH * 0.72, 0);
  deck.frustumCulled = false;

  const landing = new THREE.Mesh(new THREE.BoxGeometry(w * 1.15, 0.45 * s, landL), shade);
  landing.position.set(0, lipH * 0.28, -(deckL * 0.5 + gap * 0.5 + landL * 0.35));
  landing.rotation.x = 0.28;
  landing.frustumCulled = false;

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, lipH * 0.7, deckL + gap), shade);
  const sideR = sideL.clone();
  sideL.position.set(-w * 0.52, lipH * 0.35, 0);
  sideR.position.set(w * 0.52, lipH * 0.35, 0);
  sideL.frustumCulled = false;
  sideR.frustumCulled = false;

  g.add(approach, lip, deck, landing, sideL, sideR);
  g.userData.park = {
    kind: medium ? "tabletop_med" : "tabletop_small",
    length: approachL + deckL + gap + landL,
    height: lipH,
    airLen: gap + deckL * 0.4,
    lipAlong: approachL * 0.55,
  };
  return g;
}

/** Kicker: steep takeoff, gap, sloped landing. */
function createKicker(s, medium = false) {
  const g = new THREE.Group();
  g.name = medium ? "park-kicker-med" : "park-kicker-small";
  const snow = parkSnowMat();
  const shade = parkSnowShadeMat();
  const w = (medium ? 2.8 : 2.1) * s;
  const lipH = (medium ? 2.8 : 1.9) * s;
  const rampL = (medium ? 2.6 : 1.9) * s;
  const landL = (medium ? 3.4 : 2.4) * s;
  const gap = (medium ? 1.8 : 1.1) * s;

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, lipH, rampL), snow);
  ramp.position.set(0, lipH * 0.38, rampL * 0.15);
  ramp.rotation.x = -0.72;
  ramp.frustumCulled = false;

  const face = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, lipH * 0.95, 0.28 * s), shade);
  face.position.set(0, lipH * 0.48, -rampL * 0.15);
  face.frustumCulled = false;

  const landing = new THREE.Mesh(new THREE.BoxGeometry(w * 1.2, 0.5 * s, landL), shade);
  landing.position.set(0, lipH * 0.18, -(gap + landL * 0.4));
  landing.rotation.x = 0.32;
  landing.frustumCulled = false;

  const mound = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.45 * s, rampL * 0.7), shade);
  mound.position.set(0, 0.2 * s, rampL * 0.45);
  mound.frustumCulled = false;

  g.add(mound, ramp, face, landing);
  g.userData.park = {
    kind: medium ? "kicker_med" : "kicker_small",
    length: rampL + gap + landL,
    height: lipH,
    airLen: gap * 1.1,
    lipAlong: rampL * 0.55,
  };
  return g;
}

function createParkFeatureMesh(kind, s) {
  switch (kind) {
    case "rail":
      return createRail(s, 1);
    case "flat_rail":
      return createFlatDownRail(s);
    case "box":
      return createBox(s, false);
    case "cbox":
      return createBox(s, true);
    case "rainbow":
      return createRainbowRail(s);
    case "roller":
      return createRoller(s);
    case "hip":
      return createHip(s);
    case "tabletop_small":
      return createTabletopJump(s, false);
    case "tabletop_med":
      return createTabletopJump(s, true);
    case "kicker_small":
      return createKicker(s, false);
    case "kicker_med":
      return createKicker(s, true);
    default:
      return createBox(s, false);
  }
}

function isJumpKind(kind) {
  return (
    kind === "kicker_small" ||
    kind === "kicker_med" ||
    kind === "tabletop_small" ||
    kind === "tabletop_med" ||
    kind === "hip" ||
    kind === "roller"
  );
}

function isGrindKind(kind) {
  return kind === "rail" || kind === "flat_rail" || kind === "box" || kind === "cbox" || kind === "rainbow";
}

function createParkRider(unitScale, board, suit, ski) {
  const mesh = makeClayRider(unitScale, board, suit, ski);
  mesh.name = board ? "park-boarder" : "park-skier";
  return mesh;
}

/**
 * Build one terrain park along a downhill spine (Vector3[]).
 * Sparse accents at measured distances along the piste — snow stays dominant.
 */
export function createSnowPark(run, opts = {}) {
  const {
    seed = 1,
    unitScale = 1,
    group = null,
    blockers = null,
  } = opts;
  if (!run || run.length < 2) return { features: [], riders: [] };

  const pts = ensureDownhillPath(run);
  const len = polylineLen(pts);
  const s = Math.max(1, unitScale);
  /* Clearance must exceed exaggerated footprint or props stack into a Lego pile. */
  const avgGap = Math.max(160, 4.2 * s);
  const pad = Math.min(len * 0.12, Math.max(avgGap * 0.35, 40));
  const usable = Math.max(0, len - pad * 2);
  if (usable < avgGap * 0.85) return { features: [], riders: [] };

  let count = Math.floor(usable / avgGap);
  count = Math.max(1, Math.min(5, count));
  if (usable < avgGap * 1.6) count = Math.min(count, 2);
  if (usable < avgGap * 2.6) count = Math.min(count, 3);

  const plan = pickParkFeaturePlan(seed, count);
  const features = [];
  const parent = group || new THREE.Group();
  const usedAlong = [];
  const blockR = Math.max(14, 0.22 * s);

  const tooCloseAlong = (along, need) => {
    for (const u of usedAlong) {
      if (Math.abs(along - u) < need) return true;
    }
    return false;
  };

  const blockedXZ = (x, z) => {
    if (!blockers?.length) return false;
    for (const b of blockers) {
      if (Math.hypot(x - b.x, z - b.z) < blockR) return true;
    }
    return false;
  };

  /* Strict downhill reservation: each feature owns a long along-piste band. */
  let cursor = pad;
  for (let i = 0; i < plan.length; i++) {
    const kind = plan[i];
    const need = parkMinSpacingAlong(kind, s);
    let along = cursor + need;
    if (along > len - pad) break;

    let placed = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      const tryAlong = along + attempt * Math.max(24, need * 0.15);
      if (tryAlong > len - pad) break;
      if (tooCloseAlong(tryAlong, need)) continue;

      const hit = alongPolyline(pts, tryAlong);
      if (!hit) continue;
      const ahead = alongPolyline(pts, Math.min(len - 0.5, tryAlong + Math.max(4, 0.08 * s)));
      const tan = new THREE.Vector3(
        (ahead?.x ?? hit.x) - hit.x,
        (ahead?.y ?? hit.y) - hit.y,
        (ahead?.z ?? hit.z) - hit.z,
      );
      if (tan.lengthSq() < 1e-8) tan.set(hit.tx || 0, 0, hit.tz || 1);
      tan.normalize();

      const sideSign = i % 2 === 0 ? 1 : -1;
      const sideAmt =
        sideSign * (0.55 + rng(seed + i * 4.3) * 0.9) * Math.max(1.0, 0.028 * s);
      const offsetScale = isJumpKind(kind) ? 0.35 : 0.85;
      const nx = -tan.z;
      const nz = tan.x;
      const nLen = Math.hypot(nx, nz) || 1;
      const ox = (nx / nLen) * sideAmt * offsetScale;
      const oz = (nz / nLen) * sideAmt * offsetScale;
      const fx = hit.x + ox;
      const fz = hit.z + oz;
      if (blockedXZ(fx, fz)) continue;

      const mesh = createParkFeatureMesh(kind, s);
      mesh.position.set(fx, hit.y, fz);
      orientParkGroup(mesh, tan);
      if (kind === "hip") mesh.rotation.y += sideSign > 0 ? -0.4 : 0.4;
      mesh.renderOrder = 3;
      mesh.frustumCulled = false;
      parent.add(mesh);

      const foot = parkFeatureLengthM(kind, s);
      const meta = mesh.userData.park || { kind, length: foot, height: s };
      features.push({
        kind: meta.kind,
        along: tryAlong,
        length: meta.length || foot,
        height: meta.height || s,
        airLen: meta.airLen || meta.length * 0.35,
        lipAlong: meta.lipAlong || meta.length * 0.35,
        x: fx,
        y: hit.y,
        z: fz,
        tx: tan.x,
        ty: tan.y,
        tz: tan.z,
        side: sideAmt * offsetScale,
        mesh,
      });
      usedAlong.push(tryAlong);
      cursor = tryAlong + need * 0.55;
      placed = true;
      break;
    }
    if (!placed) break;
  }

  const riders = [];
  const cruiseN = Math.min(8, Math.max(3, Math.round(len / Math.max(120, avgGap * 0.7))));
  for (let r = 0; r < cruiseN; r++) {
    const board = r % 3 === 0;
    const mesh = createParkRider(
      unitScale,
      board,
      RIDER_SUITS[(seed + r) % RIDER_SUITS.length],
      RIDER_SKIS[(seed + r * 2) % RIDER_SKIS.length],
    );
    parent.add(mesh);
    riders.push({
      mesh,
      pts,
      len,
      pad,
      feature: null,
      mode: "cruise",
      board,
      along: pad + ((r + 0.2) / cruiseN) * Math.max(1, len - pad * 2),
      speed: (2.6 + rng(seed * 2.1 + r) * 3.8) * Math.max(1, Math.sqrt(Math.max(1, unitScale)) * 0.55),
      bias: (r / Math.max(1, cruiseN - 1) - 0.5) * Math.min(6, Math.max(2, unitScale * 0.18)),
      phase: rng(seed + r * 6.1) * Math.PI * 2,
      amp: 1.2 + rng(seed + r * 3.2) * 2,
      wave: 18 + rng(seed + r * 4.1) * 28,
      t: 0,
      cycle: 1,
    });
  }

  const trickN = Math.min(2, features.length);
  for (let r = 0; r < trickN; r++) {
    const feat = features[(seed + r * 5) % features.length];
    const board = isGrindKind(feat.kind) ? true : r % 2 === 0;
    const mesh = createParkRider(
      unitScale,
      board,
      RIDER_SUITS[(seed + r + 3) % RIDER_SUITS.length],
      RIDER_SKIS[(seed + r * 3) % RIDER_SKIS.length],
    );
    parent.add(mesh);
    riders.push({
      mesh,
      pts,
      len,
      pad,
      feature: feat,
      mode: "feature",
      board,
      t: rng(seed * 1.3 + r * 8.7),
      cycle: 6 + rng(seed + r * 2.2) * 5,
      speed: 1,
    });
  }

  return { features, riders, group: parent, pts, len };
}

export function addSnowParks(
  parent,
  featureCollection,
  center,
  sample,
  unitScale = 1,
  clipRing = null,
  trailLift = 0.4,
  blockers = null,
) {
  const parksRaw = (featureCollection?.features || []).filter(isSnowParkFeature);
  if (!parksRaw.length) return null;

  const parksByKey = new Map();
  for (const feature of parksRaw) {
    const osm = featureOsmWayId(feature) || featureLiftOsmId(feature);
    const name = String(feature?.properties?.name || "").toLowerCase();
    let key = osm ? `way:${osm}` : "";
    if (!key) {
      const coords = lineParts(feature.geometry)[0] || polygonParts(feature.geometry)[0]?.[0] || [];
      const a = coords[0];
      const b = coords[coords.length - 1];
      key = `g:${name}:${a?.[0]?.toFixed?.(0)},${a?.[1]?.toFixed?.(0)}:${b?.[0]?.toFixed?.(0)},${b?.[1]?.toFixed?.(0)}`;
    }
    const prev = parksByKey.get(key);
    if (!prev || trailGeomScore(feature) > trailGeomScore(prev)) parksByKey.set(key, feature);
  }
  const parks = [...parksByKey.values()];
  if (!parks.length) return null;

  const root = new THREE.Group();
  root.name = "montage-snowpark";
  const jumpLift = trailLift + Math.max(0.35, 0.1 * Math.max(1, unitScale));
  const allRiders = [];
  let parkCount = 0;
  let featureCount = 0;
  const s = Math.max(1, unitScale);
  const parkSep = Math.max(180, 3.5 * s);
  const usedParkCenters = [];

  const spineCentroid = (spine) => {
    let x = 0;
    let z = 0;
    for (const p of spine) {
      x += p.x;
      z += p.z;
    }
    const n = Math.max(1, spine.length);
    return { x: x / n, z: z / n, len: polylineLen(spine) };
  };

  const candidates = [];
  for (const feature of parks) {
    const seed = snowParkFeatureSeed(feature);
    const spines = [];

    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of downsampleLine(coords, 56)) {
        const p = gamePoint(coord[0], coord[1], center, sample, jumpLift);
        if (p) pts.push(p);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        if (run.length >= 2) spines.push(ensureDownhillPath(run));
      }
    }

    if (!spines.length) {
      for (const poly of polygonParts(feature.geometry)) {
        const outer = poly?.[0];
        if (!outer || outer.length < 4) continue;
        const dens = downsampleLine(outer, 40);
        const pts = [];
        for (const coord of dens) {
          const p = gamePoint(coord[0], coord[1], center, sample, jumpLift);
          if (p) pts.push(p);
        }
        for (const run of clipPointRuns(pts, clipRing)) {
          if (run.length >= 4) {
            const half = Math.max(3, Math.floor(run.length / 2));
            spines.push(ensureDownhillPath(run.slice(0, half)));
          }
        }
      }
    }

    spines.sort((a, b) => polylineLen(b) - polylineLen(a));
    const spine = spines[0];
    if (!spine) continue;
    candidates.push({ seed, spine, c: spineCentroid(spine) });
  }

  /* Keep the longest corridor when several snow_park ways share one bay. */
  candidates.sort((a, b) => b.c.len - a.c.len);
  for (const cand of candidates) {
    let clash = false;
    for (const u of usedParkCenters) {
      if (Math.hypot(cand.c.x - u.x, cand.c.z - u.z) < parkSep) {
        clash = true;
        break;
      }
    }
    if (clash) continue;
    usedParkCenters.push(cand.c);

    const built = createSnowPark(cand.spine, {
      seed: cand.seed,
      unitScale,
      group: root,
      blockers,
    });
    if (built.features.length || built.riders.length) {
      parkCount += 1;
      featureCount += built.features.length;
      for (const rider of built.riders) allRiders.push(rider);
    }
  }

  if (!root.children.length) return null;
  parent.add(root);

  if (!allRiders.length) return { group: root, list: [], parks: parkCount, features: featureCount };
  const pack = { group: root, list: allRiders };
  updateParkRiders(pack, 0);
  return pack;
}

export function updateParkRiders(pack, dt) {
  if (!pack?.list?.length) return;
  for (const rider of pack.list) {
    if (!rider.pts?.length) continue;
    const ride = rider.mesh.userData.ride || 0.5;

    /* Most park traffic just skis the open snow between accents. */
    if (rider.mode === "cruise" || !rider.feature) {
      const pad = Math.min(rider.pad || 8, rider.len * 0.12);
      if (dt > 0) {
        rider.along += (rider.speed || 3) * dt;
        if (rider.along >= rider.len - pad) rider.along = pad;
      }
      const p = alongPolyline(rider.pts, rider.along);
      if (!p) continue;
      const nx = -p.tz;
      const nz = p.tx;
      const nLen = Math.hypot(nx, nz) || 1;
      const side =
        (rider.bias || 0) +
        (rider.amp || 1.5) *
          Math.sin(rider.along / Math.max(8, rider.wave || 24) + (rider.phase || 0));
      rider.mesh.position.set(
        p.x + (nx / nLen) * side,
        p.y + ride,
        p.z + (nz / nLen) * side,
      );
      rider.mesh.rotation.order = "YXZ";
      rider.mesh.rotation.y = Math.atan2(p.tx, p.tz);
      rider.mesh.rotation.x = 0.12 + Math.sin(rider.along * 0.05 + (rider.phase || 0)) * 0.04;
      rider.mesh.rotation.z = Math.sin(rider.along * 0.09 + (rider.phase || 0)) * (rider.board ? 0.2 : 0.12);
      rider.mesh.visible = Number.isFinite(rider.mesh.position.y);
      continue;
    }

    const feat = rider.feature;
    if (dt > 0) {
      rider.t += dt / Math.max(3.5, rider.cycle || 6);
      if (rider.t >= 1) rider.t -= Math.floor(rider.t);
    }
    const u = rider.t;
    const approach = Math.max(6, feat.length * 0.9);
    let along;
    let yBoost = 0;
    let pitch = 0.12;
    let roll = 0;
    let yawAdd = 0;

    if (isGrindKind(feat.kind)) {
      if (u < 0.28) {
        const k = u / 0.28;
        along = feat.along - approach * (1 - k);
        pitch = 0.14;
      } else if (u < 0.62) {
        const k = (u - 0.28) / 0.34;
        along = feat.along - feat.length * 0.35 + feat.length * 0.7 * k;
        yBoost = feat.height * (0.85 + Math.sin(k * Math.PI) * 0.08);
        pitch = feat.kind === "rainbow" ? -0.05 + Math.sin(k * Math.PI) * 0.45 : 0.05;
        roll = rider.board ? Math.sin(k * Math.PI * 2) * 0.35 : Math.sin(k * Math.PI) * 0.12;
        yawAdd = rider.board ? 0.15 : 0;
      } else if (u < 0.78) {
        const k = (u - 0.62) / 0.16;
        along = feat.along + feat.length * 0.35 + approach * 0.25 * k;
        yBoost = feat.height * (1 - k) * 0.5;
        pitch = 0.2;
      } else {
        const k = (u - 0.78) / 0.22;
        along = feat.along + feat.length * 0.35 + approach * 0.25 + approach * 0.5 * k;
        pitch = 0.12;
      }
    } else {
      const air = Math.max(4, feat.airLen || feat.length * 0.4);
      if (u < 0.3) {
        const k = u / 0.3;
        along = feat.along - approach * (1 - k);
        pitch = 0.16 + k * 0.08;
      } else if (u < 0.42) {
        const k = (u - 0.3) / 0.12;
        along = feat.along - 1 + (feat.lipAlong || 2) * k;
        yBoost = feat.height * 0.35 * k;
        pitch = -0.15 - k * 0.35;
      } else if (u < 0.62) {
        const k = (u - 0.42) / 0.2;
        along = feat.along + (feat.lipAlong || 2) * 0.2 + air * k;
        yBoost = feat.height * (0.55 + Math.sin(k * Math.PI) * 0.85);
        pitch = -0.35 + k * 0.7;
        roll = rider.board ? Math.sin(k * Math.PI) * 0.55 : Math.sin(k * Math.PI) * 0.2;
      } else if (u < 0.78) {
        const k = (u - 0.62) / 0.16;
        along = feat.along + air + approach * 0.35 * k;
        yBoost = feat.height * 0.2 * (1 - k);
        pitch = 0.25;
      } else {
        const k = (u - 0.78) / 0.22;
        along = feat.along + air + approach * 0.35 + approach * 0.55 * k;
        pitch = 0.12;
      }
    }

    along = Math.max(rider.pad || 2, Math.min((rider.len || feat.along + 20) - (rider.pad || 2), along));
    const p = alongPolyline(rider.pts, along);
    if (!p) continue;
    const nx = -p.tz;
    const nz = p.tx;
    const nLen = Math.hypot(nx, nz) || 1;
    const side = feat.side || 0;
    rider.mesh.position.set(
      p.x + (nx / nLen) * side * 0.85,
      p.y + yBoost + ride,
      p.z + (nz / nLen) * side * 0.85,
    );
    rider.mesh.rotation.order = "YXZ";
    rider.mesh.rotation.y = Math.atan2(p.tx, p.tz) + yawAdd;
    rider.mesh.rotation.x = pitch;
    rider.mesh.rotation.z = roll;
    rider.mesh.visible = Number.isFinite(rider.mesh.position.y);
  }
}

/** Sample lift / tree / building positions to keep park features clear. */
export function collectParkBlockers(center, sample, layers = {}) {
  const out = [];
  const pushPt = (east, north) => {
    if (!Number.isFinite(east) || !Number.isFinite(north)) return;
    const { x, z } = localXZ(east, north, center);
    if (sample && sample(x, z) == null) return;
    out.push({ x, z });
  };
  for (const feature of layers.lifts?.features || []) {
    for (const coords of lineParts(feature.geometry)) {
      if (!coords?.length) continue;
      const a = coords[0];
      const b = coords[coords.length - 1];
      if (a) pushPt(a[0], a[1]);
      if (b) pushPt(b[0], b[1]);
      const mid = coords[Math.floor(coords.length / 2)];
      if (mid) pushPt(mid[0], mid[1]);
    }
  }
  const trees = layers.forest?.features || [];
  const treeStride = Math.max(1, Math.ceil(trees.length / 180));
  for (let i = 0; i < trees.length; i += treeStride) {
    const g = trees[i]?.geometry;
    if (g?.type === "Point") pushPt(g.coordinates[0], g.coordinates[1]);
    else if (g?.type === "MultiPoint") {
      for (const c of g.coordinates || []) if (c?.length >= 2) pushPt(c[0], c[1]);
    }
  }
  for (const feature of layers.buildings?.features || []) {
    for (const ring of ringParts(feature.geometry)) {
      if (!ring?.length) continue;
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const c of ring) {
        if (!c || c.length < 2) continue;
        sx += c[0];
        sy += c[1];
        n += 1;
      }
      if (n) pushPt(sx / n, sy / n);
    }
  }
  return out;
}

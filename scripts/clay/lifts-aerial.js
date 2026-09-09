/**
 * Aerial chairlifts and gondolas: towers, terminals, cable catenaries, and swinging carriers.
 */

import * as THREE from "three";
import { PALETTE, TRAIL_WIDTH } from "./config.js";
import {
  rng,
  lineParts,
  polylineLen,
  alongPolyline,
  sampleAlongPolyline,
  horizTangentAt,
  sideVector,
  featureLiftOsmId,
  clipPointRuns,
  downsampleLine,
  buildSaggedSpan,
} from "./math-utils.js";
import { gamePoint, appendRibbon, meshFromPositions } from "./trails.js";
import {
  isSurfaceLift,
  isTBarLift,
  createTBarAssets,
  createTBarLift,
  orientLiftGround,
  MAX_TBAR_LIFTS,
  MAX_TBAR_CARRIERS,
} from "./lifts-tbar.js";

export const GONDOLA_LIFT_TYPES = new Set([
  "gondola",
  "cable_car",
  "cablecar",
  "mixed_lift",
  "funitel",
  "tricable",
  "detachable_gondola",
]);

export function isGondolaLift(type) {
  return GONDOLA_LIFT_TYPES.has(type);
}

export function isLiftPylonOrStation(type) {
  return type === "pylon" || type === "station" || type === "goods";
}

export function featureAerialway(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  let type = tags.aerialway || props.aerialway || "";
  if (!type) {
    const other = String(tags.other_tags || props.other_tags || "");
    const m = /["']?aerialway["']?\s*=>\s*"([^"]+)/.exec(other);
    if (m) type = m[1];
  }
  return String(type || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
}

export function liftGeomScore(feature) {
  const id = String(feature?.properties?.id || "");
  let n = 0;
  for (const coords of lineParts(feature?.geometry)) n += coords?.length || 0;
  return (id.includes("way:") ? 1000 : 0) + n;
}

export function selectLiftFeatures(features) {
  const byKey = new Map();
  for (const feature of features || []) {
    if (!lineParts(feature.geometry).length) continue;
    const type = featureAerialway(feature);
    if (isLiftPylonOrStation(type)) continue;
    const osm = featureLiftOsmId(feature);
    let key = osm ? `way:${osm}` : "";
    if (!key) {
      const coords = lineParts(feature.geometry)[0] || [];
      const a = coords[0];
      const b = coords[coords.length - 1];
      const name = feature?.properties?.name || "";
      key = `g:${name}:${a?.[0]?.toFixed?.(0)},${a?.[1]?.toFixed?.(0)}:${b?.[0]?.toFixed?.(0)},${b?.[1]?.toFixed?.(0)}`;
    }
    const prev = byKey.get(key);
    if (!prev || liftGeomScore(feature) > liftGeomScore(prev)) byKey.set(key, feature);
  }
  return [...byKey.values()];
}

function cableHeightProfile(t, cableH, stationH) {
  const ramp = 0.14;
  let u = 1;
  if (t < ramp) u = t / ramp;
  else if (t > 1 - ramp) u = (1 - t) / ramp;
  u = Math.max(0, Math.min(1, u));
  u = u * u * (3 - 2 * u);
  return stationH + (cableH - stationH) * u;
}

function createAerialLiftAssets(unitScale = 1) {
  const s = Math.max(1, unitScale);
  const chairTowerH = 3.4 * s;
  const gondolaTowerH = 4.2 * s;
  return {
    s,
    chairTowerH,
    gondolaTowerH,
    chairCableH: chairTowerH * 0.92,
    gondolaCableH: gondolaTowerH * 0.92,
    stationH: Math.max(0.55 * s, 1.15),
    chairLane: 0.72 * s,
    gondolaLane: 1.05 * s,
    cableR: Math.max(0.03 * s, 0.04),
    towerMargin: Math.max(55, 9.5 * s),
    steelMat: new THREE.MeshLambertMaterial({ color: PALETTE.lift, flatShading: true }),
    steelDark: new THREE.MeshLambertMaterial({ color: 0x374151, flatShading: true }),
    housingMat: new THREE.MeshLambertMaterial({ color: 0x5b6b7a, flatShading: true }),
    housingDeep: new THREE.MeshLambertMaterial({ color: 0x3f4d5a, flatShading: true }),
    platformMat: new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true }),
    railMat: new THREE.MeshLambertMaterial({ color: 0x1f2937, flatShading: true }),
    roofMat: new THREE.MeshLambertMaterial({ color: 0x0f766e, flatShading: true }),
    wheelMat: new THREE.MeshLambertMaterial({ color: 0x111827, flatShading: true }),
    cableMat: new THREE.MeshBasicMaterial({ color: PALETTE.cable }),
    accentMat: new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true }),
  };
}

function createTurnaroundWheel(assets, radius, thick) {
  const geo = new THREE.CylinderGeometry(radius, radius, thick, 14);
  geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, assets.wheelMat);
  mesh.name = "lift-turnaround-wheel";
  mesh.frustumCulled = false;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, thick * 1.35, 8),
    assets.steelDark,
  );
  hub.rotation.z = Math.PI / 2;
  hub.frustumCulled = false;
  const g = new THREE.Group();
  g.add(mesh, hub);
  return g;
}

function createLoadingPlatform(assets, width, depth, height) {
  const g = new THREE.Group();
  g.name = "lift-loading-platform";
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12 * assets.s, depth), assets.platformMat);
  deck.position.y = height;
  deck.frustumCulled = false;
  const postGeo = new THREE.CylinderGeometry(0.06 * assets.s, 0.08 * assets.s, height, 5);
  for (const [x, z] of [
    [-width * 0.38, -depth * 0.35],
    [width * 0.38, -depth * 0.35],
    [-width * 0.38, depth * 0.35],
    [width * 0.38, depth * 0.35],
  ]) {
    const post = new THREE.Mesh(postGeo, assets.steelDark);
    post.position.set(x, height / 2, z);
    post.frustumCulled = false;
    g.add(post);
  }
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.05 * assets.s, 0.18 * assets.s, depth * 0.92), assets.railMat);
  const railR = railL.clone();
  railL.position.set(-width * 0.45, height + 0.12 * assets.s, 0);
  railR.position.set(width * 0.45, height + 0.12 * assets.s, 0);
  railL.frustumCulled = false;
  railR.frustumCulled = false;
  g.add(deck, railL, railR);
  return g;
}

function createTerminalBuilding(assets, w, h, d) {
  const g = new THREE.Group();
  g.name = "lift-terminal-building";
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), assets.housingMat);
  body.position.y = h * 0.5;
  body.frustumCulled = false;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, 0.16 * assets.s, d * 1.08), assets.roofMat);
  roof.position.y = h + 0.06 * assets.s;
  roof.frustumCulled = false;
  /* Open bay cut suggestion: darker inset panels on the lift face. */
  const bay = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.55, 0.08 * assets.s), assets.housingDeep);
  bay.position.set(0, h * 0.42, d * 0.5 + 0.02 * assets.s);
  bay.frustumCulled = false;
  g.add(body, roof, bay);
  return g;
}

function createChairliftTerminal(endpoint, direction, endType, assets) {
  const g = new THREE.Group();
  g.name = endType === "top" ? "chair-terminal-top" : "chair-terminal-bottom";
  g.position.copy(endpoint);
  const yaw = Math.atan2(direction.x, direction.z);
  g.rotation.y = yaw;

  const s = assets.s;
  const frameH = assets.chairTowerH * 1.15;
  const lane = assets.chairLane;
  const outward = endType === "top" ? 1 : -1;

  const colGeo = new THREE.CylinderGeometry(0.16 * s, 0.22 * s, frameH, 6);
  for (const x of [-lane * 1.15, lane * 1.15]) {
    const col = new THREE.Mesh(colGeo, assets.steelMat);
    col.position.set(x, frameH / 2, 0);
    col.frustumCulled = false;
    g.add(col);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(lane * 2.6, 0.18 * s, 0.18 * s), assets.steelDark);
  beam.position.y = frameH * 0.88;
  beam.frustumCulled = false;
  g.add(beam);

  const platformH = Math.max(0.7 * s, assets.stationH * 0.85);
  const platform = createLoadingPlatform(assets, lane * 2.8, 2.2 * s, platformH);
  platform.position.z = outward * -0.35 * s;
  g.add(platform);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(lane * 3.0, 0.12 * s, 2.4 * s), assets.housingMat);
  canopy.position.set(0, platformH + 1.35 * s, outward * -0.2 * s);
  canopy.frustumCulled = false;
  g.add(canopy);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 1.1 * s, 1.6 * s), assets.housingDeep);
  housing.position.set(lane * 1.55, 0.7 * s, outward * -0.9 * s);
  housing.frustumCulled = false;
  g.add(housing);

  const wheel = createTurnaroundWheel(assets, 0.55 * s, 0.22 * s);
  wheel.position.set(0, assets.stationH + 0.15 * s, outward * 0.55 * s);
  g.add(wheel);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(lane * 1.6, 0.08 * s, 1.4 * s), assets.platformMat);
  ramp.position.set(0, platformH * 0.45, outward * -1.45 * s);
  ramp.rotation.x = outward * -0.22;
  ramp.frustumCulled = false;
  g.add(ramp);

  return g;
}

function createGondolaTerminal(endpoint, direction, endType, assets) {
  const g = new THREE.Group();
  g.name = endType === "top" ? "gondola-terminal-top" : "gondola-terminal-bottom";
  g.position.copy(endpoint);
  g.rotation.y = Math.atan2(direction.x, direction.z);

  const s = assets.s;
  const lane = assets.gondolaLane;
  const outward = endType === "top" ? 1 : -1;
  const building = createTerminalBuilding(assets, 3.6 * s, 2.4 * s, 4.2 * s);
  building.position.z = outward * -0.6 * s;
  g.add(building);

  const frameH = assets.gondolaTowerH * 1.05;
  const colGeo = new THREE.CylinderGeometry(0.2 * s, 0.28 * s, frameH, 6);
  for (const x of [-lane * 1.35, lane * 1.35]) {
    const col = new THREE.Mesh(colGeo, assets.steelMat);
    col.position.set(x, frameH / 2, outward * 0.85 * s);
    col.frustumCulled = false;
    g.add(col);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(lane * 3.0, 0.22 * s, 0.22 * s), assets.steelDark);
  beam.position.set(0, frameH * 0.9, outward * 0.85 * s);
  beam.frustumCulled = false;
  g.add(beam);

  const platformH = Math.max(0.85 * s, assets.stationH);
  const platform = createLoadingPlatform(assets, lane * 3.2, 3.0 * s, platformH);
  platform.position.z = outward * 0.15 * s;
  g.add(platform);

  const wheel = createTurnaroundWheel(assets, 0.78 * s, 0.28 * s);
  wheel.position.set(0, assets.stationH + 0.35 * s, outward * 1.35 * s);
  g.add(wheel);

  const drive = new THREE.Mesh(new THREE.BoxGeometry(1.8 * s, 1.35 * s, 2.0 * s), assets.housingDeep);
  drive.position.set(lane * 1.9, 0.85 * s, outward * -1.4 * s);
  drive.frustumCulled = false;
  g.add(drive);

  return g;
}

/**
 * Shared aerial terminal factory.
 * @param {"chairlift"|"gondola"} kind
 * @param {THREE.Vector3} endpoint terrain-sampled OSM endpoint
 * @param {THREE.Vector3} direction horizontal unit tangent into the lift line
 * @param {"bottom"|"top"} endType
 */
function createLiftTerminal(kind, endpoint, direction, endType, assets) {
  const terminal = kind === "gondola"
    ? createGondolaTerminal(endpoint, direction, endType, assets)
    : createChairliftTerminal(endpoint, direction, endType, assets);
  terminal.scale.set(0.5, 1, 0.5);
  return terminal;
}

/**
 * Continuous aerial cable loop with 180° terminal turnarounds.
 * uphill → top arc → downhill → bottom arc
 */
function buildAerialCableLoop(ground, cableH, stationH, laneHalf, unitScale = 1) {
  const total = polylineLen(ground);
  if (!(total > 12) || ground.length < 2) return null;
  const s = Math.max(1, unitScale);
  const samples = Math.max(18, Math.ceil(total / Math.max(16, total / 36)));
  const supportDists = [];
  for (let i = 0; i <= samples; i++) supportDists.push((total * i) / samples);

  function cableAt(dist, sideSign) {
    const p = alongPolyline(ground, dist);
    if (!p) return null;
    const tNorm = dist / total;
    const clear = cableHeightProfile(tNorm, cableH, stationH);
    const tan = new THREE.Vector3(p.tx, 0, p.tz);
    if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
    else tan.normalize();
    const side = sideVector(tan);
    return new THREE.Vector3(
      p.x + side.x * laneHalf * sideSign,
      p.y + clear,
      p.z + side.z * laneHalf * sideSign,
    );
  }

  function lanePoints(sideSign) {
    const pts = [];
    for (let i = 0; i < supportDists.length; i++) {
      const a = cableAt(supportDists[i], sideSign);
      if (!a) continue;
      if (pts.length) {
        const prev = pts[pts.length - 1];
        const span = prev.distanceTo(a);
        const sag = Math.min(span * 0.028, s * 0.28);
        pts.push(...buildSaggedSpan(prev, a, Math.max(2, Math.round(span / 22)), sag));
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
    const clear = cableHeightProfile(endDist / total, cableH, stationH);
    const center = new THREE.Vector3(p.x, p.y + clear, p.z);
    const outward = endDist > total * 0.5 ? tan.clone() : tan.clone().negate();
    const arc = [];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const ang = (Math.PI * i) / n;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const start = side.clone().multiplyScalar(fromSide * laneHalf);
      const out = outward.clone().multiplyScalar(laneHalf * 1.15);
      const q = start.clone().multiplyScalar(c).addScaledVector(out, sn);
      if (fromSide === -toSide) {
        arc.push(new THREE.Vector3(center.x + q.x, center.y, center.z + q.z));
      } else {
        const end = side.clone().multiplyScalar(toSide * laneHalf);
        const r = start
          .clone()
          .multiplyScalar(1 - ang / Math.PI)
          .addScaledVector(end, ang / Math.PI)
          .addScaledVector(out, sn);
        arc.push(new THREE.Vector3(center.x + r.x, center.y, center.z + r.z));
      }
    }
    return arc;
  }

  const topArc = turnaround(total, -1, 1);
  const botArc = turnaround(0, 1, -1);
  const loop = [...up, ...topArc, ...down, ...botArc];
  if (loop.length < 10) return null;

  /* Fraction along closed loop where the top terminal arc begins (after uphill). */
  let upLen = 0;
  for (let i = 1; i < up.length; i++) upLen += up[i - 1].distanceTo(up[i]);
  let topLen = 0;
  for (let i = 1; i < topArc.length; i++) topLen += topArc[i - 1].distanceTo(topArc[i]);
  let totalLoop = 0;
  for (let i = 1; i < loop.length; i++) totalLoop += loop[i - 1].distanceTo(loop[i]);
  totalLoop += loop[loop.length - 1].distanceTo(loop[0]);
  const topU = totalLoop > 1 ? (upLen + topLen * 0.5) / totalLoop : 0.5;

  return { loop, topU, totalLoop };
}

function densifyClosedLoop(loopPts, step) {
  if (!loopPts?.length) return [];
  const curve = new THREE.CatmullRomCurve3(loopPts, true, "catmullrom", 0.4);
  const len = curve.getLength();
  const n = Math.max(24, Math.ceil(len / Math.max(6, step)));
  const pts = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    curve.getPointAt(i / n, p);
    pts.push(p.clone());
  }
  /* Close so alongPolyline / polylineLen include the final terminal return span. */
  if (pts.length) pts.push(pts[0].clone());
  return pts;
}

/** Slow through terminal arcs so carriers visibly pass the station. */
function aerialTerminalSpeedScale(u, topU) {
  const wrap = (a) => {
    let d = Math.abs(a);
    if (d > 0.5) d = 1 - d;
    return d;
  };
  const dBot = wrap(u);
  const dTop = wrap(u - topU);
  const zone = 0.07;
  let scale = 1;
  if (dBot < zone) scale = Math.min(scale, 0.32 + 0.68 * (dBot / zone));
  if (dTop < zone) scale = Math.min(scale, 0.32 + 0.68 * (dTop / zone));
  return scale;
}

function endpointDirection(ground, atStart) {
  if (!ground?.length) return new THREE.Vector3(0, 0, 1);
  if (atStart) {
    const a = ground[0];
    const b = ground[Math.min(1, ground.length - 1)];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
    if (t.lengthSq() < 1e-8) return new THREE.Vector3(0, 0, 1);
    return t.normalize();
  }
  const a = ground[ground.length - 2] || ground[0];
  const b = ground[ground.length - 1];
  const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z);
  if (t.lengthSq() < 1e-8) return new THREE.Vector3(0, 0, 1);
  return t.normalize();
}

export function addLifts(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const group = new THREE.Group();
  group.name = "montage-lifts";
  const features = selectLiftFeatures(featureCollection?.features || []);
  if (!features.length) return null;

  const s = unitScale;
  const towerH = 3.4 * s;
  const gondolaTowerH = 4.2 * s;
  const cableH = towerH * 0.92;
  const gondolaCableH = gondolaTowerH * 0.92;
  const stationH = Math.max(0.45 * s, 1.1);
  /* Spacing is in mesh/game meters (path coords), not display units. */
  const towerStep = 210;
  const chairStep = 100;
  const hangerLen = 0.55 * s;
  const gondolaHangerLen = 0.85 * s;
  const surfaceLift = Math.max(0.18, 0.2 * s);
  const surfaceWidth = Math.max(0.14, TRAIL_WIDTH * 0.48 * s);

  const poleMat = new THREE.MeshLambertMaterial({ color: PALETTE.lift, flatShading: true });
  const armMat = new THREE.MeshLambertMaterial({ color: 0x5c6773, flatShading: true });
  const cableMat = new THREE.MeshBasicMaterial({ color: PALETTE.cable });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
  const barMat = new THREE.MeshLambertMaterial({ color: 0x374151, flatShading: true });
  const cabinMat = new THREE.MeshLambertMaterial({
    color: 0xe8eef4,
    emissive: 0xcbd5e1,
    emissiveIntensity: 0.12,
    flatShading: true,
  });
  const cabinAccent = new THREE.MeshLambertMaterial({ color: 0x0f766e, flatShading: true });
  const surfaceMat = new THREE.MeshBasicMaterial({
    color: 0x171717,
    side: THREE.DoubleSide,
  });
  const tbarAssets = createTBarAssets(unitScale);
  const tbarAnims = [];
  let tbarCount = 0;
  let tbarCarriers = 0;

  /* Prefer longer drag lifts so caps still leave readable T-bars on the mountain. */
  const tbarFeatures = features
    .filter((f) => isTBarLift(featureAerialway(f)))
    .map((f) => {
      let len = 0;
      for (const coords of lineParts(f.geometry)) {
        const pts = [];
        for (const coord of downsampleLine(coords, 12)) {
          const p = gamePoint(coord[0], coord[1], center, sample, 0);
          if (p) pts.push(p);
        }
        len = Math.max(len, polylineLen(pts));
      }
      return { feature: f, len };
    })
    .filter((x) => x.len >= 35)
    .sort((a, b) => b.len - a.len);

  for (const { feature } of tbarFeatures) {
    if (tbarCount >= MAX_TBAR_LIFTS || tbarCarriers >= MAX_TBAR_CARRIERS) break;
    try {
      const built = createTBarLift(feature, {
        center,
        sample,
        unitScale,
        clipRing,
        assets: tbarAssets,
      });
      if (built?.group) {
        group.add(built.group);
        tbarCount += 1;
        if (built.anim) {
          tbarAnims.push(built.anim);
          tbarCarriers += built.anim.list?.length || 0;
        }
      }
    } catch (err) {
      console.warn("[hero-montage-map] t-bar lift failed", err);
    }
  }

  const poleGeo = new THREE.CylinderGeometry(0.07 * s, 0.1 * s, towerH, 5);
  poleGeo.translate(0, towerH / 2, 0);
  const gondolaPoleGeo = new THREE.CylinderGeometry(0.11 * s, 0.16 * s, gondolaTowerH, 6);
  gondolaPoleGeo.translate(0, gondolaTowerH / 2, 0);
  const armGeo = new THREE.BoxGeometry(0.9 * s, 0.07 * s, 0.07 * s);
  armGeo.translate(0, towerH * 0.92, 0);
  const gondolaArmGeo = new THREE.BoxGeometry(1.4 * s, 0.1 * s, 0.1 * s);
  gondolaArmGeo.translate(0, gondolaTowerH * 0.92, 0);
  const seatGeo = new THREE.BoxGeometry(0.42 * s, 0.08 * s, 0.28 * s);
  const backGeo = new THREE.BoxGeometry(0.42 * s, 0.22 * s, 0.06 * s);
  backGeo.translate(0, 0.12 * s, -0.11 * s);
  const hangerGeo = new THREE.CylinderGeometry(0.025 * s, 0.025 * s, hangerLen, 4);
  hangerGeo.translate(0, -hangerLen / 2, 0);
  const gondolaHangerGeo = new THREE.CylinderGeometry(0.04 * s, 0.04 * s, gondolaHangerLen, 5);
  gondolaHangerGeo.translate(0, -gondolaHangerLen / 2, 0);
  const cabinGeo = new THREE.BoxGeometry(1.15 * s, 1.05 * s, 1.55 * s);
  cabinGeo.translate(0, -gondolaHangerLen - 0.55 * s, 0);
  const cabinRoofGeo = new THREE.BoxGeometry(1.28 * s, 0.14 * s, 1.68 * s);
  cabinRoofGeo.translate(0, -gondolaHangerLen - 0.02 * s, 0);

  const aerialAssets = createAerialLiftAssets(unitScale);
  const towerBases = [];
  const gondolaTowerBases = [];
  const aerialLoops = [];
  const surfaceRibbons = [];
  let aerialCount = 0;
  const MAX_AERIAL = 36;
  const MAX_CHAIRS = 96;
  const chairSpeed = 4.4 * Math.max(1, Math.sqrt(Math.max(1, s)));
  const gondolaSpeed = 3.2 * Math.max(1, Math.sqrt(Math.max(1, s)));

  for (const feature of features) {
    const aw = featureAerialway(feature);
    const tbar = isTBarLift(aw);
    const surface = isSurfaceLift(aw) && !tbar;
    const gondola = isGondolaLift(aw);
    if (tbar) continue;

    if (!surface && aerialCount >= MAX_AERIAL) continue;

    for (const coords of lineParts(feature.geometry)) {
      if (surface) {
        const pts = [];
        for (const coord of downsampleLine(coords, 14)) {
          const p = gamePoint(coord[0], coord[1], center, sample, surfaceLift);
          if (p) pts.push(p);
        }
        for (const run of clipPointRuns(pts, clipRing)) {
          appendRibbon(surfaceRibbons, run, surfaceWidth);
        }
        continue;
      }

      const groundRaw = [];
      for (const coord of downsampleLine(coords, 18)) {
        const p = gamePoint(coord[0], coord[1], center, sample, 0);
        if (p) groundRaw.push(p);
      }
      const groundRuns = clipPointRuns(groundRaw, clipRing);
      let ground = groundRaw;
      if (clipRing?.length) {
        if (!groundRuns.length) continue;
        ground = groundRuns.reduce((a, b) => (b.length > a.length ? b : a));
      }
      if (ground.length < 2) continue;
      ground = orientLiftGround(ground);
      aerialCount += 1;

      const liftLen = polylineLen(ground);
      const useCableH = gondola ? gondolaCableH : cableH;
      const lane = gondola ? aerialAssets.gondolaLane : aerialAssets.chairLane;
      const built = buildAerialCableLoop(ground, useCableH, stationH, lane, s);
      if (!built?.loop?.length) continue;

      const curve = new THREE.CatmullRomCurve3(built.loop, true, "catmullrom", 0.4);
      const segs = Math.min(120, Math.max(28, built.loop.length * 2));
      const tube = new THREE.TubeGeometry(curve, segs, aerialAssets.cableR, 4, true);
      const cableMesh = new THREE.Mesh(tube, cableMat);
      cableMesh.frustumCulled = false;
      group.add(cableMesh);

      const kind = gondola ? "gondola" : "chairlift";
      const bottomDir = endpointDirection(ground, true);
      const topDir = endpointDirection(ground, false);
      group.add(createLiftTerminal(kind, ground[0], bottomDir, "bottom", aerialAssets));
      group.add(createLiftTerminal(kind, ground[ground.length - 1], topDir, "top", aerialAssets));

      const loopPts = densifyClosedLoop(built.loop, Math.max(10, liftLen / 40));
      const loopLen = polylineLen(loopPts);
      if (loopPts.length >= 2 && loopLen > 20) {
        aerialLoops.push({
          pts: loopPts,
          len: loopLen,
          topU: built.topU,
          gondola,
        });
      }

      const margin = aerialAssets.towerMargin;
      if (gondola) {
        /* Sparse mid-span towers only — terminals own the endpoints. */
        if (liftLen > margin * 2.8) {
          const towers = sampleAlongPolyline(ground, Math.max(towerStep * 1.15, liftLen / 3.2));
          for (let i = 0; i < towers.length; i++) {
            const p = towers[i];
            const tApprox = towers.length <= 1 ? 0.5 : i / (towers.length - 1);
            const approxDist = tApprox * liftLen;
            if (approxDist < margin || approxDist > liftLen - margin) continue;
            if (cableHeightProfile(tApprox, useCableH, stationH) < useCableH * 0.72) continue;
            const next = towers[Math.min(towers.length - 1, i + 1)];
            const prev = towers[Math.max(0, i - 1)];
            const tan = new THREE.Vector3().subVectors(next, prev);
            tan.y = 0;
            if (tan.lengthSq() < 1e-6) tan.set(1, 0, 0);
            else tan.normalize();
            gondolaTowerBases.push({ p, tan });
          }
        }
      } else {
        const towers = sampleAlongPolyline(ground, towerStep);
        for (let i = 0; i < towers.length; i++) {
          const p = towers[i];
          const tApprox = towers.length <= 1 ? 0.5 : i / (towers.length - 1);
          const approxDist = tApprox * liftLen;
          if (approxDist < margin || approxDist > liftLen - margin) continue;
          if (tApprox < 0.12 || tApprox > 0.88) continue;
          if (cableHeightProfile(tApprox, cableH, stationH) < cableH * 0.72) continue;
          const next = towers[Math.min(towers.length - 1, i + 1)];
          const prev = towers[Math.max(0, i - 1)];
          const tan = new THREE.Vector3().subVectors(next, prev);
          tan.y = 0;
          if (tan.lengthSq() < 1e-6) tan.set(1, 0, 0);
          else tan.normalize();
          towerBases.push({ p, tan });
        }
      }
    }
  }

  if (surfaceRibbons.length) {
    const mesh = meshFromPositions(surfaceRibbons, surfaceMat);
    if (mesh) group.add(mesh);
  }

  function placeTowerInstances(bases, pGeo, aGeo) {
    if (!bases.length) return;
    const poles = new THREE.InstancedMesh(pGeo, poleMat, bases.length);
    const arms = new THREE.InstancedMesh(aGeo, armMat, bases.length);
    poles.frustumCulled = false;
    arms.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3();
    for (let i = 0; i < bases.length; i++) {
      const { p, tan } = bases[i];
      side.crossVectors(up, tan).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), side);
      m.compose(p, q, sc);
      poles.setMatrixAt(i, m);
      arms.setMatrixAt(i, m);
    }
    poles.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    group.add(poles, arms);
  }

  placeTowerInstances(towerBases, poleGeo, armGeo);
  placeTowerInstances(gondolaTowerBases, gondolaPoleGeo, gondolaArmGeo);

  const chairList = [];
  const gondolaList = [];
  for (const line of aerialLoops) {
    if (line.gondola) {
      const n = Math.max(3, Math.min(6, Math.round(line.len / Math.max(220, line.len / 4))));
      for (let k = 0; k < n; k++) {
        gondolaList.push({
          pts: line.pts,
          len: line.len,
          along: (line.len * (k + 0.18)) / Math.max(1, n),
          speed: gondolaSpeed,
          baseSpeed: gondolaSpeed,
          topU: line.topU,
        });
      }
    } else {
      const n = Math.max(4, Math.min(16, Math.round(line.len / chairStep)));
      for (let k = 0; k < n; k++) {
        if (chairList.length >= MAX_CHAIRS) break;
        chairList.push({
          pts: line.pts,
          len: line.len,
          along: (line.len * (k + 0.12)) / n,
          speed: chairSpeed,
          baseSpeed: chairSpeed,
          topU: line.topU,
        });
      }
    }
  }

  let chairAnim = null;
  if (chairList.length) {
    const hangers = new THREE.InstancedMesh(hangerGeo, barMat, chairList.length);
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, chairList.length);
    const backs = new THREE.InstancedMesh(backGeo, seatMat, chairList.length);
    hangers.frustumCulled = false;
    seats.frustumCulled = false;
    backs.frustumCulled = false;
    hangers.count = chairList.length;
    seats.count = chairList.length;
    backs.count = chairList.length;
    group.add(hangers, seats, backs);
    chairAnim = {
      hangers,
      seats,
      backs,
      list: chairList,
      hangerLen,
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      sc: new THREE.Vector3(1, 1, 1),
      forward: new THREE.Vector3(),
      seatPos: new THREE.Vector3(),
      cablePos: new THREE.Vector3(),
      zAxis: new THREE.Vector3(0, 0, 1),
    };
    updateLiftChairs(chairAnim, 0);
  }

  let gondolaAnim = null;
  if (gondolaList.length) {
    const hangers = new THREE.InstancedMesh(gondolaHangerGeo, barMat, gondolaList.length);
    const cabins = new THREE.InstancedMesh(cabinGeo, cabinMat, gondolaList.length);
    const roofs = new THREE.InstancedMesh(cabinRoofGeo, cabinAccent, gondolaList.length);
    hangers.frustumCulled = false;
    cabins.frustumCulled = false;
    roofs.frustumCulled = false;
    hangers.count = gondolaList.length;
    cabins.count = gondolaList.length;
    roofs.count = gondolaList.length;
    group.add(hangers, cabins, roofs);
    gondolaAnim = {
      hangers,
      seats: cabins,
      backs: roofs,
      list: gondolaList,
      hangerLen: 0,
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      sc: new THREE.Vector3(1, 1, 1),
      forward: new THREE.Vector3(),
      seatPos: new THREE.Vector3(),
      cablePos: new THREE.Vector3(),
      zAxis: new THREE.Vector3(0, 0, 1),
    };
    updateLiftChairs(gondolaAnim, 0);
  }

  parent.add(group);
  return { group, chairAnim, gondolaAnim, tbarAnims };
}

export function updateLiftChairs(pack, dt) {
  if (!pack?.list?.length) return;
  const { hangers, seats, backs, list, hangerLen, m, q, sc, forward, seatPos, cablePos, zAxis } = pack;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (dt > 0) {
      const u = c.len > 1 ? c.along / c.len : 0;
      const scale = aerialTerminalSpeedScale(u, c.topU ?? 0.5);
      const spd = (c.baseSpeed ?? c.speed) * scale;
      c.along += spd * dt;
      if (c.along >= c.len) c.along -= c.len;
      if (c.along < 0) c.along += c.len;
    }
    const p = alongPolyline(c.pts, c.along);
    if (!p) continue;
    cablePos.set(p.x, p.y, p.z);
    forward.set(p.tx, 0, p.tz);
    if (forward.lengthSq() < 1e-8) forward.set(1, 0, 0);
    else forward.normalize();
    q.setFromUnitVectors(zAxis, forward);
    m.compose(cablePos, q, sc);
    hangers.setMatrixAt(i, m);
    seatPos.set(p.x, p.y - hangerLen, p.z);
    m.compose(seatPos, q, sc);
    seats.setMatrixAt(i, m);
    backs.setMatrixAt(i, m);
  }
  hangers.instanceMatrix.needsUpdate = true;
  seats.instanceMatrix.needsUpdate = true;
  backs.instanceMatrix.needsUpdate = true;
}

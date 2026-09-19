/** Drape OSM vectors on the DEM. GeoJSON XY = local east, north. Game Z = -north. */

import * as THREE from "three";
import { styleForPisteFeature, classifyDifficulty } from "./trail-map.js?v=scheme1";
import { addOsmTraffic } from "./traffic.js?v=vis16";
import { alongPolyline, polylineLen } from "./gates.js?v=vis17";
import { liftType, liftCableHeight, makeLiftTerminal, makeLiftCarrier, makeLiftSkier } from "./lift-graphics.js?v=s2";
import { createLiftMotion } from "./lift-motion.js";
import { PALETTE } from "/scripts/clay/config.js";
import { addClayBuilding } from "/scripts/clay/buildings.js";
import {
  SNOW,
  applyInset,
  buildTrailCover,
  ensureMidPatches,
  forestRingsFromFC,
  getSnowLevel,
  loadSnowLevel,
} from "./snow.js?v=snow17";

const GRID = 12;
const MAX_FILL_SPAN = 700;
const TREE_STEP = 10;
const TREE_STEP_WOOD = 6;
const MAX_TREES = 8000;

function clayTreeMats() {
  return {
    bark: new THREE.MeshLambertMaterial({ color: PALETTE.trunk }),
    needle: new THREE.MeshLambertMaterial({ color: PALETTE.tree }),
    deep: new THREE.MeshLambertMaterial({ color: PALETTE.treeDeep }),
  };
}

function stampClayTree(dummy, trunks, crowns, deeps, i, x, y, z, s) {
  dummy.rotation.set(0, (i * 0.7) % 6.28, 0);
  dummy.scale.set(s, s, s);
  dummy.position.set(x, y + 2.4 * s, z);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.set(x, y + 5.1 * s, z);
  dummy.scale.set(s * 1.35, s * 1.05, s * 1.35);
  dummy.updateMatrix();
  crowns.setMatrixAt(i, dummy.matrix);
  dummy.position.set(x + s * 0.35, y + 6.4 * s, z + s * 0.2);
  dummy.scale.set(s * 0.95, s * 0.75, s * 0.95);
  dummy.updateMatrix();
  deeps.setMatrixAt(i, dummy.matrix);
}

/** Every vertex of any GeoJSON geometry, including nested multi/collection parts. */
function eachCoord(geom, fn) {
  if (!geom) return;
  const c = geom.coordinates;
  switch (geom.type) {
    case "Point":
      fn(c);
      break;
    case "MultiPoint":
    case "LineString":
      for (const p of c || []) fn(p);
      break;
    case "MultiLineString":
    case "Polygon":
      for (const r of c || []) for (const p of r || []) fn(p);
      break;
    case "MultiPolygon":
      for (const poly of c || []) for (const r of poly || []) for (const p of r || []) fn(p);
      break;
    case "GeometryCollection":
      for (const g of geom.geometries || []) eachCoord(g, fn);
      break;
    default:
      break;
  }
}

function cross(ox, oz, ax, az, bx, bz) {
  return (ax - ox) * (bz - oz) - (az - oz) * (bx - ox);
}

/** Monotone-chain hull over a flat [x,z,...] array. Returns CCW points in game XZ. */
export function convexHullXZ(flat) {
  const n = flat.length / 2;
  if (n < 3) return [];
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  idx.sort((a, b) => flat[a * 2] - flat[b * 2] || flat[a * 2 + 1] - flat[b * 2 + 1]);
  const hull = [];
  for (let pass = 0; pass < 2; pass++) {
    const start = hull.length + 1;
    const order = pass === 0 ? idx : idx.slice().reverse();
    for (const i of order) {
      const x = flat[i * 2];
      const z = flat[i * 2 + 1];
      while (
        hull.length > start &&
        cross(hull[hull.length - 2].x, hull[hull.length - 2].z, hull[hull.length - 1].x, hull[hull.length - 1].z, x, z) <= 0
      ) {
        hull.pop();
      }
      hull.push({ x, z });
    }
    hull.pop();
  }
  return hull.length >= 3 ? hull : [];
}

/**
 * Nearby-extract GeoJSON is often clipped to a rectangle. Those four (or more)
 * crop-edge vertices dominate a convex hull and turn the island into a slab.
 * Drop points on the dataset AABB, then hull the remaining OSM nodes/ways.
 */
function convexHullDropClipFrame(flat) {
  const n = flat.length / 2;
  if (n < 3) return convexHullXZ(flat);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = flat[i * 2];
    const z = flat[i * 2 + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const mx = Math.max(10, (maxX - minX) * 0.015);
  const mz = Math.max(10, (maxZ - minZ) * 0.015);
  const inner = [];
  for (let i = 0; i < n; i++) {
    const x = flat[i * 2];
    const z = flat[i * 2 + 1];
    if (x > minX + mx && x < maxX - mx && z > minZ + mz && z < maxZ - mz) {
      inner.push(x, z);
    }
  }
  const hull = convexHullXZ(inner.length >= 8 ? inner : flat);
  return hull.length >= 3 ? hull : convexHullXZ(flat);
}

function polygonParts(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

function lineParts(geom) {
  if (!geom) return [];
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  if (geom.type === "Polygon") return [geom.coordinates[0] || []];
  if (geom.type === "MultiPolygon") return (geom.coordinates || []).map((p) => p[0] || []);
  return [];
}

function ringBBox(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of ring || []) {
    if (!c || c.length < 2) continue;
    minX = Math.min(minX, c[0]);
    minY = Math.min(minY, c[1]);
    maxX = Math.max(maxX, c[0]);
    maxY = Math.max(maxY, c[1]);
  }
  return { minX, minY, maxX, maxY, span: Math.max(maxX - minX, maxY - minY) };
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function inPolygon(x, y, outer, holes) {
  if (!pointInRing(x, y, outer)) return false;
  for (const h of holes || []) {
    if (h.length >= 3 && pointInRing(x, y, h)) return false;
  }
  return true;
}

/** Jittered grid inside a wood polygon. OSM forest areas are stands, not a fill. */
function sampleForest(outer, holes, step, out) {
  const bb = ringBBox(outer);
  if (!Number.isFinite(bb.span) || bb.span < 4) return;
  const nx = Math.max(1, Math.ceil((bb.maxX - bb.minX) / step));
  const ny = Math.max(1, Math.ceil((bb.maxY - bb.minY) / step));
  let k = out.length;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const jx = ((k * 13) % 10) / 10 - 0.45;
      const jy = ((k * 29) % 10) / 10 - 0.45;
      const x = bb.minX + (i + 0.5 + jx) * step;
      const y = bb.minY + (j + 0.5 + jy) * step;
      k += 1;
      if (inPolygon(x, y, outer, holes)) out.push([x, y]);
    }
  }
}

function fillMat(color, opacity) {
  return new THREE.MeshLambertMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

const pisteFillCache = new Map();
const pisteLineCache = new Map();

function pisteFillMat(color) {
  let m = pisteFillCache.get(color);
  if (!m) {
    m = fillMat(color, 0.22);
    pisteFillCache.set(color, m);
  }
  return m;
}

function pisteLineMat(color) {
  let m = pisteLineCache.get(color);
  if (!m) {
    m = new THREE.LineBasicMaterial({ color });
    pisteLineCache.set(color, m);
  }
  return m;
}

const WALL_H = 0.305;
const WALL_T = 0.07;
const STRIPE_M = 0.8;
const wallBlack = new THREE.MeshLambertMaterial({ color: 0x141416 });
const wallColorCache = new Map();

function wallColorMat(color) {
  let m = wallColorCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    wallColorCache.set(color, m);
  }
  return m;
}

function densifyXY(ring, maxStep, closed) {
  const src = [];
  for (const c of ring || []) {
    if (c && c.length >= 2) src.push([c[0], c[1]]);
  }
  if (src.length < 2) return src;
  const n = src.length;
  const loop = closed && n >= 3;
  const segs = loop ? n : n - 1;
  const out = [];
  for (let i = 0; i < segs; i++) {
    const a = src[i];
    const b = src[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) continue;
    const steps = Math.max(1, Math.ceil(len / maxStep));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([a[0] + dx * t, a[1] + dy * t]);
    }
  }
  if (!loop) out.push(src[n - 1]);
  return out;
}

function xzRingToEn(ring) {
  return (ring || []).map((p) => [p.x, -p.z]);
}

const snowCoverFill = new THREE.MeshLambertMaterial({
  color: 0xf7f4ee,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

function clearGroup(g) {
  if (!g) return;
  const kids = g.children.slice();
  for (const c of kids) {
    g.remove(c);
    c.geometry?.dispose?.();
  }
}

function drapePisteSnow(ringXz, holesXz, elevFn) {
  const outer = xzRingToEn(ringXz);
  const holes = (holesXz || []).map(xzRingToEn);
  const mesh = drapePisteFill(outer, holes, elevFn, 0.08, snowCoverFill);
  if (mesh) {
    mesh.name = "piste-snow";
    mesh.userData.pisteKind = "snow";
    mesh.renderOrder = 5;
  }
  return mesh;
}

function paintTrailCover(root, cover, elevFn) {
  if (!root || !cover) return;
  let snowG = root.getObjectByName("snow-cover");
  if (!snowG) {
    snowG = new THREE.Group();
    snowG.name = "snow-cover";
    root.add(snowG);
  }
  clearGroup(snowG);
  for (const it of cover.items || []) {
    const ring = it.snow || it.bare;
    if (!ring || ring.length < 3) continue;
    const mesh = drapePisteSnow(ring, it.holes, elevFn);
    if (mesh) snowG.add(mesh);
  }
  if (getSnowLevel() === "midWinter") {
    for (const ring of cover.patches || []) {
      const mesh = drapePisteSnow(ring, [], elevFn);
      if (mesh) snowG.add(mesh);
    }
  }
}

export function applySnowLevel(scene) {
  const cover = scene?.userData?.trailCover;
  const elevFn = scene?.userData?.drapeElev;
  const root = scene?.userData?.pisteDecor;
  const p = SNOW[getSnowLevel()] || SNOW.spring;
  if (cover && elevFn && root) {
    ensureMidPatches(cover);
    applyInset(cover, p.inset);
    paintTrailCover(root, cover, elevFn);
  }
  const mat = scene?.userData?.snowMat;
  if (mat?.color) mat.color.setHex(p.terrain);
  for (const mesh of scene?.userData?.island?.tops || []) {
    if (mesh.material?.color) mesh.material.color.setHex(p.terrain);
  }
}

function drapeSmoothFill(outer, holes, elevFn, lift, material) {
  const dens = densifyXY(outer, 8, true);
  if (dens.length < 3) return null;
  const shape = new THREE.Shape(dens.map((p) => new THREE.Vector2(p[0], p[1])));
  for (const h of holes || []) {
    const hd = densifyXY(h, 8, true);
    if (hd.length >= 3) shape.holes.push(new THREE.Path(hd.map((p) => new THREE.Vector2(p[0], p[1]))));
  }
  let geo;
  try {
    geo = new THREE.ShapeGeometry(shape);
  } catch {
    return null;
  }
  const pos = geo.attributes.position;
  if (!pos || pos.count < 3) {
    geo.dispose();
    return null;
  }
  for (let i = 0; i < pos.count; i++) {
    const east = pos.getX(i);
    const north = pos.getY(i);
    pos.setXYZ(i, east, elevFn(east, -north) + lift, -north);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 1;
  return mesh;
}

function pushTri(arr, ax, ay, az, bx, by, bz, cx, cy, cz) {
  arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
}

function emitWallSeg(arr, x0, y0, z0, x1, y1, z1, nx, nz) {
  const t = WALL_T * 0.5;
  const h = WALL_H;
  const lx0 = x0 + nx * t;
  const lz0 = z0 + nz * t;
  const rx0 = x0 - nx * t;
  const rz0 = z0 - nz * t;
  const lx1 = x1 + nx * t;
  const lz1 = z1 + nz * t;
  const rx1 = x1 - nx * t;
  const rz1 = z1 - nz * t;
  pushTri(arr, lx0, y0, lz0, lx1, y1, lz1, lx1, y1 + h, lz1);
  pushTri(arr, lx0, y0, lz0, lx1, y1 + h, lz1, lx0, y0 + h, lz0);
  pushTri(arr, rx0, y0, rz0, rx0, y0 + h, rz0, rx1, y1 + h, rz1);
  pushTri(arr, rx0, y0, rz0, rx1, y1 + h, rz1, rx1, y1, rz1);
  pushTri(arr, lx0, y0 + h, lz0, lx1, y1 + h, lz1, rx1, y1 + h, rz1);
  pushTri(arr, lx0, y0 + h, lz0, rx1, y1 + h, rz1, rx0, y0 + h, rz0);
}

function zebraWallMeshes(ring, elevFn, color, closed) {
  const xy = densifyXY(ring, 4.5, closed);
  if (xy.length < 2) return [];
  const blackPos = [];
  const colorPos = [];
  let phase = 0;
  let paintColor = true;
  const n = xy.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    let e0 = xy[i][0];
    let n0 = xy[i][1];
    const e1 = xy[(i + 1) % n][0];
    const n1 = xy[(i + 1) % n][1];
    const dx = e1 - e0;
    const dy = n1 - n0;
    let remain = Math.hypot(dx, dy);
    if (remain < 0.04) continue;
    const ux = dx / remain;
    const uy = dy / remain;
    const ax = ux;
    const az = -uy;
    const plen = Math.hypot(-az, ax) || 1;
    const nx = -az / plen;
    const nz = ax / plen;
    while (remain > 0.04) {
      const take = Math.min(remain, STRIPE_M - phase);
      const e2 = e0 + ux * take;
      const n2 = n0 + uy * take;
      const z0 = -n0;
      const z2 = -n2;
      const y0 = elevFn(e0, z0);
      const y2 = elevFn(e2, z2);
      emitWallSeg(paintColor ? colorPos : blackPos, e0, y0, z0, e2, y2, z2, nx, nz);
      e0 = e2;
      n0 = n2;
      remain -= take;
      phase += take;
      if (phase >= STRIPE_M - 1e-4) {
        phase = 0;
        paintColor = !paintColor;
      }
    }
  }
  const out = [];
  if (colorPos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(colorPos, 3));
    geo.computeVertexNormals();
    out.push(new THREE.Mesh(geo, wallColorMat(color)));
  }
  if (blackPos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(blackPos, 3));
    geo.computeVertexNormals();
    out.push(new THREE.Mesh(geo, wallBlack));
  }
  return out;
}

function drapeLine(coords, elevFn, lift, material) {
  const pts = [];
  for (const c of coords) {
    const x = c[0];
    const z = -c[1];
    pts.push(new THREE.Vector3(x, elevFn(x, z) + lift, z));
  }
  if (pts.length < 2) return null;
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, material);
  if (material?.isLineDashedMaterial) line.computeLineDistances();
  return line;
}

const TOWER_H = 12;
const TOWER_STEP = 44;
const MAX_TOWERS = 180;
/** ponytail: keep the 80 largest OSM footprints; cluster if a resort needs more. */
const MAX_CLAY_BUILDINGS = 80;

function sampleAlong(pts, step) {
  if (!pts || pts.length < 2) return [];
  const out = [pts[0].clone()];
  let dist = 0;
  let next = step;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = a.distanceTo(b);
    if (seg < 1e-4) continue;
    while (dist + seg >= next) {
      const t = (next - dist) / seg;
      out.push(new THREE.Vector3().lerpVectors(a, b, t));
      next += step;
    }
    dist += seg;
  }
  out.push(pts[pts.length - 1].clone());
  return out;
}

function straightLiftPath(points) {
  if (points.length < 2) return points;
  const start = points[0];
  const end = points[points.length - 1];
  const out = [];
  let total = 0;
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    total += points[i].distanceTo(points[i - 1]);
    distances.push(total);
  }
  for (let i = 0; i < points.length; i++) {
    out.push(new THREE.Vector3().lerpVectors(start, end, total ? distances[i] / total : 0));
  }
  return out;
}

function placeAlongLift(obj, origin, tangent) {
  const want = new THREE.Vector3(tangent.x, 0, tangent.z);
  if (want.lengthSq() < 1e-8) want.set(0, 0, 1);
  else want.normalize();
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), want);
  obj.position.copy(origin);
}

function sitOnDem(obj, originY) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!Number.isFinite(box.min.y)) return;
  obj.position.y += originY - box.min.y;
}

function makeClayPylon(h, steel, dark) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, h, 6), steel);
  mast.position.y = h / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 0.18), dark);
  arm.position.y = h * 0.9;
  g.add(mast, arm);
  return g;
}

function addLiftKit(fc, elevFn, scene, counts) {
  if (!fc) return;
  const cableMat = new THREE.MeshBasicMaterial({ color: PALETTE.cable });
  const steel = new THREE.MeshLambertMaterial({ color: PALETTE.lift, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x374151, flatShading: true });
  const towerPts = [];
  const terminals = [];
  const liftMotions = [];
  let cables = 0;
  for (const f of fc.features || []) {
    const type = liftType(f);
    for (const coords of lineParts(f.geometry)) {
      const ground = [];
      for (const c of coords) {
        if (!c || c.length < 2) continue;
        const x = c[0];
        const z = -c[1];
        ground.push(new THREE.Vector3(x, elevFn(x, z), z));
      }
      if (ground.length < 2) continue;
      const cableHeight = liftCableHeight(type);
      const liftPath = type === "gondola" ? straightLiftPath(ground) : ground;
      if (type !== "magic_carpet") {
        const cable = liftPath.map((p) => new THREE.Vector3(p.x, p.y + cableHeight, p.z));
        const curve = new THREE.CatmullRomCurve3(cable);
        const segs = Math.min(96, Math.max(12, cable.length * 3));
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.07, 5, false), cableMat));
        cables += 1;
      }
      const a = ground[0];
      const b = ground[ground.length - 1];
      const tanA = ground[Math.min(1, ground.length - 1)].clone().sub(a);
      const tanB = b.clone().sub(ground[Math.max(0, ground.length - 2)]);
      const lineTan = new THREE.Vector3().subVectors(b, a);
      const skip = 18;
      terminals.push({ origin: a, tangent: lineTan.clone(), type }, { origin: b, tangent: lineTan.clone().negate(), type });
      const motion = createLiftMotion(
        THREE,
        scene,
        type,
        liftPath,
        elevFn,
        () => makeLiftCarrier(THREE, type, steel),
        (color) => makeLiftSkier(THREE, color),
      );
      if (motion) liftMotions.push(motion);
      for (const p of sampleAlong(ground, TOWER_STEP)) {
        if (p.distanceTo(a) < skip || p.distanceTo(b) < skip) continue;
        towerPts.push({ p, tangent: tanA.lengthSq() > tanB.lengthSq() ? tanA : lineTan, type });
      }
    }
  }
  function stride(arr, max) {
    if (arr.length <= max) return arr;
    const step = Math.ceil(arr.length / max);
    return arr.filter((_, i) => i % step === 0).slice(0, max);
  }
  const towers = stride(towerPts, MAX_TOWERS);
  for (const t of towers) {
    const h = liftCableHeight(t.type) || TOWER_H;
    const pylon = makeClayPylon(h, steel, dark);
    placeAlongLift(pylon, t.p, t.tangent);
    scene.add(pylon);
  }
  let stations = 0;
  for (const t of terminals) {
    const clone = makeLiftTerminal(THREE, t.type, steel);
    placeAlongLift(clone, t.origin, t.tangent);
    sitOnDem(clone, t.origin.y);
    scene.add(clone);
    stations += 1;
  }
  counts.lifts = cables;
  counts.lift_towers = towers.length;
  counts.lift_stations = stations;
  counts.lift_source = "clay";
  scene.userData.liftMotions = liftMotions;
}



/** Sample the polygon on a DEM grid so faces follow the slope instead of one giant plane. */
function drapeFill(outer, holes, elevFn, lift, material, maxSpan = MAX_FILL_SPAN, step = GRID, maxAxis = 48) {
  const bb = ringBBox(outer);
  if (!Number.isFinite(bb.span) || bb.span < 1) return null;
  if (bb.span > maxSpan) return null;

  const nx = Math.max(1, Math.min(maxAxis, Math.ceil((bb.maxX - bb.minX) / step)));
  const ny = Math.max(1, Math.min(maxAxis, Math.ceil((bb.maxY - bb.minY) / step)));
  const sx = (bb.maxX - bb.minX) / nx;
  const sy = (bb.maxY - bb.minY) / ny;
  const positions = [];
  const index = [];

  function vert(i, j) {
    const east = bb.minX + i * sx;
    const north = bb.minY + j * sy;
    const z = -north;
    positions.push(east, elevFn(east, z) + lift, z);
    return positions.length / 3 - 1;
  }

  const grid = [];
  for (let j = 0; j <= ny; j++) {
    grid[j] = [];
    for (let i = 0; i <= nx; i++) grid[j][i] = vert(i, j);
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = bb.minX + (i + 0.5) * sx;
      const cy = bb.minY + (j + 0.5) * sy;
      if (!inPolygon(cx, cy, outer, holes)) continue;
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      index.push(a, b, c, a, c, d);
    }
  }
  if (!index.length) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 1;
  return mesh;
}

/** Piste snow: finer DEM grid + edge lerp so the border follows the OSM ring, not stair-steps. */
function drapePisteFill(outer, holes, elevFn, lift, material) {
  const bb = ringBBox(outer);
  if (!Number.isFinite(bb.span) || bb.span < 1) return null;
  const step = 3.5;
  const maxAxis = 220;
  const nx = Math.max(1, Math.min(maxAxis, Math.ceil((bb.maxX - bb.minX) / step)));
  const ny = Math.max(1, Math.min(maxAxis, Math.ceil((bb.maxY - bb.minY) / step)));
  const sx = (bb.maxX - bb.minX) / nx;
  const sy = (bb.maxY - bb.minY) / ny;
  const positions = [];
  const index = [];

  function pushVert(east, north) {
    const z = -north;
    positions.push(east, elevFn(east, z) + lift, z);
    return positions.length / 3 - 1;
  }

  const inside = [];
  const vid = [];
  for (let j = 0; j <= ny; j++) {
    inside[j] = [];
    vid[j] = [];
    const north = bb.minY + j * sy;
    for (let i = 0; i <= nx; i++) {
      const east = bb.minX + i * sx;
      inside[j][i] = inPolygon(east, north, outer, holes);
      vid[j][i] = -1;
    }
  }

  function gridVert(i, j) {
    if (vid[j][i] >= 0) return vid[j][i];
    vid[j][i] = pushVert(bb.minX + i * sx, bb.minY + j * sy);
    return vid[j][i];
  }

  function lerpVert(i0, j0, i1, j1) {
    const e0 = bb.minX + i0 * sx;
    const n0 = bb.minY + j0 * sy;
    const e1 = bb.minX + i1 * sx;
    const n1 = bb.minY + j1 * sy;
    let lo = 0;
    let hi = 1;
    const aIn = inside[j0][i0];
    for (let k = 0; k < 6; k++) {
      const t = (lo + hi) * 0.5;
      const hit = inPolygon(e0 + (e1 - e0) * t, n0 + (n1 - n0) * t, outer, holes);
      if (hit === aIn) lo = t;
      else hi = t;
    }
    const t = (lo + hi) * 0.5;
    return pushVert(e0 + (e1 - e0) * t, n0 + (n1 - n0) * t);
  }

  function tri(ia, ib, ic) {
    index.push(ia, ib, ic);
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const bits =
        (inside[j][i] ? 1 : 0) |
        (inside[j][i + 1] ? 2 : 0) |
        (inside[j + 1][i + 1] ? 4 : 0) |
        (inside[j + 1][i] ? 8 : 0);
      if (!bits) continue;
      const a = () => gridVert(i, j);
      const b = () => gridVert(i + 1, j);
      const c = () => gridVert(i + 1, j + 1);
      const d = () => gridVert(i, j + 1);
      const ab = () => lerpVert(i, j, i + 1, j);
      const bc = () => lerpVert(i + 1, j, i + 1, j + 1);
      const cd = () => lerpVert(i + 1, j + 1, i, j + 1);
      const da = () => lerpVert(i, j + 1, i, j);
      if (bits === 15) {
        tri(a(), b(), c());
        tri(a(), c(), d());
        continue;
      }
      if (bits === 1) tri(a(), ab(), da());
      else if (bits === 2) tri(b(), bc(), ab());
      else if (bits === 3) {
        tri(a(), b(), bc());
        tri(a(), bc(), da());
      } else if (bits === 4) tri(c(), cd(), bc());
      else if (bits === 5) {
        tri(a(), ab(), bc());
        tri(a(), bc(), c());
        tri(a(), c(), cd());
        tri(a(), cd(), da());
      } else if (bits === 6) {
        tri(b(), c(), cd());
        tri(b(), cd(), ab());
      } else if (bits === 7) {
        tri(a(), b(), c());
        tri(a(), c(), cd());
        tri(a(), cd(), da());
      } else if (bits === 8) tri(d(), da(), cd());
      else if (bits === 9) {
        tri(a(), ab(), cd());
        tri(a(), cd(), d());
      } else if (bits === 10) {
        tri(b(), bc(), cd());
        tri(b(), cd(), d());
        tri(b(), d(), da());
        tri(b(), da(), ab());
      } else if (bits === 11) {
        tri(a(), b(), bc());
        tri(a(), bc(), cd());
        tri(a(), cd(), d());
      } else if (bits === 12) {
        tri(c(), d(), da());
        tri(c(), da(), bc());
      } else if (bits === 13) {
        tri(a(), ab(), bc());
        tri(a(), bc(), c());
        tri(a(), c(), d());
      } else if (bits === 14) {
        tri(b(), c(), d());
        tri(b(), d(), da());
        tri(b(), da(), ab());
      }
    }
  }
  if (!index.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

async function loadFC(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

function buildTreeHash(xzr, cell = 12) {
  const buckets = new Map();
  for (let i = 0; i < xzr.length; i += 3) {
    const ix = Math.floor(xzr[i] / cell);
    const iz = Math.floor(xzr[i + 1] / cell);
    const key = `${ix},${iz}`;
    let bin = buckets.get(key);
    if (!bin) {
      bin = [];
      buckets.set(key, bin);
    }
    bin.push(i);
  }
  return { cell, buckets, xzr };
}

export async function addOsmWorld(THREE, scene, sceneRoot, manifest, elevFn) {
  const v = manifest.vectors || {};
  const mats = {
    grass: fillMat(0xe6e9ec, 0.22),
    water: fillMat(0xb8c4cc, 0.4),
    parking: fillMat(0x8a8e94, 0.5),
    roadLine: new THREE.LineBasicMaterial({ color: 0x6a7076 }),
    cliffLine: new THREE.LineBasicMaterial({ color: 0x8a8884 }),
    skiEdge: new THREE.LineDashedMaterial({
      color: 0x2a343c,
      dashSize: 16,
      gapSize: 14,
      transparent: true,
      opacity: 0.5,
    }),
    barrier: new THREE.LineBasicMaterial({ color: 0x222222 }),
  };


  const counts = {};
  const defaults = {
    pistes: "vectors/pistes.geojson",
    lifts: "vectors/lifts.geojson",
    buildings: "vectors/buildings.geojson",
    water: "vectors/water.geojson",
    forest: "vectors/forest.geojson",
    roads: "vectors/roads.geojson",
    cliffs: "vectors/cliffs.geojson",
    grassland: "vectors/grassland.geojson",
    parking: "vectors/parking.geojson",
    ski_area: "vectors/ski-area.geojson",
    barriers: "vectors/barriers.geojson",
  };

  /** Island footprint comes from the real dataset extent, so log every vertex we load. */
  const hullSrc = [];

  async function loadLayer(key, { hull = true } = {}) {
    const rel = v[key] || defaults[key];
    if (!rel) return null;
    const fc = await loadFC(new URL(rel, sceneRoot));
    if (hull) {
      for (const f of fc?.features || []) {
        eachCoord(f.geometry, (c) => {
          if (c && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
            hullSrc.push(c[0], -c[1]);
          }
        });
      }
    }
    return fc;
  }

  function addFills(fc, mat, lift, countKey) {
    if (!fc) return;
    let n = 0;
    for (const f of fc.features || []) {
      for (const poly of polygonParts(f.geometry)) {
        const mesh = drapeFill(poly[0], poly.slice(1), elevFn, lift, mat);
        if (mesh) {
          scene.add(mesh);
          n += 1;
        }
      }
    }
    counts[countKey] = (counts[countKey] || 0) + n;
  }

  function addLines(fc, mat, lift, countKey) {
    if (!fc) return;
    let n = 0;
    for (const f of fc.features || []) {
      for (const coords of lineParts(f.geometry)) {
        const line = drapeLine(coords, elevFn, lift, mat);
        if (line) {
          scene.add(line);
          n += 1;
        }
      }
    }
    counts[countKey] = (counts[countKey] || 0) + n;
  }

  // Island rim = mapped OSM vertices (pistes, lifts, buildings, forest, …).
  // Do not hull the winter_sports AOI — that is ski-area bounds, not the OSM hull.
  const ski = await loadLayer("ski_area", { hull: false });
  addLines(ski, mats.skiEdge, 1.6, "ski_edge");

  addFills(await loadLayer("grassland"), mats.grass, 0.35, "grassland");

  const forest = await loadLayer("forest");
  const forestRings = forestRingsFromFC(forest);
  if (forest) {
    const woodPts = [];
    const otherPts = [];
    for (const f of forest.features || []) {
      const g = f.geometry;
      const tags = f.properties?.tags || {};
      const natural = String(tags.natural || "").toLowerCase();
      if (g?.type === "Point") {
        otherPts.push(g.coordinates);
        continue;
      }
      const step = natural === "wood" || tags.landuse === "forest" ? TREE_STEP_WOOD : TREE_STEP;
      const bucket = natural === "wood" ? woodPts : otherPts;
      for (const poly of polygonParts(g)) {
        sampleForest(poly[0], poly.slice(1), step, bucket);
      }
    }
    let treePts = woodPts.concat(otherPts);
    if (treePts.length > MAX_TREES) {
      const stride = Math.ceil(treePts.length / MAX_TREES);
      treePts = treePts.filter((_, i) => i % stride === 0).slice(0, MAX_TREES);
    }
    counts.forest_pts = woodPts.length + otherPts.length;
    counts.wood_pts = woodPts.length;
    if (treePts.length) {
      const n = treePts.length;
      const matsT = clayTreeMats();
      const trunkG = new THREE.CylinderGeometry(0.16, 0.22, 4.8, 6);
      const crownG = new THREE.SphereGeometry(1.55, 7, 5);
      const shrubG = new THREE.IcosahedronGeometry(0.85, 0);
      const trunks = new THREE.InstancedMesh(trunkG, matsT.bark, n);
      const crowns = new THREE.InstancedMesh(crownG, matsT.needle, n);
      const deeps = new THREE.InstancedMesh(crownG, matsT.deep, n);
      const shrubN = Math.min(420, Math.floor(n * 0.18));
      const shrubs = new THREE.InstancedMesh(shrubG, matsT.needle, shrubN);
      const xzr = [];
      const dummy = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const c = treePts[i];
        const x = c[0];
        const z = -c[1];
        const y = elevFn(x, z);
        const s = 0.75 + ((i * 17) % 11) * 0.05;
        stampClayTree(dummy, trunks, crowns, deeps, i, x, y, z, s);
        xzr.push(x, z, 0.55 * s);
        if (i < shrubN) {
          dummy.position.set(x + ((i * 3) % 5) - 2, y + 0.45 * s, z + ((i * 5) % 5) - 2);
          dummy.scale.set(s * 1.1, s * 0.55, s * 1.1);
          dummy.updateMatrix();
          shrubs.setMatrixAt(i, dummy.matrix);
        }
      }
      trunks.instanceMatrix.needsUpdate = true;
      crowns.instanceMatrix.needsUpdate = true;
      deeps.instanceMatrix.needsUpdate = true;
      shrubs.instanceMatrix.needsUpdate = true;
      scene.add(trunks, crowns, deeps, shrubs);
      counts.trees = n;
      counts.shrubs = shrubN;
      scene.userData.treeHash = buildTreeHash(xzr);
    }
  }

  const parkingFc = await loadLayer("parking");
  addFills(parkingFc, mats.parking, 0.45, "parking");
  const water = await loadLayer("water");
  addFills(water, mats.water, 0.3, "water");
  addLines(water, new THREE.LineBasicMaterial({ color: 0xa8b4bc }), 0.6, "water_line");

  const pistes = await loadLayer("pistes");
  loadSnowLevel();
  const cover = buildTrailCover(pistes, forestRings);
  scene.userData.trailCover = cover;
  scene.userData.drapeElev = elevFn;
  const pisteRoot = new THREE.Group();
  pisteRoot.name = "piste-decor";
  paintTrailCover(pisteRoot, cover, elevFn);
  if (pistes) {
    for (const f of pistes.features || []) {
      const g = f.geometry;
      const style = styleForPisteFeature(f);
      const tagPaint = (mesh, kind) => {
        if (!mesh) return;
        mesh.userData.pisteDifficulty = style.difficulty || "";
        mesh.userData.pisteType = style.type || "";
        mesh.userData.pisteKind = kind;
      };
      if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
        for (const poly of polygonParts(g)) {
          for (const w of zebraWallMeshes(poly[0], elevFn, style.color, true)) {
            if (w.material !== wallBlack) tagPaint(w, "wall");
            pisteRoot.add(w);
          }
          for (const hole of poly.slice(1)) {
            for (const w of zebraWallMeshes(hole, elevFn, style.color, true)) {
              if (w.material !== wallBlack) tagPaint(w, "wall");
              pisteRoot.add(w);
            }
          }
        }
        counts.piste_poly = (counts.piste_poly || 0) + 1;
      } else {
        for (const coords of lineParts(g)) {
          const center = drapeLine(coords, elevFn, 0.85, pisteLineMat(style.color));
          if (center) {
            center.renderOrder = 2;
            tagPaint(center, "line");
            pisteRoot.add(center);
          }
          for (const w of zebraWallMeshes(coords, elevFn, style.color, false)) {
            if (w.material !== wallBlack) tagPaint(w, "wall");
            pisteRoot.add(w);
          }
        }
        counts.piste_line = (counts.piste_line || 0) + 1;
      }
    }
  }
  scene.add(pisteRoot);
  scene.userData.pisteDecor = pisteRoot;

  addLiftKit(await loadLayer("lifts"), elevFn, scene, counts);
  const roadsFc = await loadLayer("roads");
  if (roadsFc) {
    let n = 0;
    for (const f of roadsFc.features || []) {
      const hw = String(f.properties?.highway || f.properties?.tags?.highway || "").toLowerCase();
      if (hw === "tertiary" || hw === "service" || hw === "unclassified" || hw === "residential" || hw === "secondary") {
        continue;
      }
      for (const coords of lineParts(f.geometry)) {
        const line = drapeLine(coords, elevFn, 0.7, mats.roadLine);
        if (line) {
          scene.add(line);
          n += 1;
        }
      }
    }
    counts.paths = n;
  }
  const traffic = addOsmTraffic(THREE, scene, parkingFc, roadsFc, elevFn);
  counts.parked_cars = traffic.parked;
  counts.driving_cars = traffic.driving;
  counts.road_strips = traffic.roads;
  addLines(await loadLayer("cliffs"), mats.cliffLine, 1.0, "cliffs");
  addLines(await loadLayer("barriers"), mats.barrier, 1.1, "barriers");

  const buildings = await loadLayer("buildings");
  if (buildings) {
    const group = new THREE.Group();
    group.name = "clay-buildings";
    const candidates = [];
    for (const f of buildings.features || []) {
      for (const poly of polygonParts(f.geometry)) {
        const ring = poly[0];
        if (!ring || ring.length < 3) continue;
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const c of ring) {
          if (!c || c.length < 2) continue;
          const x = c[0];
          const z = -c[1];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        const footW = Math.max(4, maxX - minX);
        const footD = Math.max(4, maxZ - minZ);
        if (footW > 80 || footD > 80) continue;
        candidates.push({
          cx: (minX + maxX) * 0.5,
          cz: (minZ + maxZ) * 0.5,
          footW,
          footD,
          area: footW * footD,
          yaw: footW >= footD ? 0 : Math.PI / 2,
        });
      }
    }
    candidates.sort((a, b) => b.area - a.area);
    let n = 0;
    for (const c of candidates) {
      if (n >= MAX_CLAY_BUILDINGS) break;
      const sc = Math.min(1, 24 / c.footW, 24 / c.footD);
      addClayBuilding(
        group,
        c.cx,
        c.cz,
        elevFn(c.cx, c.cz),
        c.footW * sc,
        c.footD * sc,
        Math.max(3.5, Math.min(11, Math.sqrt(c.area) * 0.32)),
        c.yaw,
      );
      n += 1;
    }
    scene.add(group);
    counts.buildings = n;
  }

  scene.userData.osmHull = convexHullDropClipFrame(hullSrc);
  counts.osm_vertices = hullSrc.length / 2;
  counts.hull_points = scene.userData.osmHull.length;

  return counts;
}

/** Fill empty piste edges when OSM forest is thin along the corridor. */
export function addPisteEdgeScenery(THREE, scene, pistePolys, elevFn) {
  const hash = scene.userData.treeHash;
  const existing = hash?.xzr || [];
  function nearTree(x, z) {
    if (!existing.length) return false;
    const cell = hash.cell || 12;
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bin = hash.buckets?.get(`${ix + dx},${iz + dz}`);
        if (!bin) continue;
        for (const i of bin) {
          if (Math.hypot(x - existing[i], z - existing[i + 1]) < 7) return true;
        }
      }
    }
    return false;
  }
  const dummy = new THREE.Object3D();
  const matsT = clayTreeMats();
  const trunkG = new THREE.CylinderGeometry(0.16, 0.22, 4.8, 6);
  const crownG = new THREE.SphereGeometry(1.55, 7, 5);
  const rockG = new THREE.DodecahedronGeometry(0.7, 0);
  const snow = new THREE.MeshLambertMaterial({ color: PALETTE.snowShade, flatShading: true });
  const pts = [];
  for (const poly of pistePolys || []) {
    const len = polylineLen(poly);
    if (len < 30) continue;
    for (let s = 12; s < len - 12; s += 16) {
      const p = alongPolyline(poly, s);
      const nx = -p.tz;
      const nz = p.tx;
      for (const side of [-1, 1]) {
        const x = p.x + nx * (24 + (s % 5)) * side;
        const z = p.z + nz * (24 + (s % 5)) * side;
        if (nearTree(x, z)) continue;
        pts.push(x, z, (s + side) % 3 === 0 ? 1 : 0);
      }
    }
  }
  if (pts.length < 6) return 0;
  const n = Math.min(280, Math.floor(pts.length / 3));
  const trunks = new THREE.InstancedMesh(trunkG, matsT.bark, n);
  const crowns = new THREE.InstancedMesh(crownG, matsT.needle, n);
  const deeps = new THREE.InstancedMesh(crownG, matsT.deep, n);
  const rocks = new THREE.InstancedMesh(rockG, snow, Math.ceil(n * 0.25));
  let ri = 0;
  let ti = 0;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 3];
    const z = pts[i * 3 + 1];
    const rock = pts[i * 3 + 2];
    const y = elevFn(x, z);
    const s = 0.7 + (i % 7) * 0.06;
    if (rock && ri < rocks.count) {
      dummy.position.set(x, y + 0.35 * s, z);
      dummy.scale.setScalar(1.4 * s);
      dummy.rotation.set(0.2, i, 0.1);
      dummy.updateMatrix();
      rocks.setMatrixAt(ri, dummy.matrix);
      ri += 1;
      continue;
    }
    stampClayTree(dummy, trunks, crowns, deeps, ti, x, y, z, s);
    ti += 1;
  }
  trunks.count = ti;
  crowns.count = ti;
  deeps.count = ti;
  rocks.count = ri;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  deeps.instanceMatrix.needsUpdate = true;
  rocks.instanceMatrix.needsUpdate = true;
  trunks.castShadow = true;
  crowns.castShadow = true;
  deeps.castShadow = true;
  scene.add(trunks, crowns, deeps, rocks);
  const xzr = hash?.xzr ? hash.xzr.slice() : [];
  for (let i = 0; i < n; i++) xzr.push(pts[i * 3], pts[i * 3 + 1], 0.55);
  scene.userData.treeHash = buildTreeHash(xzr);
  return n;
}

/** Recolor draped piste fills + zebra walls after the regional marking scheme changes. */
export function applyPisteDecorDifficultyScheme(scene) {
  const root = scene?.userData?.pisteDecor;
  if (!root) return;
  root.traverse((obj) => {
    const kind = obj.userData?.pisteKind;
    if ((!obj.isMesh && !obj.isLine) || (kind !== "fill" && kind !== "wall" && kind !== "line")) return;
    const style = classifyDifficulty(obj.userData.pisteDifficulty, obj.userData.pisteType);
    obj.material =
      kind === "fill" ? pisteFillMat(style.color) : kind === "line" ? pisteLineMat(style.color) : wallColorMat(style.color);
  });
}

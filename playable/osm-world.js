/** Drape OSM vectors on the DEM. GeoJSON XY = local east, north. Game Z = -north. */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { styleForPisteFeature } from "./trail-map.js?v=vis24";
import { addOsmTraffic } from "./traffic.js?v=vis16";

const GRID = 12;
const MAX_FILL_SPAN = 700;
const MAX_BUILDING_SPAN = 80;
const TREE_STEP = 10;
const TREE_STEP_WOOD = 6;
const MAX_TREES = 8000;

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
const CABLE_H = 11.15;
const TOWER_STEP = 44;
const MAX_TOWERS = 180;
const POLY_LIFT_URL = new URL("./assets/models/poly-google-chairlift.glb", import.meta.url);
/** Original Poly kit XZ axis from first to last pillar (source units). */
const POLY_AXIS = new THREE.Vector3(-832, 0, 834).normalize();
const TREE_MESH = /^Spruce/i;
const TREE_H = 9;

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

function bakeMeshToBase(mesh) {
  const geo = mesh.geometry.clone();
  mesh.updateWorldMatrix(true, false);
  geo.applyMatrix4(mesh.matrixWorld);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cz = (bb.min.z + bb.max.z) * 0.5;
  geo.translate(-cx, -bb.min.y, -cz);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  const h = geo.boundingBox.max.y - geo.boundingBox.min.y;
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return { geometry: geo, material: mat, height: h };
}

function placeAlongLift(obj, origin, tangent, scale) {
  const want = new THREE.Vector3(tangent.x, 0, tangent.z);
  if (want.lengthSq() < 1e-8) want.set(0, 0, 1);
  else want.normalize();
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), want);
  obj.scale.setScalar(scale);
  obj.position.copy(origin);
}

function sitOnDem(obj, originY) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!Number.isFinite(box.min.y)) return;
  obj.position.y += originY - box.min.y;
}

function makeChair(steel) {
  const g = new THREE.Group();
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), steel);
  hang.position.y = -0.85;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.42), steel);
  seat.position.set(0, -1.62, 0.02);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.05), steel);
  back.position.set(0, -1.38, -0.2);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.04), steel);
  bar.position.set(0, -1.48, 0.18);
  g.add(hang, seat, back, bar);
  return g;
}

/** Local +Z is along the lift toward the other terminal. Bullwheel stands vertical. */
function makeBullwheelTerminal(pillar, steel) {
  const g = new THREE.Group();
  const dark = steel.clone();
  dark.color.setHex(0x2c3034);
  dark.metalness = 0.78;
  dark.roughness = 0.38;
  const s = pillar ? TOWER_H / Math.max(0.01, pillar.height) : 1;
  if (pillar) {
    const pL = new THREE.Mesh(pillar.geometry, pillar.material);
    pL.scale.setScalar(s);
    pL.position.set(-2.35, 0, 0.15);
    const pR = pL.clone();
    pR.position.x = 2.35;
    g.add(pL, pR);
  } else {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, TOWER_H, 0.45), steel);
    const l = leg.clone();
    l.position.set(-2.35, TOWER_H / 2, 0.15);
    const r = leg.clone();
    r.position.set(2.35, TOWER_H / 2, 0.15);
    g.add(l, r);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.34, 0.34), dark);
  beam.position.set(0, CABLE_H + 0.7, 0.1);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 12), dark);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0, CABLE_H, 0);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.18, 12, 40), dark);
  wheel.rotation.y = Math.PI / 2;
  wheel.position.set(0, CABLE_H, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.38, 16), steel);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, CABLE_H, 0);
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.1, 0.08), dark);
  spoke.position.set(0, CABLE_H, 0);
  const spoke2 = spoke.clone();
  spoke2.rotation.x = Math.PI / 2;
  g.add(beam, axle, wheel, hub, spoke, spoke2);
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const ch = makeChair(dark);
    ch.position.set(Math.sin(a) * 1.62, CABLE_H + Math.cos(a) * 1.62, 0);
    if (ch.position.y > CABLE_H + 0.35) continue;
    g.add(ch);
  }
  g.userData.height = TOWER_H;
  return g;
}

async function loadPolyKit() {
  try {
    const gltf = await new GLTFLoader().loadAsync(POLY_LIFT_URL.href);
    gltf.scene.updateMatrixWorld(true);
    let pillar = null;
    const trees = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.name || "";
      if (/^Pillar$/i.test(n)) pillar = o;
      if (TREE_MESH.test(n)) trees.push(bakeMeshToBase(o));
    });
    return {
      pillar: pillar ? bakeMeshToBase(pillar) : null,
      trees,
    };
  } catch (err) {
    console.warn("Poly chairlift GLB failed", err);
    return null;
  }
}

async function addLiftKit(fc, elevFn, scene, counts, poly) {
  if (!fc) return;
  const cableMat = new THREE.MeshLambertMaterial({ color: 0x3a4046 });
  const env = scene.userData.envMap || null;
  const steel = new THREE.MeshStandardMaterial({
    color: 0x6a7278,
    metalness: 0.72,
    roughness: 0.42,
    envMap: env,
    envMapIntensity: env ? 0.85 : 0,
  });
  const towerPts = [];
  const terminals = [];
  let cables = 0;
  for (const f of fc.features || []) {
    for (const coords of lineParts(f.geometry)) {
      const ground = [];
      for (const c of coords) {
        if (!c || c.length < 2) continue;
        const x = c[0];
        const z = -c[1];
        ground.push(new THREE.Vector3(x, elevFn(x, z), z));
      }
      if (ground.length < 2) continue;
      const cable = ground.map((p) => new THREE.Vector3(p.x, p.y + CABLE_H, p.z));
      const curve = new THREE.CatmullRomCurve3(cable);
      const segs = Math.min(96, Math.max(12, cable.length * 3));
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.07, 5, false), cableMat));
      cables += 1;
      const a = ground[0];
      const b = ground[ground.length - 1];
      const tanA = ground[Math.min(1, ground.length - 1)].clone().sub(a);
      const tanB = b.clone().sub(ground[Math.max(0, ground.length - 2)]);
      const lineTan = new THREE.Vector3().subVectors(b, a);
      const skip = 18;
      towerPts.push({ p: a, tangent: tanA });
      towerPts.push({ p: b, tangent: tanB });
      terminals.push({ origin: a, tangent: lineTan.clone() }, { origin: b, tangent: lineTan.clone().negate() });
      for (const p of sampleAlong(ground, TOWER_STEP)) {
        if (p.distanceTo(a) < skip || p.distanceTo(b) < skip) continue;
        towerPts.push({ p, tangent: tanA.lengthSq() > tanB.lengthSq() ? tanA : lineTan });
      }
    }
  }
  function stride(arr, max) {
    if (arr.length <= max) return arr;
    const step = Math.ceil(arr.length / max);
    return arr.filter((_, i) => i % step === 0).slice(0, max);
  }
  const towers = stride(towerPts, MAX_TOWERS);
  const dummy = new THREE.Object3D();
  if (towers.length) {
    const src = poly?.pillar;
    const geo = src?.geometry || new THREE.BoxGeometry(0.38, TOWER_H, 0.38);
    const mat = src?.material || steel;
    const h = src?.height || TOWER_H;
    const s = TOWER_H / Math.max(0.01, h);
    const towerMesh = new THREE.InstancedMesh(geo, mat, towers.length);
    for (let i = 0; i < towers.length; i++) {
      const { p, tangent } = towers[i];
      dummy.position.copy(p);
      dummy.scale.setScalar(s);
      const want = new THREE.Vector3(tangent.x, 0, tangent.z);
      if (want.lengthSq() < 1e-8) dummy.quaternion.identity();
      else dummy.quaternion.setFromUnitVectors(POLY_AXIS, want.normalize());
      dummy.updateMatrix();
      towerMesh.setMatrixAt(i, dummy.matrix);
    }
    towerMesh.instanceMatrix.needsUpdate = true;
    scene.add(towerMesh);
  }
  let stations = 0;
  const term = makeBullwheelTerminal(poly?.pillar, steel);
  if (term && terminals.length) {
    for (const t of terminals) {
      const clone = term.clone(true);
      placeAlongLift(clone, t.origin, t.tangent, 1);
      sitOnDem(clone, t.origin.y);
      scene.add(clone);
      stations += 1;
    }
  }
  counts.lifts = cables;
  counts.lift_towers = towers.length;
  counts.lift_stations = stations;
  counts.lift_source = poly ? "poly-google" : "procedural";
}



/** Sample the polygon on a DEM grid so faces follow the slope instead of one giant plane. */
function drapeFill(outer, holes, elevFn, lift, material, maxSpan = MAX_FILL_SPAN) {
  const bb = ringBBox(outer);
  if (!Number.isFinite(bb.span) || bb.span < 1) return null;
  if (bb.span > maxSpan) return null;

  const nx = Math.max(1, Math.min(48, Math.ceil((bb.maxX - bb.minX) / GRID)));
  const ny = Math.max(1, Math.min(48, Math.ceil((bb.maxY - bb.minY) / GRID)));
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

function extrudeBuilding(outer, holes, elevFn, height, material) {
  const bb = ringBBox(outer);
  if (!Number.isFinite(bb.span) || bb.span > MAX_BUILDING_SPAN) return null;
  const o = [];
  for (const c of outer) {
    if (c?.length >= 2) o.push(new THREE.Vector2(c[0], c[1]));
  }
  if (o.length < 3) return null;
  const shape = new THREE.Shape(o);
  for (const h of holes || []) {
    const hp = [];
    for (const c of h) {
      if (c?.length >= 2) hp.push(new THREE.Vector2(c[0], c[1]));
    }
    if (hp.length >= 3) shape.holes.push(new THREE.Path(hp));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  const pos = geo.attributes.position;
  let base = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const east = pos.getX(i);
    const north = pos.getY(i);
    base = Math.min(base, elevFn(east, -north));
  }
  if (!Number.isFinite(base)) base = 0;
  for (let i = 0; i < pos.count; i++) {
    const east = pos.getX(i);
    const north = pos.getY(i);
    const h = pos.getZ(i);
    pos.setXYZ(i, east, base + h, -north);
  }
  pos.needsUpdate = true;
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

function addPolyForest(treePts, variants, elevFn, scene, counts) {
  const dummy = new THREE.Object3D();
  const groups = variants.map(() => []);
  treePts.forEach((c, i) => groups[i % variants.length].push({ c, i }));
  const xzr = [];
  let n = 0;
  for (let v = 0; v < variants.length; v++) {
    const pts = groups[v];
    if (!pts.length) continue;
    const src = variants[v];
    const mesh = new THREE.InstancedMesh(src.geometry, src.material, pts.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const s0 = TREE_H / Math.max(0.01, src.height);
    for (let k = 0; k < pts.length; k++) {
      const c = pts[k].c;
      const i = pts[k].i;
      const x = c[0];
      const z = -c[1];
      const y = elevFn(x, z);
      const s = s0 * (0.78 + ((i * 17) % 11) * 0.04);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, (i * 0.73) % 6.28, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      xzr.push(x, z, 0.48 + 0.42 * (s / s0));
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    n += pts.length;
  }
  counts.trees = n;
  counts.tree_source = "poly-google";
  counts.tree_colliders = xzr.length / 3;
  scene.userData.treeHash = buildTreeHash(xzr);
}

export async function addOsmWorld(THREE, scene, sceneRoot, manifest, elevFn) {
  const polyKit = await loadPolyKit();
  const v = manifest.vectors || {};
  const mats = {
    pisteFill: fillMat(0xf3eee4, 0.42),
    forest: fillMat(0xc8cdd2, 0.18),
    grass: fillMat(0xe6e9ec, 0.22),
    water: fillMat(0xb8c4cc, 0.4),
    parking: fillMat(0x8a8e94, 0.5),
    building: new THREE.MeshLambertMaterial({ color: 0xd8d4ce, side: THREE.DoubleSide }),
    pisteLine: new THREE.LineBasicMaterial({ color: 0x9aa3ab }),
    liftLine: new THREE.LineBasicMaterial({ color: 0x7a858e }),
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
      if (polyKit?.trees?.length) addPolyForest(treePts, polyKit.trees, elevFn, scene, counts);
      else {
      const n = treePts.length;
      const trunkG = new THREE.CylinderGeometry(0.11, 0.16, 3.4, 6);
      const crownG = new THREE.ConeGeometry(1.05, 8.2, 6);
      const snowG = new THREE.ConeGeometry(0.78, 2.6, 6);
      const shrubG = new THREE.IcosahedronGeometry(0.85, 0);
      const bark = new THREE.MeshLambertMaterial({ color: 0x4a3a2c });
      const needle = new THREE.MeshLambertMaterial({ color: 0x1e3a2c });
      const snow = new THREE.MeshLambertMaterial({ color: 0xe8eef2 });
      const trunks = new THREE.InstancedMesh(trunkG, bark, n);
      const crowns = new THREE.InstancedMesh(crownG, needle, n);
      const caps = new THREE.InstancedMesh(snowG, snow, n);
      const shrubN = Math.min(420, Math.floor(n * 0.18));
      const shrubs = new THREE.InstancedMesh(shrubG, needle, shrubN);
      const xzr = [];
      const dummy = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const c = treePts[i];
        const x = c[0];
        const z = -c[1];
        const y = elevFn(x, z);
        const s = 0.75 + ((i * 17) % 11) * 0.05;
        const tall = 1.12 + (i % 3) * 0.08;
        dummy.position.set(x, y + 1.7 * s, z);
        dummy.rotation.set(0, (i * 0.7) % 6.28, 0);
        dummy.scale.set(s, s * tall, s);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y + 5.8 * s, z);
        dummy.updateMatrix();
        crowns.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y + 8.35 * s, z);
        dummy.scale.set(s * 0.92, s * 0.7, s * 0.92);
        dummy.updateMatrix();
        caps.setMatrixAt(i, dummy.matrix);
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
      caps.instanceMatrix.needsUpdate = true;
      shrubs.instanceMatrix.needsUpdate = true;
      scene.add(trunks, crowns, caps, shrubs);
      counts.trees = n;
      counts.shrubs = shrubN;
      scene.userData.treeHash = buildTreeHash(xzr);
      }
    }
  }

  const parkingFc = await loadLayer("parking");
  addFills(parkingFc, mats.parking, 0.45, "parking");
  const water = await loadLayer("water");
  addFills(water, mats.water, 0.3, "water");
  addLines(water, new THREE.LineBasicMaterial({ color: 0xa8b4bc }), 0.6, "water_line");

  const pistes = await loadLayer("pistes");
  const pisteRoot = new THREE.Group();
  pisteRoot.name = "piste-decor";
  if (pistes) {
    for (const f of pistes.features || []) {
      const g = f.geometry;
      const style = styleForPisteFeature(f);
      if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
        for (const poly of polygonParts(g)) {
          const mesh = drapeSmoothFill(poly[0], poly.slice(1), elevFn, 0.04, pisteFillMat(style.color));
          if (mesh) {
            mesh.name = "piste-poly";
            pisteRoot.add(mesh);
          }
          for (const w of zebraWallMeshes(poly[0], elevFn, style.color, true)) pisteRoot.add(w);
          for (const hole of poly.slice(1)) {
            for (const w of zebraWallMeshes(hole, elevFn, style.color, true)) pisteRoot.add(w);
          }
        }
        counts.piste_poly = (counts.piste_poly || 0) + 1;
      } else {
        for (const coords of lineParts(g)) {
          for (const w of zebraWallMeshes(coords, elevFn, style.color, false)) pisteRoot.add(w);
        }
        counts.piste_line = (counts.piste_line || 0) + 1;
      }
    }
  }
  scene.add(pisteRoot);
  scene.userData.pisteDecor = pisteRoot;

  await addLiftKit(await loadLayer("lifts"), elevFn, scene, counts, polyKit);
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
    let n = 0;
    for (const f of buildings.features || []) {
      for (const poly of polygonParts(f.geometry)) {
        const mesh = extrudeBuilding(poly[0], poly.slice(1), elevFn, 9, mats.building);
        if (mesh) {
          scene.add(mesh);
          n += 1;
        }
      }
    }
    counts.buildings = n;
  }

  scene.userData.osmHull = convexHullDropClipFrame(hullSrc);
  counts.osm_vertices = hullSrc.length / 2;
  counts.hull_points = scene.userData.osmHull.length;

  return counts;
}

/**
 * Clay floating-island ski resorts from clay_scenes/ (homepage hero + wiki 3D Map).
 * Procedural island first, then upgrades to a catalog resort; homepage can cycle resorts.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import {
  HERO_SPAN,
  HEIGHT_EXAGGERATE,
  PALETTE,
  sceneRoot,
  catalogUrl,
  gameSceneBase,
  playableHref,
  capDpr,
  cross2,
  convexHullXZ,
  expandHull,
  insideConvex,
  distToHullEdge,
  distOutsideHull,
  insideIslandRing,
  distOutsideIsland,
  ensureCcwXZ,
  ensureCcw,
  projectToHull,
  ringCentroidXZ,
  resampleRingArc,
  decimateRing,
  chaikinRing,
  prepareIslandRim,
  clipPointRuns,
  resampleHull,
  rng,
  hash2,
  valueNoise,
  fbm,
  localXZ,
  lineParts,
  ringParts,
  polygonParts,
  mergeFeatureCollections,
  shadeSnowGeometry,
  shadeSnowMesh,
  makeHeightGrid,
  mountainHeight,
  addTrees,
  addProceduralTrees,
  addBuildings,
  addProceduralBuildings,
  addTrails,
  addProceduralTrails,
  waterFeatureCount,
  prepareWaterFeature,
  addOsmWater,
  addWaterDisc,
  addWaterPond,
  addTrailRiders,
  updateTrailRiders,
  collectParkBlockers,
  addSnowParks,
  updateParkRiders,
  addLifts,
  updateLiftChairs,
  updateTBarLifts,
} from "./clay/index.js";

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const { material } = child;
    if (!material) return;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
  });
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

function exaggerateHeights(mesh, factor = HEIGHT_EXAGGERATE) {
  if (!mesh?.geometry?.attributes?.position || !(factor > 0) || factor === 1) return;
  const pos = mesh.geometry.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, minY + (pos.getY(i) - minY) * factor);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

function fitTerrainRoot(mesh, targetSpan = HERO_SPAN) {
  const root = new THREE.Group();
  root.name = "montage-terrain-root";
  root.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  root.userData.terrainCenter = center.clone();

  const sized = new THREE.Box3().setFromObject(mesh);
  const size = sized.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  root.scale.setScalar(targetSpan / span);
  root.updateMatrixWorld(true);
  return { root, center, mesh, span };
}

function addSoftShadow(parent, radius) {
  const geo = new THREE.CircleGeometry(radius * 0.72, 32);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x8aa0b8,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.position.y = -8;
  disc.name = "montage-shadow";
  parent.add(disc);
  return disc;
}

/**
 * Island rim from ski_areas_1000ft_buffer — the map edge / wood cliff start.
 * Coords are local east/north meters (same as other homepage vectors).
 */
function hullFromSkiAreaBuffer(fc, center) {
  let best = null;
  let bestArea = -1;
  for (const feature of fc?.features || []) {
    for (const ring of ringParts(feature.geometry)) {
      if (!ring || ring.length < 3) continue;
      const poly = [];
      for (const c of ring) {
        if (!c || c.length < 2) continue;
        const { x, z } = localXZ(c[0], c[1], center);
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        const last = poly[poly.length - 1];
        if (last && Math.hypot(x - last.x, z - last.z) < 0.05) continue;
        poly.push({ x, z });
      }
      if (poly.length >= 3) {
        const a = poly[0];
        const b = poly[poly.length - 1];
        if (Math.hypot(a.x - b.x, a.z - b.z) < 0.05) poly.pop();
      }
      if (poly.length < 3) continue;
      let area = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        area += poly[j].x * poly[i].z - poly[i].x * poly[j].z;
      }
      area = Math.abs(area) * 0.5;
      if (area > bestArea) {
        bestArea = area;
        best = poly;
      }
    }
  }
  return best?.length >= 3 ? ensureCcwXZ(best) : [];
}

/** Like the game: drop AABB crop-frame points so the hull isn't a rectangle. */
function convexHullDropClipFrame(points) {
  if (!points?.length) return [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const mx = Math.max(10, (maxX - minX) * 0.015);
  const mz = Math.max(10, (maxZ - minZ) * 0.015);
  const inner = [];
  for (const p of points) {
    if (p.x > minX + mx && p.x < maxX - mx && p.z > minZ + mz && p.z < maxZ - mz) {
      inner.push(p);
    }
  }
  const hull = convexHullXZ(inner.length >= 8 ? inner : points);
  return hull.length >= 3 ? hull : convexHullXZ(points);
}

/** Convex hull of ALL OSM layers: trails, lifts, trees, buildings, roads, water, ski area. */
function hullFromOsmData(layers, center) {
  const pts = [];
  const pushCoord = (east, north) => {
    if (!Number.isFinite(east) || !Number.isFinite(north)) return;
    const { x, z } = localXZ(east, north, center);
    pts.push({ x, z });
  };
  const pushLine = (fc, stride = 2) => {
    for (const feature of fc?.features || []) {
      for (const coords of lineParts(feature.geometry)) {
        for (let i = 0; i < coords.length; i += stride) {
          const c = coords[i];
          if (c && c.length >= 2) pushCoord(c[0], c[1]);
        }
        if (coords.length > 1) {
          const last = coords[coords.length - 1];
          if (last?.length >= 2) pushCoord(last[0], last[1]);
        }
      }
    }
  };
  const pushPoints = (fc, stride = 1) => {
    const features = fc?.features || [];
    for (let i = 0; i < features.length; i += stride) {
      const geom = features[i]?.geometry;
      if (geom?.type === "Point") pushCoord(geom.coordinates[0], geom.coordinates[1]);
      else if (geom?.type === "MultiPoint") {
        for (const c of geom.coordinates || []) {
          if (c?.length >= 2) pushCoord(c[0], c[1]);
        }
      }
    }
  };
  const pushRings = (fc, stride = 1) => {
    for (const feature of fc?.features || []) {
      for (const ring of ringParts(feature.geometry)) {
        for (let i = 0; i < ring.length; i += stride) {
          const c = ring[i];
          if (c?.length >= 2) pushCoord(c[0], c[1]);
        }
      }
    }
  };

  pushLine(layers.routes, 2);
  pushLine(layers.lifts, 1);
  pushLine(layers.roads, 2);
  pushPoints(layers.forest, 1);
  pushRings(layers.forest, 2);
  pushRings(layers.buildings, 1);
  pushRings(layers.skiArea, 1);
  pushRings(layers.water, 1);
  pushPoints(layers.water, 1);
  pushLine(layers.water, 2);

  return convexHullDropClipFrame(pts);
}

/**
 * Clip DEM to the (possibly concave) ski-area buffer rim.
 * Outside / bay verts snap onto the rim at rim height — do not reshape the
 * wood rim to a convex hull around leftover snow.
 */
function softShapeTerrainToHull(mesh, edgeRim, sample, lipAllowM = 4) {
  if (!mesh?.geometry?.attributes?.position || !edgeRim?.length) return;
  const pos = mesh.geometry.attributes.position;
  const ox = mesh.position.x;
  const oy = mesh.position.y;
  const oz = mesh.position.z;
  const lip = Math.max(2, lipAllowM);
  const convex = ensureCcw(convexHullXZ(edgeRim));

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const z = pos.getZ(i) + oz;
    const outside = distOutsideIsland(x, z, edgeRim);
    if (outside <= 0) continue;
    const hit = projectToHull(x, z, edgeRim);
    const rimY = sample?.(hit.x, hit.z);
    const base = rimY != null ? rimY - oy : pos.getY(i);
    /* Inside the convex shell but outside the buffer = concave bay / indent. */
    const inBay = convex.length >= 3 && insideConvex(x, z, convex);
    if (outside > lip || inBay) {
      pos.setX(i, hit.x - ox);
      pos.setZ(i, hit.z - oz);
      /* Keep snapped rim verts at snow height — a deep tuck made vertical curtains. */
      pos.setY(i, base);
    } else {
      pos.setY(i, base - Math.min(3, outside * 0.5));
    }
  }
  pos.needsUpdate = true;
  pruneTerrainFacesOutsideRim(mesh, edgeRim);
  mesh.geometry.computeVertexNormals();
  shadeSnowGeometry(mesh.geometry);
  if (mesh.material && !Array.isArray(mesh.material)) {
    mesh.material.vertexColors = true;
    mesh.material.side = THREE.DoubleSide;
    mesh.material.emissive = new THREE.Color(0xffffff);
    mesh.material.emissiveIntensity = 0.08;
    mesh.material.needsUpdate = true;
  }
}

/**
 * Drop snow faces that bridge concave bays (white curtains over empty wood).
 * Only removes faces whose XZ centroid sits outside the buffer rim — no inset,
 * so the interior snow sheet stays closed.
 */
function pruneTerrainFacesOutsideRim(mesh, edgeRim) {
  if (!mesh?.geometry?.attributes?.position || !edgeRim?.length) return;
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const ox = mesh.position.x;
  const oz = mesh.position.z;
  const convex = ensureCcw(convexHullXZ(edgeRim));

  const centroidOutside = (i0, i1, i2) => {
    const mx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3 + ox;
    const mz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3 + oz;
    if (!insideIslandRing(mx, mz, edgeRim)) return true;
    /* Extra: bay mouths where centroid still clips the ring but midpoints sit out. */
    if (convex.length >= 3 && insideConvex(mx, mz, convex)) {
      const mids = [
        [(pos.getX(i0) + pos.getX(i1)) * 0.5 + ox, (pos.getZ(i0) + pos.getZ(i1)) * 0.5 + oz],
        [(pos.getX(i1) + pos.getX(i2)) * 0.5 + ox, (pos.getZ(i1) + pos.getZ(i2)) * 0.5 + oz],
        [(pos.getX(i2) + pos.getX(i0)) * 0.5 + ox, (pos.getZ(i2) + pos.getZ(i0)) * 0.5 + oz],
      ];
      let out = 0;
      for (const [x, z] of mids) {
        if (!insideIslandRing(x, z, edgeRim)) out += 1;
      }
      if (out >= 2) return true;
    }
    return false;
  };

  const index = geo.getIndex();
  if (index) {
    const src = index.array;
    const next = [];
    for (let i = 0; i < src.length; i += 3) {
      const i0 = src[i];
      const i1 = src[i + 1];
      const i2 = src[i + 2];
      if (!centroidOutside(i0, i1, i2)) next.push(i0, i1, i2);
    }
    if (next.length === src.length) return;
    geo.setIndex(next);
  } else {
    const triCount = Math.floor(pos.count / 3);
    const keepPos = [];
    const color = geo.attributes.color;
    const keepCol = color ? [] : null;
    const uv = geo.attributes.uv;
    const keepUv = uv ? [] : null;
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      if (centroidOutside(i0, i1, i2)) continue;
      for (const i of [i0, i1, i2]) {
        keepPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (keepCol) keepCol.push(color.getX(i), color.getY(i), color.getZ(i));
        if (keepUv) keepUv.push(uv.getX(i), uv.getY(i));
      }
    }
    if (keepPos.length === pos.count * 3) return;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(keepPos, 3));
    if (keepCol) geo.setAttribute("color", new THREE.Float32BufferAttribute(keepCol, 3));
    if (keepUv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(keepUv, 2));
  }
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
}

const WOOD_HI = [0.55, 0.28, 0.16];
const WOOD_MID = [0.42, 0.18, 0.1];
const WOOD_LO = [0.22, 0.1, 0.06];

function sideColor(u, n) {
  let base;
  if (u < 0.14) {
    const k = u / 0.14;
    base = [
      WOOD_HI[0] * (1 - k) + WOOD_MID[0] * k,
      WOOD_HI[1] * (1 - k) + WOOD_MID[1] * k,
      WOOD_HI[2] * (1 - k) + WOOD_MID[2] * k,
    ];
  } else {
    const k = (u - 0.14) / 0.86;
    const e = Math.pow(k, 0.85);
    base = [
      WOOD_MID[0] * (1 - e) + WOOD_LO[0] * e,
      WOOD_MID[1] * (1 - e) + WOOD_LO[1] * e,
      WOOD_MID[2] * (1 - e) + WOOD_LO[2] * e,
    ];
  }
  const s = 0.88 + n * 0.28;
  return [base[0] * s, base[1] * s, base[2] * s];
}

/**
 * Wood-sided island base: vertical mahogany under the snow rim, then
 * taper only below the lowest snow so valleys stay white.
 */
function addGameIslandRock(parent, hull, sample, span, snowMinY) {
  if (!hull?.length) return null;
  const group = new THREE.Group();
  group.name = "montage-island-wood";

  const rim = resampleRingArc(hull, 64);
  let cx = 0;
  let cz = 0;
  for (const p of rim) {
    cx += p.x;
    cz += p.z;
  }
  cx /= rim.length;
  cz /= rim.length;

  const rimY = [];
  let minRim = Infinity;
  for (let k = 0; k < rim.length; k++) {
    const p = rim[k];
    let y = sample(p.x, p.z);
    if (y == null) {
      y = sample(p.x * 0.94 + cx * 0.06, p.z * 0.94 + cz * 0.06);
    }
    if (y == null) y = Number.isFinite(snowMinY) ? snowMinY : 0;
    rimY.push(y);
    minRim = Math.min(minRim, y);
  }
  if (!Number.isFinite(minRim)) minRim = 0;

  /* Smooth rim heights so one bad sample can't make a wood spike. */
  const smoothY = rimY.slice();
  for (let pass = 0; pass < 2; pass++) {
    const next = smoothY.slice();
    for (let i = 0; i < rim.length; i++) {
      const a = smoothY[(i - 1 + rim.length) % rim.length];
      const b = smoothY[i];
      const c = smoothY[(i + 1) % rim.length];
      next[i] = (a + b * 2 + c) * 0.25;
    }
    for (let i = 0; i < rim.length; i++) smoothY[i] = next[i];
  }

  const lip = Math.max(2, span * 0.0015) + 1.5;
  const floor = Math.min(
    Number.isFinite(snowMinY) ? snowMinY : minRim,
    minRim,
  ) - Math.max(24, span * 0.035);

  const layersN = 10;
  /* Tall vertical cliff under the snow rim — aggressive lower taper was
   * carving caves so snow looked like a floating shelf over empty wood. */
  const cliffFrac = 0.78;
  const depth = Math.max(28, span * 0.08);
  const feature = Math.max(70, span * 0.1);
  const layers = [];

  for (let i = 0; i <= layersN; i++) {
    const t = i / layersN;
    const pts = [];
    for (let k = 0; k < rim.length; k++) {
      const p = rim[k];
      const dx = p.x - cx;
      const dz = p.z - cz;
      const n = fbm(p.x / feature, p.z / feature);
      const nv = fbm(p.x / (feature * 0.38) + t * 4.2, p.z / (feature * 0.38) - t * 3.1);
      const y0 = smoothY[k];
      const yTop = y0 - lip;
      if (t <= cliffFrac) {
        const kT = t / cliffFrac;
        /* Keep the upper cliff nearly vertical — tiny noise only. */
        const s = 1.0 + kT * ((n - 0.5) * 0.003);
        pts.push({
          x: cx + dx * s,
          y: yTop + (floor - yTop) * kT,
          z: cz + dz * s,
        });
        continue;
      }
      const u = (t - cliffFrac) / (1 - cliffFrac);
      const terrace = Math.floor(u * 7) / 7;
      const taper = 1 - Math.pow(terrace, 0.65) * 0.32;
      const gully = (n - 0.5) * 0.03 * (1 - u * 0.35);
      const ridge = (nv - 0.5) * 0.025;
      const s = Math.max(0.55, taper + gully + ridge);
      pts.push({
        x: cx + dx * s,
        y: floor - Math.pow(u, 0.88) * depth + (nv - 0.5) * depth * 0.02 * (1 - u),
        z: cz + dz * s,
      });
    }
    layers.push(pts);
  }

  const pos = [];
  const col = [];
  const n = rim.length;
  for (let i = 0; i < layersN; i++) {
    const a = layers[i];
    const b = layers[i + 1];
    const u0 = i / layersN;
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      const grain = 0.9 + ((k % 6) / 6) * 0.16;
      const rgb = sideColor(u0, fbm(k * 0.35, i * 0.8)).map((v) => v * grain);
      pos.push(a[k].x, a[k].y, a[k].z, a[k1].x, a[k1].y, a[k1].z, b[k].x, b[k].y, b[k].z);
      pos.push(a[k1].x, a[k1].y, a[k1].z, b[k1].x, b[k1].y, b[k1].z, b[k].x, b[k].y, b[k].z);
      for (let t = 0; t < 6; t++) col.push(rgb[0], rgb[1], rgb[2]);
    }
  }

  const last = layers[layersN];
  let apexY = Infinity;
  let ax = 0;
  let az = 0;
  for (const p of last) {
    ax += p.x;
    az += p.z;
    apexY = Math.min(apexY, p.y);
  }
  ax /= last.length;
  az /= last.length;
  const apex = { x: ax, y: apexY - depth * 0.12, z: az };
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    const jitter = fbm(k * 0.9, 7.3) - 0.5;
    const tipped = {
      x: apex.x + jitter * depth * 0.03,
      y: apex.y + Math.abs(jitter) * depth * 0.06,
      z: apex.z - jitter * depth * 0.025,
    };
    const rgb = sideColor(1, fbm(k * 0.35, 9.1));
    pos.push(last[k].x, last[k].y, last[k].z, last[k1].x, last[k1].y, last[k1].z, tipped.x, tipped.y, tipped.z);
    for (let t = 0; t < 3; t++) col.push(rgb[0], rgb[1], rgb[2]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    emissive: new THREE.Color(PALETTE.woodMid),
    emissiveIntensity: 0.1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  group.add(mesh);

  const chunkMat = new THREE.MeshLambertMaterial({
    color: PALETTE.woodMid,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const p = rim[Math.floor((i / 8) * rim.length) % rim.length];
    const u = 0.22 + hash2(i, 11) * 0.65;
    const radius = depth * (0.014 + hash2(i, 23) * 0.02);
    const chunk = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), chunkMat);
    const cpos = chunk.geometry.attributes.position;
    for (let v = 0; v < cpos.count; v++) {
      const nrm = 0.7 + fbm(cpos.getX(v) * 0.4 + i, cpos.getZ(v) * 0.4 - i) * 0.55;
      cpos.setXYZ(v, cpos.getX(v) * nrm, cpos.getY(v) * nrm * 0.82, cpos.getZ(v) * nrm);
    }
    cpos.needsUpdate = true;
    chunk.geometry.computeVertexNormals();
    chunk.position.set(
      cx + (p.x - cx) * 1.02 + (hash2(i, 41) - 0.5) * depth * 0.05,
      floor - u * depth * 0.55 - hash2(i, 57) * depth * 0.025,
      cz + (p.z - cz) * 1.02 - (hash2(i, 43) - 0.5) * depth * 0.04,
    );
    chunk.rotation.set(hash2(i, 3) * 6.28, hash2(i, 5) * 6.28, hash2(i, 7) * 6.28);
    chunk.frustumCulled = false;
    group.add(chunk);
  }

  parent.add(group);
  return group;
}

function addIslandUnderside(parent, terrainMesh) {
  const box = new THREE.Box3().setFromObject(terrainMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const geo = new THREE.SphereGeometry(
    Math.max(size.x, size.z) * 0.42,
    28,
    16,
    0,
    Math.PI * 2,
    Math.PI * 0.45,
    Math.PI * 0.55,
  );
  const mat = new THREE.MeshLambertMaterial({
    color: PALETTE.wood,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(center.x, box.min.y - Math.max(2, size.y * 0.05), center.z);
  mesh.name = "montage-underside";
  parent.add(mesh);
  return mesh;
}

function buildProceduralIsland(parent) {
  const root = new THREE.Group();
  root.name = "montage-terrain-root";
  const geo = new THREE.PlaneGeometry(HERO_SPAN, HERO_SPAN, 56, 56);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, mountainHeight(x, z));
  }
  geo.computeVertexNormals();
  shadeSnowGeometry(geo);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      vertexColors: true,
      side: THREE.DoubleSide,
    }),
  );
  mesh.name = "montage-terrain-proc";
  root.add(mesh);

  const decor = new THREE.Group();
  decor.name = "montage-decor";
  root.add(decor);
  addIslandUnderside(root, mesh);
  addSoftShadow(root, HERO_SPAN * 0.48);
  addProceduralTrails(decor, mountainHeight);
  addProceduralTrees(decor, mountainHeight);
  addProceduralBuildings(decor, mountainHeight);
  addWaterPond(decor, mesh, mountainHeight, HERO_SPAN);

  parent.add(root);
  return {
    root,
    mesh,
    decor,
    bounds: { center: new THREE.Vector3(2, 16, -4), radius: 46 },
  };
}

let gltfLoader;
function getGltfLoader() {
  if (gltfLoader) return gltfLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);
  return gltfLoader;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

function yieldFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function loadHomepageMesh(base) {
  const manifest = await fetchJson(new URL("scene-manifest.json", base));
  const meshUrl = new URL(manifest.terrain.mesh, base);
  const vectors = manifest.vectors || {};
  const gltf = await getGltfLoader().loadAsync(meshUrl.href);

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (!mesh) mesh = child;
    exaggerateHeights(child);
    shadeSnowMesh(child);
    child.castShadow = false;
    child.receiveShadow = true;
  });
  if (!mesh) throw new Error("terrain mesh missing");

  return {
    fitted: fitTerrainRoot(mesh),
    vectors,
    base,
    manifest,
  };
}

async function loadVectors(base, vectors, resort = null) {
  const routesUrl = new URL(
    vectors.piste_trails || vectors.route_centers || "vectors/piste-trails.geojson",
    base,
  );
  const liftsUrl = new URL(vectors.lifts || "vectors/lifts.geojson", base);
  const forestUrl = new URL(
    vectors.tree_points || vectors.forest || "vectors/tree-points.geojson",
    base,
  );
  // Only fetch when advertised — missing S3 keys under clay_scenes return 403, not 404.
  const bufferPath = vectors.ski_area_buffer || null;
  const clayWaterPath = vectors.water || null;
  const clayBuildingsPath = vectors.buildings || null;
  const clayRoadsPath = vectors.roads || null;
  const gameBase = gameSceneBase(resort);

  const fetches = [
    fetchJson(routesUrl).catch(() => null),
    fetchJson(liftsUrl).catch(() => null),
    fetchJson(forestUrl).catch(() => null),
    bufferPath
      ? fetchJson(new URL(bufferPath, base)).catch(() => null)
      : Promise.resolve(null),
    clayWaterPath
      ? fetchJson(new URL(clayWaterPath, base)).catch(() => null)
      : Promise.resolve(null),
    clayBuildingsPath
      ? fetchJson(new URL(clayBuildingsPath, base)).catch(() => null)
      : Promise.resolve(null),
    clayRoadsPath
      ? fetchJson(new URL(clayRoadsPath, base)).catch(() => null)
      : Promise.resolve(null),
  ];
  if (gameBase) {
    fetches.push(
      fetchJson(new URL("vectors/buildings.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/roads.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/water.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/ski-area.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/forest.geojson", gameBase)).catch(() => null),
    );
  }

  const results = await Promise.all(fetches);
  const routes = results[0];
  const lifts = results[1];
  const forestHome = results[2];
  const skiAreaBuffer = results[3];
  const clayWater = results[4];
  const clayBuildings = results[5];
  const clayRoads = results[6];
  const buildingsGame = gameBase ? results[7] : null;
  const roadsGame = gameBase ? results[8] : null;
  const waterGame = gameBase ? results[9] : null;
  const skiArea = gameBase ? results[10] : null;
  const forestGame = gameBase ? results[11] : null;

  const forest = mergeFeatureCollections(forestGame, forestHome);
  const buildings = mergeFeatureCollections(buildingsGame, clayBuildings);
  const roads = mergeFeatureCollections(roadsGame, clayRoads);
  /* Prefer game water when present; clay_scenes water covers resorts without playable_ver. */
  const water = waterFeatureCount(waterGame) ? waterGame : clayWater;
  return { routes, lifts, forest, buildings, roads, water, skiArea, skiAreaBuffer };
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7e0ea, 0.45));

  const key = new THREE.DirectionalLight(0xfff8f0, 0.95);
  key.position.set(-70, 95, 40);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd8e6f6, 0.35);
  fill.position.set(60, 40, -50);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.22);
  rim.position.set(20, 30, -80);
  scene.add(rim);
}

function boundsFromObject(object, fallback) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  /* Include height so tall peaks aren't clipped; XZ alone under-framed steep resorts. */
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  if (!Number.isFinite(radius) || radius < 1) {
    return { center: fallback.clone(), radius: 48 };
  }
  return { center, radius, size };
}

/**
 * Frame the snow + decor, not the deep wood skirt (which pulls the AABB
 * center down and makes sea-level vs alpine cameras look randomly zoomed).
 */
function framingBoundsFromRoot(root, fallback) {
  const skipNames = new Set(["montage-island-wood", "montage-shadow", "montage-underside"]);
  const box = new THREE.Box3();
  let found = false;
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    let p = obj;
    while (p) {
      if (skipNames.has(p.name)) return;
      p = p.parent;
    }
    const b = new THREE.Box3().setFromObject(obj);
    if (b.isEmpty()) return;
    if (!found) {
      box.copy(b);
      found = true;
    } else {
      box.union(b);
    }
  });
  if (!found || box.isEmpty()) return boundsFromObject(root, fallback);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5;
  if (!Number.isFinite(radius) || radius < 1) {
    return { center: fallback.clone(), radius: 48 };
  }
  return { center, radius, size };
}

export async function initHeroMontageMap(container, options = {}) {
  if (!container) return null;

  const preferredId = options.resortId ? String(options.resortId) : "";
  const lockResort = Boolean(options.lockResort || preferredId);

  const embed = container.closest(".hero-montage-embed") || container;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1200);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(capDpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  addLights(scene);

  const world = new THREE.Group();
  world.name = "montage-world";
  scene.add(world);

  let trailRiders = null;
  let parkRiders = null;
  let liftChairs = null;
  let liftGondolas = null;
  let liftTbars = null;
  const procedural = buildProceduralIsland(world);
  let bounds = procedural.bounds;
  const procTrails = procedural.decor?.getObjectByName("montage-trails-proc");
  trailRiders = addTrailRiders(
    procedural.decor,
    procTrails?.userData?.paths || [],
    mountainHeight,
    1,
  );
  embed.classList.add("is-ready");

  let running = true;
  let az = 0.55;
  let polar = Math.atan2(0.95, 1.72);
  let zoom = 1;
  let dragging = false;
  let lastPointer = null;
  let resumeSpinAt = 0;
  const IDLE_RESUME_MS = 5000;
  const SPIN_SPEED = 0.12;
  const POLAR_MIN = 0.18;
  const POLAR_MAX = 1.35;
  const ZOOM_MIN = 0.45;
  const ZOOM_MAX = 2.6;
  let lastT = performance.now();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.setAttribute("aria-label", "Drag to orbit the 3D map; scroll to zoom");

  function markInteracted() {
    resumeSpinAt = performance.now() + IDLE_RESUME_MS;
  }

  function syncOrbitFromBounds() {
    const { radius } = bounds;
    /* Stable elevated overview — don't derive polar from AABB Y (varies with
     * absolute elevation / wood depth / vertical relief). */
    az = 0.55;
    polar = 0.78;
    const aspect = Math.max(0.5, camera.aspect || 1);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov * 0.5) * aspect);
    const fitFov = Math.min(vFov, hFov);
    const pad = 1.18;
    const needDist = (Math.max(1, radius) * pad) / Math.sin(fitFov * 0.5);
    const baseDist = Math.max(1, radius * 1.72);
    zoom = THREE.MathUtils.clamp(needDist / baseDist, ZOOM_MIN, ZOOM_MAX);
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
    canvas.style.cursor = "grabbing";
    markInteracted();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || !lastPointer) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer = { x: e.clientX, y: e.clientY };
    az -= dx * 0.005;
    polar = THREE.MathUtils.clamp(polar + dy * 0.004, POLAR_MIN, POLAR_MAX);
    markInteracted();
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    lastPointer = null;
    canvas.style.cursor = "grab";
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
    markInteracted();
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.00115);
    zoom = THREE.MathUtils.clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX);
    markInteracted();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  let resorts = [];
  let resortIndex = 0;
  let loadToken = 0;
  let loading = false;

  const playLink = embed.querySelector("[data-hero-play]");
  const nameEl = embed.querySelector("[data-hero-resort-name]");
  const regionEl = embed.querySelector("[data-hero-region]");
  const prevBtn = embed.querySelector("[data-hero-prev]");
  const nextBtn = embed.querySelector("[data-hero-next]");
  const switcher = embed.querySelector(".hero-montage-switcher");

  function currentResort() {
    return resorts[resortIndex] || null;
  }

  function syncChrome(resort) {
    if (!resort) return;
    const label = resort.short_name || resort.display_name || resort.id;
    if (nameEl) nameEl.textContent = label;
    if (regionEl) regionEl.textContent = resort.region_label || resort.country || "";
    embed.setAttribute("aria-label", `${resort.display_name || label} 3D clay map`);
    const href = playableHref(resort);
    if (playLink) {
      if (href) {
        playLink.href = href;
        playLink.hidden = false;
        playLink.setAttribute("aria-label", `Ski ${label} in the 3D game`);
        const text = playLink.querySelector("[data-hero-play-label]");
        if (text) text.textContent = label;
      } else {
        playLink.hidden = true;
      }
    }
    if (switcher) switcher.hidden = lockResort || resorts.length < 2;
    if (prevBtn) prevBtn.disabled = lockResort || loading || resorts.length < 2;
    if (nextBtn) nextBtn.disabled = lockResort || loading || resorts.length < 2;
  }

  async function mountResort(resort) {
    if (!resort?.id) return;
    const token = ++loadToken;
    loading = true;
    syncChrome(resort);
    embed.classList.add("is-loading");

    try {
      const base = sceneRoot(resort.id);
      const { fitted, vectors } = await loadHomepageMesh(base);
      if (token !== loadToken) return;
      await yieldFrame();

      const { root, center, mesh, span } = fitted;
      const decor = new THREE.Group();
      decor.name = "montage-decor";
      root.add(decor);

      let sample = makeHeightGrid(mesh);
      const unitScale = Math.max(1, span / HERO_SPAN);

      trailRiders = null;
      parkRiders = null;
      liftChairs = null;
      liftGondolas = null;
      liftTbars = null;
      clearGroup(world);
      world.add(root);

      const osm = await loadVectors(base, vectors, resort);
      if (token !== loadToken) return;
      await yieldFrame();

      let clipRing = hullFromSkiAreaBuffer(osm.skiAreaBuffer, center);
      let woodRim = clipRing?.length >= 3 ? prepareIslandRim(clipRing) : null;
      if (!(woodRim?.length >= 3)) {
        clipRing = null;
        woodRim = hullFromOsmData(osm, center);
      }
      const snowHeights = makeHeightGrid(mesh);
      if (woodRim?.length >= 3) {
        if (!osm.skiAreaBuffer) {
          woodRim = ensureCcw(expandHull(woodRim, Math.max(40, span * 0.03)));
        }
        /* Snap snow onto the concave buffer rim; wood keeps the same outline. */
        softShapeTerrainToHull(mesh, woodRim, snowHeights, 4);
        sample = makeHeightGrid(mesh);
        let hx = 0;
        let hz = 0;
        for (const p of woodRim) {
          hx += p.x;
          hz += p.z;
        }
        hx /= woodRim.length;
        hz /= woodRim.length;
        let hr = 0;
        for (const p of woodRim) hr = Math.max(hr, Math.hypot(p.x - hx, p.z - hz));
        addSoftShadow(root, hr * (HERO_SPAN / span) * 0.95);
      } else {
        addIslandUnderside(root, mesh);
        addSoftShadow(root, HERO_SPAN * 0.48);
      }

      const hasOsmWater = waterFeatureCount(osm.water) > 0;
      const water = hasOsmWater ? null : prepareWaterFeature(mesh, sample, span, clipRing);
      if (water) sample = makeHeightGrid(mesh);
      if (woodRim?.length >= 3) {
        const pos = mesh.geometry.attributes.position;
        const oy = mesh.position.y;
        let snowMinY = Infinity;
        for (let i = 0; i < pos.count; i++) snowMinY = Math.min(snowMinY, pos.getY(i) + oy);
        /* Use pre-soft heights so tucked DEM verts can't spike the wood wall. */
        addGameIslandRock(root, woodRim, snowHeights, span, snowMinY);
      }
      await yieldFrame();
      if (token !== loadToken) return;

      /* Rough frame while decor loads — refined after trails/trees/buildings. */
      bounds = framingBoundsFromRoot(root, new THREE.Vector3(0, 0, 0));
      syncOrbitFromBounds();

      liftChairs = null;
      liftGondolas = null;
      liftTbars = null;
      trailRiders = null;
      parkRiders = null;
      clearGroup(decor);
      const trails = osm.routes
        ? addTrails(decor, osm.routes, center, sample, unitScale, clipRing)
        : addProceduralTrails(decor, sample);
      if (osm.lifts) {
        const liftPack = addLifts(decor, osm.lifts, center, sample, unitScale, clipRing);
        liftChairs = liftPack?.chairAnim || null;
        liftGondolas = liftPack?.gondolaAnim || null;
        liftTbars = liftPack?.tbarAnims?.length ? liftPack.tbarAnims : null;
      }
      if (osm.forest) addTrees(decor, osm.forest, center, sample, unitScale, clipRing);
      else addProceduralTrees(decor, sample, unitScale);
      if (osm.buildings) addBuildings(decor, osm.buildings, center, sample, unitScale, clipRing);
      else addProceduralBuildings(decor, sample, unitScale);
      if (hasOsmWater) {
        addOsmWater(decor, osm.water, center, sample, unitScale, clipRing);
      } else if (water) {
        addWaterDisc(decor, water.x, water.z, water.y, water.radius);
      }
      trailRiders = addTrailRiders(decor, trails?.userData?.paths || [], sample, unitScale);
      try {
        const blockers = collectParkBlockers(center, sample, {
          lifts: osm.lifts,
          forest: osm.forest,
          buildings: osm.buildings,
        });
        parkRiders = osm.routes
          ? addSnowParks(
              decor,
              osm.routes,
              center,
              sample,
              unitScale,
              clipRing,
              trails?.userData?.trailLift || 0.4,
              blockers,
            )
          : null;
      } catch (err) {
        console.warn("[hero-montage-map] snowpark failed", err);
        parkRiders = null;
      }
      bounds = framingBoundsFromRoot(root, new THREE.Vector3(0, 0, 0));
      syncOrbitFromBounds();
    } catch (err) {
      if (token === loadToken) {
        console.warn("[hero-montage-map] resort load failed", resort.id, err);
      }
    } finally {
      if (token === loadToken) {
        loading = false;
        embed.classList.remove("is-loading");
        syncChrome(currentResort());
      }
    }
  }

  function stepResort(delta) {
    if (lockResort || !resorts.length || loading) return;
    resortIndex = (resortIndex + delta + resorts.length) % resorts.length;
    mountResort(currentResort());
  }

  function onPrev() {
    stepResort(-1);
  }
  function onNext() {
    stepResort(1);
  }
  prevBtn?.addEventListener("click", onPrev);
  nextBtn?.addEventListener("click", onNext);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function frameCamera(t = 0) {
    const { center, radius } = bounds;
    const targetY = center.y;
    const dist = Math.max(1, radius * 1.72 * zoom);
    const autoSpin =
      !reduceMotion && !dragging && performance.now() >= resumeSpinAt;
    const bob = autoSpin ? Math.sin(t * 0.35) * radius * 0.012 * zoom : 0;
    const horiz = Math.cos(polar) * dist;
    camera.position.set(
      center.x + Math.cos(az) * horiz,
      targetY + Math.sin(polar) * dist + bob,
      center.z + Math.sin(az) * horiz,
    );
    camera.lookAt(center.x, targetY, center.z);
  }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const autoSpin =
      !reduceMotion && !dragging && now >= resumeSpinAt;
    if (autoSpin) az += dt * SPIN_SPEED;
    const motionDt = reduceMotion ? 0 : dt;
    if (trailRiders) updateTrailRiders(trailRiders, motionDt);
    if (parkRiders) updateParkRiders(parkRiders, motionDt);
    if (liftChairs) updateLiftChairs(liftChairs, motionDt);
    if (liftGondolas) updateLiftChairs(liftGondolas, motionDt);
    if (liftTbars) updateTBarLifts(liftTbars, motionDt);
    frameCamera(now * 0.001);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);

  const observer = new IntersectionObserver(
    (entries) => {
      running = entries.some((e) => e.isIntersecting);
      if (running) {
        lastT = performance.now();
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.05 },
  );
  observer.observe(embed);

  (async () => {
    const fallback = {
      id: preferredId || "montage_mountain_pa",
      display_name: preferredId || "Montage Mountain",
      short_name: preferredId || "Montage",
      playable_ver: preferredId ? null : "v0-107b3a77b75f",
      region_label: "",
    };
    try {
      const catalog = await fetchJson(catalogUrl());
      const all = (catalog?.resorts || []).filter((r) => r?.id);
      if (preferredId) {
        const hit = all.find((r) => r.id === preferredId);
        resorts = hit ? [hit] : [{ ...fallback, id: preferredId }];
        resortIndex = 0;
      } else {
        resorts = all.length
          ? all
          : [{ id: "montage_mountain_pa", display_name: "Montage Mountain", short_name: "Montage", playable_ver: "v0-107b3a77b75f", region_label: "North America" }];
        resortIndex = Math.max(0, resorts.findIndex((r) => r.id === "montage_mountain_pa"));
        if (resortIndex < 0) resortIndex = 0;
      }
      await mountResort(currentResort());
    } catch (err) {
      console.warn("[hero-montage-map] catalog load failed", err);
      resorts = [fallback];
      resortIndex = 0;
      await mountResort(currentResort());
    }
  })();

  return {
    resize,
    dispose() {
      running = false;
      loadToken += 1;
      observer.disconnect();
      window.removeEventListener("resize", resize);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      disposeObject(world);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
  };
}

const mount = document.getElementById("hero-montage-stage");
if (mount) initHeroMontageMap(mount);

/**
 * Clay floating-island ski resorts from clay_scenes/ (homepage hero + wiki 3D Map).
 * Procedural island first, then upgrades to a catalog resort; homepage can cycle resorts.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

import {
  HERO_SPAN,
  MAX_TREES,
  MAX_RIDERS,
  MAX_TRAILS,
  TRAIL_WIDTH,
  TRAIL_STYLES,
  TREE_SCALE,
  MAX_BUILDINGS,
  BUILDING_SHRINK,
  GRID_RES,
  HEIGHT_EXAGGERATE,
  PALETTE,
  sceneRoot,
  catalogUrl,
  gameSceneBase,
  playableHref,
  capDpr,
} from "./clay/config.js";
import {
  rng,
  hash2,
  valueNoise,
  fbm,
  localXZ,
  lineParts,
  ringParts,
  polygonParts,
  featureTag,
  isWoodFeature,
  pointInRing,
  inPolygon,
  distToRingEdges,
  firmlyInside,
  shoelaceArea,
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
  downsampleLine,
  smoothTrailPts,
  polylineLen,
  alongPolyline,
  sampleAlongPolyline,
  horizTangentAt,
  sideVector,
} from "./clay/math-utils.js";
import {
  mountainHeight,
  shadeSnowGeometry,
  shadeSnowMesh,
  makeHeightGrid,
} from "./clay/height-grid.js";

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

function collectWoodPolygons(features) {
  const polys = [];
  for (const feature of features || []) {
    if (!isWoodFeature(feature)) continue;
    for (const poly of polygonParts(feature.geometry)) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const holes = (poly.slice(1) || []).filter((h) => h && h.length >= 3);
      polys.push({ outer, holes });
    }
  }
  return polys;
}

/**
 * Treat all wood/forest polygons as one woodland and plant an even grid
 * across the union. Points are inset so they stay inside the original polys.
 */
function sampleWoodUnion(polys, maxPts) {
  if (!polys?.length) return [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let area = 0;
  for (const { outer, holes } of polys) {
    for (const c of outer) {
      if (!c || c.length < 2) continue;
      minX = Math.min(minX, c[0]);
      minY = Math.min(minY, c[1]);
      maxX = Math.max(maxX, c[0]);
      maxY = Math.max(maxY, c[1]);
    }
    area += shoelaceArea(outer);
    for (const h of holes || []) area -= shoelaceArea(h);
  }
  if (!(maxX > minX) || !(maxY > minY)) return [];
  area = Math.max(area, (maxX - minX) * (maxY - minY) * 0.05);

  let step = Math.sqrt(area / Math.max(1, maxPts));
  step = Math.max(8, Math.min(28, step));
  const bboxArea = (maxX - minX) * (maxY - minY);
  if (bboxArea / (step * step) > maxPts * 14) {
    step = Math.sqrt(bboxArea / (maxPts * 8));
  }
  const margin = Math.max(2.5, step * 0.22);

  const out = [];
  const nx = Math.max(1, Math.ceil((maxX - minX) / step));
  const ny = Math.max(1, Math.ceil((maxY - minY) / step));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = minX + (i + 0.5) * step;
      const y = minY + (j + 0.5) * step;
      for (const poly of polys) {
        if (firmlyInside(x, y, poly.outer, poly.holes, margin)) {
          out.push([x, y]);
          break;
        }
      }
    }
  }

  if (out.length <= maxPts) return out;
  const thinned = [];
  const stride = out.length / maxPts;
  for (let i = 0; i < maxPts; i++) {
    thinned.push(out[Math.min(out.length - 1, Math.floor(i * stride))]);
  }
  return thinned;
}

function mergeFeatureCollections(...fcs) {
  const features = [];
  for (const fc of fcs) {
    if (fc?.features?.length) features.push(...fc.features);
  }
  return features.length ? { type: "FeatureCollection", features } : null;
}

function difficultyBucket(raw) {
  const d = String(raw || "").toLowerCase().trim();
  if (!d) return "blue";
  if (d === "green" || d === "blue" || d === "black") return d;
  if (d.includes("novice") || d.includes("easy") || d === "beginner" || d === "learning") return "green";
  if (
    d.includes("advanced") ||
    d.includes("expert") ||
    d.includes("extreme") ||
    d.includes("freeride") ||
    d.includes("difficult") ||
    d === "very_difficult"
  ) {
    return "black";
  }
  if (d.includes("intermediate") || d === "medium") return "blue";
  return "blue";
}

function featureDifficulty(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  let difficulty =
    tags["piste:difficulty"] ||
    tags.difficulty ||
    props["piste:difficulty"] ||
    props.piste_difficulty ||
    props.difficulty ||
    "";
  if (!difficulty) {
    const other = String(tags.other_tags || props.other_tags || "");
    const m = /piste:difficulty"=>"([^"]+)/.exec(other);
    if (m) difficulty = m[1];
  }
  return difficulty;
}

function featureOtherTagsBlob(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  return String(tags.other_tags || props.other_tags || "");
}

function featureOsmWayId(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  if (tags.osm_way_id != null && String(tags.osm_way_id).trim()) return String(tags.osm_way_id);
  const id = String(props.id || "");
  const m = /way:(\d+)/.exec(id) || /:(\d+)$/.exec(id);
  return m ? m[1] : "";
}

/** OSM piste *areas* (often natural=grassland) — outlines, not ski centerlines. */
function isPisteAreaOutline(feature) {
  const type = feature?.geometry?.type;
  if (type === "Polygon" || type === "MultiPolygon") return true;
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  const other = featureOtherTagsBlob(feature);
  if (tags.area === "yes" || /"area"=>"yes"/.test(other)) return true;
  const natural = String(tags.natural || props.natural || "").toLowerCase();
  return natural === "grassland" || natural === "grass" || natural === "fell" || natural === "scrub";
}

function isSkiRouteCenterline(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  if (String(tags.route || "").toLowerCase() === "ski") return true;
  return /"route"=>"ski"/.test(featureOtherTagsBlob(feature));
}

function trailGeomScore(feature) {
  const id = String(feature?.properties?.id || "");
  let n = 0;
  for (const coords of lineParts(feature?.geometry)) n += coords?.length || 0;
  return (id.includes("way:") ? 1000 : 0) + n;
}

/** Keep ski route centerlines; drop area outlines, snow parks, and duplicate OSM ways. */
function selectTrailCenterlines(features) {
  const lines = (features || []).filter(
    (f) => lineParts(f.geometry).length && !isPisteAreaOutline(f) && !isSnowParkFeature(f),
  );
  // Prefer dedicated route=ski relations only when they cover most of the network.
  // Megaresorts often have a few route=ski lines plus hundreds of piste ways — using
  // routes alone made Killington/Jay look empty.
  const routes = lines.filter(isSkiRouteCenterline);
  const pool = routes.length && routes.length * 3 >= lines.length ? routes : lines;
  const byKey = new Map();
  for (const feature of pool) {
    const osm = featureOsmWayId(feature);
    let key = osm ? `way:${osm}` : "";
    if (!key) {
      const coords = lineParts(feature.geometry)[0] || [];
      const a = coords[0];
      const b = coords[coords.length - 1];
      const name = feature?.properties?.name || "";
      key = `g:${name}:${a?.[0]?.toFixed?.(1)},${a?.[1]?.toFixed?.(1)}:${b?.[0]?.toFixed?.(1)},${b?.[1]?.toFixed?.(1)}:${coords.length}`;
    }
    const prev = byKey.get(key);
    if (!prev || trailGeomScore(feature) > trailGeomScore(prev)) byKey.set(key, feature);
  }
  return [...byKey.values()];
}

function featureAerialway(feature) {
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

function featureLiftOsmId(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  if (tags.osm_way_id != null && String(tags.osm_way_id).trim()) return String(tags.osm_way_id);
  if (props.osm_way_id != null && String(props.osm_way_id).trim()) return String(props.osm_way_id);
  const id = String(props.id || "");
  const m = /(?:way:|nan:|:)?(\d+)\s*$/.exec(id);
  return m ? m[1] : "";
}

function liftGeomScore(feature) {
  const id = String(feature?.properties?.id || "");
  let n = 0;
  for (const coords of lineParts(feature?.geometry)) n += coords?.length || 0;
  return (id.includes("way:") ? 1000 : 0) + n;
}

/** Drop duplicate OSM lifts (e.g. lifts:nan:ID vs lifts:way:ID). */
function selectLiftFeatures(features) {
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

const SURFACE_LIFT_TYPES = new Set([
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

/** Classic drag lifts rendered as overhead T-bar systems (not carpet ribbons). */
const TBAR_LIFT_TYPES = new Set([
  "t_bar",
  "j_bar",
  "platter",
  "drag_lift",
  "draglift",
  "button_lift",
  "poma",
  "surface_lift",
]);

function isSurfaceLift(type) {
  return SURFACE_LIFT_TYPES.has(type);
}

function isTBarLift(type) {
  return TBAR_LIFT_TYPES.has(type);
}

const GONDOLA_LIFT_TYPES = new Set([
  "gondola",
  "cable_car",
  "cablecar",
  "mixed_lift",
  "funitel",
  "tricable",
  "detachable_gondola",
]);

function isGondolaLift(type) {
  return GONDOLA_LIFT_TYPES.has(type);
}

function isLiftPylonOrStation(type) {
  return type === "pylon" || type === "station" || type === "goods";
}

function featurePisteType(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  /* Prefer OSM other_tags / piste:type over flattened piste_type — exports often
   * set piste_type="downhill" even when other_tags says piste:type=snow_park. */
  let type = tags["piste:type"] || props["piste:type"] || "";
  if (!type) {
    const other = featureOtherTagsBlob(feature);
    const m = /piste:type"=>"([^"]+)/.exec(other);
    if (m) type = m[1];
  }
  if (!type) type = tags.piste_type || props.piste_type || "";
  return String(type || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();
}

function isSnowParkFeature(feature) {
  const t = featurePisteType(feature);
  if (t === "snow_park" || t === "terrain_park" || t === "snowpark") return true;
  const name = String(feature?.properties?.name || "").toLowerCase();
  return /\b(terrain\s*park|snow\s*park|rail\s*(fun\s*)?park|half[\s-]?pipe)\b/.test(name);
}

function trailStyle(difficulty) {
  return TRAIL_STYLES[difficultyBucket(difficulty)] || TRAIL_STYLES.blue;
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

function appendRibbon(positions, pts, width) {
  if (!pts || pts.length < 2) return;
  const half = width * 0.5;
  const up = new THREE.Vector3(0, 1, 0);
  /* Continuous strip with averaged corner normals — per-segment sides made
   * sharp zig-zag miters that read as jagged trail edges. */
  const lefts = [];
  const rights = [];
  for (let i = 0; i < pts.length; i++) {
    let dir;
    if (i === 0) dir = new THREE.Vector3().subVectors(pts[1], pts[0]);
    else if (i === pts.length - 1) dir = new THREE.Vector3().subVectors(pts[i], pts[i - 1]);
    else {
      const d0 = new THREE.Vector3().subVectors(pts[i], pts[i - 1]);
      const d1 = new THREE.Vector3().subVectors(pts[i + 1], pts[i]);
      if (d0.lengthSq() > 1e-8) d0.normalize();
      if (d1.lengthSq() > 1e-8) d1.normalize();
      dir = d0.add(d1);
    }
    if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
    else dir.normalize();
    const side = new THREE.Vector3().crossVectors(up, dir);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    else side.normalize().multiplyScalar(half);
    lefts.push(new THREE.Vector3().subVectors(pts[i], side));
    rights.push(new THREE.Vector3().addVectors(pts[i], side));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const aL = lefts[i];
    const aR = rights[i];
    const bL = lefts[i + 1];
    const bR = rights[i + 1];
    positions.push(
      aL.x, aL.y, aL.z, aR.x, aR.y, aR.z, bR.x, bR.y, bR.z,
      aL.x, aL.y, aL.z, bR.x, bR.y, bR.z, bL.x, bL.y, bL.z,
    );
  }
}

function meshFromPositions(positions, mat) {
  if (positions.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

function gamePoint(east, north, center, sample, lift = 0.9) {
  const { x, z } = localXZ(east, north, center);
  const y = sample(x, z);
  if (y == null) return null;
  return new THREE.Vector3(x, y + lift, z);
}

function addTrails(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const group = new THREE.Group();
  group.name = "montage-trails";
  const buckets = {
    green: [],
    blue: [],
    black: [],
  };
  const features = selectTrailCenterlines(featureCollection?.features || []);
  const stride = Math.max(1, Math.ceil(features.length / MAX_TRAILS));
  const width = TRAIL_WIDTH * unitScale;
  /* Trails sit just above snow; riders use a higher path so they rest on top. */
  const trailLift = Math.max(0.4, 0.12 * unitScale);
  const riderLift = trailLift + Math.max(0.35, 0.1 * unitScale);
  const paths = [];

  for (let i = 0; i < features.length; i += stride) {
    const feature = features[i];
    const style = trailStyle(featureDifficulty(feature));
    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      const ridePts = [];
      for (const coord of downsampleLine(coords, 96)) {
        const p = gamePoint(coord[0], coord[1], center, sample, trailLift);
        const r = gamePoint(coord[0], coord[1], center, sample, riderLift);
        if (p) pts.push(p);
        if (r) ridePts.push(r);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        appendRibbon(buckets[style.key], smoothTrailPts(run, 1), width);
      }
      for (const run of clipPointRuns(ridePts, clipRing)) {
        if (run.length >= 2) paths.push(ensureDownhillPath(smoothTrailPts(run, 1)));
      }
    }
  }

  for (const [key, positions] of Object.entries(buckets)) {
    if (!positions.length) continue;
    const style = trailStyle(key);
    const mat = new THREE.MeshLambertMaterial({
      color: style.color,
      emissive: style.emissive,
      emissiveIntensity: style.intensity,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const mesh = meshFromPositions(positions, mat);
    if (mesh) {
      mesh.renderOrder = 2;
      group.add(mesh);
    }
  }

  group.userData.paths = paths;
  group.userData.trailLift = trailLift;
  group.userData.riderLift = riderLift;
  parent.add(group);
  return group;
}

function ensureDownhillPath(pts) {
  if (!pts || pts.length < 2) return pts || [];
  return pts[0].y >= pts[pts.length - 1].y ? pts : pts.slice().reverse();
}

const RIDER_SUITS = [0xe11d48, 0x2563eb, 0x16a34a, 0x7c3aed, 0xea580c, 0x0f766e, 0xf59e0b];
const RIDER_SKIS = [0xfbbf24, 0x38bdf8, 0xf43f5e, 0xa3e635];

function makeClayRider(unitScale, board, suit, ski) {
  /* Keep riders readable on the hero island (mesh meters → ~tree-trunk scale). */
  const s = Math.min(11, Math.max(1.35, 0.4 * unitScale));
  const g = new THREE.Group();
  g.name = board ? "montage-boarder" : "montage-skier";

  const suitMat = new THREE.MeshLambertMaterial({
    color: suit,
    emissive: suit,
    emissiveIntensity: 0.22,
    flatShading: true,
  });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b892, flatShading: true });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2937, flatShading: true });
  const skiMat = new THREE.MeshLambertMaterial({
    color: ski,
    emissive: ski,
    emissiveIntensity: 0.18,
    flatShading: true,
  });
  const helmMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.18 * s, 0.55 * s, 6), suitMat);
  body.position.y = 0.52 * s;
  body.frustumCulled = false;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 7, 6), helmMat);
  head.position.y = 0.9 * s;
  head.frustumCulled = false;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 6, 5), skinMat);
  face.position.set(0, 0.88 * s, 0.07 * s);
  face.frustumCulled = false;
  g.add(body, head, face);

  if (board) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.06 * s, 1.05 * s), skiMat);
    deck.position.y = 0.05 * s;
    deck.frustumCulled = false;
    g.add(deck);
  } else {
    const skiGeo = new THREE.BoxGeometry(0.1 * s, 0.05 * s, 1.05 * s);
    const left = new THREE.Mesh(skiGeo, skiMat);
    const right = new THREE.Mesh(skiGeo, skiMat);
    left.position.set(-0.13 * s, 0.05 * s, 0);
    right.position.set(0.13 * s, 0.05 * s, 0);
    left.frustumCulled = false;
    right.frustumCulled = false;
    g.add(left, right);
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.014 * s, 0.75 * s, 4), darkMat);
    const poleR = poleL.clone();
    poleL.position.set(-0.3 * s, 0.48 * s, 0.06 * s);
    poleR.position.set(0.3 * s, 0.48 * s, 0.06 * s);
    poleL.rotation.x = 0.55;
    poleR.rotation.x = 0.55;
    poleL.frustumCulled = false;
    poleR.frustumCulled = false;
    g.add(poleL, poleR);
  }

  g.userData.ride = 0.16 * s;
  g.renderOrder = 4;
  g.frustumCulled = false;
  return g;
}

/** Seed from OSM id / name so parks stay stable across refreshes. */
function snowParkFeatureSeed(feature) {
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
function createSnowPark(run, opts = {}) {
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

function addSnowParks(
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

function updateParkRiders(pack, dt) {
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
function collectParkBlockers(center, sample, layers = {}) {
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

function addTrailRiders(parent, paths, sample, unitScale = 1) {
  const minLen = Math.max(12, unitScale * 0.5);
  const usable = (paths || [])
    .map((p) => ({ pts: p, len: polylineLen(p) }))
    .filter((p) => p.pts && p.len > minLen)
    .sort((a, b) => b.len - a.len);
  if (!usable.length) return null;

  const group = new THREE.Group();
  group.name = "montage-riders";
  group.frustumCulled = false;
  const list = [];
  const speedScale = Math.max(1, Math.sqrt(Math.max(1, unitScale)) * 0.75);
  const maxPerTrail = 3;
  /* Spread the budget across every trail first — don't fill trail 0 then starve the rest. */
  const budget = Math.min(MAX_RIDERS, Math.max(usable.length, Math.round(usable.length * 1.85)));
  const counts = new Array(usable.length).fill(0);
  let placed = 0;
  for (let pass = 0; pass < maxPerTrail && placed < budget; pass++) {
    for (let t = 0; t < usable.length && placed < budget; t++) {
      const route = usable[t];
      /* Longer trails earn pass 2/3; short ones stay at 1. */
      const earn =
        pass === 0 ||
        (pass === 1 && route.len > Math.max(80, unitScale * 4)) ||
        (pass === 2 && route.len > Math.max(160, unitScale * 9));
      if (!earn) continue;
      if (counts[t] >= maxPerTrail) continue;
      counts[t] += 1;
      placed += 1;
    }
  }

  let slot = 0;
  for (let t = 0; t < usable.length; t++) {
    const n = counts[t];
    if (!n) continue;
    const route = usable[t];
    const pts = route.pts;
    const len = route.len;
    const pad = Math.min(len * 0.08, Math.max(len * 0.04, 6));
    for (let k = 0; k < n; k++) {
      const board = slot % 5 === 0 || slot % 5 === 3;
      const mesh = makeClayRider(
        unitScale,
        board,
        RIDER_SUITS[slot % RIDER_SUITS.length],
        RIDER_SKIS[slot % RIDER_SKIS.length],
      );
      group.add(mesh);
      const lane = n <= 1 ? 0 : k / (n - 1) - 0.5;
      list.push({
        mesh,
        pts,
        len,
        pad,
        along: pad + Math.max(1, len - pad * 2) * ((k + 0.2) / (n + 0.2)),
        speed: (2.8 + rng(slot * 2.1 + t) * 4.6) * speedScale,
        phase: rng(slot * 7.3) * Math.PI * 2,
        bias: lane * Math.min(5.5, Math.max(2.0, unitScale * 0.18)),
        amp: 1.2 + rng(slot * 4.4) * 2.0,
        wave: 16 + rng(slot * 5.2) * 30,
        board,
      });
      slot += 1;
    }
  }

  parent.add(group);
  const pack = { group, list, sample };
  updateTrailRiders(pack, 0);
  return pack;
}

function updateTrailRiders(pack, dt) {
  if (!pack?.list?.length) return;
  for (const rider of pack.list) {
    const pad = Math.min(rider.pad || 6, rider.len * 0.15);
    if (dt > 0) {
      rider.along += rider.speed * dt;
      /* Hit the bottom → teleport back to the top. */
      if (rider.along >= rider.len - pad) rider.along = pad;
    }
    const p = alongPolyline(rider.pts, rider.along);
    if (!p) continue;
    const nx = -p.tz;
    const nz = p.tx;
    const nLen = Math.hypot(nx, nz) || 1;
    const side =
      (rider.bias || 0) + (rider.amp || 2) * Math.sin(rider.along / Math.max(8, rider.wave || 24) + rider.phase);
    const x = p.x + (nx / nLen) * side;
    const z = p.z + (nz / nLen) * side;
    /* Stay on the elevated ride path (above trail ribbons), not bare snow. */
    const y = p.y;
    const cut = Math.atan2(
      ((rider.amp || 2) / Math.max(8, rider.wave || 24)) * Math.cos(rider.along / Math.max(8, rider.wave || 24) + rider.phase),
      1,
    );
    rider.mesh.position.set(x, y + (rider.mesh.userData.ride || 0.5), z);
    rider.mesh.rotation.order = "YXZ";
    rider.mesh.rotation.y = Math.atan2(p.tx, p.tz) + cut * 0.65;
    rider.mesh.rotation.x = 0.12 + Math.sin(rider.along * 0.05 + rider.phase) * 0.04;
    rider.mesh.rotation.z = Math.sin(rider.along * 0.09 + rider.phase) * (rider.board ? 0.22 : 0.14);
    rider.mesh.visible = Number.isFinite(rider.mesh.position.y);
  }
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

/** Cable that rides high mid-line then drops to boarding height at both terminals. */
function buildAerialCable(ground, cableH, stationH, step) {
  const total = polylineLen(ground);
  if (!(total > 1) || ground.length < 2) return [];
  const samples = Math.max(16, Math.ceil(total / Math.max(8, step)));
  const cable = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = alongPolyline(ground, t * total);
    if (!p) continue;
    cable.push(new THREE.Vector3(p.x, p.y + cableHeightProfile(t, cableH, stationH), p.z));
  }
  return cable;
}

/* ─── T-bar / drag-lift system ─────────────────────────────────────────── */

const MAX_TBAR_LIFTS = 10;
const MAX_TBAR_CARRIERS = 160;

function createTBarAssets(unitScale = 1) {
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

function orientLiftGround(ground) {
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
function createTBarLift(liftFeature, ctx) {
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

function updateTBarLift(pack, dt) {
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

function updateTBarLifts(packs, dt) {
  if (!packs?.length) return;
  for (const pack of packs) updateTBarLift(pack, dt);
}

/* ─── Aerial chairlift / gondola terminals + continuous cable loops ───── */

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
  if (kind === "gondola") return createGondolaTerminal(endpoint, direction, endType, assets);
  return createChairliftTerminal(endpoint, direction, endType, assets);
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

function addLifts(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
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

function updateLiftChairs(pack, dt) {
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

function placeTreeInstances(positions, unitScale = 1) {
  const trunkGeo = new THREE.CylinderGeometry(0.08 * unitScale, 0.11 * unitScale, 0.55 * unitScale, 4);
  const crownGeo = new THREE.ConeGeometry(0.55 * unitScale, 1.35 * unitScale, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
  const crownMat = new THREE.MeshLambertMaterial({ color: PALETTE.tree, flatShading: true });
  const deepMat = new THREE.MeshLambertMaterial({ color: PALETTE.treeDeep, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, positions.length);
  const crownsDeep = new THREE.InstancedMesh(crownGeo, deepMat, positions.length);
  trunks.frustumCulled = false;
  crowns.frustumCulled = false;
  crownsDeep.frustumCulled = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < positions.length; i++) {
    const t = positions[i];
    const sc = t.scale * TREE_SCALE;
    q.setFromAxisAngle(up, t.rot);
    p.set(t.x, t.y, t.z);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);

    p.y = t.y + 0.85 * sc * unitScale;
    m.compose(p, q, s);
    crowns.setMatrixAt(i, m);

    p.y = t.y + 1.35 * sc * unitScale;
    s.set(sc * 0.72, sc * 0.72, sc * 0.72);
    m.compose(p, q, s);
    crownsDeep.setMatrixAt(i, m);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  crownsDeep.instanceMatrix.needsUpdate = true;

  const group = new THREE.Group();
  group.name = "montage-trees";
  group.add(trunks, crowns, crownsDeep);
  return group;
}

function addProceduralTrees(parent, sample, unitScale = 1) {
  const positions = [];
  for (let i = 0; i < MAX_TREES * 2 && positions.length < MAX_TREES; i++) {
    const x = -42 * unitScale + rng(i * 3.7) * 84 * unitScale;
    const z = -42 * unitScale + rng(i * 9.1) * 84 * unitScale;
    const y = sample(x, z);
    if (y == null || y < 4 * unitScale || y > 40 * unitScale) continue;
    if (rng(i * 1.3) > 0.72 && y > 28 * unitScale) continue;
    positions.push({
      x,
      y,
      z,
      rot: rng(i + 5) * Math.PI * 2,
      scale: 0.75 + rng(i + 2) * 0.65,
    });
  }
  if (!positions.length) return null;
  const group = placeTreeInstances(positions, unitScale);
  parent.add(group);
  return group;
}

function addTrees(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const features = featureCollection?.features || [];
  if (!features.length) return addProceduralTrees(parent, sample, unitScale);

  const woodPolys = collectWoodPolygons(features);
  let coords = sampleWoodUnion(woodPolys, MAX_TREES);

  /* Fallback: individual tree points only when no wood/forest polygons exist. */
  if (!coords.length) {
    coords = [];
    for (const feature of features) {
      const geom = feature.geometry;
      if (geom?.type === "Point" && geom.coordinates?.length >= 2) coords.push(geom.coordinates);
      else if (geom?.type === "MultiPoint") {
        for (const c of geom.coordinates || []) {
          if (c?.length >= 2) coords.push(c);
        }
      }
    }
    if (coords.length > MAX_TREES) {
      const stride = coords.length / MAX_TREES;
      const thinned = [];
      for (let i = 0; i < MAX_TREES; i++) {
        thinned.push(coords[Math.min(coords.length - 1, Math.floor(i * stride))]);
      }
      coords = thinned;
    }
  }

  const positions = [];
  for (let i = 0; i < coords.length && positions.length < MAX_TREES; i++) {
    const coord = coords[i];
    const { x, z } = localXZ(coord[0], coord[1], center);
    if (clipRing?.length && !insideIslandRing(x, z, clipRing)) continue;
    const y = sample(x, z);
    if (y == null) continue;
    positions.push({
      x,
      y,
      z,
      rot: rng(i * 5.1) * Math.PI * 2,
      scale: 0.8 + rng(i * 2.3) * 0.55,
    });
  }

  if (!positions.length) return addProceduralTrees(parent, sample, unitScale);
  const group = placeTreeInstances(positions.slice(0, MAX_TREES), unitScale);
  parent.add(group);
  return group;
}

/** Carve a flat bowl into the terrain so a pond reads clearly. */
function carveWaterBowl(mesh, cx, cz, radius, depth) {
  const pos = mesh.geometry.attributes.position;
  const ox = mesh.position.x;
  const oy = mesh.position.y;
  const oz = mesh.position.z;
  const r2 = radius * radius;
  let bedY = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const z = pos.getZ(i) + oz;
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    const t = 1 - Math.sqrt(d2) / radius;
    const y = pos.getY(i);
    const target = y - depth * t * t;
    pos.setY(i, target);
    bedY = Math.min(bedY, target + oy);
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  shadeSnowMesh(mesh);
  return Number.isFinite(bedY) ? bedY : null;
}

function findWaterSite(sample, span, clipRing = null) {
  const half = span * 0.32;
  let best = null;
  const step = Math.max(4, span / 28);
  for (let z = -half; z <= half; z += step) {
    for (let x = -half; x <= half; x += step) {
      if (clipRing?.length && !insideIslandRing(x, z, clipRing)) continue;
      const y = sample(x, z);
      if (y == null) continue;
      /* Prefer a mid-slope bowl, not the absolute ski-area edge. */
      const score = y + Math.hypot(x, z) * 0.08;
      if (!best || score < best.score) best = { x, z, y, score };
    }
  }
  return best;
}

function addWaterDisc(parent, x, z, y, radius) {
  const mat = new THREE.MeshBasicMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(x, y, z);
  disc.name = "montage-water";
  disc.renderOrder = 2;
  disc.frustumCulled = false;
  parent.add(disc);
  return disc;
}

function waterFeatureCount(fc) {
  return fc?.features?.length || 0;
}

/** Drape OSM water polygons + stream ribbons onto the clay terrain. */
function addOsmWater(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;

  const group = new THREE.Group();
  group.name = "montage-water-osm";
  const fillLift = Math.max(0.25, 0.06 * unitScale);
  const lineLift = Math.max(0.35, 0.08 * unitScale);
  const lineWidth = Math.max(0.35, TRAIL_WIDTH * 0.85 * Math.min(2.2, unitScale * 0.12));

  const fillMat = new THREE.MeshLambertMaterial({
    color: PALETTE.water,
    emissive: PALETTE.waterEm,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const lineMat = new THREE.MeshLambertMaterial({
    color: PALETTE.water,
    emissive: PALETTE.waterEm,
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const lineRibbons = [];
  let added = 0;

  for (const feature of features) {
    for (const poly of polygonParts(feature.geometry)) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const dens = downsampleLine(outer, 48);
      const shapePts = [];
      for (const coord of dens) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        if (clipRing?.length && !insideIslandRing(x, z, clipRing)) continue;
        shapePts.push(new THREE.Vector2(x, z));
      }
      if (shapePts.length < 3) continue;
      const shape = new THREE.Shape(shapePts);
      for (const hole of poly.slice(1) || []) {
        if (!hole || hole.length < 3) continue;
        const holePts = [];
        for (const coord of downsampleLine(hole, 24)) {
          const { x, z } = localXZ(coord[0], coord[1], center);
          holePts.push(new THREE.Vector2(x, z));
        }
        if (holePts.length >= 3) shape.holes.push(new THREE.Path(holePts));
      }
      let geo;
      try {
        geo = new THREE.ShapeGeometry(shape);
      } catch {
        continue;
      }
      const pos = geo.attributes.position;
      if (!pos || pos.count < 3) {
        geo.dispose();
        continue;
      }
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getY(i);
        const y = sample(x, z);
        pos.setXYZ(i, x, (y == null ? 0 : y) + fillLift, z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, fillMat);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      group.add(mesh);
      added += 1;
    }

    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of downsampleLine(coords, 64)) {
        const p = gamePoint(coord[0], coord[1], center, sample, lineLift);
        if (p) pts.push(p);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        appendRibbon(lineRibbons, run, lineWidth);
      }
    }
  }

  if (lineRibbons.length) {
    const mesh = meshFromPositions(lineRibbons, lineMat);
    if (mesh) {
      mesh.renderOrder = 2;
      group.add(mesh);
      added += 1;
    }
  }

  if (!added) return null;
  parent.add(group);
  return group;
}

function prepareWaterFeature(mesh, sample, span, clipRing = null) {
  const site = findWaterSite(sample, span, clipRing);
  if (!site) return null;
  const radius = Math.max(6, span * 0.055);
  const depth = Math.max(3, span * 0.025);
  let bedY = site.y;
  if (mesh) {
    const carved = carveWaterBowl(mesh, site.x, site.z, radius * 1.05, depth);
    if (carved != null) bedY = carved;
  }
  if (bedY == null) return null;
  return {
    x: site.x,
    z: site.z,
    y: bedY + Math.max(0.8, depth * 0.35),
    radius: radius * 0.92,
  };
}

function addWaterPond(parent, mesh, sample, span) {
  const feature = prepareWaterFeature(mesh, sample, span);
  if (!feature) return null;
  return addWaterDisc(parent, feature.x, feature.z, feature.y, feature.radius);
}

function addClayBuilding(group, cx, cz, y0, w, d, h, yaw, wallMat, roofMat) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  box.position.set(cx, y0 + h * 0.5, cz);
  box.rotation.y = yaw;
  box.renderOrder = 5;
  box.frustumCulled = false;
  group.add(box);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.06, Math.max(0.35 * (h / 6), h * 0.14), d * 1.06),
    roofMat,
  );
  roof.position.set(cx, y0 + h + Math.max(0.2, h * 0.08), cz);
  roof.rotation.y = yaw;
  roof.renderOrder = 5;
  roof.frustumCulled = false;
  group.add(roof);
}

function addBuildings(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const features = featureCollection?.features || [];
  if (!features.length) return addProceduralBuildings(parent, sample, unitScale);

  const group = new THREE.Group();
  group.name = "montage-buildings";
  const wallMat = new THREE.MeshLambertMaterial({
    color: PALETTE.building,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const s = unitScale * BUILDING_SHRINK;
  /* Keep base-village footprints near the buffer edge; hard clip hid them under snow. */
  const edgeSlackM = Math.max(35, 12 * unitScale);
  const snowLift = Math.max(0.55, 0.18 * unitScale);

  const candidates = [];
  for (const feature of features) {
    for (const ring of ringParts(feature.geometry)) {
      if (!ring || ring.length < 3) continue;
      const xs = [];
      const zs = [];
      for (const coord of ring) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        xs.push(x);
        zs.push(z);
      }
      const cx = (Math.min(...xs) + Math.max(...xs)) * 0.5;
      const cz = (Math.min(...zs) + Math.max(...zs)) * 0.5;
      if (clipRing?.length && distOutsideIsland(cx, cz, clipRing) > edgeSlackM) continue;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const footW = Math.max(4, maxX - minX);
      const footD = Math.max(4, maxZ - minZ);
      if (footW > 80 || footD > 80) continue;
      let y = sample(cx, cz);
      if (y == null) {
        let ySum = 0;
        let yN = 0;
        for (let i = 0; i < xs.length; i++) {
          const sy = sample(xs[i], zs[i]);
          if (sy == null) continue;
          ySum += sy;
          yN += 1;
        }
        if (yN < 1) continue;
        y = ySum / yN;
      }
      candidates.push({
        cx,
        cz,
        y: y + snowLift,
        footW,
        footD,
        area: footW * footD,
      });
    }
  }

  /* Prefer larger footprints (lodges / base villages often sit near the rim). */
  candidates.sort((a, b) => b.area - a.area);

  let count = 0;
  for (const c of candidates) {
    if (count >= MAX_BUILDINGS) break;
    const w = Math.min(c.footW, 24) * s;
    const d = Math.min(c.footD, 24) * s;
    const h = Math.max(3.5, Math.min(11, Math.sqrt(c.area) * 0.32)) * s;
    const yaw = rng(count * 7.1) * 0.15;
    addClayBuilding(group, c.cx, c.cz, c.y, w, d, h, yaw, wallMat, roofMat);
    count += 1;
  }

  if (!group.children.length) return addProceduralBuildings(parent, sample, unitScale);
  parent.add(group);
  return group;
}

function addProceduralBuildings(parent, sample, unitScale = 1) {
  const group = new THREE.Group();
  group.name = "montage-buildings-proc";
  const wallMat = new THREE.MeshLambertMaterial({
    color: PALETTE.building,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const s = unitScale * BUILDING_SHRINK;
  const snowLift = Math.max(0.55, 0.18 * unitScale);

  const clusters = [
    { x: 10, z: 18, n: 5 },
    { x: -8, z: 14, n: 4 },
    { x: 22, z: 6, n: 3 },
  ];

  let seed = 0;
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.n; i++) {
      const x = (cluster.x + (rng(seed * 2.1) - 0.5) * 14) * Math.min(unitScale, 1.2);
      const z = (cluster.z + (rng(seed * 3.7) - 0.5) * 10) * Math.min(unitScale, 1.2);
      const y = sample(x, z);
      if (y == null) {
        seed += 1;
        continue;
      }
      const w = (3.5 + rng(seed * 1.4) * 4.5) * s;
      const d = (3 + rng(seed * 2.2) * 3.5) * s;
      const h = (4.5 + rng(seed * 1.8) * 5) * s;
      addClayBuilding(group, x, z, y + snowLift, w, d, h, rng(seed) * Math.PI * 0.25, wallMat, roofMat);
      seed += 1;
    }
  }

  if (!group.children.length) return null;
  parent.add(group);
  return group;
}

function addProceduralTrails(parent, sample) {
  const group = new THREE.Group();
  group.name = "montage-trails-proc";
  const paths = [
    { key: "black", pts: [[-8, 36], [2, 28], [10, 18], [14, 8], [8, 2]] },
    { key: "black", pts: [[12, 34], [18, 24], [22, 14], [16, 4]] },
    { key: "green", pts: [[-22, 22], [-14, 14], [-6, 8], [0, 2]] },
    { key: "green", pts: [[-4, 30], [-10, 20], [-16, 10], [-12, 2]] },
    { key: "blue", pts: [[6, 32], [0, 22], [-4, 12], [2, 3]] },
  ];
  const buckets = { green: [], blue: [], black: [] };
  const ridePaths = [];
  for (const path of paths) {
    const pts = [];
    const ridePts = [];
    for (const [x, z] of path.pts) {
      const y = sample(x, z);
      if (y == null) continue;
      pts.push(new THREE.Vector3(x, y + 0.55, z));
      ridePts.push(new THREE.Vector3(x, y + 0.95, z));
    }
    if (ridePts.length >= 2) ridePaths.push(ensureDownhillPath(ridePts));
    appendRibbon(buckets[path.key], pts, TRAIL_WIDTH * 1.05);
  }
  for (const [key, positions] of Object.entries(buckets)) {
    const style = trailStyle(key);
    const mat = new THREE.MeshLambertMaterial({
      color: style.color,
      emissive: style.emissive,
      emissiveIntensity: style.intensity,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const mesh = meshFromPositions(positions, mat);
    if (mesh) {
      mesh.renderOrder = 2;
      group.add(mesh);
    }
  }
  group.userData.paths = ridePaths;
  parent.add(group);
  return group;
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

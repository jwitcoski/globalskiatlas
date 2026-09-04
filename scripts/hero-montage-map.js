/**
 * Clay floating-island ski resorts from clay_scenes/ (homepage hero + wiki 3D Map).
 * Procedural island first, then upgrades to a catalog resort; homepage can cycle resorts.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const HERO_SPAN = 100;
const MAX_TREES = 900;
const MAX_RIDERS = 280;
const MAX_TRAILS = 220;
/** Desired trail width in hero/display units (after mesh fit). Keep very thin. */
const TRAIL_WIDTH = 0.42;
const TREE_SCALE = 1.16;
const MAX_BUILDINGS = 28;
/** Buildings are authored in mesh meters; keep them tiny in the hero (~1/8 prior size). */
const BUILDING_SHRINK = 0.12;
const GRID_RES = 72;
const HEIGHT_EXAGGERATE = 2;

/** Clay island palette — white snow, green trees, blue water; US trail colors. */
const PALETTE = {
  bg: 0xffffff,
  snow: 0xffffff,
  snowShade: 0xe8eef2,
  rock: 0xb0bac4,
  rockDeep: 0x8a96a3,
  rockLip: 0xc5ced6,
  tree: 0x2f9e44,
  treeDeep: 0x237a36,
  trunk: 0x6b4f3a,
  trailGreen: 0x22c55e,
  trailGreenEm: 0x16a34a,
  trailBlue: 0x3b82f6,
  trailBlueEm: 0x2563eb,
  trailBlack: 0x171717,
  trailBlackEm: 0x404040,
  water: 0x2f9fff,
  waterEm: 0x1d7fd6,
  building: 0x9eb0c0,
  buildingRoof: 0x7f91a3,
  wood: 0x6b2d1a,
  woodMid: 0x4a1f12,
  woodDeep: 0x2f140c,
  woodHighlight: 0x8a3d24,
  lift: 0x6b7785,
  cable: 0x4b5563,
};

function sceneRoot(resortId) {
  return new URL(`/clay_scenes/${resortId}/`, location.origin);
}

function catalogUrl() {
  return new URL("/clay_scenes/catalog.json", location.origin);
}

function gameSceneBase(resort) {
  if (!resort?.id || !resort?.playable_ver) return null;
  const host = location.hostname;
  const path = `game_scenes/${resort.id}/${resort.playable_ver}/`;
  if (host === "localhost" || host === "127.0.0.1") {
    return new URL(`/${path}`, location.origin);
  }
  if (host === "globalskiatlas.com" || host === "www.globalskiatlas.com") {
    return new URL(`https://globalskiatlas.com/${path}`);
  }
  return new URL(
    `https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/${path}`,
  );
}

function playableHref(resort) {
  if (!resort?.id || !resort?.playable_ver) return null;
  return `/playable/?resort=${encodeURIComponent(resort.id)}&ver=${encodeURIComponent(resort.playable_ver)}`;
}

function capDpr() {
  return Math.min(window.devicePixelRatio || 1, 1.35);
}

function rng(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

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

function mountainHeight(x, z) {
  const peak = Math.exp(-((x - 5) ** 2 + (z + 11) ** 2) / 110) * 48;
  const ridge = Math.exp(-((x + 16) ** 2) / 80 - (z + 1) ** 2 / 150) * 26;
  const bowl = Math.exp(-((x - 22) ** 2 + (z + 6) ** 2) / 260) * -5;
  const ripple = Math.sin(x * 0.1) * 1.6 + Math.cos(z * 0.08) * 1.3;
  return 5 + (peak + ridge + bowl + ripple) * HEIGHT_EXAGGERATE;
}

function shadeSnowGeometry(geo) {
  if (!geo?.attributes?.position) return;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanY = Math.max(1, maxY - minY);
  const colors = new Float32Array(pos.count * 3);
  const high = new THREE.Color(0xffffff);
  const mid = new THREE.Color(0xf6f8fb);
  const low = new THREE.Color(0xe8eef5);
  const slopeShade = new THREE.Color(0xdde5ee);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const elev = (pos.getY(i) - minY) / spanY;
    /* Stay near snow-white; only a soft cool tint in valleys. */
    if (elev > 0.5) c.copy(mid).lerp(high, (elev - 0.5) / 0.5);
    else c.copy(low).lerp(mid, elev / 0.5);
    const ny = Math.abs(nrm.getY(i));
    const slope = THREE.MathUtils.clamp(1 - ny, 0, 1);
    c.lerp(slopeShade, slope * 0.28);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function shadeSnowMesh(mesh) {
  shadeSnowGeometry(mesh.geometry);
  if (mesh.material && !Array.isArray(mesh.material)) mesh.material.dispose();
  mesh.material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.08,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

function localXZ(east, north, center) {
  return { x: east - center.x, z: -north - center.z };
}

function lineParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function ringParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates?.[0]].filter(Boolean);
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).map((poly) => poly?.[0]).filter(Boolean);
  }
  return [];
}

function polygonParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates].filter(Boolean);
  if (geometry.type === "MultiPolygon") return geometry.coordinates || [];
  return [];
}

function featureTag(feature, key) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  let v = tags[key] || props[key] || "";
  if (!v) {
    const other = String(tags.other_tags || props.other_tags || "");
    const m = new RegExp(`${key}"\\s*=>\\s*"([^"]+)`).exec(other);
    if (m) v = m[1];
  }
  return String(v || "").toLowerCase().trim();
}

function isWoodFeature(feature) {
  const natural = featureTag(feature, "natural");
  const landuse = featureTag(feature, "landuse");
  return natural === "wood" || natural === "forest" || landuse === "forest";
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
  if (!outer || outer.length < 3 || !pointInRing(x, y, outer)) return false;
  for (const h of holes || []) {
    if (h.length >= 3 && pointInRing(x, y, h)) return false;
  }
  return true;
}

function distToRingEdges(x, y, ring) {
  let best = Infinity;
  for (let i = 0; i < (ring || []).length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b || a.length < 2 || b.length < 2) continue;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby || 1;
    let t = ((x - a[0]) * abx + (y - a[1]) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a[0] + abx * t), y - (a[1] + aby * t)));
  }
  return best;
}

/** Strictly inside a polygon, inset from the boundary so crowns don't spill out. */
function firmlyInside(x, y, outer, holes, margin) {
  if (!inPolygon(x, y, outer, holes)) return false;
  if (!(margin > 0)) return true;
  if (distToRingEdges(x, y, outer) < margin) return false;
  for (const h of holes || []) {
    if (h.length >= 3 && distToRingEdges(x, y, h) < margin) return false;
  }
  return true;
}

function shoelaceArea(ring) {
  if (!ring || ring.length < 3) return 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a) * 0.5;
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

function isSurfaceLift(type) {
  return SURFACE_LIFT_TYPES.has(type);
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

const TRAIL_STYLES = {
  green: { color: 0x22c55e, emissive: 0x16a34a, intensity: 0.32, key: "green" },
  blue: { color: 0x3b82f6, emissive: 0x2563eb, intensity: 0.34, key: "blue" },
  black: { color: 0x171717, emissive: 0x404040, intensity: 0.28, key: "black" },
};

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

function cross2(ax, az, bx, bz, cx, cz) {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

function convexHullXZ(points) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.z));
  if (pts.length < 3) return [];
  const sorted = pts.slice().sort((a, b) => a.x - b.x || a.z - b.z);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2].x, lower[lower.length - 2].z, lower[lower.length - 1].x, lower[lower.length - 1].z, p.x, p.z) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross2(upper[upper.length - 2].x, upper[upper.length - 2].z, upper[upper.length - 1].x, upper[upper.length - 1].z, p.x, p.z) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expandHull(poly, amount) {
  if (!poly?.length || !(amount > 0)) return poly || [];
  let cx = 0;
  let cz = 0;
  for (const p of poly) {
    cx += p.x;
    cz += p.z;
  }
  cx /= poly.length;
  cz /= poly.length;
  return poly.map((p) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    return { x: cx + (dx / d) * (d + amount), z: cz + (dz / d) * (d + amount) };
  });
}

function insideConvex(x, z, poly) {
  if (!poly?.length) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (cross2(a.x, a.z, b.x, b.z, x, z) < 0) return false;
  }
  return true;
}

function distToHullEdge(x, z, poly) {
  if (!poly?.length) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (a.x + abx * t), z - (a.z + abz * t)));
  }
  return best;
}

function distOutsideHull(x, z, poly) {
  if (!poly?.length) return 0;
  if (insideConvex(x, z, poly)) return 0;
  return distToHullEdge(x, z, poly);
}

/** Point-in-polygon for possibly concave island rings ({x,z}…​). */
function insideIslandRing(x, z, ring) {
  if (!ring?.length) return false;
  const flat = [];
  for (const p of ring) flat.push([p.x, p.z]);
  return pointInRing(x, z, flat);
}

function distOutsideIsland(x, z, ring) {
  if (!ring?.length) return 0;
  if (insideIslandRing(x, z, ring)) return 0;
  return distToHullEdge(x, z, ring);
}

function ensureCcwXZ(poly) {
  if (!poly?.length) return poly || [];
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j].x * poly[i].z - poly[i].x * poly[j].z;
  }
  return a >= 0 ? poly : poly.slice().reverse();
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

function projectToHull(x, z, hull) {
  let best = Infinity;
  let px = x;
  let pz = z;
  for (let e = 0; e < hull.length; e++) {
    const a = hull[e];
    const b = hull[(e + 1) % hull.length];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = a.x + abx * t;
    const qz = a.z + abz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (d < best) {
      best = d;
      px = qx;
      pz = qz;
    }
  }
  return { x: px, z: pz };
}

function ringCentroidXZ(ring) {
  let cx = 0;
  let cz = 0;
  for (const p of ring || []) {
    cx += p.x;
    cz += p.z;
  }
  const n = Math.max(1, ring?.length || 0);
  return { x: cx / n, z: cz / n };
}

/** Even arc-length resample — stops clustered rim verts from making knife-edge wood tris. */
function resampleRingArc(ring, count) {
  if (!ring?.length) return [];
  const n = ring.length;
  const seg = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    seg.push(len);
    total += len;
  }
  if (!(total > 1e-6)) return ring.slice();
  const out = [];
  const step = total / count;
  let edge = 0;
  let consumed = 0;
  for (let i = 0; i < count; i++) {
    const target = i * step;
    while (edge < n - 1 && consumed + seg[edge] < target) {
      consumed += seg[edge];
      edge += 1;
    }
    const len = seg[edge] || 1e-6;
    const t = Math.max(0, Math.min(1, (target - consumed) / len));
    const a = ring[edge];
    const b = ring[(edge + 1) % n];
    out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  return out;
}

function decimateRing(ring, maxPts) {
  if (!ring?.length || ring.length <= maxPts) return ring || [];
  return resampleRingArc(ring, maxPts);
}

/** Chaikin corner-cut — softens jagged buffer outlines for the cliff rim. */
function chaikinRing(ring, iterations = 2) {
  let pts = (ring || []).map((p) => ({ x: p.x, z: p.z }));
  if (pts.length < 3) return pts;
  for (let k = 0; k < iterations; k++) {
    const next = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      next.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
    }
    pts = next;
  }
  return ensureCcwXZ(pts);
}

function prepareIslandRim(hull) {
  if (!hull?.length) return [];
  return chaikinRing(resampleRingArc(hull, 72), 2);
}

/**
 * Convex shaping rim — projecting DEM verts onto a concave buffer causes
 * knife-edge spikes (Hakuba). Convex keeps topology sane; wood uses the detailed rim.
 */
function prepareShapeRim(hull) {
  if (!hull?.length) return [];
  const convex = convexHullXZ(hull);
  if (convex.length >= 3) return ensureCcwXZ(resampleRingArc(convex, 48));
  return prepareIslandRim(hull);
}

function clipPointRuns(pts, ring) {
  if (!ring?.length) return pts?.length >= 2 ? [pts] : [];
  const runs = [];
  let cur = [];
  for (const p of pts || []) {
    if (p && insideIslandRing(p.x, p.z, ring)) cur.push(p);
    else {
      if (cur.length >= 2) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs;
}

function ensureCcw(poly) {
  if (!poly?.length) return poly || [];
  let cx = 0;
  let cz = 0;
  for (const p of poly) {
    cx += p.x;
    cz += p.z;
  }
  cx /= poly.length;
  cz /= poly.length;
  return insideConvex(cx, cz, poly) ? poly : poly.slice().reverse();
}

/**
 * Clip DEM to the AOI with only a short lip past the wood rim.
 * Far outside verts snap onto the rim; a few meters of overhang is left.
 * Uses the (smoothed) buffer rim so Europe can't keep a half-mile shelf.
 */
function softShapeTerrainToHull(mesh, edgeRim, sample, lipAllowM = 4) {
  if (!mesh?.geometry?.attributes?.position || !edgeRim?.length) return;
  const pos = mesh.geometry.attributes.position;
  const ox = mesh.position.x;
  const oy = mesh.position.y;
  const oz = mesh.position.z;
  const tuck = 18;
  const fade = 24;
  const lip = Math.max(2, lipAllowM);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const z = pos.getZ(i) + oz;
    const outside = distOutsideIsland(x, z, edgeRim);
    if (outside <= 0) continue;
    const hit = projectToHull(x, z, edgeRim);
    const rimY = sample?.(hit.x, hit.z);
    const base = rimY != null ? rimY - oy : pos.getY(i);
    const sink = tuck + Math.min(160, outside) * 0.35 + Math.min(1, outside / fade) * 8;
    pos.setY(i, base - sink);
    if (outside > lip) {
      pos.setX(i, hit.x - ox);
      pos.setZ(i, hit.z - oz);
    }
  }
  pos.needsUpdate = true;
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

function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const tx = x - xi;
  const tz = z - zi;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}

function fbm(x, z) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < 4; i++) {
    v += valueNoise(x * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.13;
  }
  return v / norm;
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

function resampleHull(hull, count) {
  return resampleRingArc(hull, count);
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

  const lip = Math.max(8, span * 0.004) + 5;
  const floor = Math.min(
    Number.isFinite(snowMinY) ? snowMinY : minRim,
    minRim,
  ) - Math.max(24, span * 0.035);

  const layersN = 10;
  const cliffFrac = 0.62;
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
        const s = 1.0 + kT * ((n - 0.5) * 0.004);
        pts.push({
          x: cx + dx * s,
          y: yTop + (floor - yTop) * kT,
          z: cz + dz * s,
        });
        continue;
      }
      const u = (t - cliffFrac) / (1 - cliffFrac);
      const terrace = Math.floor(u * 7) / 7;
      const taper = 1 - Math.pow(terrace, 0.55) * 0.88;
      const gully = (n - 0.5) * 0.12 * (1 - u * 0.35);
      const ridge = (nv - 0.5) * 0.06;
      const s = Math.max(0.08, taper + gully + ridge);
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

/** O(verts) once, then O(1) bilinear height — avoids Raycaster storms. */
function makeHeightGrid(mesh, resolution = GRID_RES) {
  const pos = mesh.geometry.attributes.position;
  const ox = mesh.position.x;
  const oy = mesh.position.y;
  const oz = mesh.position.z;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const z = pos.getZ(i) + oz;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const w = Math.max(1e-3, maxX - minX);
  const d = Math.max(1e-3, maxZ - minZ);
  const heights = new Float32Array(resolution * resolution);
  heights.fill(-Infinity);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox;
    const y = pos.getY(i) + oy;
    const z = pos.getZ(i) + oz;
    const u = Math.min(resolution - 1, Math.max(0, Math.floor(((x - minX) / w) * (resolution - 1))));
    const v = Math.min(resolution - 1, Math.max(0, Math.floor(((z - minZ) / d) * (resolution - 1))));
    const idx = v * resolution + u;
    if (y > heights[idx]) heights[idx] = y;
  }
  /* Fill empty cells from nearest filled neighbor (cheap 1-pass blur). */
  for (let pass = 0; pass < 2; pass++) {
    for (let v = 0; v < resolution; v++) {
      for (let u = 0; u < resolution; u++) {
        const idx = v * resolution + u;
        if (heights[idx] !== -Infinity) continue;
        let best = -Infinity;
        for (let dv = -1; dv <= 1; dv++) {
          for (let du = -1; du <= 1; du++) {
            const uu = u + du;
            const vv = v + dv;
            if (uu < 0 || vv < 0 || uu >= resolution || vv >= resolution) continue;
            const h = heights[vv * resolution + uu];
            if (h > best) best = h;
          }
        }
        if (best !== -Infinity) heights[idx] = best;
      }
    }
  }

  return (x, z) => {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return null;
    const uf = ((x - minX) / w) * (resolution - 1);
    const vf = ((z - minZ) / d) * (resolution - 1);
    const u0 = Math.floor(uf);
    const v0 = Math.floor(vf);
    const u1 = Math.min(resolution - 1, u0 + 1);
    const v1 = Math.min(resolution - 1, v0 + 1);
    const tu = uf - u0;
    const tv = vf - v0;
    const h00 = heights[v0 * resolution + u0];
    const h10 = heights[v0 * resolution + u1];
    const h01 = heights[v1 * resolution + u0];
    const h11 = heights[v1 * resolution + u1];
    if (h00 === -Infinity) return null;
    const a = h00 + (h10 - h00) * tu;
    const b = h01 + (h11 - h01) * tu;
    return a + (b - a) * tv;
  };
}

function downsampleLine(coords, maxPts = 18) {
  if (!coords || coords.length <= maxPts) return coords || [];
  const out = [];
  const step = (coords.length - 1) / (maxPts - 1);
  for (let i = 0; i < maxPts; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

function appendRibbon(positions, pts, width) {
  if (!pts || pts.length < 2) return;
  const half = width * 0.5;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dir = new THREE.Vector3().subVectors(b, a);
    if (dir.lengthSq() < 1e-6) continue;
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(up, dir).normalize().multiplyScalar(half);
    const aL = new THREE.Vector3().subVectors(a, side);
    const aR = new THREE.Vector3().addVectors(a, side);
    const bL = new THREE.Vector3().subVectors(b, side);
    const bR = new THREE.Vector3().addVectors(b, side);
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
      for (const coord of downsampleLine(coords, 64)) {
        const p = gamePoint(coord[0], coord[1], center, sample, trailLift);
        const r = gamePoint(coord[0], coord[1], center, sample, riderLift);
        if (p) pts.push(p);
        if (r) ridePts.push(r);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        appendRibbon(buckets[style.key], run, width);
      }
      for (const run of clipPointRuns(ridePts, clipRing)) {
        if (run.length >= 2) paths.push(ensureDownhillPath(run));
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
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
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
  try {
    addSnowParkJumps(parent, featureCollection, center, sample, unitScale, clipRing, trailLift);
  } catch (err) {
    console.warn("[hero-montage-map] snowpark jumps failed", err);
  }
  return group;
}

/** White clay triangle ramps along snow-park lines / inside park polygons. */
function addSnowParkJumps(parent, featureCollection, center, sample, unitScale = 1, clipRing = null, trailLift = 0.4) {
  const parksRaw = (featureCollection?.features || []).filter(isSnowParkFeature);
  if (!parksRaw.length) return null;

  /* Deduplicate park ways (nan: vs way: / duplicate names). */
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

  const group = new THREE.Group();
  group.name = "montage-snowpark";
  const s = Math.max(1, unitScale);
  const jumpLift = trailLift + Math.max(0.45, 0.14 * s);
  const sites = [];

  function pushSitesAlong(run, seedBase) {
    if (!run || run.length < 2) return;
    const len = polylineLen(run);
    /* A few well-spaced jumps — not a sawtooth ridge. */
    const target = Math.max(2, Math.min(5, Math.round(len / Math.max(55, unitScale * 1.1))));
    for (let k = 0; k < target; k++) {
      const t = (k + 1) / (target + 1);
      const along = alongPolyline(run, len * t);
      if (!along) continue;
      const ahead = alongPolyline(run, Math.min(len, len * t + Math.max(3, len * 0.05)));
      const tan = new THREE.Vector3(
        (ahead?.x ?? along.x) - along.x,
        0,
        (ahead?.z ?? along.z) - along.z,
      );
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
      else tan.normalize();
      sites.push({
        p: new THREE.Vector3(along.x, along.y, along.z),
        tan,
        seed: seedBase + k * 3.7,
      });
    }
  }

  for (const feature of parks) {
    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of downsampleLine(coords, 48)) {
        const p = gamePoint(coord[0], coord[1], center, sample, jumpLift);
        if (p) pts.push(p);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        pushSitesAlong(run, sites.length * 11.3);
      }
    }
    for (const poly of polygonParts(feature.geometry)) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const dens = downsampleLine(outer, 36);
      const pts = [];
      for (const coord of dens) {
        const p = gamePoint(coord[0], coord[1], center, sample, jumpLift);
        if (p) pts.push(p);
      }
      for (const run of clipPointRuns(pts, clipRing)) {
        if (run.length < 3) continue;
        let cx = 0;
        let cz = 0;
        for (const q of run) {
          cx += q.x;
          cz += q.z;
        }
        cx /= run.length;
        cz /= run.length;
        const n = Math.min(4, Math.max(2, Math.round(run.length / 8)));
        for (let k = 0; k < n; k++) {
          const idx = Math.min(run.length - 2, 1 + Math.floor(((k + 0.5) / n) * (run.length - 2)));
          const p = run[idx];
          const next = run[Math.min(run.length - 1, idx + 1)];
          const tan = new THREE.Vector3().subVectors(next, p);
          tan.y = 0;
          if (tan.lengthSq() < 1e-6) tan.set(1, 0, 0);
          else tan.normalize();
          const inward = new THREE.Vector3(cx - p.x, 0, cz - p.z);
          if (inward.lengthSq() > 1e-4) inward.normalize().multiplyScalar(Math.max(2, 0.2 * s));
          sites.push({
            p: new THREE.Vector3(p.x + inward.x, p.y, p.z + inward.z),
            tan,
            seed: sites.length * 5.7 + k,
          });
        }
      }
    }
  }

  if (!sites.length) return null;

  const jumpW = 1.25 * s;
  const jumpH = 2.6 * s;
  const jumpD = 1.35 * s;

  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.35,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -10,
    polygonOffsetUnits: -10,
  });
  const sideMat = new THREE.MeshLambertMaterial({
    color: 0xe2e8f0,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.2,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < sites.length && i < 28; i++) {
    const { p, tan, seed } = sites[i];
    const scale = 0.9 + rng(seed) * 0.55;
    const jump = new THREE.Group();
    /* Tall upright triangle (fin) — readable from the default elevated camera. */
    const finGeo = new THREE.BufferGeometry();
    const hw = jumpW * 0.5 * scale;
    const h = jumpH * scale;
    const d = jumpD * scale;
    finGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          // left face (main visible triangle)
          0, 0, d, 0, 0, -d, 0, h, -d * 0.2,
          // right face (slight thickness)
          hw * 0.15, 0, d, hw * 0.15, h, -d * 0.2, hw * 0.15, 0, -d,
          // deck / thickness fill
          0, 0, d, hw * 0.15, 0, d, 0, h, -d * 0.2,
          hw * 0.15, 0, d, hw * 0.15, h, -d * 0.2, 0, h, -d * 0.2,
        ]),
        3,
      ),
    );
    finGeo.computeVertexNormals();
    const fin = new THREE.Mesh(finGeo, mat);
    fin.frustumCulled = false;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(jumpW * 0.7 * scale, 0.12 * s, jumpD * 1.1 * scale),
      sideMat,
    );
    base.position.y = 0.06 * s;
    base.frustumCulled = false;
    jump.add(base, fin);
    jump.position.copy(p);
    jump.rotation.y = Math.atan2(tan.x, tan.z);
    jump.renderOrder = 3;
    jump.frustumCulled = false;
    group.add(jump);
  }

  parent.add(group);
  try {
    if (typeof window !== "undefined") {
      window.__claySnowPark = { parks: parks.length, sites: sites.length, jumps: group.children.length };
    }
  } catch (_) {
    /* ignore */
  }
  return group;
}

function ensureDownhillPath(pts) {
  if (!pts || pts.length < 2) return pts || [];
  return pts[0].y >= pts[pts.length - 1].y ? pts : pts.slice().reverse();
}

function polylineLen(pts) {
  let len = 0;
  for (let i = 1; i < (pts || []).length; i++) len += pts[i].distanceTo(pts[i - 1]);
  return len;
}

function alongPolyline(pts, dist) {
  if (!pts?.length) return null;
  if (dist <= 0) {
    const a = pts[0];
    const b = pts[Math.min(1, pts.length - 1)];
    const seg = Math.max(1e-6, a.distanceTo(b));
    return {
      x: a.x,
      y: a.y,
      z: a.z,
      tx: (b.x - a.x) / seg,
      tz: (b.z - a.z) / seg,
    };
  }
  let left = dist;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = a.distanceTo(b);
    if (seg < 1e-6) continue;
    if (left <= seg) {
      const t = left / seg;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        tx: (b.x - a.x) / seg,
        tz: (b.z - a.z) / seg,
      };
    }
    left -= seg;
  }
  const a = pts[pts.length - 2] || pts[0];
  const b = pts[pts.length - 1];
  const seg = Math.max(1e-6, a.distanceTo(b));
  return {
    x: b.x,
    y: b.y,
    z: b.z,
    tx: (b.x - a.x) / seg,
    tz: (b.z - a.z) / seg,
  };
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

function addTrailRiders(parent, paths, sample, unitScale = 1) {
  const minLen = Math.max(12, unitScale * 0.5);
  const usable = (paths || [])
    .map((p) => ({ pts: p, len: polylineLen(p) }))
    .filter((p) => p.pts && p.len > minLen);
  if (!usable.length) return null;

  const group = new THREE.Group();
  group.name = "montage-riders";
  group.frustumCulled = false;
  const list = [];
  const speedScale = Math.max(1, Math.sqrt(Math.max(1, unitScale)) * 0.75);
  let slot = 0;

  for (let t = 0; t < usable.length; t++) {
    const route = usable[t];
    const pts = route.pts;
    const len = route.len;
    const pad = Math.min(len * 0.08, Math.max(len * 0.04, 6));
    /* Longer runs get more traffic; always 2–10 skiers per trail. */
    const byLen = 2 + Math.round(8 * Math.min(1, len / Math.max(120, unitScale * 8)));
    const n = Math.max(2, Math.min(10, byLen));

    for (let k = 0; k < n; k++) {
      if (list.length >= MAX_RIDERS) break;
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
        along: pad + Math.max(1, len - pad * 2) * ((k + 0.15) / n),
        speed: (2.8 + rng(slot * 2.1 + t) * 4.6) * speedScale,
        phase: rng(slot * 7.3) * Math.PI * 2,
        /* Offset off the ribbon centerline; weave a few feet side-to-side. */
        bias: lane * Math.min(7.5, Math.max(2.5, unitScale * 0.22)),
        amp: 1.4 + rng(slot * 4.4) * 2.4,
        wave: 16 + rng(slot * 5.2) * 30,
        board,
      });
      slot += 1;
    }
    if (list.length >= MAX_RIDERS) break;
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

function sampleAlongPolyline(pts, step) {
  if (!pts || pts.length < 2) return [];
  const out = [];
  let dist = 0;
  let next = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = a.distanceTo(b);
    if (seg < 1e-4) continue;
    while (next <= dist + seg) {
      const t = (next - dist) / seg;
      out.push(new THREE.Vector3().lerpVectors(a, b, t));
      next += step;
    }
    dist += seg;
  }
  if (!out.length) out.push(pts[0].clone());
  const last = pts[pts.length - 1];
  if (out[out.length - 1].distanceTo(last) > step * 0.25) out.push(last.clone());
  return out;
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

  const towerBases = [];
  const gondolaTowerBases = [];
  const cablePolylines = [];
  const chairLines = [];
  const gondolaLines = [];
  const surfaceRibbons = [];
  let aerialCount = 0;
  const MAX_AERIAL = 36;
  const MAX_CHAIRS = 96;
  const chairSpeed = 4.4 * Math.max(1, Math.sqrt(Math.max(1, s)));
  const gondolaSpeed = 3.2 * Math.max(1, Math.sqrt(Math.max(1, s)));

  for (const feature of features) {
    const aw = featureAerialway(feature);
    const surface = isSurfaceLift(aw);
    const gondola = isGondolaLift(aw);
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
      for (const coord of downsampleLine(coords, 14)) {
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
      aerialCount += 1;

      const liftLen = polylineLen(ground);
      const useCableH = gondola ? gondolaCableH : cableH;
      const cable = buildAerialCable(ground, useCableH, stationH, Math.max(18, liftLen / 28));
      if (cable.length >= 2) {
        cablePolylines.push(cable);
        const cableLen = polylineLen(cable);
        const a = cable[0];
        const b = cable[cable.length - 1];
        const pts = a.y <= b.y ? cable : cable.slice().reverse();
        if (gondola) {
          if (cableLen > 20) gondolaLines.push({ pts, len: cableLen });
        } else if (cableLen > chairStep * 0.5) {
          chairLines.push({ pts, len: cableLen });
        }
      }

      if (gondola) {
        /* Terminal pylons only — no mid-span towers. */
        for (const end of [ground[0], ground[ground.length - 1]]) {
          const neighbor =
            end === ground[0]
              ? ground[Math.min(1, ground.length - 1)]
              : ground[Math.max(0, ground.length - 2)];
          const along = new THREE.Vector3().subVectors(neighbor, end);
          along.y = 0;
          if (along.lengthSq() < 1e-6) along.set(1, 0, 0);
          else along.normalize();
          gondolaTowerBases.push({ p: end, tan: along });
        }
      } else {
        const towers = sampleAlongPolyline(ground, towerStep);
        for (let i = 0; i < towers.length; i++) {
          const p = towers[i];
          /* No mid-line towers at the terminals — cable drops to boarding height there. */
          const tApprox = towers.length <= 1 ? 0.5 : i / (towers.length - 1);
          if (tApprox < 0.1 || tApprox > 0.9) continue;
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

  /* Cables as thin tubes along each lift. */
  for (const cable of cablePolylines) {
    if (cable.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(cable);
    const segs = Math.min(48, Math.max(8, cable.length * 2));
    const tube = new THREE.TubeGeometry(curve, segs, Math.max(0.03 * s, 0.04), 4, false);
    const mesh = new THREE.Mesh(tube, cableMat);
    mesh.frustumCulled = false;
    group.add(mesh);
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
  for (const line of chairLines) {
    const n = Math.max(3, Math.min(14, Math.round(line.len / chairStep)));
    for (let k = 0; k < n; k++) {
      if (chairList.length >= MAX_CHAIRS) break;
      chairList.push({
        pts: line.pts,
        len: line.len,
        along: (line.len * (k + 0.12)) / n,
        speed: chairSpeed,
      });
    }
    if (chairList.length >= MAX_CHAIRS) break;
  }

  const gondolaList = [];
  for (const line of gondolaLines) {
    const n = Math.max(2, Math.min(3, Math.round(line.len / Math.max(280, line.len / 2.5))));
    for (let k = 0; k < n; k++) {
      gondolaList.push({
        pts: line.pts,
        len: line.len,
        along: (line.len * (k + 0.2)) / Math.max(1, n),
        speed: gondolaSpeed,
      });
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
  return { group, chairAnim, gondolaAnim };
}

function updateLiftChairs(pack, dt) {
  if (!pack?.list?.length) return;
  const { hangers, seats, backs, list, hangerLen, m, q, sc, forward, seatPos, cablePos, zAxis } = pack;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (dt > 0) {
      c.along += c.speed * dt;
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
  box.frustumCulled = false;
  group.add(box);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.06, Math.max(0.35 * (h / 6), h * 0.14), d * 1.06),
    roofMat,
  );
  roof.position.set(cx, y0 + h + Math.max(0.2, h * 0.08), cz);
  roof.rotation.y = yaw;
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
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
  });
  const s = unitScale * BUILDING_SHRINK;

  let count = 0;
  for (const feature of features) {
    if (count >= MAX_BUILDINGS) break;
    for (const ring of ringParts(feature.geometry)) {
      if (!ring || ring.length < 3) continue;
      const xs = [];
      const zs = [];
      let ySum = 0;
      let yN = 0;
      for (const coord of ring) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        xs.push(x);
        zs.push(z);
        const y = sample(x, z);
        if (y != null) {
          ySum += y;
          yN += 1;
        }
      }
      if (yN < 1) continue;
      const cx = (Math.min(...xs) + Math.max(...xs)) * 0.5;
      const cz = (Math.min(...zs) + Math.max(...zs)) * 0.5;
      if (clipRing?.length && !insideIslandRing(cx, cz, clipRing)) continue;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const footW = Math.max(4, maxX - minX);
      const footD = Math.max(4, maxZ - minZ);
      if (footW > 80 || footD > 80) continue;
      const w = Math.min(footW, 24) * s;
      const d = Math.min(footD, 24) * s;
      const h = Math.max(3.5, Math.min(11, Math.sqrt(footW * footD) * 0.32)) * s;
      const yaw = rng(count * 7.1) * 0.15;
      addClayBuilding(
        group,
        cx,
        cz,
        ySum / yN,
        w,
        d,
        h,
        yaw,
        wallMat,
        roofMat,
      );
      count += 1;
      if (count >= MAX_BUILDINGS) break;
    }
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
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
  });
  const s = unitScale * BUILDING_SHRINK;

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
      addClayBuilding(group, x, z, y, w, d, h, rng(seed) * Math.PI * 0.25, wallMat, roofMat);
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
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
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
  const radius = Math.max(size.x, size.z) * 0.5;
  if (!Number.isFinite(radius) || radius < 1) {
    return { center: fallback.clone(), radius: 48 };
  }
  return { center, radius };
}

export async function initHeroMontageMap(container, options = {}) {
  if (!container) return null;

  const preferredId = options.resortId ? String(options.resortId) : "";
  const lockResort = Boolean(options.lockResort || preferredId);

  const embed = container.closest(".hero-montage-embed") || container;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
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
  let liftChairs = null;
  let liftGondolas = null;
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
    const { center, radius } = bounds;
    const targetY = center.y * 0.35;
    const dist = Math.max(1, radius * 1.72);
    const elev = center.y + radius * 0.95;
    polar = THREE.MathUtils.clamp(Math.atan2(elev - targetY, dist), POLAR_MIN, POLAR_MAX);
    az = 0.55;
    zoom = 1;
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
      liftChairs = null;
      liftGondolas = null;
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
        /* ~4 m lip is fine; anything farther snaps to the buffer rim. */
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

      bounds = boundsFromObject(root, new THREE.Vector3(0, 14, 0));
      syncOrbitFromBounds();

      liftChairs = null;
      liftGondolas = null;
      trailRiders = null;
      clearGroup(decor);
      const trails = osm.routes
        ? addTrails(decor, osm.routes, center, sample, unitScale, clipRing)
        : addProceduralTrails(decor, sample);
      if (osm.lifts) {
        const liftPack = addLifts(decor, osm.lifts, center, sample, unitScale, clipRing);
        liftChairs = liftPack?.chairAnim || null;
        liftGondolas = liftPack?.gondolaAnim || null;
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
    const targetY = center.y * 0.35;
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
    if (liftChairs) updateLiftChairs(liftChairs, motionDt);
    if (liftGondolas) updateLiftChairs(liftGondolas, motionDt);
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

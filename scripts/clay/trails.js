/**
 * Ski trail classification, geometry generation, ribbon draping, and styling.
 */

import * as THREE from "three";
import { TRAIL_WIDTH, TRAIL_STYLES, MAX_TRAILS } from "./config.js";
import {
  localXZ,
  lineParts,
  downsampleLine,
  clipPointRuns,
  smoothTrailPts,
} from "./math-utils.js";

export const CLAY_TRAIL_SCHEMES = ["american", "european", "japanese"];
export const CLAY_TRAIL_SCHEME_LABELS = {
  american: "American",
  european: "European",
  japanese: "Japanese",
};

const CLAY_TRAIL_COLORS = {
  green: TRAIL_STYLES.green,
  blue: TRAIL_STYLES.blue,
  red: { color: 0xef4444, emissive: 0xdc2626, intensity: 0.11, key: "red" },
  black: TRAIL_STYLES.black,
  orange: { color: 0xf97316, emissive: 0xea580c, intensity: 0.11, key: "orange" },
  yellow: { color: 0xeab308, emissive: 0xca8a04, intensity: 0.1, key: "yellow" },
  gray: { color: 0x94a3b8, emissive: 0x64748b, intensity: 0.06, key: "gray" },
};

const CLAY_TRAIL_SCHEME_KEYS = {
  american: {
    green: "green",
    blue: "blue",
    black: "black",
  },
  european: {
    green: "green",
    blue: "red",
    black: "black",
  },
  japanese: {
    green: "green",
    blue: "red",
    black: "black",
  },
};

let clayTrailScheme = "american";

export function getClayTrailScheme() {
  return clayTrailScheme;
}

export function loadClayTrailScheme() {
  try {
    const stored = localStorage.getItem("gsa-diff-scheme");
    if (CLAY_TRAIL_SCHEMES.includes(stored)) clayTrailScheme = stored;
  } catch {
    /* ignore */
  }
  return clayTrailScheme;
}

export function setClayTrailScheme(scheme) {
  if (!CLAY_TRAIL_SCHEMES.includes(scheme)) return clayTrailScheme;
  clayTrailScheme = scheme;
  try {
    localStorage.setItem("gsa-diff-scheme", scheme);
  } catch {
    /* ignore */
  }
  return clayTrailScheme;
}

export function appendRibbon(positions, pts, width) {
  if (!pts || pts.length < 2) return;
  const half = width * 0.5;
  const up = new THREE.Vector3(0, 1, 0);
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

export function meshFromPositions(positions, mat) {
  if (positions.length < 9) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function gamePoint(east, north, center, sample, lift = 0.9) {
  const { x, z } = localXZ(east, north, center);
  const y = sample(x, z);
  if (y == null) return null;
  return new THREE.Vector3(x, y + lift, z);
}

export function difficultyBucket(raw) {
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

export function featureDifficulty(feature) {
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

export function featureOtherTagsBlob(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  return String(tags.other_tags || props.other_tags || "");
}

export function featureOsmWayId(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  if (tags.osm_way_id != null && String(tags.osm_way_id).trim()) return String(tags.osm_way_id);
  const id = String(props.id || "");
  const m = /way:(\d+)/.exec(id) || /:(\d+)$/.exec(id);
  return m ? m[1] : "";
}

export function isPisteAreaOutline(feature) {
  const type = feature?.geometry?.type;
  if (type === "Polygon" || type === "MultiPolygon") return true;
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  const other = featureOtherTagsBlob(feature);
  if (tags.area === "yes" || /"area"=>"yes"/.test(other)) return true;
  const natural = String(tags.natural || props.natural || "").toLowerCase();
  return natural === "grassland" || natural === "grass" || natural === "fell" || natural === "scrub";
}

export function isSkiRouteCenterline(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  if (String(tags.route || "").toLowerCase() === "ski") return true;
  return /"route"=>"ski"/.test(featureOtherTagsBlob(feature));
}

export function trailGeomScore(feature) {
  const id = String(feature?.properties?.id || "");
  let n = 0;
  for (const coords of lineParts(feature?.geometry)) n += coords?.length || 0;
  return (id.includes("way:") ? 1000 : 0) + n;
}

export function featurePisteType(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
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

export function isSnowParkFeature(feature) {
  const t = featurePisteType(feature);
  if (t === "snow_park" || t === "terrain_park" || t === "snowpark") return true;
  const name = String(feature?.properties?.name || "").toLowerCase();
  return /\b(terrain\s*park|snow\s*park|rail\s*(fun\s*)?park|half[\s-]?pipe)\b/.test(name);
}

export function selectTrailCenterlines(features) {
  const lines = (features || []).filter(
    (f) => lineParts(f.geometry).length && !isPisteAreaOutline(f) && !isSnowParkFeature(f),
  );
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

export function trailStyle(difficulty, scheme = clayTrailScheme) {
  const raw = String(difficulty || "").toLowerCase().trim();
  if (!raw || raw === "unrated" || raw === "unknown" || raw === "undefined") return CLAY_TRAIL_COLORS.gray;
  if (scheme === "european") {
    if (raw.includes("freeride")) return CLAY_TRAIL_COLORS.yellow;
    if (raw === "double_black" || raw === "double black" || raw === "black") return CLAY_TRAIL_COLORS.black;
    if (raw === "green" || raw === "beginner" || raw === "novice" || raw === "learning") return CLAY_TRAIL_COLORS.green;
    if (raw === "blue" || raw === "easy") return CLAY_TRAIL_COLORS.blue;
    if (raw === "red" || raw === "intermediate" || raw === "medium") return CLAY_TRAIL_COLORS.red;
    if (raw.includes("expert") || raw.includes("extreme")) return CLAY_TRAIL_COLORS.orange;
    if (raw.includes("advanced") || raw.includes("difficult") || raw === "very_difficult") return CLAY_TRAIL_COLORS.black;
  }
  if (scheme === "japanese") {
    if (raw === "green" || raw === "beginner" || raw === "novice" || raw === "learning" || raw === "easy") {
      return CLAY_TRAIL_COLORS.green;
    }
    if (raw === "red" || raw === "intermediate" || raw === "medium" || raw === "blue") return CLAY_TRAIL_COLORS.red;
    if (raw === "black" || raw === "double_black" || raw === "double black") return CLAY_TRAIL_COLORS.black;
    if (raw.includes("advanced") || raw.includes("expert") || raw.includes("extreme") || raw.includes("freeride") || raw === "very_difficult") {
      return CLAY_TRAIL_COLORS.black;
    }
  }
  const sourceKey = difficultyBucket(difficulty);
  const key = CLAY_TRAIL_SCHEME_KEYS[scheme]?.[sourceKey] || sourceKey;
  return CLAY_TRAIL_COLORS[key] || CLAY_TRAIL_COLORS.blue;
}

export function ensureDownhillPath(pts) {
  if (!pts || pts.length < 2) return pts || [];
  return pts[0].y >= pts[pts.length - 1].y ? pts : pts.slice().reverse();
}

export function addTrails(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const group = new THREE.Group();
  group.name = "montage-trails";
  const buckets = {
    green: [],
    blue: [],
    black: [],
    red: [],
    orange: [],
    yellow: [],
    gray: [],
  };
  const features = selectTrailCenterlines(featureCollection?.features || []);
  const stride = Math.max(1, Math.ceil(features.length / MAX_TRAILS));
  const width = TRAIL_WIDTH * unitScale;
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
      for (const run of clipPointRuns(smoothTrailPts(pts, 1), clipRing)) {
        appendRibbon(buckets[style.key], run, width);
      }
      for (const run of clipPointRuns(smoothTrailPts(ridePts, 1), clipRing)) {
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

export function addProceduralTrails(parent, sample) {
  const group = new THREE.Group();
  group.name = "montage-trails-proc";
  const paths = [
    { key: "black", pts: [[-8, 36], [2, 28], [10, 18], [14, 8], [8, 2]] },
    { key: "black", pts: [[12, 34], [18, 24], [22, 14], [16, 4]] },
    { key: "green", pts: [[-22, 22], [-14, 14], [-6, 8], [0, 2]] },
    { key: "green", pts: [[-4, 30], [-10, 20], [-16, 10], [-12, 2]] },
    { key: "blue", pts: [[6, 32], [0, 22], [-4, 12], [2, 3]] },
  ];
  const buckets = { green: [], blue: [], black: [], red: [], orange: [], yellow: [], gray: [] };
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

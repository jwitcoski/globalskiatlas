/**
 * Homepage hero map — Montage Mountain as a clay / isometric floating island.
 * Loads real DEM mesh + OSM vectors from game_scenes. No legend.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const RESORT = {
  id: "montage_mountain_pa",
  ver: "v0-107b3a77b75f",
  name: "Montage Mountain",
};

const S3_SCENES =
  "https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/game_scenes/";
const CF_SCENES = "https://globalskiatlas.com/game_scenes/";

const HERO_SPAN = 100;
const MAX_TREES = 900;
const MAX_BUILDINGS = 48;
const TRAIL_RADIUS = 2.6;

/** Clay-model palette (matches reference: orange / chartreuse trails, forest green trees). */
const PALETTE = {
  bg: 0xffffff,
  snow: 0xffffff,
  snowShade: 0xd2e4f2,
  rock: 0x9aabbc,
  tree: 0x1a5534,
  treeDeep: 0x123f26,
  trunk: 0x5a4030,
  building: 0xa9b7c5,
  buildingRoof: 0x8fa0b0,
  water: 0x2aa6e0,
  trailWarm: 0xf07828,
  trailWarmEm: 0xea580c,
  trailLime: 0xc4d84a,
  trailLimeEm: 0xa3bf2a,
  lift: 0x6b7785,
  cable: 0x4b5563,
};

function isLocalDev() {
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function sceneRoot() {
  if (isLocalDev()) return new URL(`/game_scenes/${RESORT.id}/${RESORT.ver}/`, location.origin);
  const host = location.hostname;
  const base =
    host === "globalskiatlas.com" || host === "www.globalskiatlas.com" ? CF_SCENES : S3_SCENES;
  return new URL(`${RESORT.id}/${RESORT.ver}/`, base);
}

function capDpr() {
  return Math.min(window.devicePixelRatio || 1, 1.6);
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

function shadeSnowMesh(mesh) {
  const geo = mesh.geometry;
  if (!geo?.attributes?.position) return;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const white = new THREE.Color(PALETTE.snow);
  const shade = new THREE.Color(PALETTE.snowShade);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = Math.abs(nrm.getY(i));
    /* Flatter = brighter snow; steeper faces pick up cool blue shade. */
    const t = THREE.MathUtils.clamp(1 - ny * 1.15, 0, 1);
    c.copy(white).lerp(shade, t * 0.85);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

function boundsFromFeatures(featureCollection, center, pad = 40) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let hits = 0;
  for (const feature of featureCollection?.features || []) {
    const parts = [
      ...lineParts(feature.geometry),
      ...ringParts(feature.geometry),
    ];
    if (feature.geometry?.type === "Point") parts.push([feature.geometry.coordinates]);
    for (const part of parts) {
      for (const coord of part || []) {
        if (!coord || coord.length < 2) continue;
        const { x, z } = localXZ(coord[0], coord[1], center);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
        hits += 1;
      }
    }
  }
  if (!hits) return null;
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
  };
}

function cropTerrainToBounds(mesh, localBounds, center) {
  if (!localBounds || !mesh?.geometry?.attributes?.position || !center) return;
  const pos = mesh.geometry.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  /* Mesh vertices stay in absolute game space; mesh.position shifts the group. */
  const minX = localBounds.minX + center.x;
  const maxX = localBounds.maxX + center.x;
  const minZ = localBounds.minZ + center.z;
  const maxZ = localBounds.maxZ + center.z;
  const sink = minY - 80;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (x < minX || x > maxX || z < minZ || z > maxZ) {
      pos.setY(i, sink);
    }
  }
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  shadeSnowMesh(mesh);
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

function localXZ(east, north, center) {
  return { x: east - center.x, z: -north - center.z };
}

function difficultyBucket(raw) {
  const d = String(raw || "").toLowerCase().trim();
  if (!d) return "mid";
  if (d.includes("novice") || d.includes("easy") || d === "beginner") return "easy";
  if (d.includes("advanced") || d.includes("expert") || d.includes("extreme") || d.includes("freeride")) {
    return "hard";
  }
  return "mid";
}

function trailStyle(difficulty) {
  const bucket = difficultyBucket(difficulty);
  if (bucket === "easy") {
    return { color: PALETTE.trailLime, emissive: PALETTE.trailLimeEm, intensity: 0.35 };
  }
  if (bucket === "hard") {
    return { color: PALETTE.trailWarm, emissive: PALETTE.trailWarmEm, intensity: 0.42 };
  }
  return { color: PALETTE.trailWarm, emissive: PALETTE.trailWarmEm, intensity: 0.28 };
}

function makeHeightSampler(root, terrainMesh) {
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, -1, 0);
  const worldDir = new THREE.Vector3();
  const hitLocal = new THREE.Vector3();
  return (x, z) => {
    origin.set(x, 4000, z);
    root.localToWorld(origin);
    worldDir.copy(dir).transformDirection(root.matrixWorld).normalize();
    ray.set(origin, worldDir);
    const hits = ray.intersectObject(terrainMesh, false);
    if (!hits.length) return null;
    hitLocal.copy(hits[0].point);
    root.worldToLocal(hitLocal);
    return hitLocal.y;
  };
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
  const geo = new THREE.CircleGeometry(radius * 0.72, 48);
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

function addIslandUnderside(parent, terrainMesh) {
  const box = new THREE.Box3().setFromObject(terrainMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const geo = new THREE.CylinderGeometry(
    Math.max(size.x, size.z) * 0.42,
    Math.max(size.x, size.z) * 0.18,
    Math.max(14, size.y * 0.45),
    28,
    1,
    true,
  );
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(center.x, box.min.y - Math.max(7, size.y * 0.18), center.z);
  mesh.name = "montage-underside";
  parent.add(mesh);
  return mesh;
}

function gamePoint(east, north, center, sample, lift = 0.9) {
  const { x, z } = localXZ(east, north, center);
  const y = sample(x, z);
  if (y == null) return null;
  return new THREE.Vector3(x, y + lift, z);
}

function addTrails(parent, featureCollection, center, sample) {
  const group = new THREE.Group();
  group.name = "montage-trails";
  group.frustumCulled = false;

  for (const feature of featureCollection?.features || []) {
    const style = trailStyle(feature.properties?.piste_difficulty);
    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of coords) {
        const p = gamePoint(coord[0], coord[1], center, sample, 1.1);
        if (p) pts.push(p);
      }
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts);
      const segs = Math.min(56, Math.max(10, pts.length * 2));
      const tube = new THREE.TubeGeometry(curve, segs, TRAIL_RADIUS, 5, false);
      const mat = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: style.intensity,
        roughness: 0.45,
        metalness: 0.02,
      });
      const mesh = new THREE.Mesh(tube, mat);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }
  parent.add(group);
  return group;
}

function sampleAlongPolyline(pts, step) {
  if (!pts || pts.length < 2) return [];
  const out = [];
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
  return out;
}

function addLifts(parent, featureCollection, center, sample, worldSpan) {
  const group = new THREE.Group();
  group.name = "montage-lifts";
  group.frustumCulled = false;
  const towerH = Math.max(18, worldSpan * 0.012);
  const cableH = towerH * 0.88;
  const step = Math.max(90, worldSpan * 0.055);
  const cableMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cable,
    metalness: 0.4,
    roughness: 0.55,
  });
  const poleMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lift,
    metalness: 0.5,
    roughness: 0.48,
  });
  const poleGeo = new THREE.CylinderGeometry(0.85, 1.05, towerH, 6);
  poleGeo.translate(0, towerH / 2, 0);
  const towerPts = [];

  for (const feature of featureCollection?.features || []) {
    for (const coords of lineParts(feature.geometry)) {
      const ground = [];
      for (const coord of coords) {
        const p = gamePoint(coord[0], coord[1], center, sample, 0);
        if (p) ground.push(p);
      }
      if (ground.length < 2) continue;
      const cable = ground.map((p) => new THREE.Vector3(p.x, p.y + cableH, p.z));
      const curve = new THREE.CatmullRomCurve3(cable);
      const segs = Math.min(64, Math.max(8, cable.length * 3));
      const cableMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segs, Math.max(0.4, worldSpan * 0.00035), 5, false),
        cableMat,
      );
      cableMesh.frustumCulled = false;
      group.add(cableMesh);
      towerPts.push(ground[0], ground[ground.length - 1], ...sampleAlongPolyline(ground, step));
    }
  }

  if (towerPts.length) {
    const stride = Math.max(1, Math.ceil(towerPts.length / 90));
    const picked = towerPts.filter((_, i) => i % stride === 0).slice(0, 90);
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, picked.length);
    poles.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < picked.length; i++) {
      m.compose(picked[i], q, s);
      poles.setMatrixAt(i, m);
    }
    poles.instanceMatrix.needsUpdate = true;
    group.add(poles);
  }

  parent.add(group);
  return group;
}

function addTrees(parent, featureCollection, center, sample) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;

  const positions = [];
  let seed = 0;
  for (let i = 0; i < features.length; i++) {
    const geom = features[i].geometry;
    const coords = [];
    if (geom?.type === "Point") coords.push(geom.coordinates);
    else if (geom?.type === "MultiPoint") coords.push(...(geom.coordinates || []));
    for (const coord of coords) {
      if (!coord || coord.length < 2) continue;
      /* Cluster a few cones around each OSM forest point for the dense clay look. */
      const cluster = 5 + Math.floor(rng(seed * 1.7) * 5);
      for (let k = 0; k < cluster; k++) {
        const jitter = 8 + rng(seed * 3.3 + k) * 16;
        const ang = rng(seed * 8.1 + k * 2.2) * Math.PI * 2;
        const east = coord[0] + Math.cos(ang) * jitter;
        const north = coord[1] + Math.sin(ang) * jitter;
        const { x, z } = localXZ(east, north, center);
        const y = sample(x, z);
        if (y == null) continue;
        positions.push({
          x,
          y,
          z,
          rot: rng(seed * 5.1 + k) * Math.PI * 2,
          scale: 0.8 + rng(seed * 2.3 + k) * 0.6,
        });
        seed += 1;
      }
    }
  }
  if (!positions.length) return null;

  const stride = Math.max(1, Math.ceil(positions.length / MAX_TREES));
  const picked = positions.filter((_, i) => i % stride === 0).slice(0, MAX_TREES);

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.0, 5);
  const crownGeo = new THREE.ConeGeometry(1.15, 2.8, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tree,
    roughness: 0.88,
    flatShading: true,
  });
  const deepMat = new THREE.MeshStandardMaterial({
    color: PALETTE.treeDeep,
    roughness: 0.9,
    flatShading: true,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, picked.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, picked.length);
  const crownsDeep = new THREE.InstancedMesh(crownGeo, deepMat, picked.length);
  trunks.frustumCulled = false;
  crowns.frustumCulled = false;
  crownsDeep.frustumCulled = false;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < picked.length; i++) {
    const t = picked[i];
    const sc = t.scale * 1.85;
    q.setFromAxisAngle(up, t.rot);
    p.set(t.x, t.y, t.z);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);

    p.y = t.y + 1.55 * sc;
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    crowns.setMatrixAt(i, m);

    p.y = t.y + 2.55 * sc;
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
  parent.add(group);
  return group;
}

function addBuildings(parent, featureCollection, center, sample) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;

  const group = new THREE.Group();
  group.name = "montage-buildings";
  group.frustumCulled = false;
  const wallMat = new THREE.MeshStandardMaterial({
    color: PALETTE.building,
    roughness: 0.86,
    metalness: 0.05,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: PALETTE.buildingRoof,
    roughness: 0.8,
    flatShading: true,
  });

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
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const w = Math.max(4, maxX - minX);
      const d = Math.max(4, maxZ - minZ);
      if (w > 120 || d > 120) continue;
      const h = Math.max(6, Math.min(18, Math.sqrt(w * d) * 0.35));
      const y0 = ySum / yN;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      box.position.set((minX + maxX) / 2, y0 + h * 0.5, (minZ + maxZ) / 2);
      box.frustumCulled = false;
      group.add(box);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, Math.max(1.2, h * 0.12), d * 1.04), roofMat);
      roof.position.set(box.position.x, y0 + h + 0.6, box.position.z);
      roof.frustumCulled = false;
      group.add(roof);
      count += 1;
      if (count >= MAX_BUILDINGS) break;
    }
  }

  if (!group.children.length) return null;
  parent.add(group);
  return group;
}

function addWaterPatches(parent, featureCollection, center, sample) {
  const features = featureCollection?.features || [];
  if (!features.length) return null;
  const group = new THREE.Group();
  group.name = "montage-water";
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.35,
    metalness: 0.08,
    emissive: 0x0a6fa8,
    emissiveIntensity: 0.15,
  });

  let n = 0;
  for (const feature of features) {
    const geom = feature.geometry;
    let cx;
    let cz;
    if (geom?.type === "Point") {
      cx = geom.coordinates[0];
      cz = geom.coordinates[1];
    } else if (geom?.type === "LineString" && geom.coordinates?.length) {
      const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
      cx = mid[0];
      cz = mid[1];
    } else {
      const rings = ringParts(geom);
      if (!rings.length) continue;
      const ring = rings[0];
      let sx = 0;
      let sz = 0;
      for (const c of ring) {
        sx += c[0];
        sz += c[1];
      }
      cx = sx / ring.length;
      cz = sz / ring.length;
    }
    const { x, z } = localXZ(cx, cz, center);
    const y = sample(x, z);
    if (y == null) continue;
    const r = 6 + rng(n * 3.1) * 10;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20), mat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, y + 0.8, z);
    disc.frustumCulled = false;
    group.add(disc);
    n += 1;
    if (n >= 8) break;
  }
  if (!group.children.length) return null;
  parent.add(group);
  return group;
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

async function loadMontageScene(base) {
  const manifest = await fetchJson(new URL("scene-manifest.json", base));
  const meshUrl = new URL(manifest.terrain.mesh, base);
  const routesUrl = new URL(manifest.vectors.route_centers || "vectors/route-centers.geojson", base);
  const liftsUrl = new URL(manifest.vectors.lifts || "vectors/lifts.geojson", base);
  const forestUrl = new URL(manifest.vectors.forest || "vectors/forest.geojson", base);
  const buildingsUrl = new URL(manifest.vectors.buildings || "vectors/buildings.geojson", base);
  const waterUrl = new URL(manifest.vectors.water || "vectors/water.geojson", base);
  const skiAreaUrl = new URL(manifest.vectors.ski_area || "vectors/ski-area.geojson", base);

  const [gltf, routes, lifts, forest, buildings, water, skiArea] = await Promise.all([
    getGltfLoader().loadAsync(meshUrl.href),
    fetchJson(routesUrl),
    fetchJson(liftsUrl),
    fetchJson(forestUrl).catch(() => null),
    fetchJson(buildingsUrl).catch(() => null),
    fetchJson(waterUrl).catch(() => null),
    fetchJson(skiAreaUrl).catch(() => null),
  ]);

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (!mesh) mesh = child;
    shadeSnowMesh(child);
    child.castShadow = false;
    child.receiveShadow = true;
  });
  if (!mesh) throw new Error("terrain mesh missing");

  const fitted = fitTerrainRoot(mesh);
  return {
    ...fitted,
    routes,
    lifts,
    forest,
    buildings,
    water,
    skiArea,
  };
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d0e6, 1.15));
  const key = new THREE.DirectionalLight(0xfff8f0, 0.85);
  key.position.set(60, 140, 30);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ec5ea, 0.7);
  fill.position.set(-70, 50, -40);
  scene.add(fill);
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

export async function initHeroMontageMap(container) {
  if (!container) return null;

  const embed = container.closest(".hero-montage-embed") || container;
  embed.classList.add("is-loading");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.bg);
  scene.fog = new THREE.Fog(PALETTE.bg, 110, 210);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(capDpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.appendChild(renderer.domElement);

  addLights(scene);

  const world = new THREE.Group();
  world.name = "montage-world";
  scene.add(world);

  let bounds = { center: new THREE.Vector3(0, 12, 0), radius: 48 };
  let running = true;
  let angle = 0.55;
  let lastT = performance.now();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    const r = radius * 1.72;
    const elev = center.y + radius * 0.95;
    const bob = reduceMotion ? 0 : Math.sin(t * 0.35) * radius * 0.012;
    camera.position.set(
      center.x + Math.cos(angle) * r,
      elev + bob,
      center.z + Math.sin(angle) * r,
    );
    camera.lookAt(center.x, center.y * 0.35, center.z);
  }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!reduceMotion) angle += dt * 0.12;
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

  try {
    const loaded = await loadMontageScene(sceneRoot());
    const { root, center, mesh, routes, lifts, forest, buildings, water, skiArea } = loaded;
    const decor = new THREE.Group();
    decor.name = "montage-decor";
    root.add(decor);
    world.add(root);

    const focusBounds =
      boundsFromFeatures(skiArea, center, 90) ||
      boundsFromFeatures(routes, center, 70);
    if (focusBounds) cropTerrainToBounds(mesh, focusBounds, center);

    root.updateMatrixWorld(true);
    const sample = makeHeightSampler(root, mesh);
    addIslandUnderside(root, mesh);
    addSoftShadow(root, HERO_SPAN * 0.48);
    if (routes) addTrails(decor, routes, center, sample);
    if (lifts) addLifts(decor, lifts, center, sample, HERO_SPAN);
    if (forest) addTrees(decor, forest, center, sample);
    if (buildings) addBuildings(decor, buildings, center, sample);
    if (water) addWaterPatches(decor, water, center, sample);

    bounds = boundsFromObject(root, new THREE.Vector3(0, 14, 0));
    if (focusBounds) {
      const s = root.scale.x || 1;
      const cx = ((focusBounds.minX + focusBounds.maxX) * 0.5) * s;
      const cz = ((focusBounds.minZ + focusBounds.maxZ) * 0.5) * s;
      const rx = ((focusBounds.maxX - focusBounds.minX) * 0.5) * s;
      const rz = ((focusBounds.maxZ - focusBounds.minZ) * 0.5) * s;
      bounds = {
        center: new THREE.Vector3(cx, bounds.center.y, cz),
        radius: Math.max(rx, rz, 28),
      };
    }
    embed.classList.remove("is-loading");
    embed.classList.add("is-ready");
  } catch (err) {
    console.warn("[hero-montage-map] failed to load Montage scene", err);
    embed.classList.remove("is-loading");
  }

  return () => {
    running = false;
    observer.disconnect();
    window.removeEventListener("resize", resize);
    disposeObject(world);
    renderer.dispose();
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
  };
}

const mount = document.getElementById("hero-montage-stage");
if (mount) initHeroMontageMap(mount);

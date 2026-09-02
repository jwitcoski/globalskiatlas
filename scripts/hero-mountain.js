/**
 * Homepage hero — bright procedural trees on instant placeholder terrain,
 * then upgrades to exported Montage mesh + OSM piste/lift vectors.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const FOG = 0xc5dff0;
const HOMEPAGE_CATALOG_URL = "/homepage_scene/catalog.json";
const DEFAULT_HERO_RESORT = {
  id: "montage_mountain_pa",
  display_name: "Montage Mountain",
  playable_ver: "v0-107b3a77b75f",
};
const HERO_SPAN = 92;
const TRAIL_TUBE_RADIUS = 7;
const TREE_COUNT = 260;
const LIFT_MAX_TOWERS = 120;
const TREE_UNIT_SCALE = 1.15;
const TREE_SIZE = 0.5;

const TRAIL_COLORS = {
  novice: { color: 0x22c55e, emissive: 0x16a34a },
  easy: { color: 0x22c55e, emissive: 0x16a34a },
  intermediate: { color: 0x3b82f6, emissive: 0x2563eb },
  advanced: { color: 0x171717, emissive: 0x404040 },
  expert: { color: 0x171717, emissive: 0x404040 },
  freeride: { color: 0xeab308, emissive: 0xca8a04 },
  extreme: { color: 0xeab308, emissive: 0xca8a04 },
  unrated: { color: 0x94a3b8, emissive: 0x64748b },
};

function capDpr() {
  return Math.min(window.devicePixelRatio || 1, 1.75);
}

function rng(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function mountainHeight(x, z) {
  const peak = Math.exp(-((x - 5) ** 2 + (z + 11) ** 2) / 110) * 48;
  const ridge = Math.exp(-((x + 16) ** 2) / 80 - (z + 1) ** 2 / 150) * 26;
  const bowl = Math.exp(-((x - 22) ** 2 + (z + 6) ** 2) / 260) * -5;
  const ripple = Math.sin(x * 0.1) * 1.6 + Math.cos(z * 0.08) * 1.3;
  return 5 + peak + ridge + bowl + ripple;
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

function snowMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xfaf9f6,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

function addSky(scene) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 20, 10),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x4ea6e0) },
        uHorizon: { value: new THREE.Color(0xd7ebf7) },
      },
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 uTop,uHorizon;
        void main(){ float h=clamp(vDir.y*0.5+0.5,0.,1.); gl_FragColor=vec4(mix(uHorizon,uTop,pow(h,1.12)),1.); }`,
    }),
  );
  sky.frustumCulled = false;
  scene.add(sky);
  return sky;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xf0f7ff, 0xe8efe8, 1.35));
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.5);
  sun.position.set(90, 140, 60);
  scene.add(sun);
}

function buildProceduralTerrain(parent, sample) {
  const size = HERO_SPAN;
  const segs = 72;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) - 5;
    const z = pos.getZ(i) + 7;
    pos.setY(i, sample(x, z));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, snowMaterial());
  mesh.name = "hero-terrain";
  parent.add(mesh);
  return mesh;
}

function difficultyKey(raw) {
  const d = String(raw || "").toLowerCase().trim();
  if (!d) return "unrated";
  if (d.includes("novice") || d === "learning") return "novice";
  if (d.includes("easy") || d === "beginner") return "easy";
  if (d.includes("intermediate") || d === "medium") return "intermediate";
  if (d.includes("advanced") || d === "difficult") return "advanced";
  if (d.includes("expert") || d === "very_difficult") return "expert";
  if (d.includes("freeride") || d.includes("off_piste")) return "freeride";
  if (d.includes("extreme") || d.includes("freestyle")) return "extreme";
  return "unrated";
}

function trailStyleForFeature(feature) {
  const props = feature?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  let difficulty =
    tags["piste:difficulty"] ||
    tags.difficulty ||
    props["piste:difficulty"] ||
    props.piste_difficulty ||
    props.difficulty ||
    "";
  const other = String(tags.other_tags || props.other_tags || "");
  if (!difficulty) {
    const m = /piste:difficulty"=>"([^"]+)/.exec(other);
    if (m) difficulty = m[1];
  }
  return TRAIL_COLORS[difficultyKey(difficulty)] || TRAIL_COLORS.unrated;
}

function lineParts(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function geoToLocal(east, north, center) {
  return {
    x: east - center.x,
    z: -north - center.z,
  };
}

function gamePoint(east, north, center, sample, liftOffset = 0.35) {
  const { x, z } = geoToLocal(east, north, center);
  const y = sample(x, z);
  if (y == null) return null;
  return new THREE.Vector3(x, y + liftOffset, z);
}

function addOsmTrails(parent, featureCollection, center, sample) {
  const group = new THREE.Group();
  group.name = "hero-trails";
  group.frustumCulled = false;
  for (const feature of featureCollection?.features || []) {
    const style = trailStyleForFeature(feature);
    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of coords) {
        const p = gamePoint(coord[0], coord[1], center, sample);
        if (p) pts.push(p);
      }
      if (pts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(pts);
      const segs = Math.min(64, Math.max(12, pts.length * 2));
      const tube = new THREE.TubeGeometry(curve, segs, TRAIL_TUBE_RADIUS, 6, false);
      const mat = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: 0.78,
        roughness: 0.38,
        metalness: 0.04,
        depthTest: true,
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

function liftMetrics(span) {
  const towerH = Math.max(22, span * 0.015);
  return {
    towerH,
    cableH: towerH * 0.9,
    towerStep: Math.max(70, span * 0.048),
    cableRadius: Math.max(0.55, span * 0.00042),
    poleRadius: Math.max(0.7, span * 0.0011),
  };
}

function addOsmLifts(parent, featureCollection, center, sample, span) {
  const group = new THREE.Group();
  group.name = "hero-lifts";
  group.frustumCulled = false;
  const { towerH, cableH, towerStep, cableRadius, poleRadius } = liftMetrics(span);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.35, roughness: 0.55 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.55, roughness: 0.45 });
  const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius * 1.15, towerH, 6);
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
      const segs = Math.min(72, Math.max(10, cable.length * 3));
      const cableMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segs, cableRadius, 5, false),
        cableMat,
      );
      cableMesh.frustumCulled = false;
      group.add(cableMesh);

      const a = ground[0];
      const b = ground[ground.length - 1];
      const lineTan = new THREE.Vector3().subVectors(b, a);
      const skip = towerStep * 0.2;
      towerPts.push({ p: a, tangent: lineTan });
      towerPts.push({ p: b, tangent: lineTan });
      for (const p of sampleAlongPolyline(ground, towerStep)) {
        if (p.distanceTo(a) < skip || p.distanceTo(b) < skip) continue;
        towerPts.push({ p, tangent: lineTan });
      }
    }
  }

  if (towerPts.length) {
    const stride = Math.max(1, Math.ceil(towerPts.length / LIFT_MAX_TOWERS));
    const towers = towerPts.filter((_, i) => i % stride === 0).slice(0, LIFT_MAX_TOWERS);
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, towers.length);
    poles.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < towers.length; i++) {
      const { p } = towers[i];
      q.identity();
      m.compose(p, q, s);
      poles.setMatrixAt(i, m);
    }
    poles.count = towers.length;
    poles.instanceMatrix.needsUpdate = true;
    group.add(poles);
  }

  parent.add(group);
  return group;
}

function treeScaleForSpan(span) {
  return Math.max(1, span / HERO_SPAN) * TREE_UNIT_SCALE;
}

function makeTreeMeshes(count) {
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.1, 5);
  const crownGeo = new THREE.ConeGeometry(1.05, 2.6, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x16a34a,
    emissiveIntensity: 0.55,
    roughness: 0.78,
  });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);
  trunks.frustumCulled = false;
  crowns.frustumCulled = false;
  return { trunks, crowns, group: new THREE.Group() };
}

function placeTreeInstances(trunks, crowns, positions, treeScaleMul, m, q, s, p) {
  let n = 0;
  for (let i = 0; i < positions.length && n < trunks.count; i++) {
    const { x, y, z, rot, scale } = positions[i];
    const sc = (scale ?? 1) * treeScaleMul * TREE_SIZE;
    p.set(x, y, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot ?? 0);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(n, m);
    p.y += 1.55 * sc;
    m.compose(p, q, s);
    crowns.setMatrixAt(n, m);
    n++;
  }
  trunks.count = n;
  crowns.count = n;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  return n;
}

function addPlacedTrees(parent, treeFc, center, sample, span) {
  const group = new THREE.Group();
  group.name = "hero-trees";
  group.frustumCulled = false;
  const features = treeFc?.features || [];
  if (!features.length) return null;

  const treeScaleMul = treeScaleForSpan(span);
  const positions = [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const coord = f.geometry?.coordinates;
    if (!coord || coord.length < 2) continue;
    const { x, z } = geoToLocal(coord[0], coord[1], center);
    let y = f.properties?.elevation_m;
    if (y != null && center) y -= center.y;
    if (y == null) y = sample(x, z);
    if (y == null) continue;
    positions.push({
      x,
      y,
      z,
      rot: rng(i * 5.1) * Math.PI * 2,
      scale: 0.8 + rng(i * 2.3) * 0.55,
    });
  }
  if (!positions.length) return null;

  const { trunks, crowns } = makeTreeMeshes(positions.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  placeTreeInstances(trunks, crowns, positions, treeScaleMul, m, q, s, p);
  group.add(trunks, crowns);
  parent.add(group);
  return group;
}

function addTrees(parent, sample, limits = {}) {
  const group = new THREE.Group();
  group.name = "hero-trees";
  group.frustumCulled = false;
  const minY = limits.minY ?? 2.5;
  const maxY = limits.maxY ?? 42;
  const minX = limits.minX ?? -39;
  const maxX = limits.maxX ?? 39;
  const minZ = limits.minZ ?? -39;
  const maxZ = limits.maxZ ?? 39;
  const treeScaleMul = limits.treeScale ?? 1;
  const count = TREE_COUNT;
  const { trunks, crowns } = makeTreeMeshes(count);
  const positions = [];
  for (let i = 0; i < count * 2 && positions.length < count; i++) {
    const x = minX + rng(i * 3.7) * (maxX - minX);
    const z = minZ + rng(i * 9.1) * (maxZ - minZ);
    const y = sample(x, z);
    if (y == null || y > maxY || y < minY) continue;
    positions.push({
      x,
      y,
      z,
      rot: rng(i + 5) * Math.PI * 2,
      scale: 0.75 + rng(i + 2) * 0.65,
    });
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  placeTreeInstances(trunks, crowns, positions, treeScaleMul, m, q, s, p);
  group.add(trunks, crowns);
  parent.add(group);
  return group;
}

function makeSnowfall(scene) {
  const n = 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 110;
    pos[i * 3 + 1] = Math.random() * 50 + 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.38, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  scene.add(points);
  return points;
}

function makeHeightSampler(root, terrainMesh) {
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, -1, 0);
  const worldDir = new THREE.Vector3();
  const hitLocal = new THREE.Vector3();
  return (x, z) => {
    origin.set(x, 3000, z);
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

function boundsFromObject(object, fallbackCenter) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.z) * 0.52;
  if (!Number.isFinite(radius) || radius < 1) {
    return { center: fallbackCenter.clone(), radius: 44 };
  }
  return { center, radius };
}

function fitTerrainRoot(mesh, targetSpan = HERO_SPAN) {
  const root = new THREE.Group();
  root.name = "hero-terrain-root";
  root.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  root.userData.terrainCenter = center.clone();

  const sized = new THREE.Box3().setFromObject(mesh);
  const size = sized.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  const scale = targetSpan / span;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  return { root, center, mesh, span };
}

function clearDecor(decorGroup) {
  while (decorGroup.children.length) {
    const child = decorGroup.children[0];
    decorGroup.remove(child);
    disposeObject(child);
  }
}

function buildProceduralDecor(decorGroup, sample) {
  clearDecor(decorGroup);
  addTrees(decorGroup, sample, { minY: 2.5, maxY: 42, treeScale: 1 });
}

function buildOsmDecor(decorGroup, center, sample, limits, vectors, span) {
  clearDecor(decorGroup);
  if (vectors?.pisteTrails) addOsmTrails(decorGroup, vectors.pisteTrails, center, sample);
  if (vectors?.treePoints) {
    addPlacedTrees(decorGroup, vectors.treePoints, center, sample, span);
  } else {
    addTrees(decorGroup, sample, limits);
  }
  if (vectors?.lifts) addOsmLifts(decorGroup, vectors.lifts, center, sample, span);
}

function decorLimitsFromMesh(mesh, span) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const inset = 0.06;
  return {
    minX: box.min.x + size.x * inset,
    maxX: box.max.x - size.x * inset,
    minZ: box.min.z + size.z * inset,
    maxZ: box.max.z - size.z * inset,
    minY: box.min.y + size.y * 0.04,
    maxY: box.min.y + size.y * 0.78,
    treeScale: span / HERO_SPAN,
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

function heroSceneBase(resortId) {
  return `/homepage_scene/${resortId}/`;
}

async function loadHomepageCatalog() {
  try {
    const res = await fetch(HOMEPAGE_CATALOG_URL, { cache: "force-cache" });
    if (!res.ok) return null;
    const catalog = await res.json();
    const resorts = catalog?.resorts?.filter((r) => r?.id);
    return resorts?.length ? resorts : null;
  } catch {
    return null;
  }
}

function pickHeroResort(resorts) {
  if (!resorts?.length) return { ...DEFAULT_HERO_RESORT };
  const day = Math.floor(Date.now() / 86_400_000);
  return resorts[day % resorts.length];
}

function playableHref(resort) {
  const params = new URLSearchParams({ resort: resort.id });
  if (resort.playable_ver) params.set("ver", resort.playable_ver);
  return `/playable/?${params.toString()}`;
}

function updateHeroBadge(resort) {
  const badge = document.querySelector(".hero-mountain-badge a");
  if (!badge || !resort) return;
  const name = resort.display_name || resort.id;
  badge.href = playableHref(resort);
  badge.setAttribute("aria-label", `Play ${name} in the ski game`);
  badge.innerHTML = `${name} <i class="bi bi-controller"></i>`;
}

async function loadHomepageScene(sceneBase) {
  const manifestRes = await fetch(`${sceneBase}scene-manifest.json`, { cache: "force-cache" });
  if (!manifestRes.ok) throw new Error(`manifest ${manifestRes.status}`);
  const manifest = await manifestRes.json();
  const meshUrl = `${sceneBase}${manifest.terrain.mesh}`;
  const trailsUrl = `${sceneBase}${manifest.vectors?.piste_trails || "vectors/piste-trails.geojson"}`;
  const liftsUrl = `${sceneBase}${manifest.vectors?.lifts || "vectors/lifts.geojson"}`;
  const treesUrl = `${sceneBase}${manifest.vectors?.tree_points || "vectors/tree-points.geojson"}`;

  const [gltf, pisteTrails, lifts, treePoints] = await Promise.all([
    getGltfLoader().loadAsync(meshUrl),
    fetch(trailsUrl, { cache: "force-cache" }).then((r) => {
      if (!r.ok) throw new Error(`piste-trails ${r.status}`);
      return r.json();
    }),
    fetch(liftsUrl, { cache: "force-cache" }).then((r) => {
      if (!r.ok) throw new Error(`lifts ${r.status}`);
      return r.json();
    }),
    fetch(treesUrl, { cache: "force-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (child.isMesh && !mesh) mesh = child;
  });
  if (!mesh) throw new Error("terrain mesh missing in GLB");
  mesh.material = snowMaterial();
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const fitted = fitTerrainRoot(mesh);
  return {
    root: fitted.root,
    center: fitted.center,
    mesh: fitted.mesh,
    span: fitted.span,
    pisteTrails,
    lifts,
    treePoints,
  };
}

function decorLimitsForObject(root) {
  const mesh = root.children.find((child) => child.isMesh);
  if (!mesh) {
    return { minY: 2.5, maxY: 42, minX: -39, maxX: 39, minZ: -39, maxZ: 39, treeScale: 1 };
  }
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  return decorLimitsFromMesh(mesh, span);
}

function applyTerrainUpgrade({
  terrainSlot,
  decorGroup,
  proceduralTerrain,
  setBounds,
  container,
  root,
  center,
  terrainMesh,
  span,
  vectors,
}) {
  terrainSlot.remove(proceduralTerrain);
  disposeObject(proceduralTerrain);
  terrainSlot.remove(decorGroup);
  root.add(decorGroup);
  terrainSlot.add(root);

  const sample = makeHeightSampler(root, terrainMesh);
  const limits = decorLimitsFromMesh(terrainMesh, span);
  root.updateMatrixWorld(true);
  buildOsmDecor(decorGroup, center, sample, limits, vectors, span);
  setBounds(boundsFromObject(root, new THREE.Vector3(0, 18, 0)));
  container.classList.add("hero-mountain-real-terrain");
}

function upgradeToRealTerrain({
  terrainSlot,
  decorGroup,
  proceduralTerrain,
  setBounds,
  container,
  sceneBase,
}) {
  const run = () =>
    loadHomepageScene(sceneBase)
      .then(({ root, center, mesh, span, pisteTrails, lifts, treePoints }) => {
        applyTerrainUpgrade({
          terrainSlot,
          decorGroup,
          proceduralTerrain,
          setBounds,
          container,
          root,
          center,
          terrainMesh: mesh,
          span,
          vectors: { pisteTrails, lifts, treePoints },
        });
        return root;
      })
      .catch((err) => {
        console.warn("hero-mountain: real terrain upgrade failed", err);
        return null;
      });

  if (!window.requestIdleCallback) return run();
  return new Promise((resolve) => {
    requestIdleCallback(() => {
      run().then(resolve);
    }, { timeout: 4000 });
  });
}

export async function initHeroMountain(container) {
  if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const catalog = await loadHomepageCatalog();
  const heroResort = pickHeroResort(catalog);
  const sceneBase = heroSceneBase(heroResort.id);
  updateHeroBadge(heroResort);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.Fog(FOG, 48, 200);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(capDpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  const sky = addSky(scene);
  addLights(scene);
  const snow = makeSnowfall(scene);

  const terrainSlot = new THREE.Group();
  terrainSlot.name = "hero-terrain-slot";
  scene.add(terrainSlot);

  const decorGroup = new THREE.Group();
  decorGroup.name = "hero-decor";
  terrainSlot.add(decorGroup);

  const proceduralSample = mountainHeight;
  const proceduralTerrain = buildProceduralTerrain(terrainSlot, proceduralSample);
  buildProceduralDecor(decorGroup, proceduralSample);

  let bounds = { center: new THREE.Vector3(5, 19, -7), radius: 44 };
  const setBounds = (next) => {
    bounds = next;
  };

  container.classList.add("hero-mountain-ready");
  upgradeToRealTerrain({
    terrainSlot,
    decorGroup,
    proceduralTerrain,
    setBounds,
    container,
    sceneBase,
  });

  let running = true;
  let angle = 0;
  let lastT = performance.now();

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    angle += dt * 0.15;

    const { center, radius } = bounds;
    const r = radius * 1.5;
    camera.position.set(
      center.x + Math.cos(angle) * r,
      center.y + radius * 0.62,
      center.z + Math.sin(angle) * r,
    );
    camera.lookAt(center.x, center.y * 0.5, center.z);
    sky.position.copy(camera.position);

    const pos = snow.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - 0.05;
      if (y < 2) y = 44 + Math.random() * 10;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;

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
  observer.observe(container);

  return () => {
    running = false;
    observer.disconnect();
    window.removeEventListener("resize", resize);
    renderer.dispose();
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
  };
}

const mount = document.getElementById("hero-img-bg");
if (mount) initHeroMountain(mount);

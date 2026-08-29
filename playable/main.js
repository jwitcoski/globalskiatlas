import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { makeHeightfield } from "./heightfield.js?v=cam2";
import {
  makeSkier,
  spawnOnSlope,
  stepSki,
  orientSkier,
  chaseCam,
  isoCam,
  punchFov,
  makeAirState,
  resetAirState,
  makeCamShake,
  addTrauma,
  applyCamShake,
} from "./physics.js?v=feel7";
import { featuredCourses, attachPisteDifficulty, courseFinish, createRun, tickRun, formatTime } from "./run.js?v=map2";
import { coordsToXz, attachPiste, resetScore, tickScore, commitBestScore, formatScore } from "./score.js?v=feel1";
import {
  orientPiste,
  placeGates,
  resetGates,
  tickGates,
  clearGateMeshes,
  addGateMeshes,
} from "./gates.js?v=vis16";
import { addOsmWorld } from "./osm-world.js?v=island11";
import {
  snowTerrainMaterial,
  addSkyAndLights,
  followSky,
  followSun,
  addFinish,
  addContactBlob,
  makeSpray,
  updateSpray,
  makeFallingSnow,
  updateFallingSnow,
  setInspectAtmosphere,
} from "./look.js?v=island1";
import { addResortIsland, updateIslandDust } from "./island.js?v=island10";
import { bindUi, setHud, openPanel, closePanel } from "./ui.js?v=vis23";
import { showPickerMap, destroyPickerMap } from "./picker-map.js?v=map4";
import { capDpr, bindPads, attachDebug } from "./debug.js?v=fix1";
import { bakePisteSculpt, drapeSculptOnMesh } from "./piste-sculpt.js?v=feel3";
import { addTrailMarks, clearTrailMarks } from "./trail-marks.js?v=marks2";
import { makeYeti, resetYeti, parkYetiAtStart, tickYeti } from "./yeti.js?v=vis16";
import { createSkiWake, clearSkiWake, pushSkiWake, updateSkiWake } from "./ski-wake.js?v=feel1";
import {
  addTrailMap,
  setTrailMapSelection,
  pickTrailOnMap,
  frameTrailOverview,
  difficultyLegendHtml,
  classifyDifficulty,
  markerSvg,
  parseSkiArea,
} from "./trail-map.js?v=vis25";
import { makeMinimap } from "./minimap.js?v=feel4";
import { updateTraffic } from "./traffic.js?v=vis16";

/** Served at /playable/. Scene cakes live on S3 (catalog.json + per-resort prefixes). */
const PUBLIC_SCENES =
  "https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/game_scenes/";
let SCENE_ROOT = new URL("./", import.meta.url);
let catalogHub = null;
const STEP = 1 / 60;

const ui = bindUi();
const LEGAL =
  "OpenStreetMap + Mapzen Skadi. Chairlift: Poly by Google (CC-BY). Not an official map, not affiliated with any ski area, not for navigation or safety.";

const keys = new Set();
addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
bindPads(keys);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 24000);
camera.userData.pov = "chase";
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.info.autoReset = false;
renderer.setPixelRatio(capDpr());
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.cssText = "position:fixed;inset:0;z-index:0;display:block;";
document.body.appendChild(renderer.domElement);
const look = addSkyAndLights(THREE, scene, renderer);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false;
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerDown = null;

const lineMats = new Map();
function lineMat(color) {
  let m = lineMats.get(color);
  if (!m) {
    m = new THREE.LineBasicMaterial({ color });
    lineMats.set(color, m);
  }
  return m;
}

function lineObj(coords, color, elevFn) {
  const pts = [];
  for (const c of coords) {
    const x = c[0];
    const z = -c[1];
    pts.push(new THREE.Vector3(x, elevFn(x, z) + 1.2, z));
  }
  if (pts.length < 2) return null;
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color));
}

async function loadJSON(rel) {
  const r = await fetch(new URL(rel, SCENE_ROOT));
  if (!r.ok) throw new Error(`${rel} ${r.status}`);
  return r.json();
}

function loadGltf(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, resolve, undefined, reject);
  });
}

function selectedDiff() {
  return classifyDifficulty(activeCourse?.piste_difficulty, activeCourse?.piste_type);
}

function showReady() {
  const d = selectedDiff();
  openPanel(ui, "ready", {
    course: courseName,
    legal: LEGAL,
    trails: trailChoices,
    selectedId: activeCourse?.id,
    marker: markerSvg(d, 18),
    diffKey: d.key,
    diffLabel: d.label,
    legend: difficultyLegendHtml(),
    changeMountain: !!catalogHub,
  });
}

function setIslandLobby(on) {
  const dust = scene.userData.island?.dust;
  if (dust) dust.pts.visible = on;
}

function setPistePlayMode(playing) {
  const root = scene.userData.pisteDecor;
  if (!root) return;
  root.visible = !playing;
}

function setPlayableVisible(on) {
  skier.visible = on;
  blob.visible = on;
  spray.visible = on;
  if (flakes?.pts) flakes.pts.visible = on;
  if (wake) wake.mesh.visible = on && wake.samples.length > 1;
  if (gateRoot) gateRoot.visible = on;
  if (marksRoot) marksRoot.visible = on;
  if (yeti) yeti.visible = on && !!run?.yetiOut;
  if (finishMark) finishMark.visible = on;
  setPistePlayMode(on);
}

function enterLobby(reframe) {
  if (!run) return;
  run.phase = "ready";
  acc = 0;
  setInspectAtmosphere(scene, look, true);
  setIslandLobby(true);
  if (trailMap) trailMap.root.visible = true;
  setPlayableVisible(false);
  orbit.enabled = true;
  if (reframe !== false) frameTrailOverview(camera, orbit, trailMap, scene.userData.island);
  setTrailMapSelection(trailMap, activeCourse?.id);
  document.body.style.cursor = "grab";
  showReady();
}

function exitLobby() {
  orbit.enabled = false;
  setInspectAtmosphere(scene, look, false);
  setIslandLobby(false);
  if (trailMap) trailMap.root.visible = false;
  setPlayableVisible(true);
  document.body.style.cursor = "";
  placeSkier();
  parkYetiAtStart(yeti, run, spawnXZ, hf);
}

function cyclePov() {
  camera.userData.pov = camera.userData.pov === "iso" ? "chase" : "iso";
  camera.userData.skiRig = false;
  if (ui.povBtn) ui.povBtn.textContent = camera.userData.pov === "iso" ? "ISO" : "CAM";
}

function applyRunCam() {
  if (camera.userData.pov === "iso") isoCam(THREE, camera, skier.position, heading, vel, hf);
  else chaseCam(THREE, camera, skier.position, heading, vel, hf);
}

function navAngleDeg() {
  if (!run) return 0;
  const g = run.gates?.[run.gateIndex];
  const tx = g ? g.x : run.finish.x;
  const tz = g ? g.z : run.finish.z;
  const bearing = Math.atan2(tx - skier.position.x, tz - skier.position.z);
  let a = bearing - heading;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return (a * 180) / Math.PI;
}

function onUiAct(act, courseId) {
  if (act === "pick") {
    const next = trailChoices.find((r) => r.id === courseId);
    if (next) {
      applyCourse(next);
      resetRun({ lobby: true, keepCam: true, reframe: false });
    }
    return;
  }
  if (act === "lobby") {
    if (run) resetRun({ lobby: true, reframe: true });
    return;
  }
  if (act === "mountains") {
    const u = new URL(location.href);
    u.searchParams.delete("resort");
    u.searchParams.delete("ver");
    u.searchParams.delete("scene");
    location.assign(u);
    return;
  }
  if (act === "mountain" && courseId) {
    openMountain(courseId).catch((e) => {
      openPanel(ui, "error", { message: String(e), changeMountain: !!catalogHub });
    });
    return;
  }
  if (!run) return;
  if (act === "start" && run.phase === "ready") {
    closePanel(ui);
    exitLobby();
  }
  if (act === "resume" && run.phase === "paused") {
    run.phase = "running";
    last = performance.now();
    closePanel(ui);
  }
  if (act === "restart") resetRun({ lobby: false });
}

function fitRenderer() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(capDpr());
  renderer.setSize(innerWidth, innerHeight);
}

const skier = makeSkier(THREE, scene);
const yeti = makeYeti(THREE, scene);
const blob = addContactBlob(THREE, scene);
const spray = makeSpray(THREE, scene);
const wake = createSkiWake(THREE, scene);
const flakes = makeFallingSnow(THREE, scene);
const vel = new THREE.Vector3();
const air = makeAirState();
const shake = makeCamShake();
let heading = 0;
let hf = null;
let run = null;
let spawnXZ = { x: 0, z: 0 };
let last = performance.now();
let acc = 0;
let fpsEma = 60;
const dbg = attachDebug(renderer, () => ({
  fps: Math.round(fpsEma),
  dt: 1 / Math.max(1, fpsEma),
  phase: run?.phase,
  speed: vel.length(),
  heading,
  onPiste: !!run?.onPiste,
  y: skier.position.y,
  score: run?.score || 0,
}));
let courseName = "";
let finishedShown = false;
let dnfShown = false;
let courseLineMat = null;
let finishMark = null;
let trailChoices = [];
let activeCourse = null;
let gateRoot = null;
let marksRoot = null;
let trailMap = null;
let mini = null;
const pisteLines = [];

function trailAim(run, spawn) {
  const pts = run?.pistePts;
  if (pts && pts.length >= 2) {
    const i = Math.min(4, pts.length - 1);
    return { x: pts[i].x - pts[0].x, z: pts[i].z - pts[0].z };
  }
  if (run?.finish && spawn) {
    return { x: run.finish.x - spawn.x, z: run.finish.z - spawn.z };
  }
  return null;
}

function placeSkier() {
  heading = spawnOnSlope(THREE, hf, skier.position, vel, spawnXZ.east, spawnXZ.north, spawnXZ.elev, trailAim(run, spawnXZ));
  spawnXZ.x = skier.position.x;
  spawnXZ.z = skier.position.z;
  resetAirState(air);
  shake.trauma = 0;
  camera.position.set(0, 0, 0);
  orientSkier(THREE, skier, skier.position, heading, vel, hf);
  applyRunCam();
}

function applyCourse(course) {
  activeCourse = course;
  const finish = courseFinish(course);
  courseName = finish.name;
  spawnXZ = {
    east: finish.startEast,
    north: finish.startNorth,
    elev: finish.startElev,
    x: finish.startEast,
    z: -finish.startNorth,
  };
  if (finishMark && hf) {
    finishMark.position.set(finish.x, hf.sample(finish.x, finish.z), finish.z);
  }
  run = createRun(finish);
  const hit = pisteLines.find((p) => course.name && p.name === course.name);
  const pistePts = orientPiste(
    hit && hit.pts.length >= 2
      ? hit.pts
      : [
          { x: finish.startEast, z: -finish.startNorth },
          { x: finish.x, z: finish.z },
        ],
    spawnXZ,
  );
  attachPiste(run, pistePts);
  run.courseLen = Math.hypot(finish.x - spawnXZ.x, finish.z - spawnXZ.z) || 1;
  run.gates = placeGates(pistePts);
  resetGates(run);
  clearGateMeshes(gateRoot);
  gateRoot = hf ? addGateMeshes(THREE, scene, run.gates, (x, z) => hf.sample(x, z)) : null;
  clearTrailMarks(marksRoot);
  if (gateRoot) gateRoot.visible = false;
  if (marksRoot) marksRoot.visible = false;
}

function resetRun(opts = {}) {
  if (!hf || !run) return;
  run.phase = "ready";
  run.time = 0;
  run.leftGate = false;
  resetScore(run);
  resetGates(run);
  resetYeti(yeti, run);
  clearSkiWake(wake);
  resetAirState(air);
  shake.trauma = 0;
  acc = 0;
  finishedShown = false;
  dnfShown = false;
  if (opts.lobby === false) {
    closePanel(ui);
    exitLobby();
    return;
  }
  enterLobby(opts.reframe !== false && !opts.keepCam);
}

function scenePathFromUrl() {
  const q = new URLSearchParams(location.search);
  const resort = q.get("resort");
  const ver = q.get("ver");
  if (resort && ver) return `${resort}/${ver}`;
  const scene = q.get("scene");
  return scene ? scene.replace(/^\/+|\/+$/g, "") : "";
}

function rememberScenePath(path) {
  const slash = path.indexOf("/");
  const resort = slash < 0 ? path : path.slice(0, slash);
  const ver = slash < 0 ? "" : path.slice(slash + 1);
  const u = new URL(location.href);
  u.searchParams.set("resort", resort);
  u.searchParams.set("ver", ver);
  u.searchParams.delete("scene");
  history.replaceState({}, "", u);
}

async function openMountain(path) {
  const rel = path.replace(/^\/+|\/+$/g, "");
  rememberScenePath(rel);
  const base = catalogHub?.base || new URL("../", import.meta.url);
  SCENE_ROOT = new URL(`${rel}/`, base);
  pisteLines.length = 0;
  destroyPickerMap();
  openPanel(ui, "loading", { message: "DEM + OSM scene…" });
  await loadMountain();
}

function catalogUrls() {
  const q = new URLSearchParams(location.search);
  const urls = [];
  const custom = q.get("scenes");
  const localOnly = q.has("local");
  if (custom) {
    const root = custom.endsWith("/") ? custom : `${custom}/`;
    urls.push(new URL("catalog.json", root));
  } else if (!localOnly) {
    urls.push(new URL("catalog.json", PUBLIC_SCENES));
  }
  urls.push(new URL("../catalog.json", import.meta.url), new URL("../../../catalog.json", import.meta.url));
  return urls;
}

async function fetchCatalog() {
  for (const u of catalogUrls()) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.resorts?.length) return { data, base: new URL(".", u) };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadMountain() {
  const manifest = await loadJSON("scene-manifest.json");
  if (manifest.display_name) document.title = String(manifest.display_name).replace(" — Prototype", "");
  const hfMeta = await loadJSON(manifest.terrain.heightfield_metadata);
  const buf = await (await fetch(new URL(manifest.terrain.heightfield, SCENE_ROOT))).arrayBuffer();
  hf = makeHeightfield(hfMeta, new Uint16Array(buf));

  const snowMat = snowTerrainMaterial(THREE);
  let terrainRoot = null;
  try {
    const gltf = await loadGltf(new URL(manifest.terrain.mesh, SCENE_ROOT).href);
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.material = snowMat;
        o.receiveShadow = true;
      }
    });
    terrainRoot = gltf.scene;
    scene.add(gltf.scene);
  } catch (meshErr) {
    console.warn("terrain mesh failed; skiing on heightfield only", meshErr);
  }

  const graph = await loadJSON(manifest.gameplay.routes_graph);
  trailChoices = featuredCourses(graph);
  try {
    const pisteFC = await loadJSON(manifest.vectors.pistes || "vectors/pistes.geojson");
    attachPisteDifficulty(trailChoices, pisteFC);
  } catch {
    /* OSM rating is optional if the piste layer is missing */
  }
  if (!trailChoices.length) throw new Error("No approved course with an end point");

  const routes = await loadJSON(manifest.vectors.route_centers);
  const pistePolys = [];
  for (const f of routes.features || []) {
    if (f.geometry?.type !== "LineString") continue;
    pistePolys.push(coordsToXz(f.geometry.coordinates));
  }
  bakePisteSculpt(hf, pistePolys);
  drapeSculptOnMesh(terrainRoot, hf);

  const drap = (x, z) => hf.sample(x, z);
  const osmCounts = await addOsmWorld(THREE, scene, SCENE_ROOT, manifest, drap);
  console.info("OSM world", osmCounts);

  const hull = scene.userData.osmHull;
  if (Array.isArray(hull) && hull.length >= 3) {
    const pad = 18;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of hull) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    hf.playBounds = {
      minX: minX + pad,
      maxX: maxX - pad,
      minZ: minZ + pad,
      maxZ: maxZ - pad,
    };
  }

  for (const f of routes.features || []) {
    if (f.geometry?.type !== "LineString") continue;
    pisteLines.push({
      name: f.properties?.name,
      id: f.properties?.id,
      pts: coordsToXz(f.geometry.coordinates),
    });
  }

  const first = trailChoices[0];
  const finish0 = courseFinish(first);
  if (!finish0 || finish0.x == null) throw new Error("No approved course with an end point");
  const finY = hf.sample(finish0.x, finish0.z);
  finishMark = addFinish(THREE, scene, finish0.x, finY, finish0.z);
  applyCourse(first);

  let skiArea = null;
  try {
    const skiFC = await loadJSON(manifest.vectors?.ski_area || "vectors/ski-area.geojson");
    skiArea = parseSkiArea(skiFC);
  } catch {
    /* boundary is optional; trail extent still frames the lobby */
  }
  if (skiArea?.bounds && !hf.playBounds) {
    const pad = 18;
    const b = skiArea.bounds;
    hf.playBounds = {
      minX: b.minX + pad,
      maxX: b.maxX - pad,
      minZ: b.minZ + pad,
      maxZ: b.maxZ - pad,
    };
    scene.userData.skiArea = skiArea;
  }
  if (skiArea) scene.userData.skiArea = skiArea;

  if (scene.userData.island?.root) {
    scene.remove(scene.userData.island.root);
    scene.userData.island = null;
  }
  try {
    addResortIsland(THREE, scene, hf, skiArea, scene.userData.osmHull);
    if (terrainRoot) terrainRoot.visible = false;
  } catch (islandErr) {
    console.warn("resort island failed", islandErr);
    if (terrainRoot) terrainRoot.visible = true;
  }

  trailMap = addTrailMap(THREE, scene, trailChoices, pisteLines, drap, skiArea);
  mini = makeMinimap(ui.minimap, trailMap);
  resetRun({ lobby: true, reframe: true });
}

async function bootScene() {
  catalogHub = await fetchCatalog();
  const path = scenePathFromUrl();
  if (path) {
    await openMountain(path);
    return;
  }
  if (catalogHub) {
    openPanel(ui, "mountains", {
      resorts: catalogHub.data.resorts,
      legal: catalogHub.data.disclaimer || LEGAL,
    });
    try {
      await showPickerMap(document.getElementById("picker-map"), catalogHub.data.resorts, (path) => {
        openMountain(path).catch((e) => {
          openPanel(ui, "error", { message: String(e), changeMountain: !!catalogHub });
        });
      });
    } catch (mapErr) {
      openPanel(ui, "error", { message: String(mapErr), changeMountain: false });
    }
    return;
  }
  await loadMountain();
}

try {
  await bootScene();
} catch (e) {
  openPanel(ui, "error", { message: String(e), changeMountain: !!catalogHub });
}

addEventListener("keydown", (e) => {
  if (!run) return;
  if (e.code === "Escape") {
    if (run.phase === "running") {
      run.phase = "paused";
      acc = 0;
      openPanel(ui, "paused", {});
    } else if (run.phase === "paused") {
      onUiAct("resume");
    }
  }
  if (e.code === "KeyR") resetRun();
  if (e.code === "KeyC") {
    if (run.phase === "running" || run.phase === "paused") cyclePov();
  }
  if (e.code === "Enter" || e.code === "Space") {
    if (run.phase === "ready") onUiAct("start");
    if (run.phase === "finished" || run.phase === "dnf") resetRun();
  }
});

ui.overlay?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (btn) onUiAct(btn.dataset.act, btn.dataset.course);
});
ui.pauseBtn?.addEventListener("click", () => {
  if (run?.phase === "running") {
    run.phase = "paused";
    acc = 0;
    openPanel(ui, "paused", {});
  }
});
ui.povBtn?.addEventListener("click", () => {
  if (run?.phase === "running" || run?.phase === "paused") cyclePov();
});

function canvasNdc(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (run?.phase !== "ready") return;
  pointerDown = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (run?.phase !== "ready" || !pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 7) return;
  canvasNdc(e);
  const id = pickTrailOnMap(trailMap, raycaster, camera, ndc);
  if (id) onUiAct("pick", id);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (run?.phase !== "ready") return;
  canvasNdc(e);
  const id = pickTrailOnMap(trailMap, raycaster, camera, ndc);
  renderer.domElement.style.cursor = id ? "pointer" : "grab";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    keys.clear();
    if (run?.phase === "running") {
      run.phase = "paused";
      acc = 0;
      openPanel(ui, "paused", {});
    }
  }
});

function tick(now) {
  requestAnimationFrame(tick);
  if (document.body.classList.contains("picker")) {
    last = now;
    return;
  }
  const frameDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fpsEma = fpsEma * 0.9 + (1 / Math.max(0.001, frameDt)) * 0.1;
  try {
  if (hf && run && run.phase !== "paused") {
    const freeze = run.phase === "finished" || run.phase === "dnf" || (run.phase === "ready" && !ui.overlay.hidden);
    if (!freeze) {
      acc += frameDt;
      let steps = 0;
      const turning = keys.has("KeyA") || keys.has("KeyD") || keys.has("ArrowLeft") || keys.has("ArrowRight");
      while (acc >= STEP && steps < 5) {
        const gatesBefore = run.gateHit || 0;
        const st = stepSki(THREE, {
          pos: skier.position,
          vel,
          heading,
          keys,
          hf,
          dt: STEP,
          trees: scene.userData.treeHash,
          air,
          onPiste: run.onPiste !== false,
        });
        heading = st.heading;
        skier.userData.steer = st.steer;
        skier.userData.air = st.air;
        skier.userData.skid = st.skid || 0;
        skier.userData.pole = !!st.pole;
        if (st.treeHit?.impact > 1) addTrauma(shake, Math.min(0.7, st.treeHit.impact * 0.05));
        if (st.landed > 4) addTrauma(shake, Math.min(0.55, (st.landed - 4) * 0.05));
        tickRun(run, skier.position, spawnXZ, STEP, vel.length() > 1.5);
        tickScore(run, skier.position, vel.length(), turning, STEP, {
          gap: st.treeHit?.gap,
          grazed: st.treeHit?.hit,
          skid: st.skid || 0,
          air: st.air,
        });
        tickGates(run, skier.position);
        if ((run.gateHit || 0) > gatesBefore) addTrauma(shake, 0.18);
        tickYeti(yeti, run, skier, hf, STEP, spawnXZ);
        acc -= STEP;
        steps += 1;
      }
      orientSkier(THREE, skier, skier.position, heading, vel, hf, skier.userData.steer || 0, {
        air: skier.userData.air,
        tuck: (keys.has("KeyW") || keys.has("ArrowUp")) && !skier.userData.pole,
        pole: !!skier.userData.pole,
        brake: keys.has("KeyS") || keys.has("ArrowDown"),
        speed: vel.length(),
        dt: frameDt,
      });
      applyRunCam();
      applyCamShake(camera, shake, frameDt);
      punchFov(camera, keys.has("KeyW") || keys.has("ArrowUp"), frameDt, vel.length());
      if (run.phase === "finished" && !finishedShown) {
        finishedShown = true;
        acc = 0;
        const scored = commitBestScore(run);
        openPanel(ui, "finished", {
          course: courseName,
          time: formatTime(run.time),
          score: formatScore(scored),
          gates: `${run.gateHit || 0}/${run.gates?.length || 0}`,
          bestScore: run.bestScore != null ? formatScore(run.bestScore) : "—",
          bestTime: run.best != null ? formatTime(run.best) : "—",
        });
      }
      if (run.phase === "dnf" && !dnfShown) {
        dnfShown = true;
        acc = 0;
        if (run.dnfReason === "yeti") skier.visible = false;
        openPanel(ui, "dnf", {
          score: formatScore(run.score),
          time: formatTime(run.time),
          reason: run.dnfReason || "piste",
          gates: `${run.gateHit || 0}/${run.gates?.length || 0}`,
        });
      }
    }
    const spd = vel.length() * 3.6;
    const tlabel = run.phase === "ready" ? "0:00.00" : formatTime(run.time);
    const distRemain = Math.hypot(skier.position.x - run.finish.x, skier.position.z - run.finish.z);
    setHud(ui, {
      timeLabel: tlabel,
      speedKmh: spd,
      score: run.score,
      onPiste: run.onPiste,
      offTimer: run.offTimer || 0,
      distRemain,
      distTotal: run.courseLen || distRemain || 1,
      course: courseName,
      gatesHit: run.gateHit || 0,
      gatesTotal: run.gates?.length || 0,
      gateFlash: run.gateFlash || "",
      yetiOut: !!run.yetiOut,
      navShow: run.phase === "running" || run.phase === "paused",
      navAngle: navAngleDeg(),
      pov: camera.userData.pov || "chase",
    });
    if (!freeze) {
      const blobY = hf.sample(skier.position.x, skier.position.z);
      blob.position.set(skier.position.x, blobY + 0.03, skier.position.z);
      const lift = Math.min(1, (air.height || 0) / 5);
      blob.scale.setScalar(1 + lift * 0.9);
      blob.material.opacity = 0.22 * (1 - lift * 0.55);
      pushSkiWake(wake, hf, skier.position.x, skier.position.z, heading, vel.length(), frameDt, !air.on);
      updateSkiWake(wake, hf, frameDt);
      updateSpray(spray, skier, heading, vel.length(), frameDt, keys, hf, {
        powder: run.onPiste === false,
        skid: skier.userData.skid || 0,
        air: air.on,
      });
      updateFallingSnow(flakes, camera, frameDt);
    }
  }
  if (run?.phase === "ready" && orbit.enabled) orbit.update();
  if (run?.phase === "ready") updateIslandDust(scene.userData.island, frameDt);
  if (scene.userData.traffic && hf) updateTraffic(scene.userData.traffic, frameDt, (x, z) => hf.sample(x, z));
  if (mini && run) {
    const hunting = !!(run.yetiOut && yeti?.visible);
    mini.draw({
      x: run.phase === "ready" ? spawnXZ.x : skier.position.x,
      z: run.phase === "ready" ? spawnXZ.z : skier.position.z,
      heading,
      courseId: activeCourse?.id,
      finish: run.finish,
      yeti: hunting,
      yetiX: hunting ? yeti.position.x : null,
      yetiZ: hunting ? yeti.position.z : null,
    });
  }
  } catch (err) {
    console.error(err);
  }
  renderer.info.reset();
  followSky(look.sky, camera);
  const sunFocus =
    run?.phase === "ready" && scene.userData.island?.center
      ? scene.userData.island.center
      : skier.position;
  followSun(look.sun, sunFocus);
  renderer.render(scene, camera);
  dbg.tick(frameDt);
}
requestAnimationFrame(tick);
addEventListener("resize", fitRenderer);

window.__ski = { scene, camera, orbit, renderer };
window.__THREE_GAME_DIAGNOSTICS__ = {
  renderer: renderer.info,
  physics: { engine: "custom-dem", timestep: STEP, gravity: "fall-line * grade", gFall: 32, turn: 0.98 },
  get state() {
    return {
      phase: run?.phase,
      heading,
      speed: vel.length(),
      y: skier.position.y,
      score: run?.score,
      onPiste: run?.onPiste,
      air: !!air.on,
      airHeight: air.height,
      nearMiss: run?.nearMiss || 0,
      trauma: shake.trauma,
      fov: camera.fov,
      fps: Math.round(fpsEma),
      gates: `${run?.gateHit || 0}/${run?.gates?.length || 0}`,
      course: courseName,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      drawingBuffer: [renderer.domElement.width, renderer.domElement.height],
      sceneChildren: scene.children.length,
      cam: [Math.round(camera.position.x), Math.round(camera.position.y), Math.round(camera.position.z)],
      course: courseName,
    };
  },
};

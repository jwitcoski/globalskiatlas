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
} from "./physics.js?v=feel11";
import { featuredCourses, attachPisteDifficulty, courseFinish, createRun, tickRun, formatTime } from "./run.js?v=map4";
import { coordsToXz, attachPiste, resetScore, tickScore, commitBestScore, formatScore, distToPolyline } from "./score.js?v=feel3";
import { orientPiste, alongTrack, alongPolyline } from "./gates.js?v=vis18";
import { addOsmWorld } from "./osm-world.js?v=island14";
import {
  snowTerrainMaterial,
  addSkyAndLights,
  followSky,
  followSun,
  addFinish,
  addStart,
  addContactBlob,
  makeSpray,
  updateSpray,
  makeFallingSnow,
  updateFallingSnow,
  setInspectAtmosphere,
} from "./look.js?v=island4";
import { addResortIsland, updateIslandDust } from "./island.js?v=island10";
import { bindUi, setHud, openPanel, closePanel, updateLoading } from "./ui.js?v=vis31";
import { atlasStatsHtml, prefetchWikiIndex } from "./atlas-stats.js?v=stats1";
import { showPickerMap, destroyPickerMap } from "./picker-map.js?v=map5";
import { capDpr, bindPads, attachDebug } from "./debug.js?v=fix1";
import { intentsFrom, isTurning } from "./input.js?v=feel1";
import { bindMobileChrome } from "./mobile.js?v=feel1";
import { bakePisteSculpt, drapeSculptOnMesh } from "./piste-sculpt.js?v=feel3";
import { addTrailMarks, clearTrailMarks, updateTrailMarks } from "./trail-marks.js?v=marks10";
import { makeYeti, resetYeti, parkYetiAtStart, tickYeti } from "./yeti.js?v=vis16";
import { createSkiWake, clearSkiWake, pushSkiWake, updateSkiWake } from "./ski-wake.js?v=feel1";
import {
  addTrailMap,
  setTrailMapSelection,
  pickTrailOnMap,
  frameTrailOverview,
  fitLobbyClip,
  fitPlayClip,
  updateTrailMapLod,
  difficultyLegendHtml,
  classifyDifficulty,
  markerSvg,
  parseSkiArea,
} from "./trail-map.js?v=zoom3";
import { makeMinimap } from "./minimap.js?v=feel6";
import { createNpcSkiers, clearNpcSkiers, tickNpcSkiers } from "./npc-skiers.js?v=feel4";
import { updateTraffic } from "./traffic.js?v=vis16";
import {
  TRAILER,
  trailerDefaultPath,
  armTrailer,
  steerTrailer,
  trailerNeedsPaint,
  paintTrailerFrame,
} from "./trailer.js?v=t2";

/** Website CloudFront can origin-pull game_scenes; S3 is the fallback. */
const S3_SCENES = "https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/game_scenes/";
const CF_SCENES = "https://globalskiatlas.com/game_scenes/";
const PUBLIC_SCENES =
  location.hostname === "globalskiatlas.com" || location.hostname === "www.globalskiatlas.com"
    ? CF_SCENES
    : S3_SCENES;
let SCENE_ROOT = new URL("./", import.meta.url);
let catalogHub = null;
let lastManifest = null;
let readySeq = 0;
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
const mobile = bindMobileChrome(keys);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 24000);
camera.userData.pov = "chase";
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: TRAILER,
});
renderer.info.autoReset = false;
renderer.setPixelRatio(capDpr());
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.cssText = "position:fixed;inset:0;z-index:0;display:block;";
document.body.appendChild(renderer.domElement);
const look = addSkyAndLights(THREE, scene, renderer);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false;
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;
orbit.rotateSpeed = 0.72;
orbit.panSpeed = 0.7;
orbit.zoomSpeed = 0.7;
orbit.zoomToCursor = false;
orbit.screenSpacePanning = true;
let lobbyZoomTo = 0;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerDown = null;

function wheelPixels(e) {
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  else if (e.deltaMode === 2) dy *= Math.max(400, innerHeight);
  return Math.max(-64, Math.min(64, dy));
}

function applyLobbyZoom(dt) {
  if (!orbit.enabled || !lobbyZoomTo) return;
  const t = orbit.target;
  const p = camera.position;
  const ox = p.x - t.x;
  const oy = p.y - t.y;
  const oz = p.z - t.z;
  const dist = Math.hypot(ox, oy, oz) || 1;
  const lo = orbit.minDistance || 1;
  const hi = orbit.maxDistance || dist;
  const want = Math.min(hi, Math.max(lo, lobbyZoomTo));
  const next = dist + (want - dist) * (1 - Math.exp(-10 * dt));
  const s = next / dist;
  p.set(t.x + ox * s, t.y + oy * s, t.z + oz * s);
  if (Math.abs(next - want) < Math.max(0.04, want * 0.0005)) lobbyZoomTo = 0;
}

renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    if (!orbit.enabled || run?.phase !== "ready") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const dist = camera.position.distanceTo(orbit.target);
    if (!lobbyZoomTo) lobbyZoomTo = dist;
    lobbyZoomTo = Math.min(
      orbit.maxDistance,
      Math.max(orbit.minDistance, lobbyZoomTo * Math.exp(wheelPixels(e) * 0.002)),
    );
  },
  { capture: true, passive: false },
);

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

function loadGltf(url, onProgress) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      resolve,
      (ev) => {
        if (!onProgress) return;
        if (ev.total) onProgress(ev.loaded, ev.total);
        else onProgress(ev.loaded, 0);
      },
      reject,
    );
  });
}

function pushLoad(partial) {
  Object.assign(loadUi, partial);
  updateLoading(ui, loadUi);
}

let loadUi = {};

function selectedDiff() {
  return classifyDifficulty(activeCourse?.piste_difficulty, activeCourse?.piste_type);
}

function currentCatalogResort() {
  const path = scenePathFromUrl();
  return (
    catalogHub?.data?.resorts?.find((r) => String(r.path || "").replace(/\/+$/, "") === path) || null
  );
}

function showReady() {
  if (TRAILER) {
    closePanel(ui);
    return;
  }
  const d = selectedDiff();
  const payload = {
    course: courseName,
    legal: LEGAL,
    trails: trailChoices,
    selectedId: activeCourse?.id,
    marker: markerSvg(d, 18),
    diffKey: d.key,
    diffLabel: d.label,
    legend: difficultyLegendHtml(),
    changeMountain: !!catalogHub,
  };
  openPanel(ui, "ready", payload);
  const seq = ++readySeq;
  const catalog = currentCatalogResort();
  const hint = {
    name: String(lastManifest?.display_name || catalog?.name || "").replace(/\s+[—-]\s+Prototype$/i, ""),
    country: catalog?.country,
    location: catalog?.location,
    id: catalog?.id,
  };
  atlasStatsHtml(hint)
    .then((html) => {
      if (!html || seq !== readySeq || run?.phase !== "ready") return;
      openPanel(ui, "ready", { ...payload, atlasStats: html });
    })
    .catch(() => {});
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
  if (marksRoot) marksRoot.visible = on;
  if (npcPack?.root) npcPack.root.visible = on && !TRAILER;
  if (yeti) yeti.visible = on && !!run?.yetiOut;
  if (finishMark) finishMark.visible = on;
  if (startMark) startMark.visible = on;
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
  camera.fov = 60;
  if (reframe !== false) {
    lobbyZoomTo = 0;
    frameTrailOverview(camera, orbit, trailMap, scene.userData.island);
  }
  setTrailMapSelection(trailMap, activeCourse?.id);
  updateTrailMapLod(trailMap, camera);
  document.body.style.cursor = "grab";
  showReady();
}

function exitLobby() {
  orbit.enabled = false;
  lobbyZoomTo = 0;
  fitPlayClip(camera);
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
  if (!run?.pistePts) return 0;
  const tr = alongTrack(run.pistePts, skier.position.x, skier.position.z);
  const aim = alongPolyline(run.pistePts, tr.along + 42);
  const bearing = Math.atan2(aim.x - skier.position.x, aim.z - skier.position.z);
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
let startMark = null;
let trailChoices = [];
let activeCourse = null;
let marksRoot = null;
let npcPack = null;
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
  const named = pisteLines.find((p) => course.name && p.name === course.name);
  let hit = named;
  let best = Infinity;
  for (const p of pisteLines) {
    if (!p.pts || p.pts.length < 2) continue;
    const d = distToPolyline(spawnXZ.x, spawnXZ.z, p.pts) * 2 + distToPolyline(finish.x, finish.z, p.pts);
    if (d < best) {
      best = d;
      hit = p;
    }
  }
  if (named && distToPolyline(spawnXZ.x, spawnXZ.z, named.pts) < 40) hit = named;
  const pistePts = orientPiste(
    hit && hit.pts.length >= 2
      ? hit.pts
      : [
          { x: finish.startEast, z: -finish.startNorth },
          { x: finish.x, z: finish.z },
        ],
    spawnXZ,
    finish,
  );
  attachPiste(run, pistePts);
  run.courseLen = Math.hypot(finish.x - spawnXZ.x, finish.z - spawnXZ.z) || 1;
  run.clocked = false;
  run.startAlong = 4;
  const p0 = alongPolyline(pistePts, 0);
  const yaw = Math.atan2(p0.tx, p0.tz);
  if (startMark && hf) {
    startMark.position.set(p0.x, hf.sample(p0.x, p0.z), p0.z);
    startMark.rotation.y = yaw;
  }
  const diff = classifyDifficulty(course.piste_difficulty, course.piste_type);
  clearTrailMarks(marksRoot);
  marksRoot = hf ? addTrailMarks(THREE, scene, pistePts, (x, z) => hf.sample(x, z)) : null;
  if (marksRoot) marksRoot.visible = false;
  clearNpcSkiers(npcPack);
  npcPack = TRAILER || !hf ? null : createNpcSkiers(THREE, scene, pisteLines, (x, z) => hf.sample(x, z), spawnXZ, pistePts);
}

function resetRun(opts = {}) {
  if (!hf || !run) return;
  run.phase = "ready";
  run.time = 0;
  run.leftGate = false;
  run.clocked = false;
  resetScore(run);
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
  if (scene) return scene.replace(/^\/+|\/+$/g, "");
  return TRAILER ? trailerDefaultPath() : "";
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
  const catalog = catalogHub?.data?.resorts?.find((r) => String(r.path || "").replace(/\/+$/, "") === rel) || null;
  const name = String(catalog?.name || rel.split("/")[0] || "Mountain").replace(/_/g, " ");
  loadUi = { name, message: "Reading the scene manifest…", stage: "manifest", factsHtml: "" };
  openPanel(ui, "loading", loadUi);
  atlasStatsHtml({
    name,
    country: catalog?.country,
    location: catalog?.location,
    id: catalog?.id,
  })
    .then((html) => {
      if (html) pushLoad({ factsHtml: html });
    })
    .catch(() => {});
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
    urls.push(new URL("catalog.json", CF_SCENES));
    urls.push(new URL("catalog.json", S3_SCENES));
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
  pushLoad({ message: "Reading the scene manifest…" });
  const manifest = await loadJSON("scene-manifest.json");
  lastManifest = manifest;
  if (manifest.display_name) {
    document.title = String(manifest.display_name).replace(" — Prototype", "");
    pushLoad({ name: String(manifest.display_name).replace(/\s+[—-]\s+Prototype$/i, "") });
  }
  pushLoad({ message: "Loading the heightfield…" });
  const hfMeta = await loadJSON(manifest.terrain.heightfield_metadata);
  const buf = await (await fetch(new URL(manifest.terrain.heightfield, SCENE_ROOT))).arrayBuffer();
  hf = makeHeightfield(hfMeta, new Uint16Array(buf));

  const snowMat = snowTerrainMaterial(THREE);
  let terrainRoot = null;
  try {
    pushLoad({ message: "Downloading terrain mesh…", pct: 0.02 });
    const gltf = await loadGltf(new URL(manifest.terrain.mesh, SCENE_ROOT).href, (loaded, total) => {
      if (!total) {
        pushLoad({
          message: `Downloading terrain mesh… ${(loaded / (1024 * 1024)).toFixed(0)} MB so far`,
        });
        return;
      }
      const mb = total / (1024 * 1024);
      pushLoad({
        pct: loaded / total,
        sizeHint: mb > 40 ? `About ${mb.toFixed(0)} MB of terrain` : `Terrain ${mb.toFixed(0)} MB`,
        message: `Downloading terrain mesh… ${Math.round((loaded / total) * 100)}%`,
      });
    });
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
  pushLoad({ message: "Draping OSM on the mountain…", pct: 0.92 });
  const osmCounts = await addOsmWorld(THREE, scene, SCENE_ROOT, manifest, drap);
  console.info("OSM world", osmCounts);
  pushLoad({ message: "Readying the run…", pct: 0.98 });

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
  startMark = addStart(THREE, scene, spawnXZ?.x || 0, finY, spawnXZ?.z || 0, 0);
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
  prefetchWikiIndex();
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
  if (TRAILER) return;
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
  if (hf && run && run.phase !== "paused" && !mobile.blocked()) {
    const freeze =
      run.phase === "finished" ||
      run.phase === "dnf" ||
      (run.phase === "ready" && orbit.enabled);
    if (!freeze) {
      acc += frameDt;
      let steps = 0;
      if (TRAILER) steerTrailer(keys, run, skier, heading, !orbit.enabled);
      const turning = isTurning(keys);
      while (acc >= STEP && steps < 5) {
        const extras = TRAILER ? [] : tickNpcSkiers(THREE, npcPack, STEP, skier.position, hf, alongTrack(run.pistePts, skier.position.x, skier.position.z).along);
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
          extras,
        });
        heading = st.heading;
        skier.userData.steer = st.steer;
        skier.userData.air = st.air;
        skier.userData.skid = st.skid || 0;
        skier.userData.pole = !!st.pole;
        if (st.treeHit?.impact > 1) addTrauma(shake, Math.min(0.7, st.treeHit.impact * 0.05));
        if (st.landed > 4) addTrauma(shake, Math.min(0.55, (st.landed - 4) * 0.05));
        const along = alongTrack(run.pistePts, skier.position.x, skier.position.z).along;
        tickRun(run, skier.position, spawnXZ, STEP, vel.length() > 1.5, along);
        tickScore(run, skier.position, vel.length(), turning, STEP, {
          gap: st.treeHit?.gap,
          grazed: st.treeHit?.hit,
          skid: st.skid || 0,
          air: st.air,
          landed: st.landed || 0,
          airTime: st.airTime || 0,
          airDist: st.airDist || 0,
        });
        tickYeti(yeti, run, skier, hf, STEP, spawnXZ);
        acc -= STEP;
        steps += 1;
      }
      updateTrailMarks(marksRoot, alongTrack(run.pistePts, skier.position.x, skier.position.z).along, skier.position);
      const intent = intentsFrom(keys);
      orientSkier(THREE, skier, skier.position, heading, vel, hf, skier.userData.steer || 0, {
        air: skier.userData.air,
        tuck: intent.tuck && !skier.userData.pole,
        pole: !!skier.userData.pole,
        brake: intent.brake,
        speed: vel.length(),
        dt: frameDt,
      });
      applyRunCam();
      applyCamShake(camera, shake, frameDt);
      punchFov(camera, intent.tuck, frameDt, vel.length());
      if (run.phase === "finished" && !finishedShown) {
        finishedShown = true;
        acc = 0;
        const scored = commitBestScore(run);
        if (TRAILER) {
          /* keep rolling for the sting card */
        } else openPanel(ui, "finished", {
          course: courseName,
          time: formatTime(run.time),
          score: formatScore(scored),
          bestScore: run.bestScore != null ? formatScore(run.bestScore) : "—",
          bestTime: run.best != null ? formatTime(run.best) : "—",
        });
      }
      if (run.phase === "dnf" && !dnfShown) {
        dnfShown = true;
        acc = 0;
        if (run.dnfReason === "yeti") skier.visible = false;
        if (!TRAILER) openPanel(ui, "dnf", {
          score: formatScore(run.score),
          time: formatTime(run.time),
          reason: run.dnfReason || "piste",
        });
      }
    }
    const spd = vel.length() * 3.6;
    const tlabel = run.phase === "ready" || !run.clocked ? "0:00.00" : formatTime(run.time);
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
      combo: run.combo || 1,
      clocked: run.clocked && run.phase !== "ready",
      styleFlash: run.styleFlash || "",
      gateFlash: run.gateFlash || "",
      shoutLine: run.shoutLine || "",
      shoutPts: run.shoutPts || 0,
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
  if (run?.phase === "ready" && orbit.enabled) {
    applyLobbyZoom(frameDt);
    orbit.update();
    fitLobbyClip(camera, orbit);
    updateTrailMapLod(trailMap, camera);
  }
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
      start: startMark ? { x: startMark.position.x, z: startMark.position.z } : null,
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
  if (trailerNeedsPaint()) paintTrailerFrame(renderer.domElement);
  dbg.tick(frameDt);
}
requestAnimationFrame(tick);
addEventListener("resize", fitRenderer);

armTrailer({
  renderer,
  orbit,
  keys,
  skier,
  getRun: () => run,
  getHeading: () => heading,
  start: () => onUiAct("start"),
  cyclePov,
  closeHud: () => closePanel(ui),
  cameraPov: () => camera.userData.pov,
  courseName: () => courseName,
  displayName: () => lastManifest?.display_name || courseName,
});

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
      gates: run?.clocked ? "clocked" : "gate",
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

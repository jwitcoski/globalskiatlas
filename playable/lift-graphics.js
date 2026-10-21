import { PALETTE } from "/scripts/clay/config.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const AERIAL_TYPES = new Set(["cable_car", "gondola", "chair_lift", "mixed_lift"]);
const TREE_HEIGHT = 9;
const AERIAL_HEIGHT = 10.5;
const GONDOLA_HEIGHT = 12.5;
/* Sheave centers on tower.glb. The world offset is this times cableHeight / 10.5. */
export const LIFT_LANE = 2.35;

export function liftType(feature) {
  const tags = feature?.properties?.tags || {};
  let t = String(tags.aerialway || feature?.properties?.aerialway || tags.lift_type || "chair_lift")
    .toLowerCase()
    .replace(/-/g, "_");
  if (t === "chairlift") t = "chair_lift";
  if (t === "cablecar") t = "cable_car";
  if (t === "mixedlift") t = "mixed_lift";
  return t;
}

export function isAerialLift(type) {
  return AERIAL_TYPES.has(type);
}

const CARPET_SURFACE = 0.06;
/* Haul and return ropes sit this far apart, and this far above the snow. */
export const ROPE_LANE = 0.45;
export const ROPE_HEIGHT = 1.05;

export function liftCableHeight(type) {
  if (type === "magic_carpet") return CARPET_SURFACE;
  if (type === "rope_tow") return ROPE_HEIGHT;
  if (type === "gondola" || type === "cable_car") return GONDOLA_HEIGHT;
  return isAerialLift(type) ? AERIAL_HEIGHT : TREE_HEIGHT;
}

let terminalColors = null;

function terminalMaterials(THREE) {
  if (terminalColors) return terminalColors;
  const lambert = (color) => new THREE.MeshLambertMaterial({ color });
  terminalColors = {
    dark: lambert(0x2a3038),
    wood: lambert(0xc4a882),
    roof: lambert(0x1c3d66),
    platform: lambert(0xd7dde4),
  };
  return terminalColors;
}

export function makeLiftTerminal(THREE, type, steel, end = "return") {
  const root = new THREE.Group();
  const { dark, wood, roof, platform } = terminalMaterials(THREE);
  const pole = steel || new THREE.MeshLambertMaterial({ color: PALETTE.lift });
  const h = liftCableHeight(type);
  if (type === "magic_carpet") {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 1.45), dark);
    hood.position.set(0, 0.28, -0.4);
    root.add(hood);
    return root;
  }
  if (type === "rope_tow") {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(ROPE_LANE, ROPE_LANE, 0.1, 20), dark);
    wheel.position.y = ROPE_HEIGHT;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), pole);
    hub.position.y = ROPE_HEIGHT;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, ROPE_HEIGHT - 0.05, 6), pole);
    leg.position.y = (ROPE_HEIGHT - 0.05) / 2;
    root.add(wheel, hub, leg);
    if (end === "drive") {
      const hut = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.3), wood);
      hut.position.set(-(ROPE_LANE + 1.35), 0.85, -0.5);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.5), dark);
      lid.position.set(hut.position.x, 1.75, hut.position.z);
      root.add(hut, lid);
    }
    return root;
  }
  if (h < 2) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 2.2), pole);
    housing.position.set(0, 0.7, -1.2);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 2.5), roof);
    lid.position.set(0, 1.48, -1.2);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 3.4), platform);
    deck.position.set(0, 0.08, 0.2);
    root.add(deck, housing, lid);
    return root;
  }
  const lane = LIFT_LANE * (h / AERIAL_HEIGHT);
  const drive = isAerialLift(type) && end === "drive";
  const mastH = h - 0.16;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(drive ? 0.42 : 0.5, drive ? 0.55 : 0.62, mastH, 10), pole);
  mast.position.y = mastH / 2;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(lane, lane, 0.22, 28), dark);
  wheel.position.y = h;
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(lane + 0.1, lane + 0.1, 0.1, 28), dark);
  tire.position.y = h;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.28, 10), pole);
  hub.position.y = h;
  root.add(mast, wheel, tire, hub);
  if (drive) {
    const span = lane * 2 + 1.7;
    const depth = lane * 2.2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(span, 0.16, depth), roof);
    cap.position.set(0, h + 0.95, -lane * 0.35);
    const band = new THREE.Mesh(new THREE.BoxGeometry(span + 0.08, 0.55, depth + 0.08), wood);
    band.position.set(0, h + 0.55, -lane * 0.35);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.85, 8), pole);
    neck.position.y = h + 0.5;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(span + 0.6, 0.14, lane * 1.5), platform);
    deck.position.set(0, 0.07, 0.15);
    root.add(cap, band, neck, deck);
  } else {
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 2.2), wood);
    hut.position.set(-(lane + 2.3), 1.25, -1.4);
    const hutRoof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, 2.5), dark);
    hutRoof.position.set(hut.position.x, 2.57, hut.position.z);
    root.add(hut, hutRoof);
  }
  return root;
}

function makeGondola(THREE, steel, mixed) {
  const cabin = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(mixed ? 0.8 : 1.05, 0.72, 0.72), steel);
  body.position.y = -0.58;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(mixed ? 0.62 : 0.84, 0.4, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x9dd8e8, metalness: 0.2, roughness: 0.22, transparent: true, opacity: 0.82 }),
  );
  glass.position.y = -0.43;
  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), steel);
  hanger.position.y = -0.1;
  cabin.add(hanger, body, glass);
  return cabin;
}

/* Fixed-grip quad, meters below the cable grip; riders face +z (direction of travel). */
const CHAIR_W = 2.2;
const CHAIR_SEAT_Y = -2.6;
const CHAIR_URL = new URL("./assets/models/lift/chair.glb?v=2", import.meta.url).href;
let chairTemplate = null;
let chairLoad = null;
const chairWaiters = [];

function chairLambert(THREE, source) {
  const map = source?.map || null;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map, color: 0xffffff });
}

function prepareChairTemplate(THREE, root) {
  let material = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    material ||= chairLambert(THREE, src);
    o.material = material;
    if (src && src !== material) src.dispose?.();
  });
  chairTemplate = root;
  for (const group of chairWaiters) group.add(chairTemplate.clone(true));
  chairWaiters.length = 0;
}

function loadChair(THREE) {
  if (chairLoad) return chairLoad;
  chairLoad = new GLTFLoader().loadAsync(CHAIR_URL).then(
    (gltf) => prepareChairTemplate(THREE, gltf.scene),
    (err) => console.warn("chair model", err),
  );
  return chairLoad;
}

/** One shared GLB, cloned per chair. The group is what the lift yaws and moves. */
function makeChair(THREE, steel) {
  void steel;
  const chair = new THREE.Group();
  chair.userData.seat = { y: CHAIR_SEAT_Y + 0.05, x: -CHAIR_W * 0.22, z: 0.02 };
  if (chairTemplate) chair.add(chairTemplate.clone(true));
  else {
    chairWaiters.push(chair);
    loadChair(THREE);
  }
  return chair;
}

let carpetMap = null;

function magicCarpetMap(THREE) {
  if (carpetMap) return carpetMap;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  g.fillStyle = "#1a1c20";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#5c6570";
  for (let y = 6; y < 64; y += 16) {
    for (let x = (y / 16) % 2 ? 2 : 10; x < 64; x += 16) {
      g.beginPath();
      g.arc(x, y, 3.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  carpetMap = new THREE.CanvasTexture(canvas);
  carpetMap.wrapS = carpetMap.wrapT = THREE.RepeatWrapping;
  carpetMap.colorSpace = THREE.SRGBColorSpace;
  return carpetMap;
}

/** Continuous belt. Points are already on the visible snow. */
export function makeMagicCarpet(THREE, points) {
  const group = new THREE.Group();
  if (!points || points.length < 2) return group;
  const width = 1.35;
  const rights = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    return { x: tz / len, z: -tx / len };
  });
  const pos = [];
  const uv = [];
  const idx = [];
  let dist = 0;
  for (let i = 0; i < points.length; i++) {
    if (i) dist += points[i].distanceTo(points[i - 1]);
    const p = points[i];
    const r = rights[i];
    const y = p.y + CARPET_SURFACE;
    const hw = width / 2;
    pos.push(p.x - r.x * hw, y, p.z - r.z * hw, p.x + r.x * hw, y, p.z + r.z * hw);
    const v = dist / 0.55;
    uv.push(0, v, 1, v);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const belt = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      map: magicCarpetMap(THREE),
      color: 0xffffff,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  belt.renderOrder = 6;
  belt.userData.snowLift = new Float32Array(points.length * 2).fill(CARPET_SURFACE);
  group.add(belt);
  const railMat = new THREE.MeshLambertMaterial({ color: 0x24282e, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const rp = [];
    const ri = [];
    const extra = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const r = rights[i];
      const x = p.x + r.x * side * (width / 2);
      const z = p.z + r.z * side * (width / 2);
      const y = p.y + CARPET_SURFACE;
      rp.push(x, y, z, x, y + 0.14, z);
      extra.push(CARPET_SURFACE, CARPET_SURFACE + 0.14);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2;
      ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
    railGeo.setIndex(ri);
    railGeo.computeVertexNormals();
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.userData.snowLift = extra;
    rail.renderOrder = 6;
    group.add(rail);
  }
  return group;
}

let ropeMats = null;

function ropeMaterials(THREE) {
  if (ropeMats) return ropeMats;
  ropeMats = {
    rope: new THREE.MeshLambertMaterial({ color: 0xc47a2a, side: THREE.DoubleSide }),
    post: new THREE.MeshLambertMaterial({ color: PALETTE.lift, side: THREE.DoubleSide }),
  };
  return ropeMats;
}

function addRibbon(THREE, parent, pts, mat, y0, y1) {
  if (!pts || pts.length < 2) return;
  const pos = [];
  const extra = [];
  const idx = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    pos.push(p.x, p.y + y0, p.z, p.x, p.y + y1, p.z);
    extra.push(y0, y1);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.snowLift = extra;
  mesh.renderOrder = 6;
  parent.add(mesh);
}

function offsetPoints(points, lane) {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    return { x: p.x + (tz / len) * lane, y: p.y, z: p.z - (tx / len) * lane };
  });
}

/** Two low ropes and short posts. Points are on the ground line. */
export function makeRopeTow(THREE, points) {
  const group = new THREE.Group();
  if (!points || points.length < 2) return group;
  const { rope, post } = ropeMaterials(THREE);
  const half = 0.03;
  for (const lane of [-ROPE_LANE, ROPE_LANE]) {
    addRibbon(THREE, group, offsetPoints(points, lane), rope, ROPE_HEIGHT - half, ROPE_HEIGHT + half);
  }
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  let dist = 0;
  let next = 28;
  const w = 0.045;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = a.distanceTo(b);
    if (seg < 1e-4) continue;
    while (dist + seg >= next && next < total - 14) {
      const t = (next - dist) / seg;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      const rx = tz / len;
      const rz = -tx / len;
      const fx = tx / len;
      const fz = tz / len;
      addRibbon(THREE, group, [
        { x: p.x - rx * w, y: p.y, z: p.z - rz * w },
        { x: p.x + rx * w, y: p.y, z: p.z + rz * w },
      ], post, 0, ROPE_HEIGHT);
      addRibbon(THREE, group, [
        { x: p.x - fx * w, y: p.y, z: p.z - fz * w },
        { x: p.x + fx * w, y: p.y, z: p.z + fz * w },
      ], post, 0, ROPE_HEIGHT);
      addRibbon(THREE, group, [
        { x: p.x - rx * ROPE_LANE, y: p.y, z: p.z - rz * ROPE_LANE },
        { x: p.x + rx * ROPE_LANE, y: p.y, z: p.z + rz * ROPE_LANE },
      ], post, ROPE_HEIGHT - 0.02, ROPE_HEIGHT + 0.04);
      next += 32;
    }
    dist += seg;
  }
  return group;
}

export function makeLiftCarrier(THREE, type, steel) {
  if (type === "cable_car") {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.15, 1.3), steel);
    car.position.y = -1.0;
    return car;
  }
  if (type === "gondola") return makeGondola(THREE, steel, false);
  if (type === "mixed_lift") return makeGondola(THREE, steel, true);
  if (type === "chair_lift") return makeChair(THREE, steel);
  if (type === "magic_carpet") return new THREE.Group();
  if (type === "rope_tow") return new THREE.Group();
  const tow = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 5), steel);
  pole.position.y = -0.38;
  const handle = type === "platter"
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), new THREE.MeshLambertMaterial({ color: 0xd28b2d }))
    : new THREE.Mesh(new THREE.BoxGeometry(type === "t-bar" ? 0.8 : 0.35, 0.05, 0.05), steel);
  handle.position.y = -0.78;
  tow.add(pole, handle);
  return tow;
}

export function makeLiftSkier(THREE, color) {
  const skier = new THREE.Group();
  const suit = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 3, 6), suit);
  body.position.y = 0.18;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe5b895 }));
  head.position.y = 0.52;
  skier.add(body, head);
  return skier;
}
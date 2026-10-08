import { PALETTE } from "/scripts/clay/config.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const AERIAL_TYPES = new Set(["cable_car", "gondola", "chair_lift", "mixed_lift"]);
const TREE_HEIGHT = 9;
const AERIAL_HEIGHT = 10.5;
const GONDOLA_HEIGHT = 12.5;

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

export function liftCableHeight(type) {
  if (type === "magic_carpet") return 0.55;
  if (type === "gondola" || type === "cable_car") return GONDOLA_HEIGHT;
  return isAerialLift(type) ? AERIAL_HEIGHT : TREE_HEIGHT;
}

export function makeLiftTerminal(THREE, type, steel) {
  const root = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x374151, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ color: 0x0f766e, flatShading: true });
  const platform = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
  const pole = steel || new THREE.MeshLambertMaterial({ color: PALETTE.lift, flatShading: true });
  const h = liftCableHeight(type);
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
  const gondola = type === "gondola" || type === "cable_car";
  const lane = gondola ? 3.4 : 2.6;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, h, 6), pole);
  const left = col.clone();
  const right = col.clone();
  left.position.set(-lane, h / 2, 0);
  right.position.set(lane, h / 2, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(lane * 2.4, 0.28, 0.28), dark);
  beam.position.y = h * 0.94;
  const wheelR = gondola ? 1.35 : 1.05;
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.32, 16), dark);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, h, 0.55);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.22, wheelR * 0.22, 0.4, 8), pole);
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(wheel.position);
  const deckH = gondola ? 1.15 : 0.95;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(lane * 3.2, 0.18, gondola ? 6.2 : 4.6), platform);
  deck.position.set(0, deckH, -1.4);
  const houseW = gondola ? 7.2 : 4.4;
  const houseH = gondola ? 3.6 : 2.4;
  const houseD = gondola ? 5.4 : 3.2;
  const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), pole);
  house.position.set(0, houseH * 0.5, -2.6);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(houseW * 1.08, 0.22, houseD * 1.08), roof);
  cap.position.set(0, houseH + 0.12, -2.6);
  const bay = new THREE.Mesh(new THREE.BoxGeometry(houseW * 0.7, houseH * 0.5, 0.12), dark);
  bay.position.set(0, houseH * 0.45, -2.6 + houseD * 0.5);
  root.add(left, right, beam, wheel, hub, deck, house, cap, bay);
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
const CHAIR_SEAT_D = 0.5;
let chairGeo = null;

function chairGeometry(THREE) {
  if (chairGeo) return chairGeo;
  const frame = [];
  const pad = [];
  const box = (list, w, h, d, x, y, z, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx) g.rotateX(rx);
    list.push(g.translate(x, y, z));
  };
  const up = new THREE.Vector3(0, 1, 0);
  const rod = (ax, ay, az, bx, by, bz, r = 0.035) => {
    const a = new THREE.Vector3(ax, ay, az);
    const dir = new THREE.Vector3(bx, by, bz).sub(a);
    const g = new THREE.CylinderGeometry(r, r, dir.length(), 6);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()));
    frame.push(g.translate(ax + dir.x / 2, ay + dir.y / 2, az + dir.z / 2));
  };
  const hw = CHAIR_W / 2;
  const sy = CHAIR_SEAT_Y;
  const backZ = -CHAIR_SEAT_D * 0.5 - 0.05;
  box(frame, 0.22, 0.22, 0.5, 0, -0.05, 0);
  rod(0, -0.1, 0, 0, sy + 0.95, 0, 0.055);
  rod(0, sy + 0.95, 0, 0, sy + 0.72, backZ - 0.08, 0.055);
  rod(-hw, sy + 0.72, backZ - 0.08, hw, sy + 0.72, backZ - 0.08, 0.045);
  box(pad, CHAIR_W - 0.08, 0.1, CHAIR_SEAT_D, 0, sy, 0);
  box(pad, CHAIR_W - 0.08, 0.55, 0.08, 0, sy + 0.36, backZ, -0.16);
  for (const s of [-1, 1]) {
    const x = s * hw;
    rod(x, sy + 0.72, backZ - 0.08, x, sy - 0.06, backZ, 0.04);
    rod(x, sy - 0.06, backZ, x, sy - 0.06, CHAIR_SEAT_D * 0.5, 0.035);
    rod(x, sy + 0.28, backZ, x, sy + 0.28, CHAIR_SEAT_D * 0.4, 0.03);
    rod(x, sy + 0.72, backZ - 0.08, x, sy + 0.42, CHAIR_SEAT_D * 0.75, 0.03);
    rod(s * 0.45, sy + 0.42, CHAIR_SEAT_D * 0.75, s * 0.45, sy - 0.42, CHAIR_SEAT_D * 0.95, 0.025);
  }
  rod(-hw, sy + 0.42, CHAIR_SEAT_D * 0.75, hw, sy + 0.42, CHAIR_SEAT_D * 0.75, 0.035);
  rod(-0.75, sy - 0.42, CHAIR_SEAT_D * 0.95, 0.75, sy - 0.42, CHAIR_SEAT_D * 0.95, 0.04);
  const merge = (list) => {
    const out = mergeGeometries(list.map((g) => g.toNonIndexed()));
    out.computeVertexNormals();
    return out;
  };
  chairGeo = { frame: merge(frame), pad: merge(pad) };
  return chairGeo;
}

let padMat = null;

/** Two meshes per chair (shared geometry), so a long lift costs two draw calls per chair, not fourteen. */
function makeChair(THREE, steel) {
  const g = chairGeometry(THREE);
  padMat ||= new THREE.MeshLambertMaterial({ color: 0x1e3a5f, flatShading: true });
  const chair = new THREE.Group();
  chair.add(new THREE.Mesh(g.frame, steel), new THREE.Mesh(g.pad, padMat));
  chair.userData.seat = { y: CHAIR_SEAT_Y + 0.05, x: -CHAIR_W * 0.22, z: 0.02 };
  return chair;
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
  if (type === "magic_carpet") {
    const carpet = new THREE.Group();
    const belt = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 1.3), new THREE.MeshLambertMaterial({ color: 0xd15b2b }));
    belt.position.y = -0.25;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.12, 0.08), new THREE.MeshLambertMaterial({ color: 0xf0c24b }));
    rail.position.set(0, -0.08, -0.6);
    const rail2 = rail.clone();
    rail2.position.z = 0.6;
    carpet.add(belt, rail, rail2);
    return carpet;
  }
  if (type === "rope_tow") {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.8, 8), new THREE.MeshLambertMaterial({ color: 0xd28b2d }));
    rope.rotation.z = Math.PI / 2;
    rope.position.y = -0.3;
    return rope;
  }
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
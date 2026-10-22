/** Checkpoint gates on the exported OSM centerline. Not an official course.

The marker is a slalom pair (gate.glb): two poles 8 m apart, flags toward the skier.
The hit test is still the 10 m circle around the centerline point. */
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const GATE_HALF_M = 10;
export const GATE_RADIUS_M = 10;
export const GATE_MISS_DNF = 3;
export const GATE_BONUS = 420;

export function polylineLen(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return n;
}

export function alongPolyline(pts, dist) {
  let left = Math.max(0, dist);
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const az = pts[i - 1].z;
    const bx = pts[i].x;
    const bz = pts[i].z;
    const seg = Math.hypot(bx - ax, bz - az) || 1e-6;
    if (left <= seg) {
      const t = left / seg;
      const tx = (bx - ax) / seg;
      const tz = (bz - az) / seg;
      return { x: ax + tx * left, z: az + tz * left, tx, tz, along: dist };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  const seg = Math.hypot(last.x - prev.x, last.z - prev.z) || 1;
  return { x: last.x, z: last.z, tx: (last.x - prev.x) / seg, tz: (last.z - prev.z) / seg, along: dist };
}

export function alongTrack(pts, x, z) {
  let best = Infinity;
  let along = 0;
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const az = pts[i - 1].z;
    const bx = pts[i].x;
    const bz = pts[i].z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    const len = Math.sqrt(len2);
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      along = walked + t * len;
    }
    walked += len;
  }
  return { along, dist: best };
}

export function orientPiste(pts, start, finish) {
  if (!pts || pts.length < 2 || !start) return pts || [];
  const last = pts[pts.length - 1];
  const fx = finish?.x ?? last.x;
  const fz = finish?.z ?? last.z;
  const a =
    Math.hypot(pts[0].x - start.x, pts[0].z - start.z) + Math.hypot(last.x - fx, last.z - fz);
  const b =
    Math.hypot(last.x - start.x, last.z - start.z) + Math.hypot(pts[0].x - fx, pts[0].z - fz);
  return a <= b ? pts : [...pts].reverse();
}

export function placeGates(pts) {
  const total = polylineLen(pts);
  const start = Math.min(70, total * 0.12);
  const end = Math.max(start + 40, total - 45);
  const usable = Math.max(40, end - start);
  const count = Math.max(5, Math.min(12, Math.round(usable / 95)));
  const step = usable / count;
  const gates = [];
  for (let i = 0; i < count; i++) {
    const s = start + step * (i + 0.5);
    const p = alongPolyline(pts, s);
    const nx = -p.tz;
    const nz = p.tx;
    gates.push({
      i,
      along: p.along,
      x: p.x,
      z: p.z,
      nx,
      nz,
      tx: p.tx,
      tz: p.tz,
      r: GATE_RADIUS_M,
      state: "next",
      mesh: null,
    });
  }
  if (gates[0]) gates[0].state = "next";
  for (let i = 1; i < gates.length; i++) gates[i].state = "wait";
  return gates;
}

export function resetGates(run) {
  run.gateHit = 0;
  run.gateMiss = 0;
  run.gateIndex = 0;
  run.gateFlash = "";
  run.dnfReason = "";
  for (let i = 0; i < (run.gates || []).length; i++) {
    run.gates[i].state = i === 0 ? "next" : "wait";
    paintGate(run.gates[i]);
  }
}

function inPad(g, pos) {
  return Math.hypot(pos.x - g.x, pos.z - g.z) <= (g.r || GATE_RADIUS_M);
}

export function tickGates(run, pos) {
  if (run.phase !== "running" || !run.gates?.length) return run;
  const g = run.gates[run.gateIndex];
  if (!g) return run;
  const tr = alongTrack(run.pistePts, pos.x, pos.z);
  const past = tr.along - g.along;
  const r = g.r || GATE_RADIUS_M;
  if (inPad(g, pos)) {
    g.state = "hit";
    paintGate(g);
    run.gateHit += 1;
    run.score += GATE_BONUS;
    run.gateFlash = "HIT";
    run.gateIndex += 1;
    if (run.gates[run.gateIndex]) {
      run.gates[run.gateIndex].state = "next";
      paintGate(run.gates[run.gateIndex]);
    }
    return run;
  }
  if (past > r + 8) {
    g.state = "miss";
    paintGate(g);
    run.gateMiss += 1;
    run.gateFlash = "MISS";
    run.gateIndex += 1;
    run.yetiBoost = (run.yetiBoost || 0) + 1.8;
    if (run.gateMiss >= GATE_MISS_DNF) run.yetiWanted = true;
    if (run.gates[run.gateIndex]) {
      run.gates[run.gateIndex].state = "next";
      paintGate(run.gates[run.gateIndex]);
    }
  }
  return run;
}

const GATE_LOOK = {
  hit: [0x2ee66a, 0.22],
  miss: [0xff3b3b, 0.28],
  next: [0x1f78d1, 0.16],
  wait: [0x93a8b6, 0.03],
};

function paintGate(g) {
  const mat = g.mesh?.userData.tint;
  if (!mat) return;
  const [hex, emi] = GATE_LOOK[g.state] || GATE_LOOK.wait;
  mat.color.setHex(hex);
  mat.emissive.setHex(hex);
  mat.emissiveIntensity = emi;
}

const GATE_URL = new URL("./assets/models/gate/gate.glb?v=2", import.meta.url).href;
const POLE_SPAN = 4;
let _poleWorld = null;
let gateTemplate = null;
let gateLoad = null;
const gateWaiters = [];

function hardwareLambert(THREE, source) {
  const map = source?.map || null;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map, color: 0xffffff });
}

function dressPole(THREE, pole, tint) {
  pole.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry = o.geometry.clone();
    const prev = o.material;
    o.castShadow = true;
    o.receiveShadow = false;
    if (o.name === "GateTint") o.material = tint;
    else {
      const src = Array.isArray(prev) ? prev[0] : prev;
      o.material = hardwareLambert(THREE, src);
    }
    if (prev && prev !== o.material) {
      const list = Array.isArray(prev) ? prev : [prev];
      for (const m of list) m.dispose?.();
    }
  });
}

/* Local Y is world up (the gate only yaws). Drop the pole origin onto the snow under it. */
function dropPole(THREE, grp, pole, elevFn) {
  _poleWorld = _poleWorld || new THREE.Vector3();
  const base = pole.userData.baseY || 0;
  pole.position.y = base;
  pole.updateWorldMatrix(true, false);
  pole.getWorldPosition(_poleWorld);
  pole.position.y = base + elevFn(_poleWorld.x, _poleWorld.z) - grp.position.y;
}

function stickGate(THREE, grp) {
  const tint = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 });
  const elevFn = grp.userData.elev;
  for (const side of [1, -1]) {
    const pole = gateTemplate.clone(true);
    pole.position.set(side * POLE_SPAN, 0, 0);
    if (side < 0) pole.rotation.y = Math.PI;
    dressPole(THREE, pole, tint);
    grp.add(pole);
    dropPole(THREE, grp, pole, elevFn);
  }
  grp.userData.tint = tint;
  paintGate(grp.userData.gate);
}

function fallbackGate(THREE, grp) {
  const tint = new THREE.MeshLambertMaterial({ color: 0x1f78d1, emissive: 0x1f78d1, emissiveIntensity: 0.16 });
  const geo = new THREE.CylinderGeometry(0.036, 0.036, 1.8, 12);
  const elevFn = grp.userData.elev;
  for (const side of [1, -1]) {
    const pole = new THREE.Mesh(geo, tint);
    pole.position.set(side * POLE_SPAN, 0, 0);
    pole.userData.baseY = 0.9;
    pole.castShadow = true;
    grp.add(pole);
    dropPole(THREE, grp, pole, elevFn);
  }
  grp.userData.tint = tint;
  paintGate(grp.userData.gate);
}

function mountGates(THREE, root) {
  if (gateTemplate) {
    for (const grp of root.children) stickGate(THREE, grp);
    return;
  }
  gateWaiters.push(root);
  if (gateLoad) return;
  gateLoad = new GLTFLoader()
    .loadAsync(GATE_URL)
    .then((gltf) => {
      const found = {};
      gltf.scene.traverse((o) => {
        if (o.name === "GateTint" || o.name === "GateHardware") found[o.name] = o;
      });
      const template = new THREE.Group();
      for (const mesh of Object.values(found)) {
        mesh.parent?.remove(mesh);
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        template.add(mesh);
      }
      gateTemplate = template;
      for (const pending of gateWaiters.splice(0)) {
        for (const grp of pending.children) stickGate(THREE, grp);
      }
    })
    .catch((err) => {
      console.warn("gate glb", err);
      gateLoad = null;
      for (const pending of gateWaiters.splice(0)) {
        for (const grp of pending.children) fallbackGate(THREE, grp);
      }
    });
}

export function clearGateMeshes(root) {
  if (!root) return;
  const waiting = gateWaiters.indexOf(root);
  if (waiting >= 0) gateWaiters.splice(waiting, 1);
  root.removeFromParent();
  root.traverse((o) => {
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    else o.material?.dispose?.();
  });
}

export function addGateMeshes(THREE, scene, gates, elevFn) {
  const root = new THREE.Group();
  root.name = "gates";
  for (const g of gates) {
    const grp = new THREE.Group();
    grp.position.set(g.x, elevFn(g.x, g.z), g.z);
    grp.rotation.y = Math.atan2(g.tx || 0, g.tz || 1);
    grp.userData.gate = g;
    grp.userData.elev = elevFn;
    g.mesh = grp;
    root.add(grp);
  }
  scene.add(root);
  mountGates(THREE, root);
  return root;
}

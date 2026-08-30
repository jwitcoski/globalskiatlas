/** Circular checkpoint pads on the exported OSM centerline. Not an official course. */

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

function tint(mat, hex, opacity, emissive, emi) {
  if (!mat) return;
  mat.color.setHex(hex);
  if (opacity != null && mat.opacity != null) mat.opacity = opacity;
  if (mat.emissive) {
    mat.emissive.setHex(emissive ?? hex);
    mat.emissiveIntensity = emi ?? 0.35;
  }
}

function paintGate(g) {
  const m = g.mesh;
  if (!m) return;
  const ring = m.userData.ring;
  const disc = m.userData.disc;
  if (g.state === "hit") {
    tint(ring?.material, 0x2ee66a, 1, 0x145c32, 0.85);
    tint(disc?.material, 0x3dff7a, 0.42, 0x1a8a40, 0.4);
  } else if (g.state === "miss") {
    tint(ring?.material, 0xff3b3b, 1, 0x8a1010, 0.9);
    tint(disc?.material, 0xff5555, 0.4, 0x8a1010, 0.45);
  } else if (g.state === "next") {
    tint(ring?.material, 0xc8f4ff, 1, 0x3aa8c8, 0.55);
    tint(disc?.material, 0x9ee8ff, 0.28, 0x2a88a8, 0.25);
  } else {
    tint(ring?.material, 0x8eb8c8, 0.55, 0x1a3844, 0.12);
    tint(disc?.material, 0x7aa8b8, 0.1, 0x1a3844, 0.05);
  }
}

export function clearGateMeshes(root) {
  if (!root) return;
  root.removeFromParent();
  root.traverse((o) => {
    o.geometry?.dispose?.();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
    else o.material?.dispose?.();
  });
}

export function addGateMeshes(THREE, scene, gates, elevFn) {
  const root = new THREE.Group();
  const ringG = new THREE.TorusGeometry(GATE_RADIUS_M, 0.32, 8, 40);
  const discG = new THREE.CircleGeometry(GATE_RADIUS_M - 0.4, 32);
  for (const g of gates) {
    const y = elevFn(g.x, g.z);
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(
      ringG,
      new THREE.MeshStandardMaterial({
        color: 0x8eb8c8,
        roughness: 0.42,
        metalness: 0.12,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        emissive: 0x1a3844,
        emissiveIntensity: 0.12,
        envMap: scene.userData.envMap || null,
        envMapIntensity: 0.4,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    const disc = new THREE.Mesh(
      discG,
      new THREE.MeshBasicMaterial({
        color: 0x7aa8b8,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.12;
    disc.renderOrder = 2;
    grp.add(disc, ring);
    grp.position.set(g.x, y, g.z);
    grp.userData.ring = ring;
    grp.userData.disc = disc;
    g.mesh = grp;
    paintGate(g);
    root.add(grp);
  }
  scene.add(root);
  return root;
}

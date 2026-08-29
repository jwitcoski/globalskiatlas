/** Two-groove ski track draped on the DEM. Fades with age; cleared on restart. */

const MAX = 340;
const SPACING = 0.38;
const GAP = 0.19;
const HALF = 0.075;
const SINK = 0.02;
const LIFE_S = 22;

export function createSkiWake(THREE, scene) {
  const verts = MAX * 4;
  const pos = new Float32Array(verts * 3);
  const col = new Float32Array(verts * 3);
  const idx = [];
  for (let i = 0; i < MAX - 1; i++) {
    for (let g = 0; g < 2; g++) {
      const a = i * 4 + g * 2;
      const b = a + 1;
      const c = a + 4;
      const d = a + 5;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, pos, col, samples: [], dist: 0, last: null };
}

export function clearSkiWake(wake) {
  if (!wake) return;
  wake.samples.length = 0;
  wake.dist = 0;
  wake.last = null;
  wake.mesh.visible = false;
}

export function pushSkiWake(wake, hf, x, z, heading, speed, dt, active) {
  if (!wake || !hf) return;
  if (!active || speed < 2.2) {
    wake.dist = 0;
    return;
  }
  const last = wake.last;
  if (last) wake.dist += Math.hypot(x - last.x, z - last.z);
  else wake.dist = SPACING;
  if (wake.dist < SPACING) return;
  wake.dist = 0;
  wake.last = { x, z };
  wake.samples.push({ x, z, heading, t: 0 });
  if (wake.samples.length > MAX) wake.samples.shift();
}

export function updateSkiWake(wake, hf, dt) {
  if (!wake || !hf) return;
  const n = wake.samples.length;
  if (n < 2) {
    wake.mesh.visible = false;
    return;
  }
  wake.mesh.visible = true;
  const pos = wake.pos;
  const col = wake.col;
  for (let i = 0; i < n; i++) {
    const s = wake.samples[i];
    s.t += dt;
    /* Fresh grooves are dark blue shadow; old ones fade up into the snow and vanish. */
    const age = Math.min(1, s.t / LIFE_S);
    const f = age * age;
    const hx = Math.sin(s.heading);
    const hz = Math.cos(s.heading);
    const px = -hz;
    const pz = hx;
    const y = hf.sample(s.x, s.z) - SINK;
    const i4 = i * 4;
    const grooves = [
      [-GAP, -GAP - HALF],
      [GAP, GAP + HALF],
    ];
    for (let g = 0; g < 2; g++) {
      for (let e = 0; e < 2; e++) {
        const w = grooves[g][e];
        const vi = i4 + g * 2 + e;
        pos[vi * 3] = s.x + px * w;
        pos[vi * 3 + 1] = y;
        pos[vi * 3 + 2] = s.z + pz * w;
        col[vi * 3] = 0.32 + 0.66 * f;
        col[vi * 3 + 1] = 0.39 + 0.59 * f;
        col[vi * 3 + 2] = 0.5 + 0.48 * f;
      }
    }
  }
  for (let i = n; i < MAX; i++) {
    const i4 = i * 4;
    for (let k = 0; k < 4; k++) {
      const vi = i4 + k;
      pos[vi * 3 + 1] = -9999;
      col[vi * 3] = 0;
      col[vi * 3 + 1] = 0;
      col[vi * 3 + 2] = 0;
    }
  }
  wake.mesh.geometry.attributes.position.needsUpdate = true;
  wake.mesh.geometry.attributes.color.needsUpdate = true;
  wake.mesh.geometry.setDrawRange(0, Math.max(0, (n - 1) * 12));
  wake.mesh.geometry.computeBoundingSphere();
}

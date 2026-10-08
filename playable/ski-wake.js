/** Two-groove powder track draped on the DEM. Fades with age and toward the tail; cleared on restart. */

const MAX = 340;
const SPACING = 0.38;
const GAP = 0.2;
const GROOVE = 0.07;
const LIP = 0.06;
/* Just above the piste snow drape (lifted 0.08 in osm-world); below it the grooves z-fight into dots. */
const LIFT = 0.1;
const LIFE_S = 22;
/* Multiply factors on the lit snow: <1 darkens the groove (stays blue in shade), >1 lifts the lip on float targets. */
const FLOOR = [0.72, 0.8, 0.94];
const LIP_GAIN = 1.07;
const WALL_SUN = 0.1;
const TAIL = 0.3;
/* Cross-section across one groove, outer soft edge to outer soft edge. */
const XS = [-GROOVE - LIP, -GROOVE, -GROOVE * 0.35, GROOVE * 0.35, GROOVE, GROOVE + LIP];
const NX = XS.length;
const PER = NX * 2;

export function createSkiWake(THREE, scene, sun) {
  const verts = MAX * PER;
  const pos = new Float32Array(verts * 3);
  const col = new Float32Array(verts * 3).fill(1);
  const idx = [];
  for (let i = 0; i < MAX - 1; i++) {
    for (let g = 0; g < 2; g++) {
      for (let k = 0; k < NX - 1; k++) {
        const a = i * PER + g * NX + k;
        const b = a + 1;
        const c = a + PER;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
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
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      fog: false,
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
  const sp = sun?.position;
  const sl = sp ? Math.hypot(sp.x, sp.z) || 1 : 1;
  return { mesh, pos, col, samples: [], dist: 0, last: null, sunX: sp ? sp.x / sl : 0, sunZ: sp ? sp.z / sl : 0 };
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

/** 0..1 strength of a sample: smooth age fade, plus the oldest TAIL of a full buffer fading so shift() never pops. */
export function wakeStrength(age, i, n) {
  const a = Math.min(1, age / LIFE_S);
  const life = 1 - a * a * (3 - 2 * a);
  const tail = Math.min(1, i / (MAX * TAIL));
  return life * (n >= MAX * TAIL ? tail : 1);
}

/** Multiply factor for cross-section slot k: soft outer edge, raised lip, shaded floor whose sun-facing wall reads lighter. */
export function wakeShade(k, sunSide, out) {
  if (k === 0 || k === NX - 1) return out.fill(1);
  if (k === 1 || k === NX - 2) return out.fill(LIP_GAIN);
  /* Left floor slot (k = 2) sits under the wall whose normal points +perp; sunSide > 0 means that wall faces the sun. */
  const lit = (k === 2 ? sunSide : -sunSide) * WALL_SUN;
  for (let c = 0; c < 3; c++) out[c] = Math.min(1, FLOOR[c] + lit);
  return out;
}

const shade = [1, 1, 1];

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
    const k = wakeStrength(s.t, i, n);
    const hx = Math.sin(s.heading);
    const hz = Math.cos(s.heading);
    const px = -hz;
    const pz = hx;
    const sunSide = px * wake.sunX + pz * wake.sunZ;
    const y = hf.sample(s.x, s.z) + LIFT;
    for (let g = 0; g < 2; g++) {
      const c = g ? GAP : -GAP;
      for (let x = 0; x < NX; x++) {
        const w = c + XS[x];
        const vi = i * PER + g * NX + x;
        pos[vi * 3] = s.x + px * w;
        pos[vi * 3 + 1] = y;
        pos[vi * 3 + 2] = s.z + pz * w;
        wakeShade(x, sunSide, shade);
        col[vi * 3] = 1 + (shade[0] - 1) * k;
        col[vi * 3 + 1] = 1 + (shade[1] - 1) * k;
        col[vi * 3 + 2] = 1 + (shade[2] - 1) * k;
      }
    }
  }
  for (let vi = n * PER; vi < MAX * PER; vi++) {
    pos[vi * 3 + 1] = -9999;
    col[vi * 3] = col[vi * 3 + 1] = col[vi * 3 + 2] = 1;
  }
  wake.mesh.geometry.attributes.position.needsUpdate = true;
  wake.mesh.geometry.attributes.color.needsUpdate = true;
  wake.mesh.geometry.setDrawRange(0, Math.max(0, (n - 1) * 2 * (NX - 1) * 6));
  wake.mesh.geometry.computeBoundingSphere();
}

function selfCheck() {
  const ok = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  ok(wakeStrength(0, MAX - 1, MAX) > 0.99, "fresh head not full");
  ok(wakeStrength(LIFE_S, MAX - 1, MAX) < 0.01, "old sample not faded");
  ok(wakeStrength(0, 0, MAX) < 0.01, "full-buffer tail pops instead of fading");
  ok(wakeStrength(0, 0, 10) > 0.99, "short wake should not tail-fade");
  const o = [0, 0, 0];
  ok(wakeShade(0, 0, o)[0] === 1 && wakeShade(NX - 1, 0, o)[2] === 1, "outer edge not soft");
  ok(wakeShade(1, 0, o)[0] > 1, "lip not raised");
  const l = wakeShade(2, 1, [0, 0, 0])[1];
  const r = wakeShade(3, 1, [0, 0, 0])[1];
  ok(l > r && r < 1, `sun wall ${l} vs shade wall ${r}`);
  ok(wakeShade(2, 0, o)[2] > wakeShade(2, 0, o)[0], "floor not blue-shifted");
  console.log("ski-wake.js ok");
}

const argv1 = typeof process !== "undefined" ? String(process.argv?.[1] || "").replace(/\\/g, "/") : "";
if (argv1.endsWith("/ski-wake.js")) selfCheck();

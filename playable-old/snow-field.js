/** CPU snow depth. Deterministic from the run seed: no Math.random. */

const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Weights: mogul, rut, chop, pile, loose, windrow, zone. */
export const SNOW_COND = {
  fresh: { mogul: 0, rut: 0, chop: 0, pile: 0, loose: 0, windrow: 0.14, zone: 0 },
  bumpy: { mogul: 0.27, rut: 0.13, chop: 0.06, pile: 0.16, loose: 0.24, windrow: 0.16, zone: 0.5 },
  moguls: { mogul: 0.52, rut: 0.22, chop: 0.07, pile: 0.18, loose: 0.32, windrow: 0.18, zone: 0.78 },
};

const MOGUL_X = 4.6;
const MOGUL_Z = 3.9;
const EMPTY = { d: 0, rough: 0, mogul: 0, worn: 0, loose: 0 };

let cond = "fresh";
let detail = 1;
const field = { seed: 1, segs: null, polys: null, buckets: null };

/** Unsigned integer hash. Same inputs always return the same uint32. */
export function te(i, j, seed) {
  let n = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function u01(i, j, seed) {
  return te(i, j, seed) / 4294967296;
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function simplex2(xin, zin, seed) {
  const F2 = 0.3660254037844386;
  const G2 = 0.21132486540518713;
  const s = (xin + zin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(zin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t);
  const z0 = zin - (j - t);
  const i1 = x0 > z0 ? 1 : 0;
  const j1 = x0 > z0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const z1 = z0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const z2 = z0 - 1 + 2 * G2;
  const contrib = (dx, dz, ii, jj) => {
    let t0 = 0.5 - dx * dx - dz * dz;
    if (t0 < 0) return 0;
    t0 *= t0;
    const g = GRAD[te(ii, jj, seed) & 7];
    return t0 * t0 * (g[0] * dx + g[1] * dz);
  };
  return 70 * (contrib(x0, z0, i, j) + contrib(x1, z1, i + i1, j + j1) + contrib(x2, z2, i + 1, j + 1));
}

function vnoise(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = u01(x0, z0, seed);
  const b = u01(x0 + 1, z0, seed);
  const c = u01(x0, z0 + 1, seed);
  const d = u01(x0 + 1, z0 + 1, seed);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}

export function setSnowCondition(name) {
  if (!SNOW_COND[name]) return cond;
  cond = name;
  return cond;
}

export function getSnowCondition() {
  return cond;
}

export function setSnowDetail(v) {
  detail = v ? 1 : 0;
}

function readCond() {
  if (typeof location === "undefined") return;
  const q = new URLSearchParams(location.search).get("snowcond");
  if (SNOW_COND[q]) cond = q;
}

function kindOf(diff) {
  const s = String(diff || "").toLowerCase();
  if (/easy|novice|beginner/.test(s)) return 1;
  if (/advanced|expert|freeride|extreme/.test(s)) return 3;
  return 2;
}

function pointIn(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const zi = ring[i].z;
    const xj = ring[j].x;
    const zj = ring[j].z;
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function segDist(s, x, z) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
}

function segHit(s, x, z) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((x - s.ax) * dx + (z - s.az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = s.ax + dx * t;
  const pz = s.az + dz * t;
  const dist = Math.hypot(x - px, z - pz);
  const cross = dx * (z - s.az) - dz * (x - s.ax);
  const lateral = (cross < 0 ? -1 : 1) * dist;
  const fromEnd = s.fromEndAtA + s.endSign * t * s.len;
  const along = s.along0 + t * s.len;
  return { dist, lateral, t, fromEnd, along, half: s.half, slope: s.slope, curv: s.curv, kind: s.kind };
}

function indexRuns(cover, elev) {
  const segs = [];
  const polys = [];
  for (const it of cover?.items || []) {
    const kind = kindOf(it.difficulty);
    const line = it.coordsEN;
    const ring = it.snow?.length >= 3 ? it.snow : it.bare;
    if (line?.length >= 2) {
      const pts = line.map(([e, n]) => ({ x: e, z: -n, y: elev ? elev(e, -n) : 0 }));
      const lens = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
        lens.push(len);
        total += len;
      }
      const flip = pts[pts.length - 1].y > pts[0].y + 1;
      let along = 0;
      for (let i = 0; i < lens.length; i++) {
        const len = Math.max(lens[i], 1e-4);
        const a = pts[i];
        const b = pts[i + 1];
        const hdg = Math.atan2(b.x - a.x, b.z - a.z);
        const prev = i > 0 ? Math.atan2(a.x - pts[i - 1].x, a.z - pts[i - 1].z) : hdg;
        let dh = hdg - prev;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        segs.push({
          ax: a.x,
          az: a.z,
          bx: b.x,
          bz: b.z,
          len,
          half: it.half || 15,
          kind,
          slope: Math.min(1, Math.abs(b.y - a.y) / len),
          curv: Math.abs(dh) / len,
          fromEndAtA: flip ? along : total - along,
          endSign: flip ? 1 : -1,
          along0: along,
        });
        along += len;
      }
    } else if (ring?.length >= 3) {
      polys.push({ ring, kind });
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        if (len < 1e-3) continue;
        segs.push({
          ax: a.x,
          az: a.z,
          bx: b.x,
          bz: b.z,
          len,
          half: 0,
          kind,
          slope: 0.35,
          curv: 0.02,
          fromEndAtA: 220,
          endSign: 0,
          along0: 0,
        });
      }
    }
  }
  const cell = 24;
  const map = new Map();
  for (const s of segs) {
    const x0 = Math.floor(Math.min(s.ax, s.bx) / cell) - 1;
    const x1 = Math.floor(Math.max(s.ax, s.bx) / cell) + 1;
    const z0 = Math.floor(Math.min(s.az, s.bz) / cell) - 1;
    const z1 = Math.floor(Math.max(s.az, s.bz) / cell) + 1;
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const k = `${ix},${iz}`;
        const list = map.get(k);
        if (list) list.push(s);
        else map.set(k, [s]);
      }
    }
  }
  return { segs, polys, buckets: { cell, map } };
}

export function snowSeed(cover) {
  const it = cover?.items?.[0];
  const p = it?.coordsEN?.[0] || it?.bare?.[0];
  const x = Math.round(p?.x ?? p?.[0] ?? 1);
  const z = Math.round(p?.z ?? p?.[1] ?? 1);
  return te(x, z, 0x51ed) || 1;
}

/** Index piste lines so sampleSnow can find edges, slope, and distance from the run end. */
export function bindSnowField(cover, seed = 1, elev = null) {
  readCond();
  field.seed = seed | 0 || 1;
  const idx = indexRuns(cover, elev);
  field.segs = idx.segs;
  field.polys = idx.polys;
  field.buckets = idx.buckets;
}

function nearest(x, z) {
  const b = field.buckets;
  if (!b) return null;
  const ix = Math.floor(x / b.cell);
  const iz = Math.floor(z / b.cell);
  let bestSeg = null;
  let bestD = 32;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const list = b.map.get(`${ix + dx},${iz + dz}`);
      if (!list) continue;
      for (const s of list) {
        const d = segDist(s, x, z);
        if (d < bestD) {
          bestD = d;
          bestSeg = s;
        }
      }
    }
  }
  return bestSeg ? segHit(bestSeg, x, z) : null;
}

function mogulField(x, z, seed) {
  const row = Math.floor(z / MOGUL_Z);
  let h = 0;
  for (let dj = -1; dj <= 1; dj++) {
    const j = row + dj;
    const stag = j & 1 ? MOGUL_X * 0.5 : 0;
    const col = Math.floor((x - stag) / MOGUL_X);
    for (let di = -1; di <= 1; di++) {
      const i = col + di;
      const hx = u01(i, j, seed);
      const hz = u01(i, j, seed ^ 0x9e3779b9);
      const hs = u01(i, j, seed ^ 0x85ebca6b);
      const cx = (i + 0.5 + (hx - 0.5) * 0.45) * MOGUL_X + stag;
      const cz = (j + 0.5 + (hz - 0.5) * 0.35) * MOGUL_Z;
      const rx = 1.55 + hs * 0.7;
      const rz = 1.25 + (1 - hs) * 0.55;
      const r = Math.hypot((x - cx) / rx, (z - cz) / rz);
      if (r >= 1) continue;
      const t = 1 - r * r;
      h = Math.max(h, t * t * (0.72 + hs * 0.28));
    }
  }
  return h;
}

/**
 * Snow at a world xz point.
 * d is meters of displacement, mogul is the unweighted bump 0..1,
 * rough and worn are 0..1 for the shader and for friction.
 */
export function sampleSnow(x, z) {
  if (!field.segs) return { d: 0, rough: 0, mogul: 0, worn: 0, loose: 0 };
  const w = SNOW_COND[cond] || SNOW_COND.fresh;
  const seed = field.seed;
  const hit = nearest(x, z);
  const on = !!(hit && hit.dist < hit.half + 1.2);
  const mogul = on ? mogulField(x, z, seed) : 0;
  let wind = 0;
  if (hit && hit.dist < hit.half + 4) {
    const t = (hit.dist - hit.half - 0.75) / 1.15;
    if (t > -1 && t < 1) {
      const u = 1 - t * t;
      wind = u * u;
    }
  }
  const z1 = vnoise(x / 270, z / 270, seed + 3);
  const z2 = vnoise(x / 190, z / 190, seed + 11);
  const zoneGate = w.zone <= 0 ? 0 : smoothstep(0.42, 0.68, z1 * 0.55 + z2 * 0.45) * Math.min(1, w.zone / 0.78);
  const wearIn = hit ? smoothstep(40, 190, hit.fromEnd) : 0;
  const wear = on ? wearIn * zoneGate * (0.4 + 0.6 * hit.slope) * (0.55 + 0.45 * Math.min(1, hit.curv * 28)) : 0;
  const along = hit ? hit.along : x;
  const rutN = hit ? Math.pow(Math.max(0, Math.sin(along * 1.9)), 6) * vnoise(x / 7, z / 7, seed + 5) : 0;
  const chopN = Math.abs(vnoise(x / 2.4, z / 2.4, seed + 17) * 2 - 1);
  const pileN = vnoise(x / 6.5, z / 6.5, seed + 29) ** 2;
  const looseN = vnoise(x / 9, z / 9, seed + 41);
  const loose = looseN * w.loose * (on ? 0.22 : 0.38);
  let d = mogul * w.mogul * 0.95 + wind * w.windrow * 0.9;
  d += pileN * w.pile * wear * 0.45;
  d += (chopN - 0.5) * w.chop * wear * 0.16;
  d -= rutN * w.rut * wear * 0.55;
  d += (looseN - 0.5) * w.loose * 0.08;
  /* ponytail: clamp keeps a bad weight from throwing the skier; raise the cap if a preset needs taller bumps. */
  d = Math.max(-0.55, Math.min(1.15, d));
  const rough = clamp01(mogul * Math.min(1, w.mogul * 1.8) + chopN * w.chop * wear * 4 + rutN * w.rut * wear * 3 + looseN * w.loose);
  const worn = clamp01(wear * (0.35 + 0.65 * Math.max(rutN, chopN)));
  return { d, rough, mogul: w.mogul > 0 ? mogul : 0, worn, loose };
}

export function snowAt(x, z) {
  return sampleSnow(x, z);
}

export function powderDepth(x, z) {
  return sampleSnow(x, z).loose;
}

function boxBlur(src, cols, rows, rad) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const r = Math.max(1, rad | 0);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let s = 0;
      let n = 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(cols - 1, x + r);
      for (let xx = x0; xx <= x1; xx++) {
        s += src[y * cols + xx];
        n += 1;
      }
      tmp[y * cols + x] = s / n;
    }
  }
  for (let y = 0; y < rows; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(rows - 1, y + r);
    for (let x = 0; x < cols; x++) {
      let s = 0;
      let n = 0;
      for (let yy = y0; yy <= y1; yy++) {
        s += tmp[yy * cols + x];
        n += 1;
      }
      out[y * cols + x] = s / n;
    }
  }
  return out;
}

/**
 * Blend smoothed copies of an elevation grid by a piste mask.
 * mask: 0 off-piste, 1 easy groomed, 2 other groomed, 3 advanced.
 * lateral: signed meters from the centerline (bank tilt on mask 2).
 */
export function shapeSnow(heights, { cols, rows, cell, mask, lateral, originX, originZ, seed, detail: det }) {
  const easy = boxBlur(heights, cols, rows, Math.max(1, Math.round(28 / cell)));
  const bank = boxBlur(heights, cols, rows, Math.max(1, Math.round(10 / cell)));
  const noiseOn = det !== 0;
  for (let i = 0; i < heights.length; i++) {
    const m = mask ? mask[i] : 0;
    if (m === 1) heights[i] = heights[i] * 0.15 + easy[i] * 0.85;
    else if (m === 2) {
      const tilt = Math.max(-0.35, Math.min(0.35, ((lateral && lateral[i]) || 0) * 0.02));
      heights[i] = heights[i] * 0.55 + bank[i] * 0.45 + tilt;
    } else if (m === 3) {
      /* advanced: leave the surveyed slope */
    } else if (noiseOn) {
      const x = originX + (i % cols) * cell;
      const z = originZ + Math.floor(i / cols) * cell;
      heights[i] += simplex2(x / 34, z / 34, seed) * 0.42 + simplex2(x / 16, z / 16, seed + 19) * 0.16;
    }
  }
  return heights;
}

function cellOf(hf, x, z) {
  const c = Math.round(x / hf.cell - 0.5);
  const maxN = -hf.bounds.minZ;
  const r = Math.round((maxN + z) / hf.cell - 0.5);
  return { r, c };
}

/** Write the shaping delta into the heightfield overlay before meshes are built. */
export function shapeHeightfield(hf) {
  if (!hf?.overlay || !field.segs) return;
  const { rows, cols, cell } = hf;
  const n = rows * cols;
  const heights = new Float32Array(n);
  const base = new Float32Array(n);
  const mask = new Float32Array(n);
  const lateral = new Float32Array(n);
  const best = new Float32Array(n);
  best.fill(1e9);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const p = hf.cellXZ(r, c);
      base[i] = hf.sampleBase(p.x, p.z);
      heights[i] = base[i];
    }
  }
  for (const s of field.segs) {
    if (!(s.half > 0)) continue;
    const pad = s.half + cell;
    const a = cellOf(hf, Math.min(s.ax, s.bx) - pad, Math.min(s.az, s.bz) - pad);
    const b = cellOf(hf, Math.max(s.ax, s.bx) + pad, Math.max(s.az, s.bz) + pad);
    const r0 = Math.max(0, Math.min(a.r, b.r));
    const r1 = Math.min(rows - 1, Math.max(a.r, b.r));
    const c0 = Math.max(0, Math.min(a.c, b.c));
    const c1 = Math.min(cols - 1, Math.max(a.c, b.c));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        const p = hf.cellXZ(r, c);
        const hit = segHit(s, p.x, p.z);
        if (hit.dist > s.half || hit.dist >= best[i]) continue;
        best[i] = hit.dist;
        mask[i] = s.kind;
        lateral[i] = hit.lateral;
      }
    }
  }
  for (const poly of field.polys || []) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of poly.ring) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    const a = cellOf(hf, minX, minZ);
    const b = cellOf(hf, maxX, maxZ);
    const r0 = Math.max(0, Math.min(a.r, b.r));
    const r1 = Math.min(rows - 1, Math.max(a.r, b.r));
    const c0 = Math.max(0, Math.min(a.c, b.c));
    const c1 = Math.min(cols - 1, Math.max(a.c, b.c));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (mask[i]) continue;
        const p = hf.cellXZ(r, c);
        if (!pointIn(p.x, p.z, poly.ring)) continue;
        mask[i] = poly.kind;
      }
    }
  }
  const o = hf.cellXZ(0, 0);
  shapeSnow(heights, {
    cols,
    rows,
    cell,
    mask,
    lateral,
    originX: o.x,
    originZ: o.z,
    seed: field.seed,
    detail,
  });
  for (let i = 0; i < n; i++) hf.overlay[i] = heights[i] - base[i];
}

function selfCheck() {
  const ok = (c, msg) => {
    if (!c) throw new Error(msg);
  };
  ok(te(1, 2, 3) === te(1, 2, 3) && te(1, 2, 3) !== te(1, 2, 4), "te");
  ok(te(4, 5, 6) >>> 0 === te(4, 5, 6), "te unsigned");
  const cover = {
    items: [
      {
        coordsEN: [
          [0, 0],
          [0, 400],
        ],
        half: 10,
        difficulty: "easy",
      },
    ],
  };
  const elev = (e, z) => 800 + z * 0.2;
  bindSnowField(cover, 7, elev);
  setSnowCondition("fresh");
  const mid = sampleSnow(0, -200);
  const edge = sampleSnow(10.75, -200);
  ok(Math.abs(mid.d) < 0.02, `fresh center ${mid.d}`);
  ok(edge.d > 0.08 && edge.d > mid.d, `windrow ${edge.d} vs ${mid.d}`);
  ok(mid.mogul === 0 && mid.worn === 0, "fresh has no mogul or wear");
  setSnowCondition("moguls");
  let peak = 0;
  let a = 0;
  for (let x = -2; x <= 24; x += 0.35) peak = Math.max(peak, sampleSnow(x, -200).mogul);
  a = sampleSnow(3.2, -180).d;
  ok(peak > 0.55, `mogul peak ${peak}`);
  ok(a === sampleSnow(3.2, -180).d, "deterministic");
  let near = 0;
  let far = 0;
  for (let x = -80; x <= 80; x += 4) {
    near = Math.max(near, sampleSnow(x, -396).worn);
    far = Math.max(far, sampleSnow(x, -120).worn);
  }
  ok(near < 0.05 && far > near, `wear fade near ${near} far ${far}`);
  const cols = 20;
  const rows = 20;
  const cell = 8;
  const noisy = new Float32Array(cols * rows);
  for (let i = 0; i < noisy.length; i++) noisy[i] = ((i * 17) % 9) * 0.4;
  const mask = new Float32Array(cols * rows);
  mask.fill(3);
  const advanced = noisy.slice();
  shapeSnow(advanced, { cols, rows, cell, mask, lateral: null, originX: 0, originZ: 0, seed: 3, detail: 1 });
  ok(advanced[40] === noisy[40], "advanced stays natural");
  mask.fill(1);
  const easy = noisy.slice();
  shapeSnow(easy, { cols, rows, cell, mask, lateral: null, originX: 0, originZ: 0, seed: 3, detail: 1 });
  const vary = (arr) => {
    let m = 0;
    for (const v of arr) m += v;
    m /= arr.length;
    let s = 0;
    for (const v of arr) s += (v - m) ** 2;
    return s;
  };
  ok(vary(easy) < vary(noisy) * 0.55, "easy bench is smoother");
  mask.fill(0);
  const off = noisy.slice();
  const quiet = noisy.slice();
  shapeSnow(off, { cols, rows, cell, mask, lateral: null, originX: 100, originZ: -50, seed: 3, detail: 1 });
  shapeSnow(quiet, { cols, rows, cell, mask, lateral: null, originX: 100, originZ: -50, seed: 3, detail: 0 });
  ok(off[10] !== noisy[10], "off-piste noise");
  ok(quiet[10] === noisy[10], "low detail skips noise");
  setSnowCondition("fresh");
  const hfRows = 8;
  const hfCols = 8;
  const hfCell = 10;
  const overlay = new Float32Array(hfRows * hfCols);
  const hf = {
    rows: hfRows,
    cols: hfCols,
    cell: hfCell,
    overlay,
    bounds: { minX: 0, maxX: 80, minZ: -80, maxZ: 0 },
    cellXZ(r, c) {
      return { x: (c + 0.5) * hfCell, z: -80 + (r + 0.5) * hfCell };
    },
    sampleBase(x, z) {
      return 400 + z * 0.01 + Math.sin(x * 0.2) * 1.4;
    },
  };
  bindSnowField(
    {
      items: [
        {
          coordsEN: [
            [20, 20],
            [20, 60],
          ],
          half: 12,
          difficulty: "easy",
        },
      ],
    },
    4,
    (e, z) => hf.sampleBase(e, z),
  );
  setSnowDetail(1);
  shapeHeightfield(hf);
  let finite = true;
  let moved = 0;
  for (const v of overlay) {
    if (!Number.isFinite(v)) finite = false;
    if (Math.abs(v) > 1e-3) moved += 1;
  }
  ok(finite && moved > 0, `overlay finite ${finite} moved ${moved}`);
  console.log("snow-field.js ok");
}

const argv1 = typeof process !== "undefined" ? String(process.argv?.[1] || "").replace(/\\/g, "/") : "";
if (argv1.endsWith("/snow-field.js")) selfCheck();

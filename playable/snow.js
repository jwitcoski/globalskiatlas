/** Snow level: inset trail corridors + on-snow test. Local east/north meters. */

export const MAX_CORRIDOR_M = 30.48; // 100 ft
export const SNOW_DEFAULT = "spring";
export const SNOW = {
  spring: { inset: 0.45, offPiste: false, patches: false, terrain: 0xb39b78 },
  midWinter: { inset: 0.8, offPiste: false, patches: true, terrain: 0xc4a882 },
  wonderland: { inset: 1, offPiste: true, patches: false, terrain: 0xfbfaf6 },
};
export const SNOW_LABEL = {
  spring: "Spring skiing",
  midWinter: "Mid-winter",
  wonderland: "Winter wonderland",
};
export const SNOW_KEYS = Object.keys(SNOW);

const STORE = "gsa-snow-level";
let snowLevel = SNOW_DEFAULT;

export function getSnowLevel() {
  return snowLevel;
}

export function loadSnowLevel() {
  try {
    const s = localStorage.getItem(STORE);
    if (SNOW[s]) snowLevel = s;
  } catch {
    /* ignore */
  }
  return snowLevel;
}

export function setSnowLevel(level) {
  if (!SNOW[level]) return snowLevel;
  snowLevel = level;
  try {
    localStorage.setItem(STORE, level);
  } catch {
    /* ignore */
  }
  return snowLevel;
}

export function cycleSnowLevel() {
  const i = SNOW_KEYS.indexOf(snowLevel);
  return setSnowLevel(SNOW_KEYS[(i + 1) % SNOW_KEYS.length]);
}

export function pointInXz(x, z, ring) {
  if (!ring || ring.length < 3) return false;
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

function pointInEn(e, n, ring) {
  if (!ring || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ei = ring[i][0];
    const ni = ring[i][1];
    const ej = ring[j][0];
    const nj = ring[j][1];
    const hit = ni > n !== nj > n && e < ((ej - ei) * (n - ni)) / (nj - ni + 1e-12) + ei;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Width of the patchy, thinning fringe inside a snow polygon where it meets bare ground. */
export const SNOW_FRINGE_M = 4;

function inPolyEn(e, n, p) {
  const b = p.bb;
  if (b && (e < b.minX || e > b.maxX || n < b.minY || n > b.maxY)) return false;
  return pointInEn(e, n, p.outer) && !(p.holes || []).some((h) => h.length >= 3 && pointInEn(e, n, h));
}

/**
 * Per-vertex 0..1: distance to the nearest edge of `poly` that borders bare ground, over `fringe` m.
 * Edges shared with another snow polygon in `cover` don't count, so touching pistes never show a dirt seam.
 * pos is xyz with z = -north; polygons are { outer, holes, bb? } rings of [east, north].
 */
export function snowEdgeFade(pos, poly, cover, fringe = SNOW_FRINGE_M) {
  const covered = (e, n) => cover.some((p) => inPolyEn(e, n, p));
  const cell = fringe;
  const buckets = new Map();
  const key = (ix, iy) => (ix + 32768) * 65536 + (iy + 32768);
  for (const ring of [poly.outer, ...(poly.holes || [])]) {
    const m = ring?.length || 0;
    for (let i = 0; i < m; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % m];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-3) continue;
      /* Fringe-length pieces, so an edge only partly shared with a neighbour still fringes where it meets dirt. */
      const parts = Math.ceil(len / fringe);
      const dx = (b[0] - a[0]) / parts;
      const dy = (b[1] - a[1]) / parts;
      const ox = (-dy / (len / parts)) * 0.6;
      const oy = (dx / (len / parts)) * 0.6;
      for (let p = 0; p < parts; p++) {
        const ae = a[0] + dx * p;
        const an = a[1] + dy * p;
        const me = ae + dx * 0.5;
        const mn = an + dy * 0.5;
        if (covered(me + ox, mn + oy) && covered(me - ox, mn - oy)) continue;
        const seg = [ae, an, dx, dy, dx * dx + dy * dy];
        const x0 = Math.floor((Math.min(ae, ae + dx) - fringe) / cell);
        const x1 = Math.floor((Math.max(ae, ae + dx) + fringe) / cell);
        const y0 = Math.floor((Math.min(an, an + dy) - fringe) / cell);
        const y1 = Math.floor((Math.max(an, an + dy) + fringe) / cell);
        for (let ix = x0; ix <= x1; ix++) {
          for (let iy = y0; iy <= y1; iy++) {
            const k = key(ix, iy);
            const list = buckets.get(k);
            if (list) list.push(seg);
            else buckets.set(k, [seg]);
          }
        }
      }
    }
  }
  const n = pos.length / 3;
  const out = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const e = pos[i * 3];
    const nn = -pos[i * 3 + 2];
    const segs = buckets.get(key(Math.floor(e / cell), Math.floor(nn / cell)));
    if (!segs) continue;
    let best = fringe;
    for (const [ae, an, dx, dy, l2] of segs) {
      const t = Math.max(0, Math.min(1, ((e - ae) * dx + (nn - an) * dy) / l2));
      best = Math.min(best, Math.hypot(e - ae - dx * t, nn - an - dy * t));
    }
    out[i] = best / fringe;
  }
  return out;
}

function inForest(e, n, forests) {
  for (const r of forests || []) {
    if (pointInEn(e, n, r)) return true;
  }
  return false;
}

function polygonParts(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

function lineParts(geom) {
  if (!geom) return [];
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  return [];
}

function enToXz(ring) {
  const out = [];
  for (const c of ring || []) {
    if (!c || c.length < 2) continue;
    out.push({ x: c[0], z: -c[1] });
  }
  return out;
}

function pisteWidthCap(props) {
  const tags = props?.tags || {};
  const v = props?.["piste:width"] || props?.piste_width || props?.width || tags["piste:width"] || tags.width;
  const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n > 0) return Math.min(n, MAX_CORRIDOR_M);
  return MAX_CORRIDOR_M;
}

function shrinkHalf(e, n, nx, ny, half, forests) {
  let hw = half;
  // ponytail: O(verts × forest rings); cell hash if a mountain hitch.
  while (hw > 0.4 && inForest(e + nx * hw, n + ny * hw, forests)) hw *= 0.7;
  return hw;
}

function densifyLine(coords, step = 8) {
  const src = (coords || []).filter((c) => c && c.length >= 2);
  if (src.length < 2) return src;
  const out = [];
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i];
    const b = src[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      out.push([a[0] + dx * t, a[1] + dy * t]);
    }
  }
  out.push(src[src.length - 1]);
  return out;
}

/** Variable-width buffer in east/north; pinch each side against forest. */
export function bufferLine(coords, halfCap, forests) {
  const pts = densifyLine(coords);
  if (pts.length < 2) return [];
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const nx = -dy;
    const ny = dx;
    const e = pts[i][0];
    const n = pts[i][1];
    const hl = shrinkHalf(e, n, nx, ny, halfCap, forests);
    const hr = shrinkHalf(e, n, -nx, -ny, halfCap, forests);
    left.push([e + nx * hl, n + ny * hl]);
    right.push([e - nx * hr, n - ny * hr]);
  }
  const ring = left.concat(right.reverse());
  if (ring.length >= 3) {
    const a = ring[0];
    ring.push([a[0], a[1]]);
  }
  return ring;
}

export function insetRing(ring, factor) {
  return ring?.map((p) => ({ x: p.x, z: p.z })) || [];
}

export function snowHalfM(level = snowLevel) {
  return (MAX_CORRIDOR_M * 0.5) * (SNOW[level] || SNOW.spring).inset;
}

export function distToPts(x, z, pts) {
  if (!pts || pts.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const az = pts[i].z;
    const bx = pts[i + 1].x;
    const bz = pts[i + 1].z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) best = d;
  }
  return best;
}

function xzToEn(pts) {
  return (pts || []).map((p) => [p.x, -p.z]);
}

export function applyInset(cover, factor) {
  if (!cover?.items) return cover;
  const forests = cover.forestRings || [];
  const f = Math.max(0.05, Math.min(1, factor));
  for (const it of cover.items) {
    if (it.coordsEN?.length >= 2) {
      it.bare = closeXz(enToXz(bufferLine(it.coordsEN, it.half, forests)));
      it.snow = closeXz(enToXz(bufferLine(it.coordsEN, it.half * f, forests)));
    } else {
      it.snow = it.bare;
    }
  }
  return cover;
}

export function addCoverLines(cover, lineList, half = MAX_CORRIDOR_M / 2) {
  if (!cover) return cover;
  if (!cover.items) cover.items = [];
  for (const pts of lineList || []) {
    if (!pts || pts.length < 2) continue;
    cover.items.push({ coordsEN: xzToEn(pts), half, bare: [], snow: [] });
  }
  applyInset(cover, (SNOW[snowLevel] || SNOW.spring).inset);
  return cover;
}

export function buildTrailCover(pistesFC, forestRings) {
  const items = [];
  for (const f of pistesFC?.features || []) {
    const g = f.geometry;
    const half = pisteWidthCap(f.properties || {}) * 0.5;
    const polys = polygonParts(g);
    if (polys.length) {
      for (const poly of polys) {
        const bare = closeXz(enToXz(poly[0]));
        if (bare.length >= 3) {
          items.push({
            bare,
            snow: bare,
            half,
            holes: (poly.slice(1) || []).map((h) => closeXz(enToXz(h))),
          });
        }
      }
      continue;
    }
    for (const coords of lineParts(g)) {
      if (!coords || coords.length < 2) continue;
      items.push({ coordsEN: densifyLine(coords), half, bare: [], snow: [] });
    }
  }
  const cover = { items, skiRings: [], forestRings: forestRings || [] };
  applyInset(cover, (SNOW[snowLevel] || SNOW.spring).inset);
  return cover;
}

function inSkiArea(x, z, cover) {
  if (cover?.skiRings?.length) return cover.skiRings.some((r) => pointInXz(x, z, r));
  const b = cover?.bounds;
  if (!b) return false;
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

function hash01(i, salt) {
  let n = (i * 374761393 + salt * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function blobRing(x, z, rx, rz, seed, rot = 0) {
  const n = 14;
  const out = [];
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.72 + hash01(i, seed) * 0.5;
    const px = Math.cos(a) * rx * wobble;
    const pz = Math.sin(a) * rz * wobble;
    out.push({ x: x + px * cs - pz * sn, z: z + px * sn + pz * cs });
  }
  return out;
}

function onMaintained(x, z, cover) {
  for (const c of cover.items || []) {
    if (c.coordsEN?.length >= 2) {
      if (distToPts(x, z, enToXz(c.coordsEN)) < (c.half || 15)) return true;
    } else if (pointInXz(x, z, c.bare || c.snow)) {
      return true;
    }
  }
  return false;
}

/** Pick random grid cells (A1, B3, …). Collision → next cell. Jitter the blob inside the cell. */
export function ensureMidPatches(cover) {
  if (!cover || cover.patches) return cover;
  const b = cover.bounds;
  const rings = [];
  if (b && Number.isFinite(b.minX)) {
    const w = Math.max(1, b.maxX - b.minX);
    const h = Math.max(1, b.maxZ - b.minZ);
    const cols = Math.max(10, Math.round(12 * Math.sqrt(w / h)));
    const rows = Math.max(10, Math.round(12 * Math.sqrt(h / w)));
    const nCells = cols * rows;
    const cellW = w / cols;
    const cellH = h / rows;
    const diag = Math.hypot(cellW, cellH);
    const taken = new Uint8Array(nCells);
    const want = Math.min(99, nCells);
    for (let p = 0; p < want; p++) {
      let idx = Math.floor(hash01(p, 7) * nCells) % nCells;
      let tries = 0;
      while (tries < nCells) {
        if (!taken[idx]) {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = b.minX + ((col + 0.08 + hash01(p, 21) * 0.84) / cols) * w;
          const z = b.minZ + ((row + 0.08 + hash01(p, 29) * 0.84) / rows) * h;
          if (inSkiArea(x, z, cover) && !onMaintained(x, z, cover)) {
            taken[idx] = 1;
            /* Halfway between the small isolated circles and the last oversized drifts. */
            const t = hash01(p, 19);
            const r = (16 + t * 38) * 0.5 + diag * (0.58 + t * 0.4) * 0.5;
            let sx = 0.35 + hash01(p, 31) * 1.5;
            let sz = 0.35 + hash01(p, 37) * 1.5;
            if (Math.abs(sx - sz) < 0.4) sz = sx + (hash01(p, 43) < 0.5 ? 0.65 : -0.65);
            const rot = hash01(p, 47) * Math.PI;
            rings.push(blobRing(x, z, r * sx, r * sz, p + 41, rot));
            break;
          }
        }
        idx = (idx + 1) % nCells;
        tries += 1;
      }
    }
  }
  cover.patches = rings;
  return cover;
}

export function onPisteAt(x, z, cover, level = snowLevel, pistePts) {
  const p = SNOW[level] || SNOW.spring;
  const half = snowHalfM(level);
  if (p.offPiste && inSkiArea(x, z, cover)) return true;
  if (p.patches && inSkiArea(x, z, cover) && (cover.patches || []).some((r) => pointInXz(x, z, r))) {
    return true;
  }
  if (pistePts?.length >= 2 && distToPts(x, z, pistePts) <= half) return true;
  if (!cover?.items?.length) return pistePts?.length >= 2 ? false : null;
  for (const c of cover.items) {
    if (c.coordsEN?.length >= 2) {
      const line = enToXz(c.coordsEN);
      if (distToPts(x, z, line) <= c.half * p.inset) return true;
    } else if (pointInXz(x, z, c.snow || c.bare)) {
      return true;
    }
  }
  return false;
}

export function forestRingsFromFC(fc) {
  const rings = [];
  for (const f of fc?.features || []) {
    for (const poly of polygonParts(f.geometry)) {
      if (poly[0]?.length >= 3) rings.push(poly[0]);
    }
  }
  return rings;
}

function closeXz(ring) {
  if (ring.length < 3) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (Math.hypot(a.x - b.x, a.z - b.z) > 0.05) ring.push({ x: a.x, z: a.z });
  return ring;
}

function ringWidthM(ring) {
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of ring) {
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return maxZ - minZ;
}

function ringSpanAtX(ring, x, tol = 8) {
  const zs = ring.filter((p) => Math.abs(p.x - x) < tol).map((p) => p.z);
  if (zs.length < 2) return 0;
  return Math.max(...zs) - Math.min(...zs);
}

function selfCheck() {
  const { ok, equal } = awaitAssert();
  const line = [
    [0, 0],
    [80, 0],
  ];
  const full = enToXz(bufferLine(line, MAX_CORRIDOR_M / 2, []));
  ok(ringWidthM(full) <= MAX_CORRIDOR_M + 0.05, `buffer cap ${ringWidthM(full)}`);
  const forest = [
    [20, 4],
    [60, 4],
    [60, 20],
    [20, 20],
    [20, 4],
  ];
  const pinched = enToXz(bufferLine(line, MAX_CORRIDOR_M / 2, [forest]));
  ok(ringSpanAtX(pinched, 40) < ringSpanAtX(full, 40) - 1, `pinch ${ringSpanAtX(pinched, 40)} vs ${ringSpanAtX(full, 40)}`);
  const cover = {
    items: [{ bare: full, snow: insetRing(full, SNOW.spring.inset) }],
    skiRings: [
      [
        { x: -10, z: -20 },
        { x: 90, z: -20 },
        { x: 90, z: 20 },
        { x: -10, z: 20 },
      ],
    ],
  };
  const pts = [
    { x: 0, z: 0 },
    { x: 80, z: 0 },
  ];
  equal(onPisteAt(40, 0, { items: [], skiRings: cover.skiRings }, "spring", pts), true);
  equal(onPisteAt(40, 20, { items: [], skiRings: cover.skiRings }, "spring", pts), false);
  equal(onPisteAt(40, 12, cover, "wonderland", pts), true);
  const mixed = { items: [], skiRings: cover.skiRings, patches: [blobRing(40, 12, 8, 8, 1)] };
  equal(onPisteAt(40, 12, mixed, "midWinter", pts), true);
  equal(onPisteAt(40, 12, mixed, "spring", pts), false);
  /* Two 20 m squares sharing the edge east = 20; vertices at north = 10, z = -north. */
  const sq = (e0) => ({ outer: [[e0, 0], [e0 + 20, 0], [e0 + 20, 20], [e0, 20]], holes: [] });
  const A = sq(0);
  const B = sq(20);
  const vx = new Float32Array([1.5, 0, -10, 19.5, 0, -10, 10, 0, -10, 10, 0, -0.75]);
  const fadeA = snowEdgeFade(vx, A, [A, B], 3);
  ok(Math.abs(fadeA[0] - 0.5) < 1e-4, `bare edge fade ${fadeA[0]}`);
  ok(fadeA[1] === 1, `shared edge seam ${fadeA[1]}`);
  ok(fadeA[2] === 1, `interior fade ${fadeA[2]}`);
  ok(Math.abs(fadeA[3] - 0.25) < 1e-4, `south edge fade ${fadeA[3]}`);
  ok(snowEdgeFade(vx, A, [A], 3)[1] < 0.2, "lone piste east edge should fringe");
  /* C covers only the north half of A's east edge: the bare south half must still fringe. */
  const C = { outer: [[20, 10], [30, 10], [30, 20], [20, 20]], holes: [] };
  const half = snowEdgeFade(new Float32Array([19.5, 0, -3, 19.5, 0, -16]), A, [A, C], 3);
  ok(half[0] < 0.2 && half[1] === 1, `partly shared edge ${half[0]} / ${half[1]}`);
  console.log("snow.js ok");
}

function awaitAssert() {
  function ok(cond, msg) {
    if (!cond) throw new Error(msg || "assert");
  }
  function equal(a, b) {
    if (a !== b) throw new Error(`${a} !== ${b}`);
  }
  return { ok, equal };
}

const argv1 = typeof process !== "undefined" ? String(process.argv?.[1] || "").replace(/\\/g, "/") : "";
if (argv1.endsWith("/snow.js") || argv1.endsWith("playable/snow.js")) selfCheck();

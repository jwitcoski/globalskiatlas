/** Snow level: inset trail corridors + on-snow test. Local east/north meters. */

export const MAX_CORRIDOR_M = 30.48; // 100 ft
export const SNOW_DEFAULT = "spring";
export const SNOW = {
  spring: { inset: 0.45, offPiste: false, terrain: 0xb39b78 },
  midWinter: { inset: 0.8, offPiste: false, terrain: 0xe4ddd0 },
  wonderland: { inset: 1, offPiste: true, terrain: 0xfbfaf6 },
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

export function onPisteAt(x, z, cover, level = snowLevel, pistePts) {
  const p = SNOW[level] || SNOW.spring;
  const half = snowHalfM(level);
  if (p.offPiste && inSkiArea(x, z, cover)) return true;
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

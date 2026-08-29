/** Floating resort island: OSM convex-hull footprint, eroded rock taper, drifting debris. */

const LAYERS = 18;
const CLIFF_FRAC = 0.28;
const RIM_SPACING_FRAC = 0.01;
/** Sit under OSM drapes. Negative so coarse tris cannot bury trees on the lower slopes. */
const SNOW_LIFT = -0.55;

function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const tx = x - xi;
  const tz = z - zi;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}

/** 4-octave fbm in 0..1, used for cliff gullies and rock shading. */
function fbm(x, z) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < 4; i++) {
    v += valueNoise(x * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.13;
  }
  return v / norm;
}

function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.z - q.x * p.z;
  }
  return a * 0.5;
}

function ensureCcw(poly) {
  return signedArea(poly) < 0 ? poly.slice().reverse() : poly;
}

function insideConvex(x, z, poly) {
  if (!poly?.length) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!a || !b) continue;
    if ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x) < 0) return false;
  }
  return true;
}

function hullOf(points) {
  const flat = [];
  for (const p of points) {
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) flat.push(p.x, p.z);
  }
  const n = flat.length / 2;
  if (n < 3) return [];
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  idx.sort((a, b) => flat[a * 2] - flat[b * 2] || flat[a * 2 + 1] - flat[b * 2 + 1]);
  const out = [];
  for (let pass = 0; pass < 2; pass++) {
    const start = out.length + 1;
    const order = pass === 0 ? idx : idx.slice().reverse();
    for (const i of order) {
      const x = flat[i * 2];
      const z = flat[i * 2 + 1];
      while (out.length > start) {
        const p = out[out.length - 2];
        const q = out[out.length - 1];
        if ((q.x - p.x) * (z - p.z) - (q.z - p.z) * (x - p.x) > 0) break;
        out.pop();
      }
      out.push({ x, z });
    }
    out.pop();
  }
  return out;
}

function clipAgainst(poly, keep, intersect) {
  if (!poly.length) return poly;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!a || !b) continue;
    const ain = keep(a);
    const bin = keep(b);
    if (ain && bin) out.push(b);
    else if (ain && !bin) out.push(intersect(a, b));
    else if (!ain && bin) {
      out.push(intersect(a, b));
      out.push(b);
    }
  }
  return out.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.z));
}

/** Clip the hull to the DEM AABB without snapping vertices to the four corners. */
function clipToHeightfield(poly, hf) {
  const b = hf.bounds;
  const inset = hf.cell * 1.5;
  const minX = b.minX + inset;
  const maxX = b.maxX - inset;
  const minZ = b.minZ + inset;
  const maxZ = b.maxZ - inset;
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  let p = poly;
  p = clipAgainst(p, (q) => q.x >= minX, (a, b) => lerp(a, b, (minX - a.x) / ((b.x - a.x) || 1e-9)));
  p = clipAgainst(p, (q) => q.x <= maxX, (a, b) => lerp(a, b, (maxX - a.x) / ((b.x - a.x) || 1e-9)));
  p = clipAgainst(p, (q) => q.z >= minZ, (a, b) => lerp(a, b, (minZ - a.z) / ((b.z - a.z) || 1e-9)));
  p = clipAgainst(p, (q) => q.z <= maxZ, (a, b) => lerp(a, b, (maxZ - a.z) / ((b.z - a.z) || 1e-9)));
  return p.length >= 3 ? p : boundsPoly(hf);
}

function rockAlbedo(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#6a6560";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2800; i++) {
    const x = (hash2(i, 3) * 256) | 0;
    const y = (hash2(i, 9) * 256) | 0;
    const g = (78 + hash2(i, 17) * 70) | 0;
    const r = (g + hash2(i, 21) * 18) | 0;
    const b = (g - 8 - hash2(i, 27) * 14) | 0;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1 + (hash2(i, 31) * 3) | 0, 1 + (hash2(i, 37) * 4) | 0);
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(30,32,36,${0.12 + hash2(i, 41) * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(hash2(i, 43) * 256, hash2(i, 47) * 256);
    ctx.lineTo(hash2(i, 53) * 256, hash2(i, 59) * 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function boundsPoly(hf) {
  const b = hf.bounds;
  const pad = hf.cell * 2;
  return [
    { x: b.minX + pad, z: b.minZ + pad },
    { x: b.maxX - pad, z: b.minZ + pad },
    { x: b.maxX - pad, z: b.maxZ - pad },
    { x: b.minX + pad, z: b.maxZ - pad },
  ];
}

function resampleClosed(poly, spacing) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) continue;
    let d = carry;
    while (d < len) {
      const t = d / len;
      out.push({ x: a.x + dx * t, z: a.z + dz * t });
      d += spacing;
    }
    carry = d - len;
  }
  return out.length >= 8 ? out : poly;
}

function shrinkToward(poly, cx, cz, amount) {
  return poly.map((p) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.max(0, (d - amount) / d);
    return { x: cx + dx * k, z: cz + dz * k };
  });
}

function pushTri(pos, col, a, b, c, rgb) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 3; i++) col.push(rgb[0], rgb[1], rgb[2]);
}

function makeGeo(THREE, pos, col) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) {
    uv[i * 2] = pos[i * 3] * 0.012;
    uv[i * 2 + 1] = pos[i * 3 + 2] * 0.012;
  }
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

const SOIL = [0.31, 0.22, 0.15];
const ROCK_HI = [0.44, 0.43, 0.42];
const ROCK_LO = [0.17, 0.18, 0.21];

/** Soil lip at the rim, weathered rock through the body, dark at the point. */
function rockColor(u, n) {
  let base;
  if (u < 0.14) {
    const k = u / 0.14;
    base = [
      SOIL[0] * (1 - k) + ROCK_HI[0] * k,
      SOIL[1] * (1 - k) + ROCK_HI[1] * k,
      SOIL[2] * (1 - k) + ROCK_HI[2] * k,
    ];
  } else {
    const k = (u - 0.14) / 0.86;
    const e = Math.pow(k, 0.85);
    base = [
      ROCK_HI[0] * (1 - e) + ROCK_LO[0] * e,
      ROCK_HI[1] * (1 - e) + ROCK_LO[1] * e,
      ROCK_HI[2] * (1 - e) + ROCK_LO[2] * e,
    ];
  }
  const s = 0.82 + n * 0.36;
  return [base[0] * s, base[1] * s, base[2] * s];
}

function buildTop(THREE, hf, poly) {
  const stride = Math.max(1, Math.floor(Math.min(hf.rows, hf.cols) / 380));
  const pos = [];
  const col = [];
  const snow = [0.96, 0.97, 0.98];
  for (let r = 0; r < hf.rows - stride; r += stride) {
    for (let c = 0; c < hf.cols - stride; c += stride) {
      const a = hf.cellXZ(r, c);
      const b = hf.cellXZ(r, c + stride);
      const d = hf.cellXZ(r + stride, c);
      const e = hf.cellXZ(r + stride, c + stride);
      const mx = (a.x + e.x) * 0.5;
      const mz = (a.z + e.z) * 0.5;
      if (!insideConvex(mx, mz, poly)) continue;
      const va = { x: a.x, y: hf.sample(a.x, a.z) + SNOW_LIFT, z: a.z };
      const vb = { x: b.x, y: hf.sample(b.x, b.z) + SNOW_LIFT, z: b.z };
      const vd = { x: d.x, y: hf.sample(d.x, d.z) + SNOW_LIFT, z: d.z };
      const ve = { x: e.x, y: hf.sample(e.x, e.z) + SNOW_LIFT, z: e.z };
      pushTri(pos, col, va, vb, vd, snow);
      pushTri(pos, col, vb, ve, vd, snow);
    }
  }
  return pos.length ? makeGeo(THREE, pos, col) : null;
}

/**
 * One horizontal slice of the underside. The rim keeps the hull, then radius
 * collapses while fbm cuts vertical gullies so the taper reads as eroded rock.
 */
function layerRing(rim, cx, cz, t, depth, baseY, hf, feature) {
  const cliffH = depth * CLIFF_FRAC;
  const pts = [];
  for (const p of rim) {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const dist = Math.hypot(dx, dz) || 1;
    const n = fbm(p.x / feature, p.z / feature);
    const nv = fbm(p.x / (feature * 0.38) + t * 4.2, p.z / (feature * 0.38) - t * 3.1);
    const n2 = fbm(p.x / (feature * 0.18) - t, p.z / (feature * 0.18) + t);
    if (t <= CLIFF_FRAC) {
      const k = t / CLIFF_FRAC;
      const bite = k * ((n - 0.5) * 0.1 + (n2 - 0.5) * 0.06) * dist;
      const s = t <= 0 ? 1 : (dist + bite) / dist;
      pts.push({
        x: cx + dx * s,
        y: hf.sample(p.x, p.z) - 5 - k * cliffH,
        z: cz + dz * s,
      });
      continue;
    }
    const u = (t - CLIFF_FRAC) / (1 - CLIFF_FRAC);
    const terrace = Math.floor(u * 8) / 8;
    const taper = 1 - Math.pow(terrace, 0.55) * 0.92;
    const gully = (n - 0.5) * 0.34 * (1 - u * 0.35);
    const ridge = (nv - 0.5) * 0.2;
    const chip = (n2 - 0.5) * 0.1 * u;
    const s = Math.max(0.025, taper + gully + ridge + chip);
    const drop = cliffH + Math.pow(u, 0.88) * (depth - cliffH);
    pts.push({
      x: cx + dx * s,
      y: baseY - drop + (nv - 0.5) * depth * 0.06 * (1 - u),
      z: cz + dz * s,
    });
  }
  return pts;
}

function buildRock(THREE, rim, cx, cz, depth, baseY, hf, feature) {
  const pos = [];
  const col = [];
  const layers = [];
  for (let i = 0; i <= LAYERS; i++) {
    layers.push(layerRing(rim, cx, cz, i / LAYERS, depth, baseY, hf, feature));
  }
  const n = rim.length;
  for (let i = 0; i < LAYERS; i++) {
    const a = layers[i];
    const b = layers[i + 1];
    const u0 = i / LAYERS;
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      const shade = fbm(k * 0.35, i * 0.8);
      const rgb = rockColor(u0, shade);
      pushTri(pos, col, a[k], a[k1], b[k], rgb);
      pushTri(pos, col, a[k1], b[k1], b[k], rgb);
    }
  }

  const last = layers[LAYERS];
  let apexY = Infinity;
  let ax = 0;
  let az = 0;
  for (const p of last) {
    ax += p.x;
    az += p.z;
    apexY = Math.min(apexY, p.y);
  }
  ax /= last.length;
  az /= last.length;
  const apex = { x: ax, y: apexY - depth * 0.16, z: az };
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    const jitter = fbm(k * 0.9, 7.3) - 0.5;
    const tipped = {
      x: apex.x + jitter * depth * 0.05,
      y: apex.y + Math.abs(jitter) * depth * 0.1,
      z: apex.z - jitter * depth * 0.04,
    };
    pushTri(pos, col, last[k], last[k1], tipped, rockColor(1, fbm(k * 0.35, 9.1)));
  }

  return { geo: makeGeo(THREE, pos, col), apex, layers };
}

function chunkGeometry(THREE, radius, seed) {
  const geo = new THREE.IcosahedronGeometry(radius, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm(x * 0.4 + seed, z * 0.4 - seed) * 0.7 + 0.65;
    pos.setXYZ(i, x * n, y * n * 0.82, z * n);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Loose rubble shedding off the taper, like the reference island. */
function addChunks(THREE, group, mat, rim, cx, cz, apex, depth, baseY) {
  if (!rim?.length) return;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const p = rim[Math.floor((i / n) * rim.length) % rim.length];
    const u = 0.12 + hash2(i, 11) * 0.78;
    const along = 0.92 + (hash2(i, 19) - 0.5) * 0.18;
    const radius = depth * (0.01 + hash2(i, 23) * 0.028);
    const mesh = new THREE.Mesh(chunkGeometry(THREE, radius, i * 1.7), mat);
    mesh.position.set(
      cx + (p.x - cx) * along * (1 - u * 0.55) + (hash2(i, 41) - 0.5) * depth * 0.08,
      baseY - u * (baseY - apex.y) - hash2(i, 57) * depth * 0.04,
      cz + (p.z - cz) * along * (1 - u * 0.55) - (hash2(i, 43) - 0.5) * depth * 0.07,
    );
    mesh.rotation.set(hash2(i, 3) * 6.28, hash2(i, 5) * 6.28, hash2(i, 7) * 6.28);
    mesh.castShadow = true;
    mesh.name = "island-chunk";
    group.add(mesh);
  }
}

const DUST_N = 220;

function addDust(THREE, group, rim, cx, cz, topY, apex, depth) {
  if (!rim?.length) return null;
  const pos = new Float32Array(DUST_N * 3);
  const seeds = new Float32Array(DUST_N * 3);
  for (let i = 0; i < DUST_N; i++) {
    const p = rim[Math.floor(hash2(i, 71) * rim.length) % rim.length];
    const u = hash2(i, 83);
    const spread = 1 - u * 0.7;
    const x = cx + (p.x - cx) * spread;
    const z = cz + (p.z - cz) * spread;
    pos[i * 3] = x;
    pos[i * 3 + 1] = topY - u * (topY - apex.y);
    pos[i * 3 + 2] = z;
    seeds[i * 3] = x;
    seeds[i * 3 + 1] = 0.35 + hash2(i, 97) * 1.1;
    seeds[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0x8a7a68,
      size: Math.max(1.1, depth * 0.0045),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      fog: false,
    }),
  );
  pts.frustumCulled = false;
  pts.name = "island-dust";
  group.add(pts);
  return { pts, pos, seeds, topY, floorY: apex.y - depth * 0.35, speedScale: depth * 0.04 };
}

export function updateIslandDust(island, dt) {
  const dust = island?.dust;
  if (!dust || !dust.pts.visible) return;
  const { pos, seeds, topY, floorY, speedScale } = dust;
  for (let i = 0; i < DUST_N; i++) {
    const i3 = i * 3;
    pos[i3 + 1] -= seeds[i3 + 1] * speedScale * dt;
    pos[i3] += seeds[i3 + 1] * speedScale * dt * 0.12;
    if (pos[i3 + 1] < floorY) {
      pos[i3] = seeds[i3];
      pos[i3 + 1] = topY;
      pos[i3 + 2] = seeds[i3 + 2];
    }
  }
  dust.pts.geometry.attributes.position.needsUpdate = true;
}

export function addResortIsland(THREE, scene, hf, skiArea, osmHull) {
  let poly = Array.isArray(osmHull) && osmHull.length >= 3 ? osmHull : null;
  if (!poly || poly.length < 3) poly = boundsPoly(hf);
  poly = ensureCcw(clipToHeightfield(poly, hf));
  if (poly.length < 3) poly = ensureCcw(boundsPoly(hf));

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(maxX - minX, maxZ - minZ, 400);

  const group = new THREE.Group();
  group.name = "resort-island";

  const topGeo = buildTop(THREE, hf, poly);
  if (topGeo) {
    const top = new THREE.Mesh(
      topGeo,
      new THREE.MeshLambertMaterial({
        color: 0xf4f7fa,
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        transparent: false,
      }),
    );
    top.receiveShadow = true;
    top.castShadow = false;
    top.name = "island-top";
    group.add(top);
  }

  const rim = resampleClosed(shrinkToward(poly, cx, cz, hf.cell * 0.75), Math.max(10, span * RIM_SPACING_FRAC));
  let baseY = Infinity;
  let topY = -Infinity;
  for (const p of rim) {
    const y = hf.sample(p.x, p.z);
    baseY = Math.min(baseY, y);
    topY = Math.max(topY, y);
  }
  const depth = Math.max(220, Math.min(1400, span * 0.62));
  const rock = buildRock(THREE, rim, cx, cz, depth, baseY, hf, Math.max(60, span * 0.055));

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xc8c2ba,
    map: rockAlbedo(THREE),
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
    flatShading: true,
    transparent: false,
    opacity: 1,
    side: THREE.FrontSide,
    envMap: scene.userData.envMap || null,
    envMapIntensity: 0.12,
  });
  const fill = new THREE.Mesh(rock.geo, rockMat);
  fill.castShadow = true;
  fill.receiveShadow = true;
  fill.name = "island-rock";
  group.add(fill);

  addChunks(THREE, group, rockMat, rim, cx, cz, rock.apex, depth, baseY);
  const dust = addDust(THREE, group, rim, cx, cz, baseY, rock.apex, depth);

  scene.add(group);
  scene.userData.island = {
    root: group,
    dust,
    hull: poly,
    center: { x: cx, y: (hf.min + hf.max) * 0.5, z: cz },
    tip: rock.apex,
    span,
  };
  return group;
}

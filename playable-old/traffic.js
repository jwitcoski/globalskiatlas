/** OSM parking + driveable roads. Procedural snow cars — not manufacturer models. */

const DRIVE = new Set(["tertiary", "unclassified", "residential", "service", "secondary"]);
const MAX_PARKED = 72;
const MAX_DRIVING = 18;
const PARK_STEP = 16;
const BODY = [0xb42a2a, 0x2c4a78, 0xd6d8dc, 0x2e3034, 0xc45a18, 0x3d5c48, 0x6a3a78];

function highwayOf(f) {
  return String(f.properties?.highway || f.properties?.tags?.highway || "").toLowerCase();
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

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function inPolygon(x, y, outer, holes) {
  if (!pointInRing(x, y, outer)) return false;
  for (const h of holes || []) {
    if (h.length >= 3 && pointInRing(x, y, h)) return false;
  }
  return true;
}

function ringBBox(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of ring || []) {
    if (!c || c.length < 2) continue;
    minX = Math.min(minX, c[0]);
    minY = Math.min(minY, c[1]);
    maxX = Math.max(maxX, c[0]);
    maxY = Math.max(maxY, c[1]);
  }
  return { minX, minY, maxX, maxY };
}

function flatEnough(elevFn, x, z) {
  const dx = elevFn(x + 2.2, z) - elevFn(x - 2.2, z);
  const dz = elevFn(x, z + 2.2) - elevFn(x, z - 2.2);
  return Math.hypot(dx, dz) < 1.15;
}

function longestEdgeYaw(outer) {
  let best = 0;
  let len = 0;
  for (let i = 0; i < (outer || []).length; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l > len) {
      len = l;
      best = Math.atan2(dx, -dy);
    }
  }
  return best;
}

function densifyXY(coords, maxStep) {
  const src = (coords || []).filter((c) => c && c.length >= 2);
  if (src.length < 2) return src;
  const out = [];
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i];
    const b = src[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(len / maxStep));
    for (let s = 0; s < steps; s++) out.push([a[0] + (dx * s) / steps, a[1] + (dy * s) / steps]);
  }
  out.push(src[src.length - 1]);
  return out;
}

function pathLen(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return n;
}

function alongPath(pts, dist) {
  let left = ((dist % pts._len) + pts._len) % pts._len;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const az = pts[i - 1].z;
    const bx = pts[i].x;
    const bz = pts[i].z;
    const seg = Math.hypot(bx - ax, bz - az) || 1e-6;
    if (left <= seg) {
      const t = left / seg;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / seg, tz: (bz - az) / seg };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  return { x: last.x, z: last.z, tx: last.x - prev.x, tz: last.z - prev.z };
}

function mat(THREE, color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export function makeSnowCar(THREE, seed = 0) {
  const g = new THREE.Group();
  const paint = BODY[seed % BODY.length];
  const bodyM = mat(THREE, paint);
  const dark = mat(THREE, 0x1a1c1e);
  const glass = mat(THREE, 0x6a8898, { transparent: true, opacity: 0.72 });
  const snow = mat(THREE, 0xf3f6f8);
  const chrome = mat(THREE, 0xc8ccd0);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 4.15), bodyM);
  hull.position.y = 0.52;
  hull.scale.set(1, 1, 1);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.18, 4.05), dark);
  skirt.position.y = 0.28;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.62, 1.85), bodyM);
  cabin.position.set(0, 1.02, -0.18);
  const winF = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.38, 0.06), glass);
  winF.position.set(0, 1.08, 0.78);
  winF.rotation.x = -0.42;
  const winB = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.34, 0.06), glass);
  winB.position.set(0, 1.06, -1.08);
  winB.rotation.x = 0.35;
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.22), chrome);
  bumperF.position.set(0, 0.38, 2.08);
  const bumperB = bumperF.clone();
  bumperB.position.z = -2.08;
  const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), mat(THREE, 0xf4f0c8));
  const lightR = lightL.clone();
  lightL.position.set(-0.58, 0.48, 2.16);
  lightR.position.set(0.58, 0.48, 2.16);
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.06), mat(THREE, 0xa01818));
  const tailR = tailL.clone();
  tailL.position.set(-0.58, 0.5, -2.16);
  tailR.position.set(0.58, 0.5, -2.16);
  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.18), dark);
  const mirrorR = mirrorL.clone();
  mirrorL.position.set(-0.95, 0.92, 0.55);
  mirrorR.position.set(0.95, 0.92, 0.55);

  const roofSnow = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), snow);
  roofSnow.scale.set(1.15, 0.38, 1.28);
  roofSnow.position.set(0, 1.48, -0.18);
  const hoodSnow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 1.28), snow);
  hoodSnow.position.set(0, 0.92, 1.18);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), snow);
  pile.scale.set(1.5, 0.7, 1.05);
  pile.position.set(0.18 + (seed % 5) * 0.05, 1.52, -0.62);

  const wheelG = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
  const wheels = [];
  const spots = [
    [-0.78, 0.32, 1.28],
    [0.78, 0.32, 1.28],
    [-0.78, 0.32, -1.32],
    [0.78, 0.32, -1.32],
  ];
  for (const [x, y, z] of spots) {
    const w = new THREE.Mesh(wheelG, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    wheels.push(w);
    g.add(w);
  }

  g.add(
    hull,
    skirt,
    cabin,
    winF,
    winB,
    bumperF,
    bumperB,
    lightL,
    lightR,
    tailL,
    tailR,
    mirrorL,
    mirrorR,
    roofSnow,
    hoodSnow,
    pile,
  );
  g.userData.wheels = wheels;
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  return g;
}

export function drapeRoadStrip(THREE, coords, elevFn, halfW, lift, material) {
  const dens = densifyXY(coords, 7);
  if (dens.length < 2) return null;
  const pos = [];
  const xz = dens.map((p) => [p[0], -p[1]]);
  for (let i = 0; i < xz.length; i++) {
    let tx;
    let tz;
    if (i === 0) {
      tx = xz[1][0] - xz[0][0];
      tz = xz[1][1] - xz[0][1];
    } else if (i === xz.length - 1) {
      tx = xz[i][0] - xz[i - 1][0];
      tz = xz[i][1] - xz[i - 1][1];
    } else {
      tx = xz[i + 1][0] - xz[i - 1][0];
      tz = xz[i + 1][1] - xz[i - 1][1];
    }
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const x = xz[i][0];
    const z = xz[i][1];
    const y = elevFn(x, z) + lift;
    pos.push(x + nx * halfW, y, z + nz * halfW, x - nx * halfW, y, z - nz * halfW);
  }
  const idx = [];
  for (let i = 0; i < xz.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 1;
  return mesh;
}

function roadHalfW(hw) {
  if (hw === "tertiary" || hw === "secondary") return 3.6;
  if (hw === "service") return 2.4;
  return 3.0;
}

function sitCar(car, x, z, yaw, elevFn) {
  car.position.set(x, elevFn(x, z), z);
  car.rotation.set(0, yaw, 0);
}

export function addOsmTraffic(THREE, scene, parkingFc, roadsFc, elevFn) {
  const root = new THREE.Group();
  root.name = "osm-traffic";
  const movers = [];
  const roadMat = new THREE.MeshLambertMaterial({
    color: 0x4c5056,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  let parked = 0;
  let roads = 0;

  for (const f of parkingFc?.features || []) {
    for (const poly of polygonParts(f.geometry)) {
      const outer = poly[0];
      const holes = poly.slice(1);
      const bb = ringBBox(outer);
      const yaw0 = longestEdgeYaw(outer);
      const nx = Math.max(1, Math.ceil((bb.maxX - bb.minX) / PARK_STEP));
      const ny = Math.max(1, Math.ceil((bb.maxY - bb.minY) / PARK_STEP));
      let k = 0;
      for (let j = 0; j < ny && parked < MAX_PARKED; j++) {
        for (let i = 0; i < nx && parked < MAX_PARKED; i++) {
          k += 1;
          if (k % 5 === 0) continue;
          const x = bb.minX + (i + 0.5) * PARK_STEP + ((k * 7) % 5) * 0.15;
          const north = bb.minY + (j + 0.5) * PARK_STEP;
          if (!inPolygon(x, north, outer, holes)) continue;
          const z = -north;
          if (!flatEnough(elevFn, x, z)) continue;
          const car = makeSnowCar(THREE, parked + i + j);
          const stall = (j % 2 ? Math.PI : 0) + yaw0;
          sitCar(car, x, z, stall, elevFn);
          root.add(car);
          parked += 1;
        }
      }
    }
  }

  const drivePaths = [];
  for (const f of roadsFc?.features || []) {
    const hw = highwayOf(f);
    if (!DRIVE.has(hw)) continue;
    for (const coords of lineParts(f.geometry)) {
      const strip = drapeRoadStrip(THREE, coords, elevFn, roadHalfW(hw), 0.12, roadMat);
      if (strip) {
        root.add(strip);
        roads += 1;
      }
      const dens = densifyXY(coords, 8);
      if (dens.length < 2) continue;
      const pts = dens.map((c) => ({ x: c[0], z: -c[1] }));
      pts._len = pathLen(pts);
      if (pts._len > 40) drivePaths.push({ pts, hw });
    }
  }

  drivePaths.sort((a, b) => b.pts._len - a.pts._len);
  let driving = 0;
  for (const path of drivePaths) {
    const n = Math.max(1, Math.min(3, Math.floor(path.pts._len / 220)));
    for (let i = 0; i < n && driving < MAX_DRIVING; i++) {
      const car = makeSnowCar(THREE, 11 + driving);
      const along = (path.pts._len * (i + 0.35)) / n;
      const p = alongPath(path.pts, along);
      sitCar(car, p.x, p.z, Math.atan2(p.tx, p.tz), elevFn);
      root.add(car);
      movers.push({
        mesh: car,
        pts: path.pts,
        along,
        speed: path.hw === "service" ? 4.2 : 6.1,
      });
      driving += 1;
    }
  }

  scene.add(root);
  const traffic = { root, movers, parked, driving, roads };
  scene.userData.traffic = traffic;
  return traffic;
}

export function updateTraffic(traffic, dt, elevFn) {
  if (!traffic?.movers?.length) return;
  for (const m of traffic.movers) {
    m.along += m.speed * dt;
    const p = alongPath(m.pts, m.along);
    sitCar(m.mesh, p.x, p.z, Math.atan2(p.tx, p.tz), elevFn);
    const wheels = m.mesh.userData.wheels || [];
    const spin = (m.speed / 0.32) * dt;
    for (const w of wheels) w.rotation.x += spin;
  }
}

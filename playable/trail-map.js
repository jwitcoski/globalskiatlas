/** OSM piste:difficulty / piste:type markers. Original icons — not a resort map. */

const GREEN = "#1f7a38";
const BLUE = "#1d5fb8";
const BLACK = "#1a1a1c";
const YELLOW = "#e6c200";
const ORANGE = "#e36a12";
const GRAY = "#6a7076";

/**
 * Ski-area (landuse=winter_sports) in local east/north → game XZ rings + AABB.
 * Lobby map / fog / minimap use this as the cutoff — OSM outside the AOI is sparse.
 */
export function parseSkiArea(fc) {
  const rings = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let name = "";
  for (const f of fc?.features || []) {
    if (!name) name = f.properties?.name || f.properties?.tags?.name || "";
    const parts =
      f.geometry?.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry?.type === "MultiPolygon"
          ? f.geometry.coordinates
          : [];
    for (const poly of parts) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const ring = [];
      for (const c of outer) {
        if (!c || c.length < 2) continue;
        const x = c[0];
        const z = -c[1];
        ring.push({ x, z });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
      if (ring.length >= 3) {
        const a = ring[0];
        const b = ring[ring.length - 1];
        if (Math.hypot(a.x - b.x, a.z - b.z) > 0.05) ring.push({ x: a.x, z: a.z });
        rings.push(ring);
      }
    }
  }
  if (!rings.length || !Number.isFinite(minX)) return null;
  const span = Math.max(maxX - minX, maxZ - minZ, 400);
  return {
    name,
    rings,
    bounds: {
      minX,
      maxX,
      minZ,
      maxZ,
      cx: (minX + maxX) * 0.5,
      cz: (minZ + maxZ) * 0.5,
      span,
    },
  };
}

function isPark(t) {
  const x = String(t || "").toLowerCase();
  return x === "snow_park" || x === "terrain_park" || x === "snowpark";
}

export function classifyDifficulty(raw, pisteType) {
  const d = String(raw || "").toLowerCase().trim();
  let style;
  if (d === "novice" || d === "easy" || d === "beginner") {
    style = { key: "easy", label: "Easy", shape: "circle", html: GREEN, color: 0x1f7a38 };
  } else if (d === "intermediate" || d === "medium") {
    style = { key: "intermediate", label: "Intermediate", shape: "square", html: BLUE, color: 0x1d5fb8 };
  } else if (d === "advanced") {
    style = { key: "advanced", label: "Advanced", shape: "diamond", html: BLACK, color: 0x1a1a1c };
  } else if (d === "expert") {
    style = { key: "expert", label: "Expert", shape: "double", html: BLACK, color: 0x1a1a1c };
  } else if (d === "freeride") {
    style = { key: "freeride", label: "Freeride", shape: "diamond", html: YELLOW, color: 0xe6c200 };
  } else if (d === "extreme") {
    style = { key: "extreme", label: "Extreme", shape: "extreme", html: YELLOW, color: 0xe6c200 };
  } else {
    style = { key: "unrated", label: "Unrated", shape: "circle", html: GRAY, color: 0x6a7076 };
  }
  if (isPark(pisteType)) {
    style = {
      ...style,
      key: "park",
      label: style.key === "unrated" ? "Snow park" : `${style.label} park`,
      html: ORANGE,
      color: 0xe36a12,
      park: true,
    };
  }
  return style;
}

export function styleForPisteFeature(f) {
  const props = f?.properties || {};
  const tags = props.tags && typeof props.tags === "object" ? props.tags : {};
  let d = tags["piste:difficulty"] || tags.difficulty || props["piste:difficulty"] || props.piste_difficulty || props.difficulty || "";
  let t = tags["piste:type"] || tags.piste_type || props["piste:type"] || props.piste_type || "";
  const ot = String(tags.other_tags || props.other_tags || "");
  if (!d) {
    const m = /piste:difficulty"=>"([^"]+)/.exec(ot);
    if (m) d = m[1];
  }
  if (!t) {
    const m = /piste:type"=>"([^"]+)/.exec(ot);
    if (m) t = m[1];
  }
  return classifyDifficulty(d, t);
}

export function markerSvg(style, size = 18) {
  const c = style.html;
  const s = size;
  const sw = 1.7;
  if (style.shape === "square") {
    return `<svg class="diff-svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="1.2" fill="${c}" stroke="#fff" stroke-width="${sw}"/></svg>`;
  }
  if (style.shape === "diamond") {
    return `<svg class="diff-svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,12 12,22 2,12" fill="${c}" stroke="#fff" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
  }
  if (style.shape === "double") {
    return `<svg class="diff-svg" width="${s * 1.55}" height="${s}" viewBox="0 0 36 24" aria-hidden="true"><polygon points="9,2 18,12 9,22 0,12" fill="${c}" stroke="#fff" stroke-width="${sw}" stroke-linejoin="round"/><polygon points="27,2 36,12 27,22 18,12" fill="${c}" stroke="#fff" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
  }
  if (style.shape === "extreme") {
    return `<svg class="diff-svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,12 12,22 2,12" fill="${c}" stroke="#1a1a1c" stroke-width="2" stroke-linejoin="round"/><text x="12" y="15.5" text-anchor="middle" font-size="7.5" font-weight="800" fill="#1a1a1c" font-family="system-ui,sans-serif">EX</text></svg>`;
  }
  return `<svg class="diff-svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="${c}" stroke="#fff" stroke-width="${sw}"/></svg>`;
}

function paintMarker(ctx, shape, fill, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = fill;
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (shape === "square") {
    ctx.beginPath();
    ctx.rect(cx - 34, cy - 34, 68, 68);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(w - 10, cy);
    ctx.lineTo(cx, h - 10);
    ctx.lineTo(10, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (shape === "double") {
    const draw = (ox) => {
      ctx.beginPath();
      ctx.moveTo(ox, 14);
      ctx.lineTo(ox + 44, cy);
      ctx.lineTo(ox, h - 14);
      ctx.lineTo(ox - 44, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    draw(cx - 30);
    draw(cx + 30);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(cx, 10);
  ctx.lineTo(w - 10, cy);
  ctx.lineTo(cx, h - 10);
  ctx.lineTo(10, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a1a1c";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#1a1a1c";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EX", cx, cy + 2);
}

const texCache = new Map();

function markerTexture(THREE, shape, html) {
  const key = `${shape}:${html}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas");
  c.width = shape === "double" ? 256 : 128;
  c.height = 128;
  paintMarker(c.getContext("2d"), shape, html, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
}

function badgeTexture(THREE, style, name) {
  const text = String(name || "Trail");
  const icon = document.createElement("canvas");
  icon.width = style.shape === "double" ? 256 : 128;
  icon.height = 128;
  paintMarker(icon.getContext("2d"), style.shape, style.html, icon.width, icon.height);

  const measure = document.createElement("canvas").getContext("2d");
  measure.font = "700 34px Segoe UI, system-ui, sans-serif";
  const tw = Math.ceil(measure.measureText(text).width);
  const w = Math.max(icon.width + 24, tw + 40);
  const h = 200;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(icon, (w - icon.width) * 0.5, 4);
  ctx.font = "700 34px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(24,32,40,0.78)";
  ctx.fillStyle = "#f4f6f8";
  ctx.strokeText(text, w * 0.5, 162);
  ctx.fillText(text, w * 0.5, 162);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return { tex, aspect: w / h };
}

function polylineForCourse(course, pisteLines) {
  const hit = pisteLines.find((p) => course.name && p.name === course.name);
  if (hit?.pts?.length >= 2) return hit.pts;
  const s = course.start_local || {};
  const e = course.end_local || {};
  return [
    { x: s.east_m, z: -(s.north_m || 0) },
    { x: e.east_m, z: -(e.north_m || 0) },
  ];
}

function ribbonGeometry(THREE, vecs, width) {
  const half = width * 0.5;
  const n = vecs.length;
  const pos = new Float32Array(n * 6);
  const index = [];
  for (let i = 0; i < n; i++) {
    const a = vecs[Math.max(0, i - 1)];
    const b = vecs[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const p = vecs[i];
    const o = i * 6;
    pos[o] = p.x - dz * half;
    pos[o + 1] = p.y;
    pos[o + 2] = p.z + dx * half;
    pos[o + 3] = p.x + dz * half;
    pos[o + 4] = p.y;
    pos[o + 5] = p.z - dx * half;
    if (i < n - 1) {
      const v = i * 2;
      index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(index);
  return geo;
}

function ribbonMesh(THREE, vecs, width, color, opacity, order) {
  if (!vecs || vecs.length < 2) return null;
  const mesh = new THREE.Mesh(
    ribbonGeometry(THREE, vecs, width),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = order;
  return mesh;
}

function dashedRibbon(THREE, vecs, width, color, opacity, order, dash = 22, gap = 16) {
  const group = new THREE.Group();
  if (!vecs || vecs.length < 2) return group;
  let drawing = true;
  let remain = dash;
  let cur = [vecs[0]];
  const emit = () => {
    if (cur.length >= 2) {
      const mesh = ribbonMesh(THREE, cur, width, color, opacity, order);
      if (mesh) group.add(mesh);
    }
    cur = [];
  };
  for (let i = 1; i < vecs.length; i++) {
    const a = vecs[i - 1];
    const b = vecs[i];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dz = b.z - a.z;
    let leftover = Math.hypot(dx, dy, dz);
    if (leftover < 1e-4) continue;
    dx /= leftover;
    dy /= leftover;
    dz /= leftover;
    let ax = a.x;
    let ay = a.y;
    let az = a.z;
    while (leftover > 1e-4) {
      const take = Math.min(leftover, remain);
      ax += dx * take;
      ay += dy * take;
      az += dz * take;
      leftover -= take;
      remain -= take;
      const p = new THREE.Vector3(ax, ay, az);
      if (drawing) cur.push(p);
      if (remain <= 1e-4) {
        if (drawing) emit();
        drawing = !drawing;
        remain = drawing ? dash : gap;
        cur = [p];
      }
    }
  }
  if (drawing) emit();
  return group;
}

function midPoint(pts, elevFn) {
  const i = Math.max(1, Math.floor(pts.length * 0.35));
  const p = pts[i] || pts[0];
  return { x: p.x, y: elevFn(p.x, p.z) + 14, z: p.z };
}

export function addTrailMap(THREE, scene, courses, pisteLines, elevFn, skiArea = null) {
  const root = new THREE.Group();
  root.name = "trail-map";
  const picks = [];
  const pending = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxY = -Infinity;
  let minY = Infinity;

  for (const course of courses || []) {
    const pts = polylineForCourse(course, pisteLines);
    const style = classifyDifficulty(course.piste_difficulty, course.piste_type);
    const vecs = pts.map((p) => {
      const y = elevFn(p.x, p.z) + 2.4;
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
      return new THREE.Vector3(p.x, y, p.z);
    });
    if (vecs.length < 2) continue;
    pending.push({ course, pts, style, vecs });
  }

  /* Prefer the winter_sports AOI so the lobby frames the mapped ski area, not the DEM pad. */
  const ao = skiArea?.bounds;
  if (ao) {
    minX = ao.minX;
    maxX = ao.maxX;
    minZ = ao.minZ;
    maxZ = ao.maxZ;
  }

  const span = Math.max(maxX - minX, maxZ - minZ, 400);
  const trailW = Math.max(10, Math.min(22, span * 0.007));
  const edgeW = Math.max(5, Math.min(11, span * 0.0032));

  for (const ring of skiArea?.rings || []) {
    if (ring.length < 3) continue;
    const vecs = ring.map((p) => {
      const y = elevFn(p.x, p.z) + 3.2;
      maxY = Math.max(maxY, y);
      minY = Math.min(minY, y);
      return new THREE.Vector3(p.x, y, p.z);
    });
    const edge = dashedRibbon(THREE, vecs, edgeW, 0x2a343c, 0.72, 2, 28, 20);
    edge.userData.skiBoundary = true;
    root.add(edge);
  }

  for (const item of pending) {
    const { course, pts, style, vecs } = item;
    const glow = ribbonMesh(THREE, vecs, trailW * 1.45, 0x243038, 1, 2);
    glow.userData.courseId = course.id;
    const line = ribbonMesh(THREE, vecs, trailW, style.color, 1, 3);
    line.userData.courseId = course.id;

    const mid = midPoint(pts, elevFn);
    const badge = badgeTexture(THREE, style, course.name || course.id);
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: badge.tex,
        transparent: true,
        depthTest: false,
      }),
    );
    const iconH = 78;
    const h = iconH / (128 / 200);
    spr.position.set(mid.x, mid.y, mid.z);
    spr.scale.set(h * badge.aspect, h, 1);
    spr.userData.courseId = course.id;
    spr.userData.baseW = h * badge.aspect;
    spr.userData.baseH = h;
    spr.renderOrder = 4;

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(18, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.copy(spr.position);
    hit.userData.courseId = course.id;

    root.add(line, glow, spr, hit);
    picks.push({ course, line, glow, spr, label: spr, style, pts });
  }

  scene.add(root);
  const cx = (minX + maxX) / 2 || 0;
  const cz = (minZ + maxZ) / 2 || 0;
  return {
    root,
    picks,
    skiArea,
    bounds: { cx, cz, span, minY, maxY, minX, maxX, minZ, maxZ },
  };
}

export function setTrailMapSelection(map, courseId) {
  if (!map) return;
  map.selectedId = courseId;
  for (const p of map.picks) {
    const on = p.course.id === courseId;
    p.glow.material.opacity = on ? 1 : 0.85;
    p.spr.material.opacity = on ? 1 : 0.9;
    p.line.material.color.setHex(p.style.color);
    p.line.material.opacity = 1;
    p.line.visible = true;
    p.glow.visible = true;
  }
}

/** Keep badges readable while zooming: world size tracks camera distance. */
export function updateTrailMapLod(map, camera) {
  if (!map?.picks?.length || !camera) return;
  const b = map.bounds;
  const midY = Number.isFinite(b.minY) && Number.isFinite(b.maxY) ? (b.minY + b.maxY) * 0.5 : camera.position.y;
  const dist = Math.hypot(camera.position.x - b.cx, camera.position.y - midY, camera.position.z - b.cz);
  const lod = Math.max(0.35, Math.min(2.6, dist / 1100));
  const sel = map.selectedId;
  for (const p of map.picks) {
    const on = p.course.id === sel;
    const k = lod * (on ? 1.12 : 1);
    p.spr.scale.set((p.spr.userData.baseW || 96) * k, (p.spr.userData.baseH || 96) * k, 1);
  }
}

export function pickTrailOnMap(map, raycaster, camera, ndc) {
  if (!map) return null;
  raycaster.setFromCamera(ndc, camera);
  raycaster.params.Line = { threshold: 28 };
  const objs = [];
  for (const p of map.picks) objs.push(p.spr, p.label, p.line, p.glow);
  map.root.traverse((o) => {
    if (o.isMesh && o.userData.courseId) objs.push(o);
  });
  const hits = raycaster.intersectObjects(objs, false);
  return hits[0]?.object?.userData?.courseId || null;
}

export function fitLobbyClip(camera, controls) {
  if (!camera || !controls) return;
  const d = camera.position.distanceTo(controls.target);
  const near = Math.min(28, Math.max(1.2, d * 0.0045));
  const far = Math.max(9000, d * 22, d + 3200);
  const nearCh = Math.abs(camera.near - near) / near;
  const farCh = Math.abs(camera.far - far) / far;
  if (nearCh < 0.18 && farCh < 0.18) return;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

/** Chase/iso sit a few meters off the snow; lobby near would clip the foreground. */
export function fitPlayClip(camera) {
  if (!camera) return;
  if (camera.near === 0.5 && camera.far === 24000) return;
  camera.near = 0.5;
  camera.far = 24000;
  camera.updateProjectionMatrix();
}

export function frameTrailOverview(camera, controls, map, island) {
  if (!map?.bounds) return;
  const { cx, cz, span, maxY, minY } = map.bounds;
  const lo = Number.isFinite(minY) ? minY : 0;
  const hi = Number.isFinite(maxY) ? maxY : lo;
  const midY = Number.isFinite(island?.center?.y) ? island.center.y : (lo + hi) * 0.5;
  const dist = Math.max(700, span * 1.05, Math.max(80, hi - lo) * 1.6);
  camera.fov = 60;
  camera.position.set(cx + span * 0.08, midY + dist * 0.62, cz + dist * 0.72);
  if (controls) {
    controls.target.set(cx, midY, cz);
    // Stay above the snow: no under-terrain flip, no clipping zoom.
    controls.minDistance = Math.max(160, span * 0.14);
    controls.maxDistance = Math.max(dist * 1.65, span * 2.1);
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.enablePan = true;
    controls.enableZoom = false;
    controls.screenSpacePanning = true;
    controls.update();
  }
  fitLobbyClip(camera, controls);
}

/** Keep the trail-map orbit on the ski area so zoom/pan cannot lose the mountain. */
export function clampLobbyOrbit(camera, controls, map, island) {
  if (!camera || !controls || !map?.bounds) return;
  const { cx, cz, span, maxY, minY } = map.bounds;
  const lo = Number.isFinite(minY) ? minY : 0;
  const hi = Number.isFinite(maxY) ? maxY : lo;
  const midY = Number.isFinite(island?.center?.y) ? island.center.y : (lo + hi) * 0.5;
  const maxR = Math.max(100, span * 0.38);
  const t = controls.target;
  const dx = t.x - cx;
  const dz = t.z - cz;
  const r = Math.hypot(dx, dz);
  // Soft pull-back instead of a hard snap — feels less “stuck”.
  if (r > maxR && r > 1e-6) {
    const over = (r - maxR) / r;
    const pull = Math.min(1, 0.22 + over * 0.55);
    t.x -= dx * over * pull;
    t.z -= dz * over * pull;
  }
  t.y += (midY - t.y) * 0.18;
  const p = camera.position;
  let ox = p.x - t.x;
  let oy = p.y - t.y;
  let oz = p.z - t.z;
  let dist = Math.hypot(ox, oy, oz) || 1;
  const loD = controls.minDistance || 160;
  const hiD = controls.maxDistance || dist;
  if (dist < loD || dist > hiD) {
    const want = Math.min(hiD, Math.max(loD, dist));
    const k = want / dist;
    p.set(t.x + ox * k, t.y + oy * k, t.z + oz * k);
  }
  // Keep camera above a floor so zoom never punches under the snow.
  const floorY = midY + Math.max(40, span * 0.02);
  if (p.y < floorY) {
    p.y = floorY;
  }
}

export function difficultyLegendHtml() {
  const items = [
    classifyDifficulty("easy"),
    classifyDifficulty("intermediate"),
    classifyDifficulty("advanced"),
    classifyDifficulty("expert"),
    classifyDifficulty("freeride"),
    classifyDifficulty("extreme"),
    classifyDifficulty("intermediate", "snow_park"),
  ];
  items[items.length - 1].label = "Snow park";
  return `<ul class="legend">${items
    .map((st) => `<li>${markerSvg(st, 16)}<span>${st.label}</span></li>`)
    .join("")}</ul>`;
}

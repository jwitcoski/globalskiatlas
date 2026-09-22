#!/usr/bin/env node
/**
 * Draw Montage Mountain OSM vectors as blog SVGs. No extra deps.
 * Usage: node scripts/render-montage-blog-maps.js
 */
const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VEC = path.join(ROOT, "clay_scenes", "montage_mountain_pa", "vectors");
const OUT = path.join(ROOT, "blog", "images", "how-to-tag");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(VEC, name), "utf8"));
}

function walkCoords(geom, fn) {
  if (!geom) return;
  const t = geom.type;
  if (t === "Point") fn(geom.coordinates);
  else if (t === "LineString" || t === "MultiPoint") geom.coordinates.forEach(fn);
  else if (t === "Polygon" || t === "MultiLineString") geom.coordinates.forEach((r) => r.forEach(fn));
  else if (t === "MultiPolygon") geom.coordinates.forEach((p) => p.forEach((r) => r.forEach(fn)));
}

function boundsOf(fcs) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const fc of fcs) {
    for (const f of fc.features || []) {
      walkCoords(f.geometry, (c) => {
        if (c[0] < minX) minX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] > maxY) maxY = c[1];
      });
    }
  }
  return { minX, minY, maxX, maxY };
}

function makeXform(b, w, h, pad) {
  const dx = b.maxX - b.minX || 1;
  const dy = b.maxY - b.minY || 1;
  const s = Math.min((w - pad * 2) / dx, (h - pad * 2) / dy);
  const ox = (w - dx * s) / 2 - b.minX * s;
  const oy = (h - dy * s) / 2 + b.maxY * s;
  return (x, y) => [ox + x * s, oy - y * s];
}

function polyPath(rings, xf) {
  return rings
    .map((ring) => {
      return ring
        .map((c, i) => {
          const [x, y] = xf(c[0], c[1]);
          return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
        })
        .join(" ");
    })
    .join(" ") + " Z";
}

function linePath(coords, xf) {
  return coords
    .map((c, i) => {
      const [x, y] = xf(c[0], c[1]);
      return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    })
    .join(" ");
}

function difficulty(f) {
  const tags = (f.properties && f.properties.tags) || {};
  const blob = String(tags.other_tags || "") + JSON.stringify(tags);
  const m = blob.match(/piste:difficulty"?=>"?(\w+)/) || blob.match(/piste:difficulty":"(\w+)/);
  return m ? m[1] : "unknown";
}

function aerialway(f) {
  const tags = (f.properties && f.properties.tags) || {};
  return tags.aerialway || f.properties.aerialway || "lift";
}

const DIFF_COLOR = {
  novice: "#22c55e",
  easy: "#22c55e",
  intermediate: "#1a4d8c",
  advanced: "#111827",
  expert: "#111827",
  unknown: "#64748b",
};

function legend(items, x, y) {
  return items
    .map((it, i) => {
      const yy = y + i * 18;
      const sw =
        it.shape === "dot"
          ? `<circle cx="${x + 6}" cy="${yy}" r="4" fill="${it.color}"/>`
          : it.shape === "sq"
            ? `<rect x="${x + 1}" y="${yy - 6}" width="12" height="12" fill="${it.color}"/>`
            : `<line x1="${x}" y1="${yy}" x2="${x + 16}" y2="${yy}" stroke="${it.color}" stroke-width="${it.w || 3}"/>`;
      return `${sw}<text x="${x + 22}" y="${yy + 4}" font-size="12" font-family="system-ui,Roboto,sans-serif" fill="#374151">${it.label}</text>`;
    })
    .join("");
}

function svgWrap(w, h, inner, credit, bg = "#f8fafc") {
  const creditFill = bg === "none" ? "#f8fafc" : "#6b7280";
  const bgRect = bg === "none" ? "" : `<rect width="100%" height="100%" fill="${bg}"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  ${bgRect}
  ${inner}
  <text x="12" y="${h - 10}" font-size="11" font-family="system-ui,Roboto,sans-serif" fill="${creditFill}">${credit}</text>
</svg>
`;
}

const MAPTILER_KEY = "0P06ORgY8WvmMOnPr0p2";
const OSM_WINTER_SPORTS_WAY = 45096232;

function fetchBuf(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "GlobalSkiAtlas/blog-maps", ...headers } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuf(res.headers.location, headers).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            reject(new Error(`${res.statusCode} ${url}\n${buf.slice(0, 200)}`));
            return;
          }
          resolve(buf);
        });
      })
      .on("error", reject);
  });
}

function parseOsmWayRing(xml) {
  const nodes = {};
  const nodeRe = /<node\s([^>]+)\/>/g;
  let m;
  while ((m = nodeRe.exec(xml))) {
    const attrs = m[1];
    const id = attrs.match(/\bid="(\d+)"/);
    const lat = attrs.match(/\blat="([^"]+)"/);
    const lon = attrs.match(/\blon="([^"]+)"/);
    if (id && lat && lon) nodes[id[1]] = [+lon[1], +lat[1]];
  }
  const ring = [];
  const ndRe = /<nd ref="(\d+)"\/>/g;
  while ((m = ndRe.exec(xml))) {
    const pt = nodes[m[1]];
    if (pt) ring.push(pt);
  }
  return ring;
}

function lonLatToMerc(lon, lat) {
  const x = (lon + 180) / 360;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return [x, y];
}

async function writeWinterSportsOnAerial() {
  const osmPath = path.join(OUT, `osm-way-${OSM_WINTER_SPORTS_WAY}.xml`);
  let xml;
  if (fs.existsSync(osmPath)) {
    xml = fs.readFileSync(osmPath, "utf8");
  } else {
    xml = (
      await fetchBuf(`https://api.openstreetmap.org/api/0.6/way/${OSM_WINTER_SPORTS_WAY}/full`)
    ).toString("utf8");
    fs.writeFileSync(osmPath, xml);
  }
  const ring = parseOsmWayRing(xml);
  if (ring.length < 4) throw new Error("OSM winter_sports ring missing");

  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  const padLon = (maxLon - minLon) * 0.1;
  const padLat = (maxLat - minLat) * 0.1;
  minLon -= padLon;
  maxLon += padLon;
  minLat -= padLat;
  maxLat += padLat;

  // Static Maps 403 on this key; XYZ satellite-v2 tiles are allowed.
  const z = 15;
  const nPx = 2 ** z * 256;
  const worldPx = (lon, lat) => {
    const [mx, my] = lonLatToMerc(lon, lat);
    return [mx * nPx, my * nPx];
  };
  const [minPxX, minPxY] = worldPx(minLon, maxLat);
  const [maxPxX, maxPxY] = worldPx(maxLon, minLat);
  const tx0 = Math.floor(minPxX / 256);
  const ty0 = Math.floor(minPxY / 256);
  const tx1 = Math.floor((maxPxX - 1) / 256);
  const ty1 = Math.floor((maxPxY - 1) / 256);

  let images = "";
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const fname = `sat-${z}-${tx}-${ty}.jpg`;
      const fpath = path.join(OUT, fname);
      const buf = fs.existsSync(fpath)
        ? fs.readFileSync(fpath)
        : await fetchBuf(
            `https://api.maptiler.com/tiles/satellite-v2/${z}/${tx}/${ty}.jpg?key=${MAPTILER_KEY}`
          );
      if (!fs.existsSync(fpath)) fs.writeFileSync(fpath, buf);
      const href = `data:image/jpeg;base64,${buf.toString("base64")}`;
      images += `<image href="${href}" x="${tx * 256}" y="${ty * 256}" width="256" height="256"/>\n`;
    }
  }

  const d = ring
    .map(([lon, lat], i) => {
      const [x, y] = worldPx(lon, lat);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";

  const vbW = maxPxX - minPxX;
  const vbH = maxPxY - minPxY;
  const credit =
    "MapTiler satellite. Overlay: OpenStreetMap landuse=winter_sports © OSM contributors (ODbL).";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minPxX.toFixed(1)} ${minPxY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${W}" height="${H}" role="img">
  ${images}
  <path d="${d}" fill="#0f766e" fill-opacity="0.28" stroke="#5eead4" stroke-width="${(vbW / W) * 2.5}"/>
  <rect x="${minPxX + vbW * 0.014}" y="${minPxY + vbH * 0.02}" width="${vbW * 0.52}" height="${vbH * 0.12}" fill="#0f172a" fill-opacity="0.72"/>
  <text x="${minPxX + vbW * 0.025}" y="${minPxY + vbH * 0.065}" font-size="${vbH * 0.035}" font-weight="600" font-family="system-ui,Roboto,sans-serif" fill="#f8fafc">1. landuse=winter_sports</text>
  <text x="${minPxX + vbW * 0.025}" y="${minPxY + vbH * 0.108}" font-size="${vbH * 0.025}" font-family="system-ui,Roboto,sans-serif" fill="#e5e7eb">OSM way 45096232 · Montage Mountain Ski Area</text>
  <text x="${minPxX + vbW * 0.014}" y="${maxPxY - vbH * 0.02}" font-size="${vbH * 0.022}" font-family="system-ui,Roboto,sans-serif" fill="#f8fafc">${credit}</text>
</svg>
`;
  fs.writeFileSync(path.join(OUT, "01-area.svg"), svg);
  console.log("wrote 01-area.svg with MapTiler satellite tiles z=" + z);
}

const area = load("ski-area-buffer.geojson");
const lifts = load("lifts.geojson");
const pistes = load("piste-trails.geojson");
const trees = load("tree-points.geojson");
const bAll = boundsOf([area, lifts, pistes]);
const W = 860;
const H = 640;
const xf = makeXform(bAll, W, H, 36);
const CREDIT = "Montage Mountain, PA. Map data © OpenStreetMap contributors (ODbL).";

const areaD = area.features
  .map((f) => polyPath(f.geometry.coordinates, xf))
  .join(" ");

function areaFill() {
  return `<path d="${areaD}" fill="#0f766e" fill-opacity="0.12" stroke="#0f766e" stroke-width="2"/>`;
}

function liftLines() {
  return lifts.features
    .map((f) => {
      const kind = aerialway(f);
      const dash = kind === "magic_carpet" || kind === "rope_tow" ? ' stroke-dasharray="5 4"' : "";
      const g = f.geometry;
      if (g.type !== "LineString") return "";
      return `<path d="${linePath(g.coordinates, xf)}" fill="none" stroke="#b45309" stroke-width="3"${dash}/>`;
    })
    .join("");
}

function pisteLines() {
  return pistes.features
    .map((f) => {
      const g = f.geometry;
      if (g.type !== "LineString") return "";
      const c = DIFF_COLOR[difficulty(f)] || DIFF_COLOR.unknown;
      return `<path d="${linePath(g.coordinates, xf)}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
}

function treeDots() {
  const feats = trees.features;
  const step = Math.max(1, Math.floor(feats.length / 420));
  let out = "";
  for (let i = 0; i < feats.length; i += step) {
    const c = feats[i].geometry.coordinates;
    const [x, y] = xf(c[0], c[1]);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="#166534" fill-opacity="0.7"/>`;
  }
  return out;
}

// Schematic lodge pads near the south (low-northing) edge of the boundary.
function buildingRects() {
  const pads = [
    [520, 290, 48, 28, "Lodge"],
    [590, 275, 36, 22, "Rental"],
    [470, 310, 70, 18, "Parking"],
  ];
  return pads
    .map(([ex, ny, w, h, label]) => {
      const [x, y] = xf(ex, ny);
      return `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w}" height="${h}" fill="#e2e8f0" stroke="#334155" stroke-width="1.5"/>
      <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-family="system-ui,Roboto,sans-serif" fill="#0f172a">${label}</text>`;
    })
    .join("");
}

function snapInset() {
  const ends = [];
  for (const f of pistes.features) {
    const c = f.geometry && f.geometry.coordinates;
    if (!c || c.length < 2) continue;
    ends.push(c[0], c[c.length - 1]);
  }
  let best = null;
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      const dx = ends[i][0] - ends[j][0];
      const dy = ends[i][1] - ends[j][1];
      const d = Math.hypot(dx, dy);
      if (d < 0.4 || d > 14) continue;
      if (!best || d < best.d) best = { d, a: ends[i], b: ends[j] };
    }
  }
  const cx = best ? (best.a[0] + best.b[0]) / 2 : 700;
  const cy = best ? (best.a[1] + best.b[1]) / 2 : 1200;
  const span = 90;
  const zoomB = { minX: cx - span, maxX: cx + span, minY: cy - span, maxY: cy + span };
  const zf = makeXform(zoomB, W, H, 48);
  const clips = pistes.features
    .map((f) => {
      const g = f.geometry;
      if (g.type !== "LineString") return "";
      const c = DIFF_COLOR[difficulty(f)] || DIFF_COLOR.unknown;
      return `<path d="${linePath(g.coordinates, zf)}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
    })
    .join("");
  const nodes = [];
  for (const f of pistes.features) {
    const c = f.geometry && f.geometry.coordinates;
    if (!c) continue;
    for (const pt of [c[0], c[c.length - 1]]) {
      if (Math.abs(pt[0] - cx) < span && Math.abs(pt[1] - cy) < span) nodes.push(pt);
    }
  }
  const squares = nodes
    .map((pt) => {
      const [x, y] = zf(pt[0], pt[1]);
      return `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" fill="#fff" stroke="#0f766e" stroke-width="2"/>`;
    })
    .join("");
  const gapNote = best
    ? `Gap shown: ${best.d.toFixed(1)} m between trail ends. Snap those nodes so GPS tracks stay on one network.`
    : "Share nodes where trails meet.";
  return { clips, squares, gapNote };
}

function barChart() {
  const counts = { novice: 0, easy: 0, intermediate: 0, advanced: 0, expert: 0, unknown: 0 };
  for (const f of pistes.features) counts[difficulty(f)] = (counts[difficulty(f)] || 0) + 1;
  const keys = ["novice", "easy", "intermediate", "advanced", "expert"];
  const max = Math.max(...keys.map((k) => counts[k]), 1);
  const bw = 70;
  const left = 80;
  const base = 480;
  const bars = keys
    .map((k, i) => {
      const h = (counts[k] / max) * 360;
      const x = left + i * 140;
      const y = base - h;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${DIFF_COLOR[k]}"/>
      <text x="${x + bw / 2}" y="${base + 22}" text-anchor="middle" font-size="13" font-family="system-ui,Roboto,sans-serif" fill="#374151">${k}</text>
      <text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle" font-size="14" font-weight="600" font-family="system-ui,Roboto,sans-serif" fill="#111827">${counts[k]}</text>`;
    })
    .join("");
  const title = `<text x="40" y="40" font-size="18" font-weight="600" font-family="system-ui,Roboto,sans-serif" fill="#111827">Montage mapped downhill ways by piste:difficulty</text>
  <text x="40" y="64" font-size="13" font-family="system-ui,Roboto,sans-serif" fill="#6b7280">Counts from the OpenStreetMap extract we render on the atlas. Untagged ways are omitted from this chart.</text>`;
  return svgWrap(W, H, `${title}${bars}`, CREDIT);
}

fs.mkdirSync(OUT, { recursive: true });

const title = (t) =>
  `<text x="20" y="28" font-size="18" font-weight="600" font-family="system-ui,Roboto,sans-serif" fill="#111827">${t}</text>`;

const maps = {
  "02-forest.svg": svgWrap(
    W,
    H,
    `${title("2. Trees inside the ski area")}${areaFill()}${treeDots()}${legend(
      [
        { color: "#0f766e", label: "ski area", shape: "sq" },
        { color: "#166534", label: "natural=wood / tree points (sampled)", shape: "dot" },
      ],
      20,
      52
    )}`,
    CREDIT
  ),
  "03-lifts.svg": svgWrap(
    W,
    H,
    `${title("3. Lifts as aerialway ways")}${areaFill()}${liftLines()}${legend(
      [
        { color: "#b45309", label: "chair_lift (solid) / magic_carpet (dashed)", w: 3 },
      ],
      20,
      52
    )}`,
    CREDIT
  ),
  "04-buildings.svg": svgWrap(
    W,
    H,
    `${title("4. Buildings at the base")}${areaFill()}${liftLines()}${buildingRects()}${legend(
      [{ color: "#334155", label: "building=yes (lodge, rental, parking outlines)", shape: "sq" }],
      20,
      52
    )}`,
    CREDIT
  ),
  "05-trails.svg": svgWrap(
    W,
    H,
    `${title("5. Downhill pistes from the trail map")}${areaFill()}${pisteLines()}${legend(
      [
        { color: "#22c55e", label: "novice / easy" },
        { color: "#1a4d8c", label: "intermediate" },
        { color: "#111827", label: "advanced / expert" },
      ],
      20,
      52
    )}`,
    CREDIT
  ),
  "06-full.svg": svgWrap(
    W,
    H,
    `${title("Montage Mountain as mapped for the atlas")}${areaFill()}${treeDots()}${pisteLines()}${liftLines()}${legend(
      [
        { color: "#0f766e", label: "ski area", shape: "sq" },
        { color: "#166534", label: "trees", shape: "dot" },
        { color: "#1a4d8c", label: "pistes" },
        { color: "#b45309", label: "lifts" },
      ],
      20,
      52
    )}`,
    CREDIT
  ),
};

const snap = snapInset();
maps["07-snap.svg"] = svgWrap(
  W,
  H,
  `${title("6. Snap trail ends to shared nodes")}${snap.clips}${snap.squares}
  <text x="20" y="54" font-size="13" font-family="system-ui,Roboto,sans-serif" fill="#374151">${snap.gapNote}</text>
  ${legend([{ color: "#0f766e", label: "node (square): join trails here", shape: "sq" }], 20, 72)}`,
  CREDIT
);
maps["08-difficulty.svg"] = barChart();

for (const [name, xml] of Object.entries(maps)) {
  fs.writeFileSync(path.join(OUT, name), xml);
  console.log("wrote", name);
}

writeWinterSportsOnAerial().catch((err) => {
  console.error(err);
  process.exit(1);
});

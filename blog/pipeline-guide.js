/**
 * Pipeline blog maps + parquet charts. Bristol Mountain is the worked example.
 * Scroll zoom is off so the page can scroll.
 */
import { createMapLibre } from "../scripts/map-core.js";
import { addSkiPmtilesToMap, SKI_PMTILES_LAYERS } from "../scripts/pmtiles-core.js";
import { pisteLineColorExpression } from "../scripts/map-colors.js";
import { config } from "../scripts/map-config.js";
import { loadSkiAreasAnalyzed } from "../scripts/geoparquet-browser.js";

const SAT_STYLE = {
  version: 8,
  sources: {
    sat: {
      type: "raster",
      tiles: [
        `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${config.MAPTILER_KEY}`,
      ],
      tileSize: 256,
      attribution: "© MapTiler © OpenStreetMap contributors",
    },
  },
  layers: [{ id: "sat", type: "raster", source: "sat" }],
};

const OSM_XML = new URL("./images/how-pipeline/osm-way-320434895.xml", import.meta.url);
const BRISTOL_ID = "320434895";
const BRISTOL_CLAY = "bristol_mountain_ski_resort_united_states_of_ame";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseOsmRing(xml) {
  const nodes = {};
  const nodeRe = /<node\s([^>]+)\/>/g;
  let m;
  while ((m = nodeRe.exec(xml))) {
    const a = m[1];
    const id = a.match(/\bid="(\d+)"/);
    const lat = a.match(/\blat="([^"]+)"/);
    const lon = a.match(/\blon="([^"]+)"/);
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

function parseOsmTags(xml) {
  const tags = { osm_type: "way" };
  const way = xml.match(/<way\b[\s\S]*?<\/way>/);
  if (!way) return tags;
  const id = way[0].match(/\bid="(\d+)"/);
  if (id) tags.osm_id = id[1];
  const tagRe = /<tag k="([^"]+)" v="([^"]*)"\/>/g;
  let m;
  while ((m = tagRe.exec(way[0]))) tags[m[1]] = m[2];
  return tags;
}

function popupHtml(title, props) {
  const keys = Object.keys(props).sort();
  const rows = keys
    .map((k) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(props[k] ?? "")}</td></tr>`)
    .join("");
  return `<p>${escapeHtml(title)}</p><table>${rows}</table>`;
}

function bindTagTable(host, title, props) {
  let box = host.parentElement?.querySelector(".guide-osm-popup");
  if (!box) {
    box = document.createElement("div");
    box.className = "guide-osm-popup";
    host.insertAdjacentElement("afterend", box);
  }
  box.innerHTML = popupHtml(title, props);
}

function waitForSdk(ms = 8000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (window.maptilersdk) return resolve(true);
      if (Date.now() - t0 > ms) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function parseHost(host) {
  const [lon, lat] = (host.dataset.center || "-77.4136,42.7426").split(",").map(Number);
  return { center: [lon, lat], zoom: Number(host.dataset.zoom || 14) };
}

function quietWheel(host) {
  host.addEventListener("wheel", (e) => e.stopPropagation(), { capture: true, passive: true });
}

function holderFor(host, idx) {
  const holder = document.createElement("div");
  holder.id = "pipe-map-" + idx;
  holder.style.width = "100%";
  holder.style.height = "360px";
  host.classList.add("is-home", "is-live");
  host.appendChild(holder);
  return holder;
}

async function bootWiki2dMap(host, idx) {
  const holder = holderFor(host, idx);
  const parsed = parseHost(host);
  const { map } = await createMapLibre({
    containerId: holder.id,
    center: parsed.center,
    zoom: parsed.zoom,
    noControl: true,
  });
  quietWheel(host);
  await addSkiPmtilesToMap(map, { pistesWidth: 3 });
  try {
    map.setPaintProperty(
      SKI_PMTILES_LAYERS.pistes,
      "line-color",
      pisteLineColorExpression("american")
    );
  } catch (err) {
    console.warn("[pipeline-guide] piste colors", err);
  }
}

async function bootAreaMap(host, area, idx) {
  const holder = holderFor(host, idx);
  const parsed = parseHost(host);
  const { map } = await createMapLibre({
    containerId: holder.id,
    style: SAT_STYLE,
    center: parsed.center,
    zoom: parsed.zoom,
    noControl: true,
  });
  quietWheel(host);
  map.addSource("area", { type: "geojson", data: area });
  map.addLayer({
    id: "area-fill",
    type: "fill",
    source: "area",
    paint: { "fill-color": "#0f766e", "fill-opacity": 0.28 },
  });
  map.addLayer({
    id: "area-line",
    type: "line",
    source: "area",
    paint: { "line-color": "#0f766e", "line-width": 2 },
  });
  bindTagTable(host, "OSM way 320434895", area.properties);
}

async function bootSatSkiMap(host, idx) {
  const holder = holderFor(host, idx);
  const parsed = parseHost(host);
  const { map } = await createMapLibre({
    containerId: holder.id,
    style: SAT_STYLE,
    center: parsed.center,
    zoom: parsed.zoom,
    noControl: true,
  });
  quietWheel(host);
  await addSkiPmtilesToMap(map, { pistesWidth: 3 });
  try {
    map.setPaintProperty(
      SKI_PMTILES_LAYERS.pistes,
      "line-color",
      pisteLineColorExpression("american")
    );
  } catch (err) {
    console.warn("[pipeline-guide] piste colors", err);
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mixChart(row) {
  const bars = [
    { k: "novice", n: num(row.trails_novice), c: "#22c55e" },
    { k: "easy", n: num(row.trails_easy), c: "#86efac" },
    { k: "intermediate", n: num(row.trails_intermediate), c: "#2563eb" },
    { k: "advanced", n: num(row.trails_advanced), c: "#111827" },
    { k: "expert", n: num(row.trails_expert), c: "#000" },
  ];
  const max = Math.max(...bars.map((b) => b.n), 1);
  const W = 320;
  const H = 220;
  const left = 108;
  const top = 8;
  const bh = 28;
  const gap = 10;
  const barW = W - left - 36;
  const rects = bars
    .map((b, i) => {
      const y = top + i * (bh + gap);
      const w = (b.n / max) * barW;
      return `<text x="0" y="${y + 18}" font-size="12" fill="#334155">${b.k}</text>
        <rect x="${left}" y="${y}" width="${w}" height="${bh}" fill="${b.c}"/>
        <text x="${left + w + 6}" y="${y + 18}" font-size="12" fill="#111827">${b.n}</text>`;
    })
    .join("");
  return `<div class="guide-chart-title">downhill_trails by piste:difficulty</div>
    <div class="guide-chart-sub">ski_areas_analyzed.parquet · Bristol Mountain</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${rects}</svg>`;
}

function scatterChart(rows, highlightId) {
  const pts = rows
    .filter((r) => /new york/i.test(String(r.state || "")) && num(r.downhill_trails) > 0 && num(r.skiable_terrain_acres) > 0)
    .map((r) => ({
      id: String(r.winter_sports_id),
      name: r.english_name || r.name,
      t: num(r.downhill_trails),
      a: num(r.skiable_terrain_acres),
    }));
  const maxT = Math.max(...pts.map((p) => p.t), 1);
  const maxA = Math.max(...pts.map((p) => p.a), 1);
  const W = 340;
  const H = 280;
  const m = { t: 12, r: 12, b: 36, l: 44 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const dots = pts
    .map((p) => {
      const x = m.l + (p.t / maxT) * iw;
      const y = m.t + ih - (p.a / maxA) * ih;
      const hi = p.id === highlightId;
      return `<circle cx="${x}" cy="${y}" r="${hi ? 7 : 3.5}" fill="${hi ? "#0f766e" : "#94a3b8"}" opacity="${hi ? 1 : 0.7}"/>`;
    })
    .join("");
  return `<div class="guide-chart-title">New York: trails vs skiable acres</div>
    <div class="guide-chart-sub">${pts.length} downhill areas. Teal is Bristol. X is downhill_trails, Y is skiable_terrain_acres.</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img">
      <line x1="${m.l}" y1="${m.t + ih}" x2="${m.l + iw}" y2="${m.t + ih}" stroke="#cbd5e1"/>
      <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ih}" stroke="#cbd5e1"/>
      ${dots}
    </svg>`;
}

function parquetTable(row) {
  const keep = [
    "winter_sports_id",
    "winter_sports_type",
    "name",
    "state",
    "country",
    "region",
    "centroid_lat",
    "centroid_lon",
    "total_area_acres",
    "skiable_terrain_acres",
    "downhill_trails",
    "total_lifts",
    "lift_types",
    "total_trail_mi",
    "longest_trail_mi",
    "avg_trail_mi",
    "trails_novice",
    "trails_easy",
    "trails_intermediate",
    "trails_advanced",
    "trails_expert",
    "night_skiing",
    "lit_pistes",
    "website",
    "resort_type",
  ];
  const props = {};
  for (const k of keep) if (row[k] != null && row[k] !== "") props[k] = row[k];
  return props;
}

async function bootCharts(row, allRows) {
  for (const el of document.querySelectorAll("[data-chart]")) {
    const kind = el.dataset.chart;
    if (kind === "mix") el.innerHTML = mixChart(row);
    if (kind === "scatter") el.innerHTML = scatterChart(allRows, BRISTOL_ID);
    if (kind === "row") {
      el.innerHTML = "";
      const box = document.createElement("div");
      box.className = "guide-osm-popup";
      box.innerHTML = popupHtml("ski_areas_analyzed.parquet", parquetTable(row));
      el.appendChild(box);
    }
  }
}

async function bootAllMaps(area) {
  if (!(await waitForSdk())) return;
  const hosts = [...document.querySelectorAll(".guide-map-host[data-kind]")];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target.dataset.booted) continue;
        e.target.dataset.booted = "1";
        io.unobserve(e.target);
        const kind = e.target.dataset.kind;
        const idx = hosts.indexOf(e.target);
        const run =
          kind === "area"
            ? bootAreaMap(e.target, area, idx)
            : kind === "satski"
              ? bootSatSkiMap(e.target, idx)
              : bootWiki2dMap(e.target, idx);
        run.catch((err) => console.warn("[pipeline-guide]", err));
      }
    },
    { rootMargin: "200px", threshold: 0 }
  );
  hosts.forEach((h) => io.observe(h));
}

function bootClay() {
  const stage = document.getElementById("guide-clay-stage");
  if (!stage) return;
  import("../scripts/hero-montage-map.js")
    .then((m) =>
      m.initHeroMontageMap(stage, {
        resortId: BRISTOL_CLAY,
        lockResort: true,
        skipNearest: true,
      })
    )
    .catch((err) => console.warn("[pipeline-guide] clay", err));
}

async function main() {
  bootClay();
  const xml = await fetch(OSM_XML).then((r) => r.text());
  const ring = parseOsmRing(xml);
  const area = {
    type: "Feature",
    properties: parseOsmTags(xml),
    geometry: { type: "Polygon", coordinates: [ring] },
  };
  const rows = await loadSkiAreasAnalyzed();
  const row = rows.find((r) => String(r.winter_sports_id) === BRISTOL_ID) || {};
  await bootCharts(row, rows);
  await bootAllMaps(area);
}

main().catch((err) => console.warn("[pipeline-guide]", err));

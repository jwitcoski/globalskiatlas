/**
 * One MapTiler map per tagging-guide example. Scroll zoom is off so the page can scroll.
 */
import { createMapLibre } from "../scripts/map-core.js";
import { addSkiPmtilesToMap, SKI_PMTILES_LAYERS } from "../scripts/pmtiles-core.js";
import { pisteLineColorExpression } from "../scripts/map-colors.js";
import { config } from "../scripts/map-config.js";

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

const OSM_XML = new URL("./images/how-to-tag/osm-way-45096232.xml", import.meta.url);

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
  const skip = { kind: 1 };
  const keys = Object.keys(props)
    .filter((k) => !skip[k])
    .sort();
  const rows = keys
    .map(
      (k) =>
        `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(props[k])}</td></tr>`
    )
    .join("");
  return `<p>${escapeHtml(title)}</p><table>${rows}</table>`;
}

function waitForSdk(ms = 8000) {
  if (typeof maptilersdk !== "undefined") return Promise.resolve(true);
  return new Promise((resolve) => {
    const t0 = Date.now();
    const t = setInterval(() => {
      if (typeof maptilersdk !== "undefined") {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - t0 > ms) {
        clearInterval(t);
        resolve(false);
      }
    }, 40);
  });
}

async function loadAreaGeojson() {
  const xml = await fetch(OSM_XML).then((r) => r.text());
  const ring = parseOsmRing(xml);
  if (ring.length < 4) return null;
  return {
    type: "Feature",
    properties: parseOsmTags(xml),
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

function parseHost(host) {
  const [lng, lat] = (host.dataset.center || "-75.6587,41.3532").split(",").map(Number);
  return {
    center: [lng, lat],
    zoom: Number(host.dataset.zoom || 14),
    overlay: host.dataset.overlay || "area",
  };
}

const TREES_JSON = new URL("./images/how-to-tag/osm-trees.geojson", import.meta.url);
const EXAMPLES_JSON = new URL("./images/how-to-tag/osm-guide-examples.geojson", import.meta.url);

function bindTagTable(host, map, layerId, title) {
  let box = host.parentElement.querySelector(":scope > .guide-osm-popup");
  if (!box) {
    box = document.createElement("div");
    box.className = "guide-osm-popup";
    host.insertAdjacentElement("afterend", box);
  }
  function open(f) {
    const t =
      (f.properties && (f.properties.name || f.properties.note)) || title;
    box.innerHTML = popupHtml(t, f.properties);
  }
  map.on("click", layerId, (e) => {
    if (e.features && e.features[0]) open(e.features[0]);
  });
  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
  return { open };
}

const TITLES = {
  area: "Winter-sports area",
  intro2d: "Winter-sports area",
  review: "Winter-sports area",
  point: "Tree node",
  line: "Tree row",
  polygon: "Wood polygon",
  building: "Lodge building",
  road: "Access road",
  parking: "Parking lot",
  lift: "Chairlift",
  trail: "Downhill piste",
  snap: "Shared trail node",
  pistepoly: "Area piste",
  "pistepoly-snap": "Area piste",
  nordic: "Nordic piste",
};

function featsForKind(fc, kind) {
  if (kind === "snap") {
    return fc.features.filter((f) => f.properties.kind === "snap" || f.properties.kind === "snap-node");
  }
  if (kind === "pistepoly" || kind === "pistepoly-snap") {
    return fc.features.filter((f) => f.properties.kind === "pistepoly" || f.properties.kind === "pistepoly-wood");
  }
  if (kind === "review" || kind === "intro2d") return fc.features.filter((f) => f.properties.kind === "area");
  return fc.features.filter((f) => f.properties.kind === kind);
}

function addKindLayers(map, src, kind) {
  const fill = (color, op) => {
    map.addLayer({
      id: src + "-fill",
      type: "fill",
      source: src,
      paint: { "fill-color": color, "fill-opacity": op },
    });
  };
  const line = (color, w, filter) => {
    map.addLayer({
      id: src + "-line",
      type: "line",
      source: src,
      ...(filter ? { filter } : {}),
      paint: { "line-color": color, "line-width": w },
    });
  };
  const circle = (color) => {
    map.addLayer({
      id: src + "-pt",
      type: "circle",
      source: src,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 8,
        "circle-color": color,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#f8fafc",
      },
    });
  };

  if (kind === "area" || kind === "review" || kind === "intro2d") {
    fill("#0f766e", 0.28);
    line("#5eead4", 2);
    return src + "-fill";
  }
  if (kind === "polygon") {
    fill("#166534", 0.4);
    line("#86efac", 2);
    return src + "-fill";
  }
  if (kind === "building") {
    fill("#cbd5e1", 0.85);
    line("#334155", 2);
    return src + "-fill";
  }
  if (kind === "parking") {
    fill("#64748b", 0.35);
    line("#334155", 2);
    return src + "-fill";
  }
  if (kind === "line") {
    line("#14532d", 5);
    return src + "-line";
  }
  if (kind === "road") {
    line("#1a4d8c", 4);
    return src + "-line";
  }
  if (kind === "lift") {
    line("#b45309", 4);
    return src + "-line";
  }
  if (kind === "trail") {
    line("#111827", 4);
    return src + "-line";
  }
  if (kind === "nordic") {
    line("#0f766e", 4);
    return src + "-line";
  }
  if (kind === "pistepoly" || kind === "pistepoly-snap") {
    map.addLayer({
      id: src + "-fill",
      type: "fill",
      source: src,
      filter: ["==", ["get", "kind"], "pistepoly"],
      paint: { "fill-color": "#f59e0b", "fill-opacity": 0.42 },
    });
    map.addLayer({
      id: src + "-wood",
      type: "fill",
      source: src,
      filter: ["==", ["get", "kind"], "pistepoly-wood"],
      paint: { "fill-color": "#166534", "fill-opacity": 0.45 },
    });
    map.addLayer({
      id: src + "-line",
      type: "line",
      source: src,
      filter: ["==", ["get", "kind"], "pistepoly"],
      paint: { "line-color": "#b45309", "line-width": 2 },
    });
    map.addLayer({
      id: src + "-wood-line",
      type: "line",
      source: src,
      filter: ["==", ["get", "kind"], "pistepoly-wood"],
      paint: { "line-color": "#86efac", "line-width": 2 },
    });
    return src + "-fill";
  }
  if (kind === "snap") {
    line("#1a4d8c", 4, ["==", ["geometry-type"], "LineString"]);
    circle("#f8fafc");
    map.setPaintProperty(src + "-pt", "circle-color", "#0f766e");
    map.setPaintProperty(src + "-pt", "circle-radius", 9);
    return src + "-pt";
  }
  circle("#22c55e");
  return src + "-pt";
}

function quietWheel(host) {
  host.addEventListener(
    "wheel",
    (e) => {
      e.stopPropagation();
    },
    { capture: true, passive: true }
  );
}

async function bootWiki2dMap(host, idx) {
  const holder = document.createElement("div");
  holder.id = "guide-map-" + idx;
  holder.style.width = "100%";
  holder.style.height = "360px";
  host.classList.add("is-home", "is-live");
  host.appendChild(holder);
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
    console.warn("[tag-guide] piste colors", err);
  }
}

async function bootKindMap(host, fc, idx) {
  const kind = host.dataset.kind;
  if (kind === "intro2d") {
    await bootWiki2dMap(host, idx);
    return;
  }
  const feats = featsForKind(fc, kind);
  if (!feats.length) return;
  const holder = document.createElement("div");
  holder.id = "guide-map-" + idx;
  holder.style.width = "100%";
  holder.style.height = "360px";
  host.classList.add("is-home", "is-live");
  host.appendChild(holder);

  const parsed = parseHost(host);
  const { map } = await createMapLibre({
    containerId: holder.id,
    style: SAT_STYLE,
    center: parsed.center,
    zoom: parsed.zoom,
    noControl: true,
  });
  quietWheel(host);

  const src = "guide-" + kind;
  map.addSource(src, { type: "geojson", data: { type: "FeatureCollection", features: feats } });
  const clickLayer = addKindLayers(map, src, kind);
  const title = TITLES[kind] || kind;
  const bound = bindTagTable(host, map, clickLayer, title);
  if (kind === "snap") {
    map.on("click", src + "-line", (e) => {
      if (e.features && e.features[0]) bound.open(e.features[0]);
    });
    const node = feats.find((f) => f.geometry.type === "Point") || feats[0];
    bound.open(node);
  } else if (kind === "pistepoly" || kind === "pistepoly-snap") {
    map.on("click", src + "-wood", (e) => {
      if (e.features && e.features[0]) bound.open(e.features[0]);
    });
    bound.open(feats.find((f) => f.properties.kind === "pistepoly") || feats[0]);
  } else {
    bound.open(feats[0]);
  }
}

async function bootAllMaps() {
  if (!(await waitForSdk())) return;
  const hosts = [...document.querySelectorAll(".guide-map-host[data-kind]")];
  if (!hosts.length) return;
  const trees = await fetch(TREES_JSON).then((r) => r.json());
  const rest = await fetch(EXAMPLES_JSON).then((r) => r.json());
  const area = await loadAreaGeojson();
  if (area) area.properties.kind = "area";
  const fc = {
    type: "FeatureCollection",
    features: [...trees.features, ...rest.features, ...(area ? [area] : [])],
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target.dataset.booted) continue;
        e.target.dataset.booted = "1";
        io.unobserve(e.target);
        bootKindMap(e.target, fc, hosts.indexOf(e.target)).catch((err) =>
          console.warn("[tag-guide]", err)
        );
      }
    },
    { rootMargin: "200px", threshold: 0 }
  );
  hosts.forEach((h) => io.observe(h));
}

function bootClay() {
  const stage = document.getElementById("guide-clay-stage");
  if (!stage) return;
  import("../scripts/hero-montage-map.js").then((m) =>
    m.initHeroMontageMap(stage, {
      resortId: "montage_mountain_pa",
      lockResort: true,
      skipNearest: true,
    })
  ).catch((err) => console.warn("[tag-guide] clay", err));
}

bootClay();
bootAllMaps().catch((err) => console.warn("[tag-guide]", err));



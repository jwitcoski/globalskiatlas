/**
 * Answer skiing-ai questions from the wiki resort index.
 * Ranking ("biggest resort") and name matches return atlas links.
 * Anything else returns null so the page can fall through to the chat API.
 */
import { foldDiacritics } from "./utils.js";

const REGION_TYPES = new Set(["country", "state", "continent"]);

function fold(s) {
  return foldDiacritics(s).toLowerCase();
}

function displayName(p) {
  const en = String(p.englishName || "").trim();
  const local = String(p.title || p.name || "").trim();
  if (en && local && en !== local) return `${en} (${local})`;
  return en || local || p.pageId || "";
}

function wikiHref(pageId) {
  return `/wiki/resort.html?page=${encodeURIComponent(pageId)}`;
}

function mapHref(name) {
  return `/mainmap.html?q=${encodeURIComponent(name)}`;
}

export function resortRows(pages) {
  const list = Array.isArray(pages) ? pages : pages?.pages || [];
  return list.filter((p) => p?.pageId && !REGION_TYPES.has(p.pageType));
}

function metricFor(q) {
  const rank = /\b(biggest|largest|most|top|highest)\b/.test(q);
  if (!rank) return null;
  if (/\b(trail|trails|run|runs)\b/.test(q)) return "downhillTrails";
  if (/\blifts?\b/.test(q)) return "totalLifts";
  if (/\b(biggest|largest|acres?|skiable|size|area)\b/.test(q)) return "skiableTerrainAcres";
  return null;
}

function placeFilter(rows, q) {
  let best = null;
  for (const row of rows) {
    for (const kind of ["state", "country"]) {
      const raw = String(row[kind] || "").trim();
      const name = fold(raw);
      if (name.length < 4) continue;
      if (!q.includes(name)) continue;
      if (!best || name.length > best.name.length) best = { kind, name, label: raw };
    }
  }
  return best;
}

function linksFor(row) {
  const name = displayName(row);
  return [
    { label: name, href: wikiHref(row.pageId) },
    { label: "Map", href: mapHref(name) },
  ];
}

function fmt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return Math.round(v).toLocaleString("en-US");
}

/**
 * @returns {{ text: string, links: {label: string, href: string}[] } | null}
 */
export function lookupAtlas(pages, rawQuery) {
  const q = fold(String(rawQuery || "")).trim();
  if (q.length < 2) return null;
  const rows = resortRows(pages);
  if (!rows.length) return null;

  const metric = metricFor(q);
  if (metric) {
    const place = placeFilter(rows, q);
    let pool = rows;
    if (place) {
      pool = rows.filter((p) => fold(p[place.kind]) === place.name);
    }
    const ranked = pool
      .filter((p) => Number(p[metric]) > 0)
      .sort((a, b) => Number(b[metric]) - Number(a[metric]))
      .slice(0, 3);
    if (!ranked.length) return null;
    const unit = metric === "downhillTrails" ? "trails" : metric === "totalLifts" ? "lifts" : "skiable acres";
    const where = place ? ` in ${place.label}` : "";
    const top = ranked[0];
    const lines = ranked.map((p, i) => `${i + 1}. ${displayName(p)} — ${fmt(p[metric])} ${unit}`);
    return {
      text: `From the Global Ski Atlas index${where}, ranked by ${unit}:\n${lines.join("\n")}`,
      links: linksFor(top),
    };
  }

  const cleaned = q
    .replace(/\b(what|whats|what's|which|is|are|the|a|an|where|show|me|about|please|link|tell|give|find)\b/g, " ")
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3) return null;
  const scored = [];
  for (const row of rows) {
    const name = displayName(row);
    const hay = fold([name, row.englishName, row.title, row.state, row.country].filter(Boolean).join(" "));
    if (!hay.includes(cleaned)) continue;
    let score = 1;
    if (fold(name) === cleaned) score = 4;
    else if (fold(name).startsWith(cleaned)) score = 3;
    scored.push({ row, score, name });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const hit = scored[0];
  if (!hit) return null;
  const unique = scored.length === 1 || scored[1].score < hit.score;
  if (hit.score < 3 && !unique) return null;
  const loc = [hit.row.state, hit.row.country].filter(Boolean).join(", ");
  const bits = [loc, hit.row.skiableTerrainAcres ? `${fmt(hit.row.skiableTerrainAcres)} skiable acres` : "", hit.row.downhillTrails ? `${fmt(hit.row.downhillTrails)} trails` : ""].filter(Boolean);
  return {
    text: `${hit.name}${bits.length ? " — " + bits.join(" · ") : ""}`,
    links: linksFor(hit.row),
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sample = [
  { pageId: "les-3-vallees", title: "Les 3 Vallées", country: "France", skiableTerrainAcres: 12127, downhillTrails: 1648, totalLifts: 150 },
  { pageId: "ski-arlberg", title: "Ski Arlberg", country: "Austria", skiableTerrainAcres: 6740, downhillTrails: 485, totalLifts: 88 },
  { pageId: "vail", title: "Vail", state: "Colorado", country: "United States", skiableTerrainAcres: 5317, downhillTrails: 274, totalLifts: 32 },
  { pageId: "breckenridge", title: "Breckenridge", state: "Colorado", country: "United States", skiableTerrainAcres: 2908, downhillTrails: 187, totalLifts: 34 },
];

if (typeof process !== "undefined" && process.argv?.[1]?.includes("skiing-ai-lookup")) {
  const big = lookupAtlas(sample, "what is the biggest resort?");
  assert(big.links[0].href.includes("les-3-vallees"), "biggest acres");
  assert(big.text.includes("12,127"), "acre count");
  const co = lookupAtlas(sample, "most trails in colorado");
  assert(co.links[0].href.includes("vail"), "colorado trails");
  const named = lookupAtlas(sample, "tell me about ski arlberg");
  assert(named.links[0].href.includes("ski-arlberg"), "name link");
  assert(named.links[1].href.includes("mainmap.html?q="), "map link");
  assert(lookupAtlas(sample, "what skis should I buy") === null, "unrelated falls through");
  console.log("skiing-ai-lookup ok");
}

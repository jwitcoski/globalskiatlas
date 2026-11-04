/** Wiki resort facts for the 3D lobby. Matches catalog/manifest to /api/wiki pages. */

const M_TO_FT = 3.28084;
const HA_TO_ACRES = 2.471054;
const MI_TO_KM = 1.60934;
const MAX_RANK = { small_hill: 4, ski_mountain: 10, multiple_mountains: 11, mega_resort: 14, unknown: 4 };
const STOP = new Set([
  "ski",
  "area",
  "resort",
  "the",
  "and",
  "of",
  "at",
  "a",
  "an",
  "mt",
  "mts",
  "mtn",
  "mountain",
  "mountains",
  "hills",
  "hill",
]);

let indexPromise = null;
const pageCache = new Map();

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokens(s) {
  return fold(s)
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function countryKey(c) {
  const f = fold(c).replace(/\./g, "");
  if (["us", "usa", "united states", "united states of america"].includes(f)) return "us";
  if (["uk", "gb", "great britain", "united kingdom"].includes(f)) return "uk";
  return f;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatElevation(m) {
  if (m == null || typeof m !== "number" || Number.isNaN(m)) return "";
  const ft = Math.round(m * M_TO_FT);
  return `${m.toLocaleString()} m (${ft.toLocaleString()} ft)`;
}

function formatAreaAcres(acres) {
  if (acres == null || typeof acres !== "number" || Number.isNaN(acres)) return "";
  const ha = (acres / HA_TO_ACRES).toFixed(1).replace(/\.0$/, "");
  return `${acres.toLocaleString()} acres (${ha} ha)`;
}

function formatAreaHa(ha) {
  if (ha == null || typeof ha !== "number" || Number.isNaN(ha)) return "";
  const acres = Math.round(ha * HA_TO_ACRES);
  return `${ha.toLocaleString()} ha (${acres.toLocaleString()} acres)`;
}

function formatDistanceMi(mi) {
  if (mi == null || typeof mi !== "number" || Number.isNaN(mi)) return "";
  const km = (mi * MI_TO_KM).toFixed(1).replace(/\.0$/, "");
  return `${mi} mi (${km} km)`;
}

function yesNo(v) {
  if (v === "yes" || v === true) return "Yes";
  if (v === "no" || v === false) return "No";
  return v == null || v === "" ? "" : String(v);
}

export function prefetchWikiIndex() {
  if (!indexPromise) {
    indexPromise = fetch("/api/wiki/index")
      .then((r) => {
        if (!r.ok) throw new Error(`wiki index ${r.status}`);
        return r.json();
      })
      .then((data) => (Array.isArray(data) ? data : data?.pages || []))
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

function scoreWikiPage(hint, page) {
  if (!page || page.pageType === "country" || page.pageType === "state" || page.pageType === "continent") {
    return 0;
  }
  const hintToks = new Set([
    ...tokens(hint.name),
    ...tokens(String(hint.id || "").replace(/_/g, " ").replace(/\b[a-z]{2}$/i, "")),
  ]);
  const pageToks = new Set([...tokens(page.title), ...tokens(page.englishName)]);
  if (!hintToks.size || !pageToks.size) return 0;
  let inter = 0;
  for (const t of hintToks) {
    if (pageToks.has(t)) inter += 1;
  }
  if (inter < 1) return 0;

  const hCountry = countryKey(hint.country);
  const pCountry = countryKey(page.country);
  if (hCountry && pCountry && hCountry !== pCountry) return 0;

  const state = fold(page.state);
  const loc = fold(hint.location);
  if (state && loc && !loc.includes(state)) return 0;

  const nameN = fold(hint.name);
  const titles = [page.title, page.englishName].map(fold).filter(Boolean);
  const nameHit = titles.some((t) => t === nameN || t.includes(nameN) || (nameN && nameN.includes(t)));
  const union = hintToks.size + pageToks.size - inter;
  const jaccard = union ? inter / union : 0;
  let score = inter * 4 + jaccard * 8;
  if (nameHit) score += 6;
  if (hCountry && pCountry && hCountry === pCountry) score += 2;
  if (state && loc.includes(state)) score += 3;
  return score;
}

function pickWikiPage(hint, pages) {
  let best = null;
  let bestScore = 0;
  for (const p of pages) {
    const s = scoreWikiPage(hint, p);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return bestScore >= 6 ? best : null;
}

async function loadWikiPage(pageId) {
  if (pageCache.has(pageId)) return pageCache.get(pageId);
  const r = await fetch(`/api/wiki/${encodeURIComponent(pageId)}`);
  if (!r.ok) return null;
  const page = await r.json();
  pageCache.set(pageId, page);
  return page;
}

function rankAllowed(page, r) {
  const category = page.resortSizeCategory || page.categorization?.size || "unknown";
  const maxRank = MAX_RANK[category] != null ? MAX_RANK[category] : 4;
  const useRanks =
    Array.isArray(page.visibleFactRanks) && page.visibleFactRanks.length ? page.visibleFactRanks : null;
  if (useRanks) return useRanks.includes(r);
  if (r >= 16) return false;
  if (r >= 12) return true;
  if (r === 15) return maxRank >= 9;
  return r <= maxRank;
}

function collectStats(page) {
  const stats = [];
  if (rankAllowed(page, 2)) {
    if (page.skiableTerrainAcres != null && !Number.isNaN(Number(page.skiableTerrainAcres))) {
      stats.push(["SKIABLE TERRAIN", formatAreaAcres(Number(page.skiableTerrainAcres))]);
    } else if (page.skiableTerrainHa != null && !Number.isNaN(Number(page.skiableTerrainHa))) {
      stats.push(["SKIABLE TERRAIN", formatAreaHa(Number(page.skiableTerrainHa))]);
    }
  }
  let verticalDrop = page.verticalDropM;
  if (
    verticalDrop == null &&
    page.highElevationM != null &&
    page.lowElevationM != null &&
    page.highElevationM >= page.lowElevationM
  ) {
    verticalDrop = page.highElevationM - page.lowElevationM;
  }
  if (rankAllowed(page, 15) && verticalDrop != null && verticalDrop >= 0) {
    stats.push(["VERTICAL DROP", formatElevation(Number(verticalDrop))]);
  }
  if (rankAllowed(page, 3) && page.downhillTrails) stats.push(["TRAILS", page.downhillTrails]);
  if (rankAllowed(page, 4) && page.totalLifts) stats.push(["LIFTS", page.totalLifts]);
  if (rankAllowed(page, 5) && page.longestTrailMi != null && !Number.isNaN(Number(page.longestTrailMi))) {
    stats.push(["LONGEST TRAIL", formatDistanceMi(Number(page.longestTrailMi))]);
  }
  if (rankAllowed(page, 6) && page.longestLiftMi != null && !Number.isNaN(Number(page.longestLiftMi))) {
    stats.push(["LONGEST LIFT", formatDistanceMi(Number(page.longestLiftMi))]);
  }
  if (rankAllowed(page, 7)) {
    if (page.totalAreaAcres != null && !Number.isNaN(Number(page.totalAreaAcres))) {
      stats.push(["TOTAL AREA", formatAreaAcres(Number(page.totalAreaAcres))]);
    } else if (page.totalAreaHa != null && !Number.isNaN(Number(page.totalAreaHa))) {
      stats.push(["TOTAL AREA", formatAreaHa(Number(page.totalAreaHa))]);
    }
  }
  if (rankAllowed(page, 9) && page.highElevationM != null) {
    stats.push(["ELEVATION (HIGH)", formatElevation(Number(page.highElevationM))]);
  }
  if (rankAllowed(page, 10) && page.lowElevationM != null) {
    stats.push(["ELEVATION (LOW)", formatElevation(Number(page.lowElevationM))]);
  }
  if (rankAllowed(page, 17) && page.litPistes != null && !Number.isNaN(Number(page.litPistes))) {
    stats.push(["LIT PISTES", String(page.litPistes)]);
  }
  if (rankAllowed(page, 18) && page.litLifts != null && !Number.isNaN(Number(page.litLifts))) {
    stats.push(["LIT LIFTS", String(page.litLifts)]);
  }
  if (rankAllowed(page, 25) && page.totalTrailMi != null && !Number.isNaN(Number(page.totalTrailMi))) {
    stats.push(["TOTAL TRAIL LENGTH", formatDistanceMi(Number(page.totalTrailMi))]);
  }

  const trailParts = [];
  if (rankAllowed(page, 8)) {
    if (page.trailsNovice) trailParts.push(`Novice ${page.trailsNovice}`);
    if (page.trailsEasy) trailParts.push(`Easy ${page.trailsEasy}`);
    if (page.trailsIntermediate) trailParts.push(`Intermediate ${page.trailsIntermediate}`);
    if (page.trailsAdvanced) trailParts.push(`Advanced ${page.trailsAdvanced}`);
    if (page.trailsExpert) trailParts.push(`Expert ${page.trailsExpert}`);
    if (page.trailsFreeride) trailParts.push(`Freeride ${page.trailsFreeride}`);
    if (page.trailsExtreme) trailParts.push(`Extreme ${page.trailsExtreme}`);
  }

  const metaParts = [];
  if (rankAllowed(page, 11) && page.liftTypes) metaParts.push(`Lift types: ${page.liftTypes}`);
  const flags = [
    [12, page.gladedTerrain, "Gladed"],
    [13, page.snowPark, "Snow park"],
    [14, page.sleddingTubing, "Sledding/tubing"],
    [16, page.nightSkiing, "Night skiing"],
    [19, page.snowmaking, "Snowmaking"],
  ];
  for (const [rank, val, label] of flags) {
    if (!rankAllowed(page, rank)) continue;
    const yn = yesNo(val);
    if (yn) metaParts.push(`${label}: ${yn}`);
  }

  return { stats, trailParts, metaParts };
}

function statsHtml(page) {
  const { stats, trailParts, metaParts } = collectStats(page);
  if (!stats.length && !trailParts.length) return "";
  const grid = stats
    .map(
      ([label, value]) =>
        `<div class="atlas-stat"><span class="stat-label">${esc(label)}</span> <span class="stat-value">${esc(String(value))}</span></div>`,
    )
    .join("");
  const breakdown = trailParts.length
    ? `<p class="atlas-breakdown"><span class="stat-label">Trail breakdown</span> ${esc(trailParts.join(" · "))}</p>`
    : "";
  const meta = metaParts.length ? `<p class="atlas-meta">${esc(metaParts.join(" · "))}</p>` : "";
  const href = `/wiki/resort.html?page=${encodeURIComponent(page.pageId)}`;
  const title = page.englishName && page.title && page.englishName !== page.title
    ? `${page.englishName} (${page.title})`
    : page.englishName || page.title || "Wiki page";
  return `<div class="atlas-stats">
    <div class="atlas-stats-grid">${grid}</div>
    ${breakdown}
    ${meta}
    <a class="atlas-wiki" href="${href}">${esc(title)} on the wiki</a>
  </div>`;
}

export async function atlasStatsHtml(hint) {
  if (!hint?.name && !hint?.id) return "";
  const pages = await prefetchWikiIndex();
  const hit = pickWikiPage(hint, pages);
  if (!hit?.pageId) return "";
  const page = await loadWikiPage(hit.pageId);
  if (!page) return "";
  return statsHtml(page);
}

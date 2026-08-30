/** Finish/DNF trail charts — same SVG comparison panels as clicking a piste on the main map. */

import { normCountry, stateRegionKey } from "../scripts/ski-feature-utils.js";
import {
  ensureSkiFeatureStatsIndex,
  getSkiFeatureStatsIndex,
  isGlobalStatsReady,
  isSkiFeatureStatsLoading,
} from "../scripts/ski-feature-stats.js?v=4";
import {
  buildComparisonCharts,
  buildFeatureChartsPanel,
} from "../scripts/ski-feature-charts.js?v=4";

let lastMeta = null;
let bound = false;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function osmIdsFromCourse(course) {
  const id = String(course?.id || "");
  const out = [];
  const typed = id.match(/(?:way|relation|node)[:/](\d+)/i);
  if (typed) out.push(typed[1]);
  for (const m of id.matchAll(/(\d{4,})/g)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function lookupPisteMeta(index, course, catalog) {
  const map = index?.pistesByKey;
  if (!map) return null;
  for (const osm of osmIdsFromCourse(course)) {
    for (const key of [`piste:${osm}`, `piste:way/${osm}`, `piste:relation/${osm}`]) {
      const hit = map.get(key);
      if (hit) return hit;
    }
  }
  const name = String(course?.name || "").trim().toLowerCase();
  const resort = String(catalog?.name || "").trim().toLowerCase();
  if (!name || name.startsWith("piste ")) return null;
  let named = null;
  for (const meta of map.values()) {
    if (String(meta.name || "").trim().toLowerCase() !== name) continue;
    const r = String(meta.resort || "").toLowerCase();
    if (resort && r && (r.includes(resort) || resort.includes(r.split("(")[0].trim()))) return meta;
    named = named || meta;
  }
  return resort ? null : named;
}

function parseState(location, country) {
  const loc = String(location || "").trim();
  if (!loc) return "";
  const countryN = normCountry(country);
  const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (normCountry(last) === countryN) return parts[parts.length - 2] || "";
    return last;
  }
  if (normCountry(loc) === countryN) return "";
  return loc;
}

function syntheticMeta(course, catalog) {
  const lengthM = Number(course?.length_m);
  const lengthKm = Number.isFinite(lengthM) && lengthM > 0 ? lengthM / 1000 : 0;
  const country = catalog?.country || "";
  const state = catalog?.state || catalog?.region || parseState(catalog?.location, country);
  const difficulty = String(course?.piste_difficulty || "").toLowerCase().trim();
  const name = course?.name || course?.displayName || "Trail";
  const resort = String(catalog?.name || "").replace(/\s+[—-]\s+Prototype$/i, "");
  return {
    kind: "piste",
    key: `piste:playable:${course?.id || name}`,
    name,
    resort,
    country,
    countryNorm: normCountry(country),
    state,
    stateKey: stateRegionKey(country, state),
    difficulty,
    pisteType: String(course?.piste_type || "").toLowerCase().trim(),
    aerialway: "",
    lengthKm,
    props: {},
  };
}

export function pisteMetaForFinish(course, catalog) {
  const index = getSkiFeatureStatsIndex();
  const syn = syntheticMeta(course, catalog);
  const fromIndex = isGlobalStatsReady(index) ? lookupPisteMeta(index, course, catalog) : null;
  if (!fromIndex) return syn;
  return {
    ...fromIndex,
    lengthKm: fromIndex.lengthKm > 0.01 ? fromIndex.lengthKm : syn.lengthKm,
    difficulty: fromIndex.difficulty || syn.difficulty,
    pisteType: fromIndex.pisteType || syn.pisteType,
    name: fromIndex.name || syn.name,
    country: fromIndex.country || syn.country,
    countryNorm: fromIndex.countryNorm || syn.countryNorm,
    state: fromIndex.state || syn.state,
    stateKey: fromIndex.state ? fromIndex.stateKey : syn.stateKey || fromIndex.stateKey,
    resort: fromIndex.resort || syn.resort,
  };
}

export function finishChartsHtml(course, catalog) {
  const meta = pisteMetaForFinish(course, catalog);
  lastMeta = meta;
  const index = getSkiFeatureStatsIndex();
  if (!isGlobalStatsReady(index)) {
    if (isSkiFeatureStatsLoading() || !index) {
      return `<div class="sf-finish-charts" data-sf-pending="1"><p class="fine">Loading trail comparisons…</p></div>`;
    }
    return "";
  }
  if (!(meta.lengthKm > 0.01)) return "";
  const panel = buildFeatureChartsPanel(meta, index, null, esc);
  if (!panel.panel) return "";
  const foot = panel.foot
    ? `<div class="sf-popup-foot">${esc(panel.foot)}</div>`
    : "";
  return (
    `<div class="sf-popup sf-finish-charts" data-sf-key="${esc(meta.key)}">` +
    `<div class="sf-popup-charts">${panel.panel}</div>${foot}` +
    `</div>`
  );
}

export function prefetchFinishCharts() {
  return ensureSkiFeatureStatsIndex();
}

export function bindFinishChartScope() {
  if (bound) return;
  bound = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".sr-scope-btn");
    const root = btn?.closest(".sf-finish-charts");
    if (!btn || !root) return;
    const scope = btn.dataset.srScope;
    const index = getSkiFeatureStatsIndex();
    if (!scope || !isGlobalStatsReady(index) || !lastMeta) return;
    e.preventDefault();
    e.stopPropagation();
    root.querySelectorAll(".sr-scope-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    const charts = buildComparisonCharts(lastMeta, index, scope);
    const panel = root.querySelector(".sf-charts-panel");
    if (panel) panel.innerHTML = charts.html;
    const caption = root.querySelector(".sf-chart-caption");
    if (caption) {
      if (charts.caption) {
        caption.textContent = charts.caption;
        caption.style.display = "";
      } else {
        caption.textContent = "";
        caption.style.display = "none";
      }
    }
    const foot = root.querySelector(".sf-popup-foot");
    if (foot && charts.foot) foot.textContent = charts.foot;
  });
}

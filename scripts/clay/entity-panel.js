/** Compact detail panel for selected clay trail and lift entities. */

import {
  aerialwayLabel,
  analyzeFeature,
  diffLabel,
  featureStableKey,
  formatLength,
  getProp,
} from "../ski-feature-utils.js";
import {
  compareLift,
  comparePiste,
  ensureSkiFeatureStatsIndex,
  getSkiFeatureStatsIndex,
  isGlobalStatsReady,
  isSkiFeatureStatsLoading,
} from "../ski-feature-stats.js";
import { formatMeters, formatSlope } from "./trail-profile.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function comparisonRows(meta, comparison, statsIndex) {
  if (!comparison) return "";
  const rows = [];
  const add = (label, value) => {
    if (value) rows.push(`<div class="clay-entity-rank"><span>${label}</span><strong>${value}</strong></div>`);
  };
  const longer = (result) => result?.percentile != null ? `Longer than ${result.percentile}%` : "";
  add(statsIndex?.viewportOnly ? "On this map" : "Worldwide", longer(comparison.global));
  add("Country", longer(comparison.country));
  add("State / province", longer(comparison.state));
  add("At this resort", longer(comparison.resort));
  return rows.join("");
}

function indexedEntity(entity, statsIndex) {
  if (!statsIndex || !entity) return null;
  const kind = entity.entityType === "lift" ? "lift" : "piste";
  const table = kind === "lift" ? statsIndex.liftsByKey : statsIndex.pistesByKey;
  if (!table) return null;
  const props = entity.properties || entity.feature?.properties || {};
  const keys = [];
  const add = (value) => {
    if (value && !keys.includes(value)) keys.push(value);
  };
  const osmId = String(entity.osmId || "").replace(/^(?:way|node|relation|nan):/i, "");
  if (osmId) {
    add(`${kind}:${osmId}`);
    add(`${kind}:way:${osmId}`);
    add(`${kind}:relation:${osmId}`);
  }
  const rawId = getProp(props, ["osm_id", "id", "@id", "osm_way_id", "ref"]);
  if (rawId != null && String(rawId).trim() !== "") {
    const cleaned = String(rawId).trim().replace(/^(?:way|node|relation|nan):/i, "");
    add(featureStableKey(kind, props));
    add(`${kind}:${rawId}`);
    add(`${kind}:${cleaned}`);
    add(`${kind}:way:${cleaned}`);
  }
  add(featureStableKey(kind, props));
  for (const key of keys) {
    const hit = table.get(key);
    if (hit) return hit;
  }
  return null;
}

function renderPanel(panel, entity, statsIndex) {
  if (!entity) {
    panel.hidden = true;
    delete panel.dataset.entityOsmId;
    panel.innerHTML = "";
    return;
  }
  const kind = entity.entityType === "lift" ? "lift" : "piste";
  const analyzed = entity.feature ? analyzeFeature(kind, entity.feature) : null;
  const indexed = indexedEntity(entity, statsIndex);
  const meta = indexed || analyzed || { lengthKm: 0, name: entity.name, resort: entity.resort };
  const isLift = kind === "lift";
  const title = entity.name || meta.name || (isLift ? aerialwayLabel(meta.aerialway) : "Unnamed trail");
  const type = isLift ? aerialwayLabel(meta.aerialway || entity.aerialway) : diffLabel(meta.difficulty || entity.difficulty || "Unknown");
  const lengthKm = Number(indexed?.lengthKm || analyzed?.lengthKm || meta.lengthKm) || 0;
  const comparison = isLift
    ? compareLift(lengthKm, meta, statsIndex)
    : comparePiste(lengthKm, meta, statsIndex);
  const rankingHtml = comparisonRows(meta, comparison, statsIndex)
    || (isSkiFeatureStatsLoading()
      ? "<p>Loading worldwide rankings…</p>"
      : "<p>Comparison data unavailable.</p>");
  const rows = [
    ["Type", type],
    ["Length", formatLength(lengthKm)],
    ["Resort", meta.resort || entity.resort],
  ].filter(([, value]) => value);
  if (!isLift && entity.trailProfile) {
    rows.splice(2, 0,
      ["Descent", formatMeters(entity.trailProfile.descentM)],
      ["Average slope", formatSlope(entity.trailProfile.averageSlopePercent)],
      ["Maximum slope", formatSlope(entity.trailProfile.maxSlopePercent)],
    );
  }

  panel.hidden = false;
  panel.dataset.entityOsmId = entity.osmId || "";
  panel.innerHTML =
    `<button type="button" class="clay-entity-close" data-clay-entity-close aria-label="Close details">&times;</button>` +
    `<div class="clay-entity-kicker">${isLift ? "Lift" : "Trail"}</div>` +
    `<h3>${escapeHtml(title)}</h3>` +
    `<div class="clay-entity-type">${escapeHtml(type)}</div>` +
    `<dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` +
    `<div class="clay-entity-ranking-title">Relative length</div>` +
    `<div class="clay-entity-rankings">${rankingHtml}</div>`;
}

export function createClayEntityPanel(embed) {
  const panel = document.createElement("section");
  panel.className = "clay-entity-panel";
  panel.hidden = true;
  panel.setAttribute("aria-live", "polite");
  embed.appendChild(panel);

  let currentEntity = null;
  let extraIndex = null;
  const pickIndex = () => {
    const global = getSkiFeatureStatsIndex();
    if (isGlobalStatsReady(global)) return global;
    return extraIndex;
  };
  const refresh = () => renderPanel(panel, currentEntity, pickIndex());
  ensureSkiFeatureStatsIndex(() => refresh());

  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-clay-entity-close]")) {
      currentEntity = null;
      extraIndex = null;
      refresh();
    }
  });

  return {
    show(entity, statsIndex) {
      currentEntity = entity;
      if (statsIndex) extraIndex = statsIndex;
      refresh();
    },
    hide() {
      currentEntity = null;
      refresh();
    },
    dispose() {
      panel.remove();
    },
    element: panel,
  };
}

export { isGlobalStatsReady };

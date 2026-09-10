/** Compact detail panel for selected clay trail and lift entities. */

import {
  aerialwayLabel,
  analyzeFeature,
  diffLabel,
  formatLength,
} from "../ski-feature-utils.js";
import {
  compareLift,
  comparePiste,
  ensureSkiFeatureStatsIndex,
  getSkiFeatureStatsIndex,
  isGlobalStatsReady,
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

function comparisonRows(meta, comparison) {
  if (!comparison) return "";
  const rows = [];
  const add = (label, value) => {
    if (value) rows.push(`<div class="clay-entity-rank"><span>${label}</span><strong>${value}</strong></div>`);
  };
  const longer = (result) => result?.percentile != null ? `Longer than ${result.percentile}%` : "";
  add("Worldwide", longer(comparison.global));
  add("Country", longer(comparison.country));
  add("State / province", longer(comparison.state));
  add("At this resort", longer(comparison.resort));
  return rows.join("");
}

function indexedEntity(entity, statsIndex) {
  if (!statsIndex || !entity?.osmId) return null;
  const map = entity.entityType === "lift" ? statsIndex.liftsByKey : statsIndex.pistesByKey;
  if (!map) return null;
  const kind = entity.entityType === "lift" ? "lift" : "piste";
  return map.get(`${kind}:${entity.osmId}`) || map.get(`${kind}:way:${entity.osmId}`) || null;
}

function renderPanel(panel, entity, statsIndex) {
  if (!entity) {
    panel.hidden = true;
    delete panel.dataset.entityOsmId;
    panel.innerHTML = "";
    return;
  }
  const indexed = indexedEntity(entity, statsIndex);
  const meta = indexed || { ...analyzeFeature(entity.entityType, entity.feature), lengthKm: 0 };
  const isLift = entity.entityType === "lift";
  const title = entity.name || meta.name || (isLift ? aerialwayLabel(meta.aerialway) : "Unnamed trail");
  const type = isLift ? aerialwayLabel(meta.aerialway) : diffLabel(meta.difficulty || "Unknown");
  const comparison = isLift
    ? compareLift(meta.lengthKm, meta, statsIndex)
    : comparePiste(meta.lengthKm, meta, statsIndex);
  const rows = [
    ["Type", type],
    ["Length", formatLength(meta.lengthKm)],
    ["Resort", meta.resort],
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
    `<div class="clay-entity-rankings">${comparisonRows(meta, comparison) || "<p>Comparison data unavailable.</p>"}</div>`;
}

export function createClayEntityPanel(embed) {
  const panel = document.createElement("section");
  panel.className = "clay-entity-panel";
  panel.hidden = true;
  panel.setAttribute("aria-live", "polite");
  embed.appendChild(panel);

  let currentEntity = null;
  let readyIndex = getSkiFeatureStatsIndex();
  const refresh = () => renderPanel(panel, currentEntity, readyIndex);
  ensureSkiFeatureStatsIndex((index) => {
    readyIndex = index;
    refresh();
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-clay-entity-close]")) {
      currentEntity = null;
      refresh();
    }
  });

  return {
    show(entity) {
      currentEntity = entity;
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

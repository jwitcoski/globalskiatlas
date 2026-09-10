/** Compact detail panel for selected clay trail and lift entities. */

import {
  analyzeFeature,
  featureStableKey,
  getProp,
} from "../ski-feature-utils.js";
import {
  ensureSkiFeatureStatsIndex,
  getSkiFeatureStatsIndex,
  isGlobalStatsReady,
} from "../ski-feature-stats.js";
import { formatMeters, formatSlope } from "./trail-profile.js";
import {
  bindResortDetailsLinks,
  buildResortPopupHtml,
  initResortPopupScopeSwitcher,
  mergeResortCatalogProperties,
} from "../ski-resort-popups.js?v=7";
import { playableHrefForResort } from "../playable-match.js";
import {
  buildSkiFeaturePopupHtml,
  ensureSkiFeatureScopeSwitcher,
  setOpenSkiFeatureMeta,
} from "../ski-feature-popups.js?v=9";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function renderPanel(panel, entity, statsIndex, resortStatsIndex, playableResorts) {
  if (!entity) {
    panel.hidden = true;
    panel.classList.remove("clay-entity-panel--resort", "clay-entity-panel--feature");
    delete panel.dataset.entityOsmId;
    panel.innerHTML = "";
    setOpenSkiFeatureMeta(null);
    return;
  }
  if (entity.entityType === "resort") {
    panel.classList.remove("clay-entity-panel--feature");
    setOpenSkiFeatureMeta(null);
    const properties = mergeResortCatalogProperties(entity, resortStatsIndex);
    const wikiPage = entity.wikiPageId
      ? { pageId: entity.wikiPageId, englishName: entity.name, title: entity.name }
      : null;
    panel.classList.add("clay-entity-panel--resort");
    panel.hidden = false;
    delete panel.dataset.entityOsmId;
    panel.innerHTML =
      `<button type="button" class="clay-entity-close" data-clay-entity-close aria-label="Close details">&times;</button>` +
      buildResortPopupHtml(properties, null, {
        includeRoadTripButton: false,
        wikiPage,
        statsIndex: resortStatsIndex,
        playableHref: playableHrefForResort(entity, properties, playableResorts),
      });
    bindResortDetailsLinks();
    if (resortStatsIndex) initResortPopupScopeSwitcher(resortStatsIndex);
    return;
  }
  panel.classList.remove("clay-entity-panel--resort");
  panel.classList.add("clay-entity-panel--feature");
  const kind = entity.entityType === "lift" ? "lift" : "piste";
  const analyzed = entity.feature ? analyzeFeature(kind, entity.feature) : null;
  const indexed = indexedEntity(entity, statsIndex);
  const lengthKm = Number(indexed?.lengthKm) > 0 ? Number(indexed.lengthKm) : 0;
  const meta = {
    ...(analyzed || {}),
    ...(indexed || {}),
    kind,
    name: entity.name || indexed?.name || analyzed?.name,
    difficulty: entity.difficulty || indexed?.difficulty || analyzed?.difficulty,
    aerialway: entity.aerialway || indexed?.aerialway || analyzed?.aerialway,
    resort: entity.resort || indexed?.resort || analyzed?.resort,
    country: entity.country || indexed?.country || analyzed?.country,
    countryNorm: entity.countryNorm || indexed?.countryNorm || analyzed?.countryNorm,
    state: entity.state || indexed?.state || analyzed?.state,
    stateKey: entity.stateKey || indexed?.stateKey || analyzed?.stateKey,
    lengthKm,
    key: indexed?.key || analyzed?.key || `${kind}:${entity.osmId || entity.name || "unnamed"}`,
    props: entity.properties || entity.feature?.properties || indexed?.props || analyzed?.props,
  };
  const extraRows = [];
  if (kind === "piste" && entity.trailProfile) {
    extraRows.push(
      ["Descent", formatMeters(entity.trailProfile.descentM)],
      ["Average slope", formatSlope(entity.trailProfile.averageSlopePercent)],
      ["Maximum slope", formatSlope(entity.trailProfile.maxSlopePercent)],
    );
  }
  panel.hidden = false;
  panel.dataset.entityOsmId = entity.osmId || "";
  panel.innerHTML =
    `<button type="button" class="clay-entity-close" data-clay-entity-close aria-label="Close details">&times;</button>` +
    buildSkiFeaturePopupHtml(meta, statsIndex, null, escapeHtml, extraRows);
  setOpenSkiFeatureMeta(meta);
  ensureSkiFeatureScopeSwitcher(escapeHtml);
}

export function createClayEntityPanel(embed) {
  const panel = document.createElement("section");
  panel.className = "clay-entity-panel";
  panel.hidden = true;
  panel.setAttribute("aria-live", "polite");
  embed.appendChild(panel);

  let currentEntity = null;
  let extraIndex = null;
  let resortIndex = null;
  let playableResorts = [];
  const pickIndex = () => {
    const global = getSkiFeatureStatsIndex();
    if (isGlobalStatsReady(global)) return global;
    return extraIndex;
  };
  const refresh = () => renderPanel(panel, currentEntity, pickIndex(), resortIndex, playableResorts);
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
      if (entity?.entityType === "resort") {
        if (statsIndex) resortIndex = statsIndex;
      } else if (statsIndex) extraIndex = statsIndex;
      refresh();
    },
    hide() {
      currentEntity = null;
      refresh();
    },
    setPlayableResorts(list) {
      playableResorts = Array.isArray(list) ? list : [];
      if (currentEntity?.entityType === "resort") refresh();
    },
    setResortStats(index) {
      resortIndex = index || null;
      if (currentEntity?.entityType === "resort") refresh();
    },
    dispose() {
      panel.remove();
    },
    element: panel,
  };
}

export { isGlobalStatsReady };

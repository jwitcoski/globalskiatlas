/**
 * Aggregate ski_areas_analyzed.parquet rows into fun state/province stats.
 */
import { countriesMatch, normCountryName, normStateName, statesMatch } from "../admin-region.js";
import { getTrailCount, isNotDownhill } from "../resort-categories.js";
import {
  COUNTRY_KEYS,
  ENGLISH_NAME_KEYS,
  LIFTS_KEYS,
  NAME_KEYS,
  SKIABLE_TERRAIN_ACRES_KEYS,
  SKIABLE_TERRAIN_HA_KEYS,
  STATE_KEYS,
  getProp,
} from "../utils.js";

const HA_TO_ACRES = 2.471054;
const M_TO_FT = 3.28084;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function acresOf(row) {
  const acres = num(getProp(row, SKIABLE_TERRAIN_ACRES_KEYS));
  if (acres > 0) return acres;
  const ha = num(getProp(row, SKIABLE_TERRAIN_HA_KEYS));
  return ha > 0 ? ha * HA_TO_ACRES : 0;
}

function liftsOf(row) {
  return Math.max(0, num(getProp(row, LIFTS_KEYS)));
}

function highM(row) {
  return num(getProp(row, [
    "elevation_high_m",
    "high_elevation_m",
    "summit_elevation_m",
    "highElevationM",
  ]));
}

function verticalM(row) {
  const ft = num(row.vertical_drop_ft);
  if (ft > 0) return ft / M_TO_FT;
  const high = highM(row);
  const low = num(getProp(row, [
    "elevation_low_m",
    "low_elevation_m",
    "base_elevation_m",
    "lowElevationM",
  ]));
  return high > 0 && low > 0 && high >= low ? high - low : 0;
}

function displayName(row) {
  return String(getProp(row, ENGLISH_NAME_KEYS) || getProp(row, NAME_KEYS) || "Ski area").trim();
}

function isYes(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1";
}

function matchesAdmin1(row, entity) {
  if (isNotDownhill(row)) return false;
  return countriesMatch(getProp(row, COUNTRY_KEYS), entity.country)
    && statesMatch(getProp(row, STATE_KEYS), entity.state || entity.title);
}

export function summarizeAdmin1FromParquet(rows, entity) {
  const inState = [];
  const byStateTrails = new Map();
  for (const row of rows || []) {
    if (isNotDownhill(row)) continue;
    const country = getProp(row, COUNTRY_KEYS);
    const state = getProp(row, STATE_KEYS);
    if (!countriesMatch(country, entity.country) || !state) continue;
    const trails = getTrailCount(row);
    const key = `${normCountryName(country)}|${normStateName(state)}`;
    byStateTrails.set(key, (byStateTrails.get(key) || 0) + trails);
    if (matchesAdmin1(row, entity)) inState.push(row);
  }

  let trails = 0;
  let lifts = 0;
  let acres = 0;
  let night = 0;
  let parks = 0;
  let glades = 0;
  let biggest = null;
  let highest = null;
  let steepest = null;
  for (const row of inState) {
    const t = getTrailCount(row);
    const a = acresOf(row);
    const high = highM(row);
    const vert = verticalM(row);
    trails += t;
    lifts += liftsOf(row);
    acres += a;
    if (isYes(row.night_skiing)) night += 1;
    if (isYes(row.snow_park)) parks += 1;
    if (isYes(row.gladed_terrain)) glades += 1;
    if (!biggest || t > biggest.trails) biggest = { name: displayName(row), trails: t };
    if (high > 0 && (!highest || high > highest.m)) highest = { name: displayName(row), m: high };
    if (vert > 0 && (!steepest || vert > steepest.m)) steepest = { name: displayName(row), m: vert };
  }

  const stateTrailTotals = [...byStateTrails.values()].sort((a, b) => b - a);
  const ownKey = `${normCountryName(entity.country)}|${normStateName(entity.state || entity.title)}`;
  const ownTrails = byStateTrails.get(ownKey) ?? trails;
  const rank = stateTrailTotals.findIndex((n) => n === ownTrails) + 1;

  return {
    loaded: true,
    resorts: inState.length,
    trails,
    lifts,
    acres,
    night,
    parks,
    glades,
    biggest,
    highest,
    steepest,
    stateRank: rank > 0 ? rank : null,
    stateCount: stateTrailTotals.length,
  };
}

export function formatInt(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}

export function formatAcres(n) {
  if (!(n > 0)) return "";
  const ha = n / HA_TO_ACRES;
  const haStr = ha >= 10 ? Math.round(ha).toLocaleString() : ha.toFixed(1).replace(/\.0$/, "");
  return `${formatInt(n)} acres (${haStr} ha)`;
}

export function formatElevationM(m) {
  if (!(m > 0)) return "";
  const ft = Math.round(m * M_TO_FT);
  return `${formatInt(m)} m (${ft.toLocaleString()} ft)`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rowHtml(label, value) {
  if (!value) return "";
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

export function admin1EntityFromProps(props = {}) {
  const pageId = String(props.pageId || "");
  const title = String(props.title || props.state || pageId || "State");
  const hasScene = props.has_region_scene === true
    || props.has_region_scene === "true"
    || props.hasRegionScene === true
    || Number(props.has_region_scene) === 1;
  return {
    entityType: "admin1",
    kind: "admin1",
    name: title,
    pageId,
    pageType: props.pageType || "state",
    title,
    state: props.state || title,
    country: props.country || "",
    resortCount: Number(props.resort_count || props.resortCount) || 0,
    hasRegionScene: hasScene,
    scene: props.scene || (pageId ? `clay_scenes/regions/${pageId}/scene-manifest.json` : ""),
    properties: props,
  };
}

/** Same stats card used by 3D country clay and 2D country live map. */
export function buildAdmin1StatsHtml(entity, parquetRows, parquetReady) {
  const title = escapeHtml(entity.title || entity.state || "State");
  const country = escapeHtml(entity.country || "");
  const summary = parquetReady ? summarizeAdmin1FromParquet(parquetRows, entity) : null;
  const count = summary?.resorts || entity.resortCount || 0;
  const rows = [];
  if (!parquetReady) {
    rows.push(rowHtml("Ski areas", "Loading parquet…"));
  } else {
    rows.push(rowHtml("Downhill ski areas", formatInt(count)));
    rows.push(rowHtml("Marked trails", summary.trails ? formatInt(summary.trails) : ""));
    rows.push(rowHtml("Lifts", summary.lifts ? formatInt(summary.lifts) : ""));
    rows.push(rowHtml("Skiable terrain", formatAcres(summary.acres)));
    if (summary.highest) {
      rows.push(rowHtml("Highest summit", `${escapeHtml(summary.highest.name)} · ${formatElevationM(summary.highest.m)}`));
    }
    if (summary.steepest) {
      rows.push(rowHtml("Biggest vertical", `${escapeHtml(summary.steepest.name)} · ${formatElevationM(summary.steepest.m)}`));
    }
    if (summary.biggest?.trails) {
      rows.push(rowHtml("Most trails", `${escapeHtml(summary.biggest.name)} · ${formatInt(summary.biggest.trails)}`));
    }
    if (summary.parks) rows.push(rowHtml("Snow parks", formatInt(summary.parks)));
    if (summary.night) rows.push(rowHtml("Night skiing", formatInt(summary.night)));
    if (summary.glades) rows.push(rowHtml("Gladed areas", formatInt(summary.glades)));
    if (summary.stateRank && summary.stateCount > 1) {
      rows.push(rowHtml(
        "Trail volume rank",
        `#${summary.stateRank} of ${summary.stateCount} in ${country || "this country"}`,
      ));
    }
  }
  let action = `<p class="clay-admin1-soon">3D map coming soon for ${title}.</p>`;
  if (entity.hasRegionScene && entity.pageId) {
    const href = `/wiki/resort.html?page=${encodeURIComponent(entity.pageId)}`;
    action = `<a class="clay-admin1-open" href="${escapeHtml(href)}">Open ${title} 3D map</a>`;
  }
  return (
    `<p class="clay-entity-kicker">State / province</p>` +
    `<h3>${title}</h3>` +
    `<p class="clay-entity-type">${country}</p>` +
    `<dl>${rows.join("")}</dl>` +
    action
  );
}

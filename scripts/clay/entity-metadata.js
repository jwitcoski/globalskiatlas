/** Normalize OSM-backed trail and lift identity for 3D picking and analytics joins. */

import {
  getAerialway,
  getDifficulty,
  getLiftName,
  getPisteType,
  getResortName,
  getState,
  getCountry,
  getTrailName,
  normCountry,
  stateRegionKey,
} from "../ski-feature-utils.js";
import { featureLiftOsmId, featureOsmWayId } from "./math-utils.js";
import { calculateTrailProfile } from "./trail-profile.js";

function cleanId(value) {
  const text = String(value ?? "").trim();
  return text.replace(/^(?:way|node|relation|nan):/i, "").trim();
}

function propertyValue(props, keys) {
  const tags = props?.tags && typeof props.tags === "object" ? props.tags : {};
  for (const key of keys) {
    const value = props?.[key] ?? tags[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

export function entityOsmId(kind, feature) {
  return cleanId(kind === "lift" ? featureLiftOsmId(feature) : featureOsmWayId(feature));
}

export function entityName(kind, props) {
  const direct = kind === "lift" ? getLiftName(props) : getTrailName(props);
  if (direct) return direct;
  return propertyValue(props, kind === "lift" ? ["name", "Name"] : ["name", "Name", "piste:name"]);
}

export function buildEntityMetadata(kind, feature, resortId = "", terrain = null) {
  const props = feature?.properties || {};
  const osmId = entityOsmId(kind, feature);
  const country = getCountry(props);
  const state = getState(props);
  const difficulty = getDifficulty(props) || propertyValue(props, ["piste:difficulty", "piste_difficulty", "difficulty"]);
  const pisteType = getPisteType(props) || propertyValue(props, ["piste:type", "piste_type"]);
  const aerialway = getAerialway(props) || propertyValue(props, ["aerialway", "Aerialway"]);
  return {
    entityType: kind,
    osmId,
    resortId: String(resortId || ""),
    name: entityName(kind, props),
    difficulty: kind === "lift" ? "" : difficulty.toLowerCase(),
    pisteType: kind === "lift" ? "" : pisteType.toLowerCase(),
    aerialway: kind === "lift" ? aerialway.toLowerCase() : "",
    resort: getResortName(props),
    state,
    stateKey: stateRegionKey(country, state),
    country,
    countryNorm: normCountry(country),
    properties: props,
    feature,
    trailProfile: kind === "piste" && terrain
      ? calculateTrailProfile({ feature, ...terrain })
      : null,
  };
}

export function entityKey(metadata) {
  if (!metadata) return "";
  return `${metadata.entityType}:${metadata.osmId || metadata.name || "unnamed"}`;
}

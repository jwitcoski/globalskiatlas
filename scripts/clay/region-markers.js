/**
 * Clickable ski-area pins on wiki region (state/country) clay islands.
 */
import * as THREE from "three";
import { getMapSizeTier, getMapTierColor } from "../resort-categories.js";
import { localXZ } from "./math-utils.js";

const TIER_SIZE = {
  small: 0.52,
  medium: 0.78,
  large: 1.05,
  mega: 1.45,
};

function pinColor(tier) {
  return new THREE.Color(getMapTierColor(String(tier || "").toLowerCase()));
}

function markerRadius(span, tier) {
  const key = String(tier || "").toLowerCase();
  const scale = TIER_SIZE[key] || TIER_SIZE.medium;
  return Math.max(span * 0.0085, 1100) * scale;
}

export function addRegionResortMarkers(parent, fc, center, sample, span) {
  const group = new THREE.Group();
  group.name = "region-resort-markers";
  const pickables = [];

  for (const feature of fc?.features || []) {
    const geom = feature.geometry;
    if (!geom || geom.type !== "Point" || !geom.coordinates || geom.coordinates.length < 2) continue;
    const props = feature.properties || {};
    const { x, z } = localXZ(geom.coordinates[0], geom.coordinates[1], center);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const y = sample?.(x, z);
    const ground = Number.isFinite(y) ? y : 0;
    const tier = TIER_SIZE[String(props.size_tier || "").toLowerCase()]
      ? String(props.size_tier).toLowerCase()
      : getMapSizeTier(props);
    const color = pinColor(tier);
    const r = markerRadius(span, tier);
    const stemH = r * 1.8;
    const pin = new THREE.Group();
    pin.position.set(x, ground + stemH * 0.55, z);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.18, r * 0.28, stemH, 8),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.12 }),
    );
    stem.position.y = -stemH * 0.15;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.72, 12, 10),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.18 }),
    );
    head.position.y = stemH * 0.42;
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(r * 1.35, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pin.add(stem, head, hit);

    const name = props.english_name || props.name || "Ski area";
    const trails = props.downhill_trails != null ? Number(props.downhill_trails) : 0;
    pin.userData.entity = {
      entityType: "resort",
      name,
      wikiPageId: props.wiki_pageId || "",
      winterSportsId: props.winter_sports_id || "",
      sizeTier: tier,
      trails: Number.isFinite(trails) ? trails : 0,
      claySceneId: props.clay_scene_id || "",
      properties: props,
      feature,
    };
    pin.userData.wikiPageId = props.wiki_pageId || "";
    group.add(pin);
    pickables.push(pin);
  }

  group.userData.pickables = pickables;
  parent.add(group);
  return group;
}

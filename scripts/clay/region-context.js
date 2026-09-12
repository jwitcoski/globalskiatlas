/**
 * Baked region context (highways, water, places, ski footprints).
 * Same local_game_meters CRS as resorts.geojson. No live OSM fetch.
 */
import * as THREE from "three";
import { PALETTE } from "./config.js";
import { localXZ, lineParts, polygonParts, downsampleLine, smoothTrailPts } from "./math-utils.js";
import { appendRibbon, meshFromPositions, gamePoint } from "./trails.js";

export function addRegionSkiFootprints(parent, fc, center, sample, span, color = 0x86c9a0) {
  const features = fc?.features || [];
  if (!features.length) return null;
  const group = new THREE.Group();
  group.name = "region-ski-footprints";
  const lift = Math.max(span * 0.00045, 80);
  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.14,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -3,
  });
  let added = 0;
  for (const feature of features) {
    for (const poly of polygonParts(feature.geometry)) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const shapePts = [];
      for (const coord of downsampleLine(outer, 36)) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        shapePts.push(new THREE.Vector2(x, z));
      }
      if (shapePts.length < 3) continue;
      let geo;
      try {
        geo = new THREE.ShapeGeometry(new THREE.Shape(shapePts));
      } catch {
        continue;
      }
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getY(i);
        const y = sample(x, z);
        pos.setXYZ(i, x, (y == null ? 0 : y) + lift, z);
      }
      pos.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;
      group.add(mesh);
      added += 1;
    }
  }
  if (!added) return null;
  parent.add(group);
  return group;
}

function addDrapedLines(parent, fc, center, sample, span, color, widthFrac, name) {
  const features = fc?.features || [];
  if (!features.length) return 0;
  const ribbons = [];
  const width = Math.max(span * widthFrac, 500);
  const lift = Math.max(span * 0.0008, 200);
  const maxStep = Math.max(span * 0.0035, 400);
  for (const feature of features) {
    for (const coords of lineParts(feature.geometry)) {
      const pts = [];
      for (const coord of downsampleLine(coords, 36)) {
        const p = gamePoint(coord[0], coord[1], center, sample, lift);
        if (p) pts.push(p);
      }
      let smooth = smoothTrailPts(pts, 2);
      for (let i = 1; i < smooth.length; i++) {
        const dy = smooth[i].y - smooth[i - 1].y;
        if (Math.abs(dy) > maxStep) {
          smooth[i].y = smooth[i - 1].y + Math.sign(dy) * maxStep;
        }
      }
      if (smooth.length >= 2) appendRibbon(ribbons, smooth, width);
    }
  }
  if (!ribbons.length) return 0;
  const mesh = meshFromPositions(ribbons, new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }));
  if (!mesh) return 0;
  mesh.name = name;
  mesh.renderOrder = 3;
  parent.add(mesh);
  return 1;
}

function placeSprite(text, isCity) {
  const pad = 20;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontPx = isCity ? 42 : 34;
  ctx.font = `700 ${fontPx}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontPx + pad * 1.4;
  canvas.width = w;
  canvas.height = h;
  ctx.font = `700 ${fontPx}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.beginPath();
  const r = 10;
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    depthTest: false,
    transparent: true,
  }));
  sprite.userData.aspect = w / h;
  return sprite;
}

function addPlaces(parent, fc, center, sample, span) {
  const features = fc?.features || [];
  if (!features.length) return null;
  const group = new THREE.Group();
  group.name = "region-places";
  const dotR = Math.max(span * 0.0032, 700);
  const labelH = Math.max(span * 0.028, 5000);
  const cityMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, emissive: 0x0f172a, emissiveIntensity: 0.1 });
  const townMat = new THREE.MeshLambertMaterial({ color: 0x475569, emissive: 0x334155, emissiveIntensity: 0.08 });
  for (const feature of features) {
    const c = feature.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    const { x, z } = localXZ(c[0], c[1], center);
    const y = sample?.(x, z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const isCity = String(feature.properties?.place || "") === "city";
    const name = String(feature.properties?.name || "").trim();
    const r = isCity ? dotR * 1.25 : dotR;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), isCity ? cityMat : townMat);
    const ground = Number.isFinite(y) ? y : 0;
    dot.position.set(x, ground + r, z);
    group.add(dot);
    if (!name) continue;
    const sprite = placeSprite(name, isCity);
    sprite.position.set(x, ground + r + labelH * 0.55, z);
    sprite.scale.set(labelH * sprite.userData.aspect, labelH, 1);
    group.add(sprite);
  }
  if (!group.children.length) return null;
  parent.add(group);
  return group;
}

export function addRegionContextLayers(parent, { footprints, water, highways, places, center, sample, span, skipSkiFootprints = false }) {
  const group = new THREE.Group();
  group.name = "region-context";
  if (!skipSkiFootprints) addRegionSkiFootprints(group, footprints, center, sample, span);
  const rivers = {
    type: "FeatureCollection",
    features: (water?.features || []).filter((f) => (f.properties?.kind || "river") !== "lake"),
  };
  const lakes = {
    type: "FeatureCollection",
    features: (water?.features || []).filter((f) => f.properties?.kind === "lake"),
  };
  addDrapedLines(group, rivers, center, sample, span, PALETTE.water, 0.0032, "region-rivers");
  addRegionSkiFootprints(group, lakes, center, sample, span, PALETTE.water);
  const motorways = {
    type: "FeatureCollection",
    features: (highways?.features || []).filter((f) => f.properties?.highway === "motorway"),
  };
  const otherRoads = {
    type: "FeatureCollection",
    features: (highways?.features || []).filter((f) => f.properties?.highway !== "motorway"),
  };
  addDrapedLines(group, otherRoads, center, sample, span, 0x94a3b8, 0.0015, "region-roads");
  addDrapedLines(group, motorways, center, sample, span, 0x475569, 0.0024, "region-motorways");
  addPlaces(group, places, center, sample, span);
  if (group.children.length) parent.add(group);
  return group;
}

/**
 * Low-poly snowy ski chalets for clay 3D resort scenes.
 */

import * as THREE from "three";
import { PALETTE, MAX_BUILDINGS, BUILDING_SHRINK } from "./config.js";
import { rng, localXZ, polygonParts, distOutsideIsland } from "./math-utils.js";

function classifyBuildingStyle(area) {
  if (area < 80) return "shed";
  if (area < 360) return "chalet";
  return "apartment";
}

function createChaletKit() {
  const lambert = (color, extra = {}) =>
    new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  return {
    wood: lambert(PALETTE.building, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    stucco: lambert(PALETTE.buildingStucco, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    trim: lambert(PALETTE.buildingTrim),
    roof: lambert(PALETTE.buildingRoof, { side: THREE.DoubleSide }),
    snow: lambert(PALETTE.snowShade, { side: THREE.DoubleSide }),
    chimney: lambert(0x4b5563),
    deck: lambert(0x8b5a3c),
    window: new THREE.MeshLambertMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      flatShading: true,
    }),
  };
}

function addPitchedSnowRoof(pivot, w, d, h, style, kit) {
  const ridgeAlongZ = d >= w;
  const span = (ridgeAlongZ ? w : d) * 1.16;
  const along = (ridgeAlongZ ? d : w) * 1.12;
  const rise = Math.max(h * 0.7, Math.min(w, d) * 0.55);
  const halfSpan = span * 0.5;
  const slope = Math.hypot(halfSpan, rise);
  const pitch = Math.atan2(rise, halfSpan);
  const thick = Math.max(0.06, Math.min(w, d) * 0.1);

  const crown = new THREE.Group();
  crown.name = "chalet-roof";
  crown.position.y = h;
  if (!ridgeAlongZ) crown.rotation.y = Math.PI * 0.5;
  pivot.add(crown);

  const shingleGeo = new THREE.BoxGeometry(slope, thick, along);
  const snowGeo = new THREE.BoxGeometry(slope * 1.04, thick * 0.65, along * 1.05);
  for (const sign of [-1, 1]) {
    const rotZ = sign * pitch;
    const x = sign * -halfSpan * 0.5;
    const y = rise * 0.5;
    const shingles = new THREE.Mesh(shingleGeo, kit.roof);
    shingles.rotation.z = rotZ;
    shingles.position.set(x, y, 0);
    shingles.frustumCulled = false;
    crown.add(shingles);

    const snow = new THREE.Mesh(snowGeo, kit.snow);
    snow.rotation.z = rotZ;
    snow.position.set(x, y + thick * 0.55, 0);
    snow.frustumCulled = false;
    crown.add(snow);
  }

  if (style !== "shed") {
    const chimneyH = Math.max(0.16, h * 0.24);
    const chimneyR = Math.max(0.04, Math.min(w, d) * 0.055);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(chimneyR, chimneyR * 1.12, chimneyH, 6), kit.chimney);
    chimney.position.set(span * 0.12, rise * 0.55 + chimneyH * 0.4, along * 0.08);
    chimney.frustumCulled = false;
    crown.add(chimney);
  }
  return rise;
}

function addWindow(pivot, x, y, z, ww, hh, rotY, kit) {
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), kit.window);
  pane.position.set(x, y, z);
  pane.rotation.y = rotY;
  pane.frustumCulled = false;
  pivot.add(pane);
}

function addChaletDetails(pivot, w, d, h, style, kit) {
  const ww = Math.max(0.12, Math.min(w, d) * (style === "apartment" ? 0.12 : 0.16));
  const hh = Math.max(0.14, h * (style === "apartment" ? 0.16 : 0.2));
  const frontZ = d * 0.5 + 0.012;
  const sideX = w * 0.5 + 0.012;
  addWindow(pivot, -w * 0.18, h * 0.42, frontZ, ww, hh, 0, kit);
  addWindow(pivot, w * 0.18, h * 0.42, frontZ, ww, hh, 0, kit);
  if (style !== "shed") {
    addWindow(pivot, sideX, h * 0.46, d * 0.08, ww * 0.85, hh * 0.9, Math.PI * 0.5, kit);
  }
  if (style === "apartment") {
    addWindow(pivot, -w * 0.18, h * 0.68, frontZ, ww, hh * 0.85, 0, kit);
    addWindow(pivot, w * 0.18, h * 0.68, frontZ, ww, hh * 0.85, 0, kit);
  }

  const deckW = w * (style === "apartment" ? 0.55 : 0.62);
  const deckD = Math.max(0.16, d * 0.22);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, Math.max(0.03, h * 0.04), deckD), kit.deck);
  deck.position.set(0, Math.max(0.03, h * 0.03), d * 0.5 + deckD * 0.32);
  deck.frustumCulled = false;
  pivot.add(deck);

  const overhang = new THREE.Mesh(
    new THREE.BoxGeometry(deckW * 1.02, Math.max(0.03, h * 0.035), deckD * 0.55),
    kit.trim,
  );
  overhang.position.set(0, h * 0.28, d * 0.5 + deckD * 0.08);
  overhang.frustumCulled = false;
  pivot.add(overhang);
}

function addApartmentBalconies(pivot, w, d, h, kit) {
  const levelCount = h > 1.2 ? 2 : 1;
  for (let level = 0; level < levelCount; level += 1) {
    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.62, Math.max(0.04, h * 0.045), d * 0.14),
      kit.trim,
    );
    balcony.position.set(0, h * (0.38 + level * 0.24), d * 0.52);
    balcony.frustumCulled = false;
    pivot.add(balcony);
  }
}

export function addClayBuilding(group, cx, cz, y0, w, d, h, yaw, kit, footprint = null, style = null) {
  const buildingStyle = style || classifyBuildingStyle(w * d);
  const mats = kit?.wood ? kit : createChaletKit();
  const wallMat = buildingStyle === "apartment" ? mats.stucco : mats.wood;
  const pivot = new THREE.Group();
  pivot.name = `clay-${buildingStyle}`;
  pivot.position.set(cx, y0, cz);
  pivot.rotation.y = yaw;

  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  box.position.y = h * 0.5;
  box.renderOrder = 5;
  box.frustumCulled = false;
  pivot.add(box);

  addPitchedSnowRoof(pivot, w, d, h, buildingStyle, mats);
  addChaletDetails(pivot, w, d, h, buildingStyle, mats);
  if (buildingStyle === "apartment") addApartmentBalconies(pivot, w, d, h, mats);
  group.add(pivot);
}

export function addBuildings(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const features = featureCollection?.features || [];
  if (!features.length) return addProceduralBuildings(parent, sample, unitScale);

  const group = new THREE.Group();
  group.name = "montage-buildings";
  const kit = createChaletKit();
  const s = unitScale * BUILDING_SHRINK;
  const edgeSlackM = Math.max(35, 12 * unitScale);
  const snowLift = Math.max(0.55, 0.18 * unitScale);

  const candidates = [];
  for (const feature of features) {
    for (const polygon of polygonParts(feature.geometry)) {
      const ring = polygon?.[0];
      if (!ring || ring.length < 3) continue;
      const xs = [];
      const zs = [];
      for (const coord of ring) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        xs.push(x);
        zs.push(z);
      }
      const cx = (Math.min(...xs) + Math.max(...xs)) * 0.5;
      const cz = (Math.min(...zs) + Math.max(...zs)) * 0.5;
      if (clipRing?.length && distOutsideIsland(cx, cz, clipRing) > edgeSlackM) continue;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minZ = Math.min(...zs);
      const maxZ = Math.max(...zs);
      const footW = Math.max(4, maxX - minX);
      const footD = Math.max(4, maxZ - minZ);
      if (footW > 80 || footD > 80) continue;
      let y = sample(cx, cz);
      if (y == null) {
        let ySum = 0;
        let yN = 0;
        for (let i = 0; i < xs.length; i++) {
          const sy = sample(xs[i], zs[i]);
          if (sy == null) continue;
          ySum += sy;
          yN += 1;
        }
        if (yN < 1) continue;
        y = ySum / yN;
      }
      candidates.push({
        cx,
        cz,
        y: y + snowLift,
        footW,
        footD,
        area: footW * footD,
        footprint: {
          outer: ring.map((coord) => localXZ(coord[0], coord[1], center)),
          holes: (polygon.slice(1) || []).map((hole) =>
            hole.map((coord) => localXZ(coord[0], coord[1], center)),
          ),
          width: footW,
          depth: footD,
        },
      });
    }
  }

  candidates.sort((a, b) => b.area - a.area);

  let count = 0;
  for (const c of candidates) {
    if (count >= MAX_BUILDINGS) break;
    const footprintScale = Math.min(1, 24 / c.footW, 24 / c.footD) * s;
    const w = c.footW * footprintScale;
    const d = c.footD * footprintScale;
    const h = Math.max(3.5, Math.min(11, Math.sqrt(c.area) * 0.32)) * s;
    addClayBuilding(group, c.cx, c.cz, c.y, w, d, h, 0, kit, c.footprint, classifyBuildingStyle(c.area));
    count += 1;
  }

  if (!group.children.length) return addProceduralBuildings(parent, sample, unitScale);
  parent.add(group);
  return group;
}

export function addProceduralBuildings(parent, sample, unitScale = 1) {
  const group = new THREE.Group();
  group.name = "montage-buildings-proc";
  const kit = createChaletKit();
  const s = unitScale * BUILDING_SHRINK;
  const snowLift = Math.max(0.55, 0.18 * unitScale);

  const clusters = [
    { x: 10, z: 18, n: 5 },
    { x: -8, z: 14, n: 4 },
    { x: 22, z: 6, n: 3 },
  ];

  let seed = 0;
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.n; i++) {
      const x = (cluster.x + (rng(seed * 2.1) - 0.5) * 14) * Math.min(unitScale, 1.2);
      const z = (cluster.z + (rng(seed * 3.7) - 0.5) * 10) * Math.min(unitScale, 1.2);
      const y = sample(x, z);
      if (y == null) {
        seed += 1;
        continue;
      }
      const rawW = 3.5 + rng(seed * 1.4) * 4.5;
      const rawD = 3 + rng(seed * 2.2) * 3.5;
      const w = rawW * s;
      const d = rawD * s;
      const h = (4.5 + rng(seed * 1.8) * 5) * s;
      addClayBuilding(
        group,
        x,
        z,
        y + snowLift,
        w,
        d,
        h,
        rng(seed) * Math.PI * 0.25,
        kit,
        null,
        classifyBuildingStyle(rawW * rawD),
      );
      seed += 1;
    }
  }

  if (!group.children.length) return null;
  parent.add(group);
  return group;
}

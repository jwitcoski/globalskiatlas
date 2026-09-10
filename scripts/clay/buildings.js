/**
 * Base lodges, buildings, and cabin geometry for 3D clay ski resort scenes.
 */

import * as THREE from "three";
import { PALETTE, MAX_BUILDINGS, BUILDING_SHRINK } from "./config.js";
import { rng, localXZ, polygonParts, distOutsideIsland } from "./math-utils.js";

function classifyBuildingStyle(area) {
  if (area < 80) return "shed";
  if (area < 360) return "chalet";
  return "apartment";
}

function gableRoofGeometry(w, d, roofHeight) {
  const halfW = w * 0.56;
  const halfD = d * 0.56;
  const vertices = new Float32Array([
    -halfW, 0, -halfD,
    halfW, 0, -halfD,
    0, roofHeight, -halfD,
    -halfW, 0, halfD,
    halfW, 0, halfD,
    0, roofHeight, halfD,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 1, 2,
    3, 5, 4,
    0, 3, 4, 0, 4, 1,
    1, 4, 5, 1, 5, 2,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function addBuildingRoof(group, cx, cz, y0, w, d, h, yaw, roofMat, style) {
  if (style === "chalet") {
    const roofHeight = Math.max(0.45, h * 0.5);
    const roof = new THREE.Mesh(gableRoofGeometry(w, d, roofHeight), roofMat);
    roof.position.set(cx, y0 + h, cz);
    roof.rotation.y = yaw;
    roof.renderOrder = 5;
    roof.frustumCulled = false;
    group.add(roof);
    return;
  }

  const roofHeight = style === "shed" ? Math.max(0.12, h * 0.1) : Math.max(0.25, h * 0.14);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * (style === "apartment" ? 1.1 : 1.04), roofHeight, d * (style === "apartment" ? 1.1 : 1.04)),
    roofMat,
  );
  roof.position.set(cx, y0 + h + Math.max(0.12, h * 0.06), cz);
  roof.rotation.y = yaw;
  roof.renderOrder = 5;
  roof.frustumCulled = false;
  group.add(roof);
}

function addApartmentBalconies(group, cx, cz, y0, w, d, h, yaw, balconyMat) {
  const levelCount = h > 1.2 ? 2 : 1;
  for (let level = 0; level < levelCount; level += 1) {
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, Math.max(0.04, h * 0.045), d * 0.16), balconyMat);
    const localZ = d * 0.56;
    balcony.position.set(cx + Math.sin(yaw) * localZ, y0 + h * (0.38 + level * 0.25), cz + Math.cos(yaw) * localZ);
    balcony.rotation.y = yaw;
    balcony.renderOrder = 5;
    balcony.frustumCulled = false;
    group.add(balcony);
  }
}

export function addClayBuilding(group, cx, cz, y0, w, d, h, yaw, wallMat, roofMat, footprint = null, style = null) {
  const buildingStyle = style || classifyBuildingStyle(w * d);
  if (footprint) {
    const shape = new THREE.Shape();
    for (const [index, point] of footprint.outer.entries()) {
      const x = (point.x - cx) * (w / footprint.width);
      const z = -(point.z - cz) * (d / footprint.depth);
      if (index === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    for (const hole of footprint.holes || []) {
      const path = new THREE.Path();
      for (const [index, point] of hole.entries()) {
        const x = (point.x - cx) * (w / footprint.width);
        const z = -(point.z - cz) * (d / footprint.depth);
        if (index === 0) path.moveTo(x, z);
        else path.lineTo(x, z);
      }
      shape.holes.push(path);
    }

    let geometry;
    let roofGeometry;
    try {
      geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      roofGeometry = new THREE.ShapeGeometry(shape);
    } catch {
      return;
    }
    const box = new THREE.Mesh(geometry, wallMat);
    box.position.set(cx, y0, cz);
    box.rotation.x = -Math.PI * 0.5;
    box.renderOrder = 5;
    box.frustumCulled = false;
    group.add(box);

    if (buildingStyle === "chalet") {
      addBuildingRoof(group, cx, cz, y0, w, d, h, yaw, roofMat, buildingStyle);
    } else {
      const roof = new THREE.Mesh(roofGeometry, roofMat);
      roof.position.set(cx, y0 + h + Math.max(0.2, h * 0.08), cz);
      roof.rotation.x = -Math.PI * 0.5;
      roof.renderOrder = 5;
      roof.frustumCulled = false;
      group.add(roof);
    }
    if (buildingStyle === "apartment") {
      addApartmentBalconies(group, cx, cz, y0, w, d, h, yaw, roofMat);
    }
    return;
  }

  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  box.position.set(cx, y0 + h * 0.5, cz);
  box.rotation.y = yaw;
  box.renderOrder = 5;
  box.frustumCulled = false;
  group.add(box);

  addBuildingRoof(group, cx, cz, y0, w, d, h, yaw, roofMat, buildingStyle);
  if (buildingStyle === "apartment") {
    addApartmentBalconies(group, cx, cz, y0, w, d, h, yaw, roofMat);
  }
}

export function addBuildings(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const features = featureCollection?.features || [];
  if (!features.length) return addProceduralBuildings(parent, sample, unitScale);

  const group = new THREE.Group();
  group.name = "montage-buildings";
  const wallMat = new THREE.MeshLambertMaterial({
    color: PALETTE.building,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
  const s = unitScale * BUILDING_SHRINK;
  /* Keep base-village footprints near the buffer edge; hard clip hid them under snow. */
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

  /* Prefer larger footprints (lodges / base villages often sit near the rim). */
  candidates.sort((a, b) => b.area - a.area);

  let count = 0;
  for (const c of candidates) {
    if (count >= MAX_BUILDINGS) break;
    const footprintScale = Math.min(1, 24 / c.footW, 24 / c.footD) * s;
    const w = c.footW * footprintScale;
    const d = c.footD * footprintScale;
    const h = Math.max(3.5, Math.min(11, Math.sqrt(c.area) * 0.32)) * s;
    addClayBuilding(
      group,
      c.cx,
      c.cz,
      c.y,
      w,
      d,
      h,
      0,
      wallMat,
      roofMat,
      c.footprint,
      classifyBuildingStyle(c.area),
    );
    count += 1;
  }

  if (!group.children.length) return addProceduralBuildings(parent, sample, unitScale);
  parent.add(group);
  return group;
}

export function addProceduralBuildings(parent, sample, unitScale = 1) {
  const group = new THREE.Group();
  group.name = "montage-buildings-proc";
  const wallMat = new THREE.MeshLambertMaterial({
    color: PALETTE.building,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const roofMat = new THREE.MeshLambertMaterial({
    color: PALETTE.buildingRoof,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });
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
        wallMat,
        roofMat,
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

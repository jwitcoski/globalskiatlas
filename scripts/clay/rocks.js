/** Low-poly OSM rocks and cliffs for the clay resort scenes. */

import * as THREE from "three";
import { PALETTE } from "./config.js";
import { featureTag, lineParts, localXZ, polygonParts, pointInRing } from "./math-utils.js";

function insideClip(x, z, clipRing) {
  return !clipRing?.length || pointInRing(x, z, clipRing);
}

function featurePoints(feature) {
  const geometry = feature?.geometry;
  if (geometry?.type === "Point") return [geometry.coordinates];
  if (geometry?.type === "MultiPoint") return geometry.coordinates || [];
  return [];
}

export function addOsmRocks(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const points = [];
  for (const feature of featureCollection?.features || []) {
    const natural = featureTag(feature, "natural");
    const geology = featureTag(feature, "geology");
    if (natural !== "rock" && natural !== "scree" && geology !== "stone") continue;
    for (const coord of featurePoints(feature)) {
      if (!coord || coord.length < 2) continue;
      const p = localXZ(coord[0], coord[1], center);
      if (insideClip(p.x, p.z, clipRing)) points.push(p);
    }
    if (natural === "scree") {
      for (const polygon of polygonParts(feature.geometry)) {
        const ring = polygon?.[0];
        if (!ring?.length) continue;
        let east = 0;
        let north = 0;
        for (const coord of ring) {
          east += coord[0];
          north += coord[1];
        }
        const p = localXZ(east / ring.length, north / ring.length, center);
        if (insideClip(p.x, p.z, clipRing)) points.push(p);
      }
    }
  }
  if (!points.length) return null;
  const group = new THREE.Group();
  group.name = "montage-osm-rocks";
  const geo = new THREE.DodecahedronGeometry(Math.max(0.22, 0.7 * unitScale), 0);
  const mat = new THREE.MeshLambertMaterial({ color: PALETTE.rock, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, points.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const y = sample(p.x, p.z);
    if (y == null) continue;
    const scale = (0.55 + ((i * 17) % 7) * 0.1) * unitScale;
    dummy.position.set(p.x, y + scale * 0.5, p.z);
    dummy.rotation.set(0.2 + (i % 3) * 0.2, (i * 1.7) % Math.PI, 0.1);
    dummy.scale.set(scale, scale * (0.7 + (i % 4) * 0.12), scale * 0.85);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  parent.add(group);
  return group;
}

export function addOsmCliffs(parent, featureCollection, center, sample, unitScale = 1, clipRing = null) {
  const group = new THREE.Group();
  group.name = "montage-osm-cliffs";
  const mat = new THREE.MeshLambertMaterial({ color: PALETTE.rockDeep, flatShading: true });
  let count = 0;
  for (const feature of featureCollection?.features || []) {
    const natural = featureTag(feature, "natural");
    if (natural !== "cliff" && natural !== "scree") continue;
    const lines = lineParts(feature.geometry);
    for (const coords of lines) {
      const points = [];
      for (const coord of coords) {
        const p = localXZ(coord[0], coord[1], center);
        if (!insideClip(p.x, p.z, clipRing)) continue;
        const y = sample(p.x, p.z);
        if (y != null) points.push(new THREE.Vector3(p.x, y + 0.2 * unitScale, p.z));
      }
      if (points.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(points);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.min(48, Math.max(8, points.length * 2)), Math.max(0.18, 0.32 * unitScale), 5, false),
        mat,
      );
      mesh.name = "montage-osm-cliff";
      group.add(mesh);
      count += 1;
    }
  }
  if (!count) return null;
  parent.add(group);
  return group;
}

export function rockFeatureCount(featureCollection) {
  return (featureCollection?.features || []).filter((feature) => {
    const natural = featureTag(feature, "natural");
    return natural === "rock" || natural === "scree" || featureTag(feature, "geology") === "stone";
  }).length;
}
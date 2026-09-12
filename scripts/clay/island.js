/** Terrain fitting and procedural floating-island construction. */

import * as THREE from "three";
import { HERO_SPAN, PALETTE } from "./config.js";
import {
  addProceduralBuildings,
  addProceduralTrees,
  addProceduralTrails,
  addWaterPond,
  mountainHeight,
  shadeSnowGeometry,
} from "./index.js";

export function exaggerateHeights(mesh, factor = 2) {
  if (!mesh?.geometry?.attributes?.position || !(factor > 0) || factor === 1) return;
  const pos = mesh.geometry.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
  for (let i = 0; i < pos.count; i++) pos.setY(i, minY + (pos.getY(i) - minY) * factor);
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

/** Wiki region GLBs store real elevation meters. Game Y = elev * height_exaggerate. */
export function scaleMeshElevation(mesh, factor) {
  if (!mesh?.geometry?.attributes?.position || !(factor > 0) || factor === 1) return;
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * factor);
  pos.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

export function wikiRegionHeightExaggerate(manifest) {
  const terrain = Number(manifest?.terrain?.height_exaggerate);
  if (Number.isFinite(terrain) && terrain > 0) return terrain;
  const camera = Number(manifest?.camera?.height_exaggerate);
  if (Number.isFinite(camera) && camera > 0) return camera;
  return null;
}

/** State-scale DEMs are ~0.3% relief; scale so ridges read after the island is fitted to hero size. */
export function regionHeightExaggerateFactor(mesh) {
  const pos = mesh?.geometry?.attributes?.position;
  if (!pos) return 12;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i));
    maxX = Math.max(maxX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
    minZ = Math.min(minZ, pos.getZ(i));
    maxZ = Math.max(maxZ, pos.getZ(i));
  }
  const relief = Math.max(1, maxY - minY);
  const plan = Math.max(maxX - minX, maxZ - minZ, 1);
  return Math.min(16, Math.max(6, (plan * 0.055) / relief));
}

/** Laplacian Y-smooth so a coarse DEM does not turn into needles after exaggeration. */
export function smoothTerrainHeights(mesh, iterations = 5) {
  const geo = mesh?.geometry;
  const pos = geo?.attributes?.position;
  if (!pos) return;
  const index = geo.getIndex();
  const n = pos.count;
  const adj = Array.from({ length: n }, () => []);
  if (index) {
    const arr = index.array;
    for (let i = 0; i < arr.length; i += 3) {
      const a = arr[i];
      const b = arr[i + 1];
      const c = arr[i + 2];
      adj[a].push(b, c);
      adj[b].push(a, c);
      adj[c].push(a, b);
    }
  } else {
    for (let i = 0; i + 2 < n; i += 3) {
      adj[i].push(i + 1, i + 2);
      adj[i + 1].push(i, i + 2);
      adj[i + 2].push(i, i + 1);
    }
  }
  const next = new Float32Array(n);
  for (let iter = 0; iter < iterations; iter++) {
    for (let v = 0; v < n; v++) {
      const nbr = adj[v];
      if (!nbr.length) {
        next[v] = pos.getY(v);
        continue;
      }
      let sum = pos.getY(v) * 2;
      for (const u of nbr) sum += pos.getY(u);
      next[v] = sum / (nbr.length + 2);
    }
    for (let v = 0; v < n; v++) pos.setY(v, next[v]);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function fitTerrainRoot(mesh, targetSpan = HERO_SPAN, landElev = null) {
  const root = new THREE.Group();
  root.name = "montage-terrain-root";
  root.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const landMin = Number(landElev?.min);
  const landMax = Number(landElev?.max);
  const hasLand = Number.isFinite(landMin) && Number.isFinite(landMax) && landMax > landMin;
  if (hasLand) center.y = (landMin + landMax) * 0.5;
  mesh.position.sub(center);
  root.userData.terrainCenter = center.clone();
  const sized = new THREE.Box3().setFromObject(mesh);
  const size = sized.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  root.scale.setScalar(targetSpan / span);
  root.updateMatrixWorld(true);
  if (hasLand) {
    const y0 = landMin + mesh.position.y;
    const y1 = landMax + mesh.position.y;
    const landSize = new THREE.Vector3(size.x, Math.max(1, y1 - y0), size.z);
    const landCenter = new THREE.Vector3(
      (sized.min.x + sized.max.x) * 0.5,
      (y0 + y1) * 0.5,
      (sized.min.z + sized.max.z) * 0.5,
    );
    root.userData.landFraming = {
      center: landCenter,
      size: landSize,
      radius: Math.max(landSize.x, landSize.y, landSize.z) * 0.5,
    };
  }
  return { root, center, mesh, span };
}

export function addSoftShadow(parent, radius) {
  const geo = new THREE.CircleGeometry(radius * 0.72, 32);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x8aa0b8,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.position.y = -8;
  disc.name = "montage-shadow";
  parent.add(disc);
  return disc;
}

export function addIslandUnderside(parent, terrainMesh) {
  const box = new THREE.Box3().setFromObject(terrainMesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const geo = new THREE.SphereGeometry(
    Math.max(size.x, size.z) * 0.42,
    28,
    16,
    0,
    Math.PI * 2,
    Math.PI * 0.45,
    Math.PI * 0.55,
  );
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: PALETTE.wood, flatShading: true, side: THREE.DoubleSide }),
  );
  mesh.position.set(center.x, box.min.y - Math.max(2, size.y * 0.05), center.z);
  mesh.name = "montage-underside";
  parent.add(mesh);
  return mesh;
}

export function buildProceduralIsland(parent) {
  const root = new THREE.Group();
  root.name = "montage-terrain-root";
  const geo = new THREE.PlaneGeometry(HERO_SPAN, HERO_SPAN, 56, 56);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, mountainHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  shadeSnowGeometry(geo);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: PALETTE.snow, vertexColors: true, side: THREE.DoubleSide }),
  );
  mesh.name = "montage-terrain-proc";
  root.add(mesh);
  const decor = new THREE.Group();
  decor.name = "montage-decor";
  root.add(decor);
  addIslandUnderside(root, mesh);
  addSoftShadow(root, HERO_SPAN * 0.48);
  addProceduralTrails(decor, mountainHeight);
  addProceduralTrees(decor, mountainHeight);
  addProceduralBuildings(decor, mountainHeight);
  addWaterPond(decor, mesh, mountainHeight, HERO_SPAN);
  parent.add(root);
  return { root, mesh, decor, bounds: { center: new THREE.Vector3(2, 16, -4), radius: 46 } };
}

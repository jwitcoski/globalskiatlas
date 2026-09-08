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

export function fitTerrainRoot(mesh, targetSpan = HERO_SPAN) {
  const root = new THREE.Group();
  root.name = "montage-terrain-root";
  root.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  root.userData.terrainCenter = center.clone();
  const sized = new THREE.Box3().setFromObject(mesh);
  const size = sized.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1);
  root.scale.setScalar(targetSpan / span);
  root.updateMatrixWorld(true);
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

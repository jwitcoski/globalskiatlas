/**
 * Pickable admin-1 polygons on wiki country clay islands.
 * Vectors are local_game_meters (x=east, y=north) — same as other region GeoJSON.
 */
import * as THREE from "three";
import { localXZ, polygonParts, downsampleLine } from "./math-utils.js";

function propsToEntity(props) {
  const pageId = String(props.pageId || "");
  const title = String(props.title || props.state || pageId || "State");
  const hasScene = props.has_region_scene !== false && Boolean(props.scene || pageId);
  return {
    entityType: "admin1",
    kind: "admin1",
    name: title,
    pageId,
    pageType: props.pageType || "state",
    title,
    state: props.state || title,
    country: props.country || "",
    resortCount: Number(props.resort_count) || 0,
    hasRegionScene: hasScene,
    scene: props.scene || (pageId ? `clay_scenes/regions/${pageId}/scene-manifest.json` : ""),
    properties: props,
  };
}

function shapeFromRing(ring, center) {
  const pts = [];
  for (const coord of downsampleLine(ring, 64)) {
    const { x, z } = localXZ(coord[0], coord[1], center);
    if (Number.isFinite(x) && Number.isFinite(z)) pts.push(new THREE.Vector2(x, z));
  }
  if (pts.length < 3) return null;
  try {
    return new THREE.Shape(pts);
  } catch {
    return null;
  }
}

function drapeGeometry(geo, sample, lift) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const y = sample?.(x, z);
    pos.setXYZ(i, x, (Number.isFinite(y) ? y : 0) + lift, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function addAdmin1Regions(parent, fc, center, sample, span) {
  const features = fc?.features || [];
  if (!features.length) return null;

  const group = new THREE.Group();
  group.name = "region-admin1";
  const pickables = [];
  const lift = Math.max(span * 0.00055, 120);

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fillHover = fillMat.clone();
  fillHover.opacity = 0.2;
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x1d4ed8,
    transparent: true,
    opacity: 0.22,
    depthTest: false,
  });
  const lineHover = lineMat.clone();
  lineHover.opacity = 0.95;
  lineHover.color = new THREE.Color(0xf8fafc);

  for (const feature of features) {
    const entity = propsToEntity(feature.properties || {});
    if (!entity.pageId) continue;
    const unit = new THREE.Group();
    unit.name = `admin1-${entity.pageId}`;
    unit.userData.entity = entity;
    unit.userData.wikiPageId = entity.pageId;
    const fills = [];
    const outlines = [];

    for (const poly of polygonParts(feature.geometry)) {
      const outer = poly?.[0];
      if (!outer || outer.length < 3) continue;
      const shape = shapeFromRing(outer, center);
      if (!shape) continue;
      const geo = new THREE.ShapeGeometry(shape);
      drapeGeometry(geo, sample, lift);
      const mesh = new THREE.Mesh(geo, fillMat);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      unit.add(mesh);
      fills.push(mesh);

      const edge = [];
      for (const coord of downsampleLine(outer, 80)) {
        const { x, z } = localXZ(coord[0], coord[1], center);
        const y = sample?.(x, z);
        edge.push(new THREE.Vector3(x, (Number.isFinite(y) ? y : 0) + lift * 1.15, z));
      }
      if (edge.length >= 2) {
        const lg = new THREE.BufferGeometry().setFromPoints(edge);
        const line = new THREE.Line(lg, lineMat);
        line.renderOrder = 5;
        line.frustumCulled = false;
        unit.add(line);
        outlines.push(line);
      }
    }

    if (!fills.length) continue;
    unit.userData.setPickHighlight = (on) => {
      for (const mesh of fills) mesh.material = on ? fillHover : fillMat;
      for (const line of outlines) line.material = on ? lineHover : lineMat;
    };
    group.add(unit);
    pickables.push(unit);
  }

  if (!pickables.length) return null;
  group.userData.pickables = pickables;
  parent.add(group);
  return group;
}

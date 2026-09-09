/** Resort manifests, terrain meshes, and vector data loading for clay scenes. */

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import {
  HEIGHT_EXAGGERATE,
  HERO_SPAN,
  gameSceneBase,
  sceneRoot,
} from "./config.js";
import {
  exaggerateHeights,
  fitTerrainRoot,
} from "./island.js";
import {
  mergeFeatureCollections,
  mergeTreeArea,
  shadeSnowMesh,
  waterFeatureCount,
} from "./index.js";

let gltfLoader;

function getGltfLoader() {
  if (gltfLoader) return gltfLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);
  return gltfLoader;
}

export async function fetchJson(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export function yieldFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function loadHomepageMesh(base) {
  const manifest = await fetchJson(new URL("scene-manifest.json", base));
  const meshUrl = new URL(manifest.terrain.mesh, base);
  const vectors = manifest.vectors || {};
  const gltf = await getGltfLoader().loadAsync(meshUrl.href);

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (!mesh) mesh = child;
    exaggerateHeights(child, HEIGHT_EXAGGERATE);
    shadeSnowMesh(child);
    child.castShadow = false;
    child.receiveShadow = true;
  });
  if (!mesh) throw new Error("terrain mesh missing");

  return { fitted: fitTerrainRoot(mesh, HERO_SPAN), vectors, base, manifest };
}

export async function loadVectors(base, vectors, resort = null) {
  const routesUrl = new URL(
    vectors.piste_trails || vectors.route_centers || "vectors/piste-trails.geojson",
    base,
  );
  const liftsUrl = new URL(vectors.lifts || "vectors/lifts.geojson", base);
  const treePointsUrl = new URL(vectors.tree_points || "vectors/tree-points.geojson", base);
  const forestUrl = new URL(vectors.forest || "vectors/forest.geojson", base);
  const bufferPath = vectors.ski_area_buffer || null;
  const clayWaterPath = vectors.water || null;
  const clayBuildingsPath = vectors.buildings || null;
  const clayRoadsPath = vectors.roads || null;
  const clayCliffsPath = vectors.cliffs || null;
  const clayRocksPath = vectors.rocks || null;
  const gameBase = gameSceneBase(resort);
  const fetches = [
    fetchJson(routesUrl).catch(() => null),
    fetchJson(liftsUrl).catch(() => null),
    fetchJson(treePointsUrl).catch(() => null),
    fetchJson(forestUrl).catch(() => null),
    bufferPath ? fetchJson(new URL(bufferPath, base)).catch(() => null) : Promise.resolve(null),
    clayWaterPath ? fetchJson(new URL(clayWaterPath, base)).catch(() => null) : Promise.resolve(null),
    clayBuildingsPath ? fetchJson(new URL(clayBuildingsPath, base)).catch(() => null) : Promise.resolve(null),
    clayRoadsPath ? fetchJson(new URL(clayRoadsPath, base)).catch(() => null) : Promise.resolve(null),
    clayCliffsPath ? fetchJson(new URL(clayCliffsPath, base)).catch(() => null) : Promise.resolve(null),
    clayRocksPath ? fetchJson(new URL(clayRocksPath, base)).catch(() => null) : Promise.resolve(null),
  ];
  if (gameBase) {
    fetches.push(
      fetchJson(new URL("vectors/buildings.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/roads.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/water.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/ski-area.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/forest.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/cliffs.geojson", gameBase)).catch(() => null),
      fetchJson(new URL("vectors/rocks.geojson", gameBase)).catch(() => null),
    );
  }
  const results = await Promise.all(fetches);
  const forestPoints = results[2];
  const forestHome = results[3];
  const game = gameBase ? results.slice(10) : [];
  const forest = await mergeTreeArea(mergeFeatureCollections(game[4], forestHome, forestPoints));
  const waterGame = gameBase ? game[2] : null;
  return {
    routes: results[0],
    lifts: results[1],
    forest,
    buildings: mergeFeatureCollections(game[0], results[6]),
    roads: mergeFeatureCollections(game[1], results[7]),
    cliffs: mergeFeatureCollections(game[5], results[8]),
    rocks: mergeFeatureCollections(game[6], results[9]),
    water: waterFeatureCount(waterGame) ? waterGame : results[5],
    skiArea: gameBase ? game[3] : null,
    skiAreaBuffer: results[4],
  };
}

export async function loadResortScene(resort) {
  const base = sceneRoot(resort.id);
  const { fitted, vectors } = await loadHomepageMesh(base);
  return { base, fitted, vectors, resort };
}

export async function loadCatalog(catalogUrl) {
  const catalog = await fetchJson(catalogUrl());
  return (catalog?.resorts || []).filter((resort) => resort?.id);
}

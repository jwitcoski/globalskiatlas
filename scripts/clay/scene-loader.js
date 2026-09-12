/** Resort manifests, terrain meshes, and vector data loading for clay scenes. */

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import {
  HEIGHT_EXAGGERATE,
  HERO_SPAN,
  gameSceneBase,
  regionCatalogUrl,
  regionSceneRoot,
  sceneRoot,
} from "./config.js";
import {
  exaggerateHeights,
  fitTerrainRoot,
  scaleMeshElevation,
  wikiRegionHeightExaggerate,
} from "./island.js?v=5";
import {
  mergeFeatureCollections,
  mergeTreeArea,
  shadeSnowMesh,
  waterFeatureCount,
} from "./index.js?v=4";

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
  const res = await fetch(url, { cache: "no-store" });
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
  const isRegion = manifest.scene_kind === "wiki_region";
  const regionExaggerate = isRegion ? wikiRegionHeightExaggerate(manifest) : null;
  let elevMin = Number(manifest.terrain?.elevation_min_m);
  let elevMax = Number(manifest.terrain?.elevation_max_m);
  const metaPath = manifest.terrain?.mesh_metadata;
  if (isRegion && metaPath) {
    try {
      const meta = await fetchJson(new URL(metaPath, base));
      const metaMin = Number(meta.elevation_min_m ?? meta.min_elevation_m);
      const metaMax = Number(meta.elevation_max_m ?? meta.max_elevation_m);
      if (Number.isFinite(metaMin)) elevMin = metaMin;
      if (Number.isFinite(metaMax)) elevMax = metaMax;
    } catch {
      /* manifest min/max are enough */
    }
  }

  let mesh = null;
  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;
    if (!mesh) mesh = child;
    if (isRegion) {
      if (!(regionExaggerate > 0)) {
        throw new Error("wiki_region height_exaggerate missing");
      }
      scaleMeshElevation(child, regionExaggerate);
      child.userData.heightExaggerate = regionExaggerate;
    } else {
      exaggerateHeights(child, HEIGHT_EXAGGERATE);
    }
    shadeSnowMesh(child, isRegion ? { contrast: true } : null);
    child.castShadow = false;
    child.receiveShadow = true;
  });
  if (!mesh) throw new Error("terrain mesh missing");

  const heroSpan = Number(manifest.camera?.suggested_hero_span) || HERO_SPAN;
  const landElev = isRegion && Number.isFinite(elevMin) && Number.isFinite(elevMax)
    ? { min: elevMin * regionExaggerate, max: elevMax * regionExaggerate }
    : null;
  return {
    fitted: fitTerrainRoot(mesh, heroSpan, landElev),
    vectors,
    base,
    manifest,
    heightExaggerate: isRegion ? regionExaggerate : HEIGHT_EXAGGERATE,
  };
}

export async function loadVectors(base, vectors, resort = null, options = {}) {
  const regionVectors = Boolean(options.regionVectors);
  const routesPath = vectors.piste_trails || vectors.route_centers || (regionVectors ? null : "vectors/piste-trails.geojson");
  const liftsPath = vectors.lifts || (regionVectors ? null : "vectors/lifts.geojson");
  const treePointsPath = vectors.tree_points || (regionVectors ? null : "vectors/tree-points.geojson");
  const forestPath = vectors.forest || (regionVectors ? null : "vectors/forest.geojson");
  const routesUrl = routesPath ? new URL(routesPath, base) : null;
  const liftsUrl = liftsPath ? new URL(liftsPath, base) : null;
  const treePointsUrl = treePointsPath ? new URL(treePointsPath, base) : null;
  const forestUrl = forestPath ? new URL(forestPath, base) : null;
  const bufferPath = vectors.ski_area_buffer || vectors.admin_boundary || null;
  const resortsPath = vectors.resorts || null;
  const footprintsPath = options.skipSkiFootprints ? null : (vectors.ski_area_footprints || null);
  const admin1Path = vectors.admin_1 || null;
  const highwaysPath = vectors.highways || null;
  const placesPath = vectors.places || null;
  const clayWaterPath = vectors.water || null;
  const clayBuildingsPath = vectors.buildings || null;
  const clayRoadsPath = vectors.roads || null;
  const clayCliffsPath = vectors.cliffs || null;
  const clayRocksPath = vectors.rocks || null;
  const gameBase = gameSceneBase(resort);
  const fetches = [
    routesUrl ? fetchJson(routesUrl).catch(() => null) : Promise.resolve(null),
    liftsUrl ? fetchJson(liftsUrl).catch(() => null) : Promise.resolve(null),
    treePointsUrl ? fetchJson(treePointsUrl).catch(() => null) : Promise.resolve(null),
    forestUrl ? fetchJson(forestUrl).catch(() => null) : Promise.resolve(null),
    bufferPath ? fetchJson(new URL(bufferPath, base)).catch(() => null) : Promise.resolve(null),
    clayWaterPath ? fetchJson(new URL(clayWaterPath, base)).catch(() => null) : Promise.resolve(null),
    clayBuildingsPath ? fetchJson(new URL(clayBuildingsPath, base)).catch(() => null) : Promise.resolve(null),
    clayRoadsPath ? fetchJson(new URL(clayRoadsPath, base)).catch(() => null) : Promise.resolve(null),
    clayCliffsPath ? fetchJson(new URL(clayCliffsPath, base)).catch(() => null) : Promise.resolve(null),
    clayRocksPath ? fetchJson(new URL(clayRocksPath, base)).catch(() => null) : Promise.resolve(null),
    resortsPath ? fetchJson(new URL(resortsPath, base)).catch(() => null) : Promise.resolve(null),
    footprintsPath ? fetchJson(new URL(footprintsPath, base)).catch(() => null) : Promise.resolve(null),
    highwaysPath ? fetchJson(new URL(highwaysPath, base)).catch(() => null) : Promise.resolve(null),
    placesPath ? fetchJson(new URL(placesPath, base)).catch(() => null) : Promise.resolve(null),
    admin1Path ? fetchJson(new URL(admin1Path, base)).catch(() => null) : Promise.resolve(null),
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
  const regionResorts = results[10];
  const regionFootprints = results[11];
  const regionHighways = results[12];
  const regionPlaces = results[13];
  const regionAdmin1 = results[14];
  const game = gameBase ? results.slice(15) : [];
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
    resorts: regionResorts,
    skiAreaFootprints: regionFootprints,
    highways: regionHighways,
    places: regionPlaces,
    admin1: regionAdmin1,
  };
}

export async function loadRegionCatalog() {
  const catalog = await fetchJson(regionCatalogUrl());
  return (catalog?.regions || []).filter((region) => region?.pageId && region.ready);
}

export function findReadyRegionByPageId(catalog, pageId) {
  const id = String(pageId || "");
  if (!id) return null;
  return (catalog?.regions || []).find((region) => region.pageId === id && region.ready) || null;
}

export async function loadRegionScene(regionId) {
  const base = regionSceneRoot(regionId);
  const { fitted, vectors, manifest } = await loadHomepageMesh(base);
  return { base, fitted, vectors, manifest };
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

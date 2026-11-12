import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import {
  exaggerateHeights,
  fitMeshToSpan,
  hologramSnowMaterial,
} from "./geometry.js";

let loader;

function getLoader() {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/**
 * Load one clay resort terrain GLB and return a fitted THREE group.
 * Trails/lifts intentionally omitted in this sandbox (terrain is enough to prove the bowl).
 */
export async function loadClayTerrain(THREE, {
  assetBase = "/clay_scenes",
  resortId,
  heightExaggerate = 2.2,
  targetSpan = 100,
} = {}) {
  if (!resortId) throw new Error("resortId required");
  const base = new URL(`${assetBase.replace(/\/$/, "")}/${resortId}/`, location.origin);
  const manifest = await fetchJson(new URL("scene-manifest.json", base));
  const meshPath = manifest?.terrain?.mesh;
  if (!meshPath) throw new Error("manifest missing terrain.mesh");

  const gltf = await getLoader().loadAsync(new URL(meshPath, base).href);
  let mesh = null;
  gltf.scene.traverse((child) => {
    if (child.isMesh && !mesh) mesh = child;
  });
  if (!mesh) throw new Error("terrain mesh missing");

  exaggerateHeights(mesh, heightExaggerate);
  mesh.material = hologramSnowMaterial(THREE);
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  const { root } = fitMeshToSpan(THREE, mesh, targetSpan);
  root.userData.manifest = manifest;
  root.userData.resortId = resortId;
  return { root, manifest };
}

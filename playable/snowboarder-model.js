/** Riding-pose snowboarder. The group still leans and falls; this mesh replaces the skier body. */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SRC = new URL("./assets/models/snowboarder/snowboarder.glb?v=1", import.meta.url).href;
/** physics.js RIDE: the group origin sits this far above the DEM. */
const RIDE = 0.92;
/** Piste snow is draped 0.08 above the DEM. Board base is authored 0.018 above its origin. */
const SNOW = 0.12;
const BASE = 0.018;

let template = null;
let pending = null;

export function loadSnowboarder() {
  if (template) return Promise.resolve(template);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(SRC).then((gltf) => {
      template = gltf.scene;
      return template;
    });
  }
  return pending;
}

function tune(src) {
  const m = src.clone();
  m.metalness = 0;
  m.metalnessMap = null;
  m.roughness = 0.62;
  m.color.setRGB(3, 3, 3);
  return m;
}

/** Recolor only the blue jacket. Pants, board, and helmet stay. */
function dyeJacket(material, hex) {
  if (hex == null) return material;
  const color = new THREE.Color(hex);
  material.defines = { JACKET_ID: hex };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uJacket = { value: color };
    shader.fragmentShader = "uniform vec3 uJacket;\n" + shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
       {
         float jacket = smoothstep(0.05, 0.16, diffuseColor.b - diffuseColor.r);
         jacket *= smoothstep(0.02, 0.1, diffuseColor.b - diffuseColor.g);
         float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
         float srcL = max(dot(uJacket, vec3(0.2126, 0.7152, 0.0722)), 0.001);
         diffuseColor.rgb = mix(diffuseColor.rgb, uJacket * (luma / srcL), jacket);
       }`,
    );
  };
  material.customProgramCacheKey = () => "board-jacket-" + hex.toString(16);
  return material;
}

/** Hide the procedural skier and stand this mesh on the snow, nose toward +Z. */
export function mountSnowboarder(skier, jacket) {
  if (!template || !skier || skier.userData.heroMesh) return false;
  skier.traverse((o) => {
    if (o.isMesh) o.visible = false;
  });
  const root = template.clone(true);
  root.name = "snowboarder";
  root.position.y = -(RIDE - SNOW) - BASE;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry = o.geometry.clone();
    o.material = dyeJacket(tune(o.material), jacket);
    o.castShadow = true;
    o.receiveShadow = true;
    o.visible = true;
    o.renderOrder = 20;
  });
  skier.add(root);
  skier.userData.heroMesh = root;
  skier.userData.boarder = true;
  return true;
}

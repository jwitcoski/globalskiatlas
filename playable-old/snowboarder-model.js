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
  m.roughness = 0.86;
  m.roughnessMap = null;
  m.color.setRGB(1, 1, 1);
  m.envMap = null;
  m.envMapIntensity = 0;
  return m;
}

/** Recolor only the blue jacket. Pants, board, and helmet stay darker. */
function dyeJacket(material, hex) {
  const dyed = hex != null;
  const color = dyed ? new THREE.Color(hex) : new THREE.Color(0xffffff);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uJacket = { value: color };
    shader.uniforms.uDye = { value: dyed ? 1 : 0 };
    shader.fragmentShader = "uniform vec3 uJacket;\nuniform float uDye;\n" + shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float gJacket = smoothstep(0.017, 0.053, diffuseColor.b - diffuseColor.r);
        gJacket *= smoothstep(0.007, 0.033, diffuseColor.b - diffuseColor.g);
        {
          vec3 jacketColor = uDye > 0.5 ? uJacket : diffuseColor.rgb;
          float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float srcL = max(dot(jacketColor, vec3(0.2126, 0.7152, 0.0722)), 0.001);
          float held = clamp(max(luma, 0.58) / srcL, 0.0, 4.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, jacketColor * held, gJacket);
        }`,
      )
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
        {
          float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
          float rim = smoothstep(0.68, 0.1, facing);
          gl_FragColor.rgb += diffuseColor.rgb * gJacket * (0.07 + rim * 0.16);
        }`,
      );
  };
  material.customProgramCacheKey = () => (dyed ? "board-jacket-rim-" + hex.toString(16) : "board-jacket-rim-atlas");
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

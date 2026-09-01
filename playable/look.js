/** Overcast winter look. Exported terrain only. Original materials — not Slow Roads assets. */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { intentsFrom } from "./input.js?v=mob1";

const SUN_DIR = { x: 0.42, y: 0.88, z: 0.22 };
const FOG = 0xc5dff0;

function flakeTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const SPARKLE = 0.55;

/** Snow is a standard material plus a world-locked glitter grain that pops at grazing angles. */
export function snowTerrainMaterial(THREE) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfbfaf6,
    roughness: 0.87,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSparkle = { value: SPARKLE };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSnowW;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n\tvSnowW = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSnowW;
        uniform float uSparkle;
        float snowHash(vec2 p){
          vec3 q = fract(vec3(p.xyx) * 0.1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        /* Near-field only: a filled cell reads as a block, so light one point inside it. */
        float sparkFade = 1.0 - smoothstep(8.0, 34.0, length(vViewPosition));
        if (sparkFade > 0.002) {
          vec2 grid = vSnowW.xz * 6.0;
          vec2 cell = mod(floor(grid), 512.0);
          vec2 seed = fract(grid) - vec2(snowHash(cell + 7.3), snowHash(cell + 19.1));
          float grain = 1.0 - smoothstep(0.1, 0.3, length(seed));
          float fres = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          float sp = pow(snowHash(cell), 55.0) * grain * (0.4 + fres * 1.5) * sparkFade;
          gl_FragColor.rgb += vec3(0.85, 0.92, 1.0) * sp * uSparkle;
        }`,
      );
  };
  return mat;
}

export function addSkyAndLights(THREE, scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.userData.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch {
    scene.userData.envMap = null;
  }

  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.Fog(FOG, 220, 4200);
  scene.userData.skiFog = scene.fog;
  scene.userData.skiBg = FOG;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(8000, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x4ea6e0) },
        uHorizon: { value: new THREE.Color(0xd7ebf7) },
      },
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vDir;
        uniform vec3 uTop, uHorizon;
        void main(){
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(uHorizon, uTop, pow(h, 1.15)), 1.0);
        }`,
    }),
  );
  sky.name = "sky-dome";
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xf4f8fc, 0xf4f0e8, 1.38));
  const sun = new THREE.DirectionalLight(0xfff4dc, 1.78);
  sun.position.set(SUN_DIR.x * 900, SUN_DIR.y * 900, SUN_DIR.z * 900);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.5;
  const sc = sun.shadow.camera;
  sc.left = -SHADOW_SPAN;
  sc.right = SHADOW_SPAN;
  sc.top = SHADOW_SPAN;
  sc.bottom = -SHADOW_SPAN;
  sc.near = 1;
  sc.far = SHADOW_DIST * 2.2;
  sc.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xb9d4ea, 0.38);
  fill.position.set(-500, 180, 320);
  scene.add(fill);
  return { sky, sun };
}

const SHADOW_SPAN = 26;
const SHADOW_DIST = 90;

/**
 * One tight cascade parked on the player. The light direction never changes, so
 * only the shadow frustum moves — the mountain keeps the same key light.
 */
export function followSun(sun, pos) {
  if (!sun?.castShadow || !pos) return;
  sun.target.position.set(pos.x, pos.y - 1, pos.z);
  sun.target.updateMatrixWorld();
  sun.position.set(
    pos.x + SUN_DIR.x * SHADOW_DIST,
    pos.y + SUN_DIR.y * SHADOW_DIST,
    pos.z + SUN_DIR.z * SHADOW_DIST,
  );
  sun.updateMatrixWorld();
}

export function followSky(sky, camera) {
  if (sky && camera) sky.position.copy(camera.position);
}

const INSPECT_TOP = 0x2f90d6;
const INSPECT_HORIZON = 0xd2eafc;
const INSPECT_BG = 0x7eb8e4;
const SKI_TOP = 0x4ea6e0;
const SKI_HORIZON = 0xd7ebf7;

/** Lobby: light haze so distant ridges fade. Ski run keeps winter haze. */
export function setInspectAtmosphere(scene, look, inspect, span = 4000) {
  const sky = look?.sky;
  const u = sky?.material?.uniforms;
  const sun = look?.sun;
  if (inspect) {
    const fogFar = Math.max(4500, span * 2.2);
    const fogNear = Math.max(500, span * 0.32);
    if (!scene.userData.lobbyFog) {
      scene.userData.lobbyFog = new THREE.Fog(INSPECT_BG, fogNear, fogFar);
    } else {
      scene.userData.lobbyFog.near = fogNear;
      scene.userData.lobbyFog.far = fogFar;
    }
    scene.fog = scene.userData.lobbyFog;
    scene.background = new THREE.Color(INSPECT_BG);
    if (u?.uTop) u.uTop.value.setHex(INSPECT_TOP);
    if (u?.uHorizon) u.uHorizon.value.setHex(INSPECT_HORIZON);
    if (sun) sun.castShadow = false;
  } else {
    if (!scene.userData.skiFog) scene.userData.skiFog = new THREE.Fog(FOG, 220, 5600);
    scene.fog = scene.userData.skiFog;
    scene.fog.near = 220;
    scene.fog.far = 5600;
    scene.background = new THREE.Color(scene.userData.skiBg ?? FOG);
    if (u?.uTop) u.uTop.value.setHex(SKI_TOP);
    if (u?.uHorizon) u.uHorizon.value.setHex(SKI_HORIZON);
    if (sun) sun.castShadow = true;
  }
}

export function addFinish(THREE, scene, x, y, z) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18, 0.4, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0xd8c98a,
      roughness: 0.45,
      metalness: 0.15,
      envMap: scene.userData.envMap || null,
      envMapIntensity: 0.5,
      emissive: 0x3a3418,
      emissiveIntensity: 0.12,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.2;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 10, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8e8e6 }),
  );
  pole.position.set(16, 5, 0);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 2.2),
    new THREE.MeshLambertMaterial({
      color: 0xe6d48a,
      side: THREE.DoubleSide,
    }),
  );
  banner.position.set(16, 9.2, 0);
  g.add(ring, pole, banner);
  g.position.set(x, y, z);
  scene.add(g);
  return g;
}

function bannerTex(label) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#d8c45a";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#1a1c18";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function gateBanner(THREE, scene, label, width = 10) {
  const g = new THREE.Group();
  const poleG = new THREE.CylinderGeometry(0.12, 0.14, 8.5, 6);
  const poleM = new THREE.MeshLambertMaterial({ color: 0xe8e8e6 });
  const L = new THREE.Mesh(poleG, poleM);
  const R = new THREE.Mesh(poleG, poleM);
  L.position.set(-width * 0.5, 4.25, 0);
  R.position.set(width * 0.5, 4.25, 0);
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.4, 1.8),
    new THREE.MeshLambertMaterial({ map: bannerTex(label), side: THREE.FrontSide }),
  );
  cloth.position.set(0, 7.4, 0);
  cloth.rotation.y = Math.PI;
  g.add(L, R, cloth);
  scene.add(g);
  return g;
}

export function addStart(THREE, scene, x, y, z, yaw = 0) {
  const g = gateBanner(THREE, scene, "START", 11);
  g.position.set(x, y, z);
  /* Plane faces +Z; chase cam looks downhill (+tangent), so flip to face the camera. */
  g.rotation.y = yaw;
  return g;
}

export function addContactBlob(THREE, scene) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 16),
    new THREE.MeshBasicMaterial({
      color: 0x3a4248,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.renderOrder = 2;
  scene.add(disc);
  return disc;
}

export function makeSpray(THREE, scene) {
  const n = 150;
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: flakeTexture(THREE),
      color: 0xffffff,
      size: 0.62,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  pts.frustumCulled = false;
  scene.add(pts);
  return { pts, pos, n, t: 0 };
}

function skiTails(skier) {
  const out = [];
  for (const node of [skier.userData.skiL, skier.userData.skiR]) {
    if (!node) continue;
    const p = new THREE.Vector3(0, -0.02, -0.82);
    node.updateWorldMatrix(true, false);
    node.localToWorld(p);
    out.push(p);
  }
  return out;
}

/** Rooster tail off the ski tails: scales with how hard you are skidding and with powder. */
export function updateSpray(spray, skier, heading, speed, dt, keys, hf, opts = {}) {
  spray.t += dt;
  const pos = spray.pos;
  const n = spray.n;
  const intent = keys ? intentsFrom(keys) : {};
  const braking = !!intent.brake;
  const turning = !!intent.left || !!intent.right;
  const powder = !!opts.powder;
  const skid = Math.min(2.2, (opts.skid || 0) * 0.28);
  const tails = skiTails(skier);
  const origin = skier.position;
  const sx = Math.sin(heading);
  const sz = Math.cos(heading);
  const show = !opts.air && (speed > 3.5 || braking || turning);
  const boost = (braking ? 1.7 : 1) * (turning ? 1.4 : 1) * (powder ? 1.55 : 1) + skid;
  for (let i = 0; i < n; i++) {
    const k = (i / n + spray.t * (0.55 + boost * 0.2)) % 1;
    const tail = tails[i % 2] || origin;
    const back = k * (1.2 + boost);
    const up = k * (0.15 + boost * 0.4);
    const side = (i % 2 === 0 ? -1 : 1) * k * (0.22 + boost * 0.14);
    const i3 = i * 3;
    const x = tail.x - sx * back + sz * side;
    const z = tail.z - sz * back - sx * side;
    const y = hf ? hf.sample(x, z) + 0.04 + up : tail.y + up;
    pos[i3] = x;
    pos[i3 + 1] = y;
    pos[i3 + 2] = z;
  }
  const op = show ? Math.min(0.8, ((speed - 2) / 30) * boost + (braking ? 0.22 : 0)) : 0;
  spray.pts.material.opacity = op;
  spray.pts.geometry.attributes.position.needsUpdate = true;
}

const FLAKE_SPAN = 48;
const FLAKE_H = 28;

export function makeFallingSnow(THREE, scene) {
  const n = matchMedia("(pointer: coarse)").matches ? 90 : 280;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * FLAKE_SPAN;
    pos[i * 3 + 1] = Math.random() * FLAKE_H;
    pos[i * 3 + 2] = (Math.random() - 0.5) * FLAKE_SPAN;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: flakeTexture(THREE),
      color: 0xffffff,
      size: 0.32,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      sizeAttenuation: true,
      fog: true,
    }),
  );
  pts.frustumCulled = false;
  pts.renderOrder = 8;
  pts.visible = false;
  scene.add(pts);
  return { pts, pos, n };
}

export function updateFallingSnow(snow, camera, dt) {
  if (!snow?.pts.visible) return;
  const pos = snow.pos;
  const n = snow.n;
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  const half = FLAKE_SPAN * 0.5;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    pos[i3 + 1] -= (1.6 + (i % 5) * 0.35) * dt;
    pos[i3] += 0.35 * dt;
    if (pos[i3 + 1] < cy - 4) pos[i3 + 1] += FLAKE_H;
    if (pos[i3] > cx + half) pos[i3] -= FLAKE_SPAN;
    if (pos[i3] < cx - half) pos[i3] += FLAKE_SPAN;
    if (pos[i3 + 2] > cz + half) pos[i3 + 2] -= FLAKE_SPAN;
    if (pos[i3 + 2] < cz - half) pos[i3 + 2] += FLAKE_SPAN;
  }
  snow.pts.geometry.attributes.position.needsUpdate = true;
}

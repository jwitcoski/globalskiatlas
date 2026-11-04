/** One snowman. The chase still moves this group; the mesh is yeti.glb. */

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const BASE_SPEED = 19;
const MAX_SPEED = 26;
const CATCH = 3.4;
const SRC = new URL("./assets/models/yeti/yeti.glb?v=3", import.meta.url).href;

function stopClip(yeti) {
  if (yeti && yeti.userData.mixer) yeti.userData.mixer.setTime(0);
}

export function makeYeti(THREE, scene) {
  const g = new THREE.Group();
  g.name = "yeti";
  g.visible = false;
  g.userData.t = 0;
  scene.add(g);
  new GLTFLoader().load(SRC, (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        m.metalness = 0;
        m.roughness = 0.92;
        if (m.color) m.color.setRGB(1, 1, 1);
      }
    });
    g.add(model);
    const clip = (gltf.animations || []).find((a) => a.name === "YetiRun") || (gltf.animations || [])[0];
    if (clip) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      g.userData.mixer = mixer;
    } else {
      const arms = [];
      model.traverse((o) => {
        if (o.name === "UpperArm_L" || o.name === "UpperArm_R") arms.push(o);
      });
      g.userData.arms = arms;
    }
  }, undefined, (err) => console.warn("yeti model", err));
  return g;
}

export function resetYeti(yeti, run) {
  if (run) {
    run.yetiOut = false;
    run.yetiWanted = false;
    run.yetiChase = false;
    run.yetiArmed = false;
    run.yetiWait = 0;
  }
  if (yeti) {
    yeti.visible = false;
    yeti.userData.t = 0;
    stopClip(yeti);
  }
}

export function parkYetiAtStart(yeti, run, spawn, hf) {
  if (!yeti || !run || !spawn || !hf) return;
  run.yetiOut = false;
  run.yetiWanted = false;
  run.yetiChase = false;
  run.yetiArmed = true;
  run.yetiWait = 0;
  const x = spawn.x;
  const z = spawn.z;
  yeti.position.set(x, hf.sample(x, z) + 0.06, z);
  yeti.visible = false;
  yeti.userData.t = 0;
  stopClip(yeti);
}

export function startYetiChase(yeti, run) {
  if (!yeti || !run || run.yetiChase) return;
  run.yetiWanted = false;
  run.yetiChase = true;
  run.yetiOut = true;
  yeti.visible = true;
}

export function tickYeti(yeti, run, skier, hf, dt) {
  if (!yeti || !run || !run.yetiArmed) return run;
  if (run.phase !== "running" && run.phase !== "ready") return run;
  if (!run.yetiChase) {
    if (run.yetiWanted) startYetiChase(yeti, run);
    else return run;
  }
  yeti.userData.t = (yeti.userData.t || 0) + dt;
  const dx = skier.position.x - yeti.position.x;
  const dz = skier.position.z - yeti.position.z;
  const dist = Math.hypot(dx, dz) || 1e-6;
  if (dist < CATCH) {
    run.phase = "dnf";
    run.dnfReason = "yeti";
    return run;
  }
  const spd = Math.min(MAX_SPEED, BASE_SPEED + (run.yetiBoost || 0));
  const step = spd * dt;
  yeti.position.x += (dx / dist) * step;
  yeti.position.z += (dz / dist) * step;
  yeti.position.y = hf.sample(yeti.position.x, yeti.position.z) + 0.06;
  yeti.rotation.y = Math.atan2(dx, dz);
  if (yeti.userData.mixer) {
    yeti.userData.mixer.update(dt);
  } else {
    const swing = Math.sin(yeti.userData.t * 10) * 0.35;
    const arms = yeti.userData.arms || [];
    if (arms[0]) arms[0].rotation.x = swing;
    if (arms[1]) arms[1].rotation.x = -swing;
  }
  return run;
}

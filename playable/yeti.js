/** SkiFree-style yeti. Procedural stand-in — not a copyrighted sprite. */

const BASE_SPEED = 19;
const MAX_SPEED = 26;
const CATCH = 3.4;

export function makeYeti(THREE, scene) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.92, metalness: 0 });
  const tuft = new THREE.MeshStandardMaterial({ color: 0xe4e8ec, roughness: 0.95, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.55 });
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), fur);
  hips.position.y = 1.15;
  hips.scale.set(1.15, 0.85, 0.95);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 1.15, 4, 10), fur);
  body.position.y = 2.05;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.72, 8, 6), tuft);
  belly.position.set(0, 1.7, 0.35);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 12, 10), fur);
  head.position.y = 3.15;
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), fur);
  const earR = earL.clone();
  earL.position.set(-0.42, 3.55, 0.05);
  earR.position.set(0.42, 3.55, 0.05);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.18), dark);
  face.position.set(0, 3.08, 0.52);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.12), fur);
  brow.position.set(0, 3.28, 0.5);
  const armG = new THREE.CapsuleGeometry(0.28, 1.45, 3, 8);
  const armL = new THREE.Mesh(armG, fur);
  const armR = new THREE.Mesh(armG, fur);
  armL.position.set(-1.15, 2.15, 0.12);
  armR.position.set(1.15, 2.15, 0.12);
  armL.rotation.z = 0.42;
  armR.rotation.z = -0.42;
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tuft);
  const handR = handL.clone();
  handL.position.set(-1.55, 1.25, 0.2);
  handR.position.set(1.55, 1.25, 0.2);
  const thighG = new THREE.CapsuleGeometry(0.32, 0.7, 3, 8);
  const thighL = new THREE.Mesh(thighG, fur);
  const thighR = new THREE.Mesh(thighG, fur);
  thighL.position.set(-0.38, 0.55, 0.05);
  thighR.position.set(0.38, 0.55, 0.05);
  const footG = new THREE.SphereGeometry(0.32, 8, 6);
  const footL = new THREE.Mesh(footG, tuft);
  const footR = footL.clone();
  footL.position.set(-0.4, 0.18, 0.18);
  footR.position.set(0.4, 0.18, 0.18);
  footL.scale.set(1.1, 0.55, 1.4);
  footR.scale.set(1.1, 0.55, 1.4);
  g.add(hips, body, belly, head, earL, earR, face, brow, armL, armR, handL, handR, thighL, thighR, footL, footR);
  g.userData.arms = [armL, armR];
  g.visible = false;
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  scene.add(g);
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
  const swing = Math.sin(yeti.userData.t * 10) * 0.35;
  const arms = yeti.userData.arms || [];
  if (arms[0]) arms[0].rotation.x = swing;
  if (arms[1]) arms[1].rotation.x = -swing;
  return run;
}

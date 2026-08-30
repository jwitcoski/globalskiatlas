/** Other skiers on and across the chevron ribbon. Hit like trees. */

import { makeSkier, orientSkier } from "./physics.js?v=feel11";
import { alongPolyline, polylineLen, alongTrack } from "./gates.js?v=vis18";
import { tickFallPose } from "./physics.js?v=feel13";

const SUITS = [0x2a6fdb, 0x1f8a4c, 0x7b3fa0, 0xe07a14, 0xc45a18, 0xd8342e, 0xf2c02e];
const SKIS = [0xf2c02e, 0x3a8fd4, 0xd8342e, 0x1f8a4c];
const NPC_R = 0.55;
const SEE = 280;

/** Lateral offset (m) = bias + amp * sin(along / wave + phase). |amp| > |bias| so they cut the >>>> line. */
const KINDS = [
  { speed: 1.6, amp: 8.4, bias: 0.4, wave: 22, phase: 0.2 },
  { speed: 2.4, amp: 9.2, bias: -0.6, wave: 18, phase: 1.4 },
  { speed: 5.5, amp: 7.1, bias: 0.2, wave: 36, phase: 2.1 },
  { speed: 8.2, amp: 6.6, bias: -0.3, wave: 44, phase: 0.7 },
  { speed: 12, amp: 5.8, bias: 0, wave: 52, phase: 3.0 },
  { speed: 16, amp: 4.8, bias: 0.8, wave: 70, phase: 1.1 },
  { speed: 22, amp: 3.6, bias: -0.4, wave: 88, phase: 2.6 },
  { speed: 26, amp: 2.8, bias: 0.2, wave: 110, phase: 0.4 },
  { speed: 3.1, amp: 10.2, bias: 0, wave: 16, phase: 4.0 },
  { speed: 19, amp: 6.4, bias: -0.5, wave: 40, phase: 5.2 },
];

function sideAt(kind, along) {
  return kind.bias + kind.amp * Math.sin(along / kind.wave + kind.phase);
}

function sideSlope(kind, along) {
  return (kind.amp / kind.wave) * Math.cos(along / kind.wave + kind.phase);
}

export function createNpcSkiers(THREE, scene, lines, elevFn, _spawn, activePts) {
  const root = new THREE.Group();
  root.name = "npc-skiers";
  scene.add(root);
  const pack = { root, list: [], elevFn };
  const routes = (lines || []).filter((p) => p.pts?.length >= 2);
  const course = activePts?.length >= 2 ? activePts : routes[0]?.pts;
  if (!course) return pack;
  const courseLen = polylineLen(course);
  let slot = 0;

  function add(pts, along, kind, home) {
    const len = polylineLen(pts);
    if (len < 40) return;
    const mesh = makeSkier(THREE, scene, {
      add: false,
      name: "npc",
      suit: SUITS[slot % SUITS.length],
      ski: SKIS[slot % SKIS.length],
    });
    slot += 1;
    mesh.scale.setScalar(1.04);
    root.add(mesh);
    pack.list.push({
      mesh,
      pts,
      along: Math.max(14, Math.min(len - 18, along)),
      speed: kind.speed,
      kind,
      len,
      home: !!home,
    });
  }

  const gaps = [18, 32, 46, 62, 80, 102, 28, 70, 54, 90];
  for (let i = 0; i < KINDS.length; i++) {
    add(course, gaps[i] % Math.max(30, courseLen - 22), KINDS[i], true);
  }

  return pack;
}

export function clearNpcSkiers(pack) {
  if (!pack?.root) return;
  pack.root.removeFromParent();
  pack.list = [];
}

export function tickNpcSkiers(THREE, pack, dt, player, hf, playerAlong = 0) {
  if (!pack?.list?.length || !hf) return [];
  const elev = pack.elevFn || ((x, z) => hf.sample(x, z));
  const extras = [];
  const px = player?.x ?? 0;
  const pz = player?.z ?? 0;
  const dummyVel = { length: () => 10 };
  for (const npc of pack.list) {
    if (npc.mesh.userData.fall) {
      tickFallPose(THREE, npc.mesh, hf, dt);
      npc.mesh.visible = true;
      continue;
    }
    npc.along += npc.speed * dt;
    if (npc.home && playerAlong > 4) {
      if (npc.along < playerAlong - 22) npc.along = playerAlong + 28 + (npc.speed % 11);
      if (npc.along > playerAlong + 160) npc.along = playerAlong + 22 + (npc.along % 13);
    }
    if (npc.along > npc.len - 8) npc.along = 16 + (npc.along % 19);
    const p = alongPolyline(npc.pts, npc.along);
    const nx = -p.tz;
    const nz = p.tx;
    const side = sideAt(npc.kind, npc.along);
    const x = p.x + nx * side;
    const z = p.z + nz * side;
    const dx = x - px;
    const dz = z - pz;
    const far = dx * dx + dz * dz > SEE * SEE;
    npc.mesh.visible = !far;
    if (far) continue;
    npc.mesh.position.set(x, elev(x, z) + 0.92, z);
    dummyVel.length = () => npc.speed;
    const cut = Math.atan2(sideSlope(npc.kind, npc.along), 1);
    const heading = Math.atan2(p.tx, p.tz) + cut;
    orientSkier(THREE, npc.mesh, npc.mesh.position, heading, dummyVel, hf, cut, {
      speed: npc.speed,
      dt,
      brake: npc.speed < 4,
    });
    extras.push({ x, z, r: NPC_R, mesh: npc.mesh });
  }
  return extras;
}

export function npcAlongHint(pack, player) {
  if (!pack?.list?.length || !player) return 0;
  return alongTrack(pack.list[0].pts, player.x, player.z).along;
}

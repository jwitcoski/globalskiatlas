/** Other skiers beside the chevron ribbon. Hit like trees. */

import { makeSkier, orientSkier } from "./physics.js?v=feel11";
import { alongPolyline, polylineLen, alongTrack } from "./gates.js?v=vis18";

const SUITS = [0x2a6fdb, 0x1f8a4c, 0x7b3fa0, 0xe07a14, 0xc45a18, 0xd8342e, 0xf2c02e];
const SKIS = [0xf2c02e, 0x3a8fd4, 0xd8342e, 0x1f8a4c];
const NPC_R = 0.55;
const SEE = 280;
/** Chevron stamps are ~7 m wide; stay outside that corridor. */
const RIBBON = 5.6;

const KINDS = [
  { speed: 1.6, yaw: 1.15, side: 7.4 },
  { speed: 2.4, yaw: -1.05, side: 8.2 },
  { speed: 5.5, yaw: 0.72, side: 6.6 },
  { speed: 8.2, yaw: -0.55, side: 7.8 },
  { speed: 12, yaw: 0.18, side: 6.4 },
  { speed: 16, yaw: -0.12, side: 7.1 },
  { speed: 22, yaw: 0.08, side: 6.2 },
  { speed: 26, yaw: -0.06, side: 8.0 },
  { speed: 3.1, yaw: 0.95, side: -7.6 },
  { speed: 19, yaw: 0.1, side: -6.5 },
];

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
    const side = kind.side >= 0 ? Math.max(RIBBON, kind.side) : Math.min(-RIBBON, kind.side);
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
      yaw: kind.yaw,
      side,
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
    npc.along += npc.speed * dt;
    if (npc.home && playerAlong > 4) {
      if (npc.along < playerAlong - 22) npc.along = playerAlong + 28 + (npc.speed % 11);
      if (npc.along > playerAlong + 160) npc.along = playerAlong + 22 + (npc.along % 13);
    }
    if (npc.along > npc.len - 8) npc.along = 16 + (npc.along % 19);
    const p = alongPolyline(npc.pts, npc.along);
    const nx = -p.tz;
    const nz = p.tx;
    const x = p.x + nx * npc.side;
    const z = p.z + nz * npc.side;
    const dx = x - px;
    const dz = z - pz;
    const far = dx * dx + dz * dz > SEE * SEE;
    npc.mesh.visible = !far;
    if (far) continue;
    npc.mesh.position.set(x, elev(x, z) + 0.92, z);
    dummyVel.length = () => npc.speed;
    const heading = Math.atan2(p.tx, p.tz) + npc.yaw;
    orientSkier(THREE, npc.mesh, npc.mesh.position, heading, dummyVel, hf, npc.yaw, {
      speed: npc.speed,
      dt,
      brake: npc.speed < 4,
    });
    extras.push({ x, z, r: NPC_R });
  }
  return extras;
}

export function npcAlongHint(pack, player) {
  if (!pack?.list?.length || !player) return 0;
  return alongTrack(pack.list[0].pts, player.x, player.z).along;
}

/**
 * Clay skiers and snowboarders: low-poly models, trail path traversal, and carving animations.
 */

import * as THREE from "three";
import { MAX_RIDERS } from "./config.js";
import { rng, polylineLen, alongPolyline } from "./math-utils.js";

export const RIDER_SUITS = [0xe11d48, 0x2563eb, 0x16a34a, 0x7c3aed, 0xea580c, 0x0f766e, 0xf59e0b];
export const RIDER_SKIS = [0xfbbf24, 0x38bdf8, 0xf43f5e, 0xa3e635];

export function makeClayRider(unitScale, board, suit, ski) {
  /* Keep riders readable on the hero island (mesh meters → ~tree-trunk scale). */
  const s = Math.min(11, Math.max(1.35, 0.4 * unitScale));
  const g = new THREE.Group();
  g.name = board ? "montage-boarder" : "montage-skier";

  const suitMat = new THREE.MeshLambertMaterial({
    color: suit,
    emissive: suit,
    emissiveIntensity: 0.22,
    flatShading: true,
  });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b892, flatShading: true });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2937, flatShading: true });
  const skiMat = new THREE.MeshLambertMaterial({
    color: ski,
    emissive: ski,
    emissiveIntensity: 0.18,
    flatShading: true,
  });
  const helmMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.18 * s, 0.55 * s, 6), suitMat);
  body.position.y = 0.52 * s;
  body.frustumCulled = false;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 7, 6), helmMat);
  head.position.y = 0.9 * s;
  head.frustumCulled = false;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 6, 5), skinMat);
  face.position.set(0, 0.88 * s, 0.07 * s);
  face.frustumCulled = false;
  g.add(body, head, face);

  if (board) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.06 * s, 1.05 * s), skiMat);
    deck.position.y = 0.05 * s;
    deck.frustumCulled = false;
    g.add(deck);
  } else {
    const skiGeo = new THREE.BoxGeometry(0.1 * s, 0.05 * s, 1.05 * s);
    const left = new THREE.Mesh(skiGeo, skiMat);
    const right = new THREE.Mesh(skiGeo, skiMat);
    left.position.set(-0.13 * s, 0.05 * s, 0);
    right.position.set(0.13 * s, 0.05 * s, 0);
    left.frustumCulled = false;
    right.frustumCulled = false;
    g.add(left, right);
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.014 * s, 0.75 * s, 4), darkMat);
    const poleR = poleL.clone();
    poleL.position.set(-0.3 * s, 0.48 * s, 0.06 * s);
    poleR.position.set(0.3 * s, 0.48 * s, 0.06 * s);
    poleL.rotation.x = 0.55;
    poleR.rotation.x = 0.55;
    poleL.frustumCulled = false;
    poleR.frustumCulled = false;
    g.add(poleL, poleR);
  }

  g.userData.ride = 0.16 * s;
  g.renderOrder = 4;
  g.frustumCulled = false;
  return g;
}

export function addTrailRiders(parent, paths, sample, unitScale = 1) {
  const minLen = Math.max(14, unitScale * 0.9);
  const usable = (paths || [])
    .map((p) => ({ pts: p, len: polylineLen(p) }))
    .filter((p) => p.pts && p.len > minLen)
    .sort((a, b) => b.len - a.len);
  if (!usable.length) return null;

  const group = new THREE.Group();
  group.name = "montage-riders";
  group.frustumCulled = false;
  const list = [];
  const speedScale = Math.max(1, Math.sqrt(Math.max(1, unitScale)) * 0.75);
  const maxPerTrail = 3;
  /* Spread the budget across every trail first — don't fill trail 0 then starve the rest. */
  const budget = Math.min(MAX_RIDERS, Math.max(usable.length, Math.round(usable.length * 1.85)));
  const counts = new Array(usable.length).fill(0);
  let placed = 0;
  for (let pass = 0; pass < maxPerTrail && placed < budget; pass++) {
    for (let t = 0; t < usable.length && placed < budget; t++) {
      const route = usable[t];
      /* Longer trails earn pass 2/3; short ones stay at 1. */
      const earn =
        pass === 0 ||
        (pass === 1 && route.len > Math.max(80, unitScale * 4)) ||
        (pass === 2 && route.len > Math.max(160, unitScale * 9));
      if (!earn) continue;
      if (counts[t] >= maxPerTrail) continue;
      counts[t] += 1;
      placed += 1;
    }
  }

  let slot = 0;
  for (let t = 0; t < usable.length; t++) {
    const n = counts[t];
    if (!n) continue;
    const route = usable[t];
    const pts = route.pts;
    const len = route.len;
    const pad = Math.min(len * 0.08, Math.max(len * 0.04, 6));
    for (let k = 0; k < n; k++) {
      const board = slot % 5 === 0 || slot % 5 === 3;
      const mesh = makeClayRider(
        unitScale,
        board,
        RIDER_SUITS[slot % RIDER_SUITS.length],
        RIDER_SKIS[slot % RIDER_SKIS.length],
      );
      group.add(mesh);
      const lane = n <= 1 ? 0 : k / (n - 1) - 0.5;
      list.push({
        mesh,
        pts,
        len,
        pad,
        along: pad + Math.max(1, len - pad * 2) * ((k + 0.2) / (n + 0.2)),
        speed: (2.8 + rng(slot * 2.1 + t) * 4.6) * speedScale,
        phase: rng(slot * 7.3) * Math.PI * 2,
        bias: lane * Math.min(5.5, Math.max(2.0, unitScale * 0.18)),
        amp: 1.2 + rng(slot * 4.4) * 2.0,
        wave: 16 + rng(slot * 5.2) * 30,
        board,
      });
      slot += 1;
    }
  }

  parent.add(group);
  const pack = { group, list, sample };
  updateTrailRiders(pack, 0);
  return pack;
}

export function updateTrailRiders(pack, dt) {
  if (!pack?.list?.length) return;
  for (const rider of pack.list) {
    const pad = Math.min(rider.pad || 6, rider.len * 0.15);
    if (dt > 0) {
      rider.along += rider.speed * dt;
      /* Hit the bottom → teleport back to the top. */
      if (rider.along >= rider.len - pad) rider.along = pad;
    }
    const p = alongPolyline(rider.pts, rider.along);
    if (!p) continue;
    const nx = -p.tz;
    const nz = p.tx;
    const nLen = Math.hypot(nx, nz) || 1;
    const side =
      (rider.bias || 0) + (rider.amp || 2) * Math.sin(rider.along / Math.max(8, rider.wave || 24) + rider.phase);
    const x = p.x + (nx / nLen) * side;
    const z = p.z + (nz / nLen) * side;
    /* Stay on the elevated ride path (above trail ribbons), not bare snow. */
    const y = p.y;
    const cut = Math.atan2(
      ((rider.amp || 2) / Math.max(8, rider.wave || 24)) * Math.cos(rider.along / Math.max(8, rider.wave || 24) + rider.phase),
      1,
    );
    rider.mesh.position.set(x, y + (rider.mesh.userData.ride || 0.5), z);
    rider.mesh.rotation.order = "YXZ";
    rider.mesh.rotation.y = Math.atan2(p.tx, p.tz) + cut * 0.65;
    rider.mesh.rotation.x = 0.12 + Math.sin(rider.along * 0.05 + rider.phase) * 0.04;
    rider.mesh.rotation.z = Math.sin(rider.along * 0.09 + rider.phase) * (rider.board ? 0.22 : 0.14);
    rider.mesh.visible = Number.isFinite(rider.mesh.position.y);
  }
}

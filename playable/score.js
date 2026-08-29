/** Arcade piste score: stay near the green OSM centerline. */

function scoreStore(run) {
  return `montage_best_score:${run.finish?.name || "course"}`;
}

export const PISTE_HALF_M = 22;
export const DNF_OFF_S = 7;

export function coordsToXz(coords) {
  return (coords || []).map((c) => ({ x: c[0], z: -c[1] }));
}

export function distToPolyline(x, z, pts) {
  if (!pts || pts.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const az = pts[i].z;
    const bx = pts[i + 1].x;
    const bz = pts[i + 1].z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

export function attachPiste(run, pts) {
  run.pistePts = pts;
  run.pisteWidth = PISTE_HALF_M;
  run.score = 0;
  run.onPiste = true;
  run.offTimer = 0;
  run.pisteDist = 0;
  run.bestScore = Number(localStorage.getItem(scoreStore(run)) || "") || null;
}

/** Grazing a trunk this close without touching it pays out. */
export const NEAR_MISS_M = 2;
const NEAR_MISS_BONUS = 160;
const NEAR_MISS_COOL = 0.55;
const NEAR_MISS_SPD = 9;
const CARVE_SKID_M = 2.6;
const FLASH_S = 1.1;

export function resetScore(run) {
  run.score = 0;
  run.onPiste = true;
  run.offTimer = 0;
  run.pisteDist = 0;
  run.styleMult = 1;
  run.nearMiss = 0;
  run.nearCool = 0;
  run.flashT = 0;
  run.gateFlash = "";
  run.lastFlash = "";
  run.yetiWanted = false;
  run.yetiOut = false;
  run.yetiBoost = 0;
  run.yetiChase = false;
  run.yetiArmed = false;
  run.yetiWait = 0;
}

/** Gates and near-misses both write gateFlash; expire it so the HUD stays live. */
function tickFlash(run, dt) {
  if (run.gateFlash !== run.lastFlash) {
    run.lastFlash = run.gateFlash;
    run.flashT = run.gateFlash ? FLASH_S : 0;
    return;
  }
  if (run.flashT > 0) {
    run.flashT -= dt;
    if (run.flashT <= 0) {
      run.gateFlash = "";
      run.lastFlash = "";
    }
  }
}

function tickNearMiss(run, gap, grazed, speed, dt) {
  run.nearCool = Math.max(0, (run.nearCool || 0) - dt);
  if (grazed || speed < NEAR_MISS_SPD) return;
  if (!(gap >= 0) || gap > NEAR_MISS_M) return;
  if (run.nearCool > 0) return;
  run.nearMiss = (run.nearMiss || 0) + 1;
  run.score += NEAR_MISS_BONUS;
  run.gateFlash = "CLOSE";
  run.nearCool = NEAR_MISS_COOL;
}

export function tickScore(run, pos, speed, turning, dt, extra = {}) {
  if (run.phase !== "running") return run;
  tickFlash(run, dt);
  const d = distToPolyline(pos.x, pos.z, run.pistePts);
  run.pisteDist = d;
  run.onPiste = d <= run.pisteWidth;
  if (run.onPiste) {
    run.offTimer = 0;
    const carving = turning && (extra.skid || 0) < CARVE_SKID_M;
    const speedBonus = Math.min(speed / 36, 0.55);
    run.styleMult = 1 + (carving ? 0.4 : 0) + speedBonus;
    run.score += speed * dt * 14 * run.styleMult;
  } else {
    run.styleMult = 1;
    run.offTimer += dt;
    run.yetiBoost = Math.min(10, (run.yetiBoost || 0) + dt * 0.7);
  }
  tickNearMiss(run, extra.gap, extra.grazed, speed, dt);
  return run;
}

export function commitBestScore(run) {
  const n = Math.round(run.score);
  if (run.bestScore == null || n > run.bestScore) {
    run.bestScore = n;
    localStorage.setItem(scoreStore(run), String(n));
  }
  return n;
}

export function formatScore(n) {
  return Math.round(n).toLocaleString("en-US");
}

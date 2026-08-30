/** Arcade piste score: stay on the centerline, carve, catch air. */

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

export const NEAR_MISS_M = 2;
const NEAR_MISS_BONUS = 160;
const NEAR_MISS_COOL = 0.55;
const NEAR_MISS_SPD = 9;
const CARVE_SKID_M = 2.6;
const FLASH_S = 1.1;
const SHOUT_S = 2.15;

export function resetScore(run) {
  run.score = 0;
  run.onPiste = true;
  run.offTimer = 0;
  run.pisteDist = 0;
  run.styleMult = 1;
  run.combo = 1;
  run.nearMiss = 0;
  run.nearCool = 0;
  run.flashT = 0;
  run.gateFlash = "";
  run.styleFlash = "";
  run.lastFlash = "";
  run.yetiWanted = false;
  run.yetiOut = false;
  run.yetiBoost = 0;
  run.yetiChase = false;
  run.yetiArmed = false;
  run.yetiWait = 0;
  run.airScoreT = 0;
  run.shoutLine = "";
  run.shoutPts = 0;
}

function tickFlash(run, dt) {
  const cur = run.styleFlash || run.gateFlash || "";
  if (cur !== run.lastFlash) {
    run.lastFlash = cur;
    run.flashT = cur ? FLASH_S : 0;
    return;
  }
  if (run.flashT > 0) {
    run.flashT -= dt;
    if (run.flashT <= 0) {
      run.gateFlash = "";
      run.styleFlash = "";
      run.lastFlash = "";
      run.shoutLine = "";
      run.shoutPts = 0;
    }
  }
}

function flash(run, text, hold = FLASH_S) {
  run.styleFlash = text;
  run.gateFlash = text;
  run.lastFlash = text;
  run.flashT = hold;
}

function tickNearMiss(run, gap, grazed, speed, dt) {
  run.nearCool = Math.max(0, (run.nearCool || 0) - dt);
  if (grazed || speed < NEAR_MISS_SPD) return;
  if (!(gap >= 0) || gap > NEAR_MISS_M) return;
  if (run.nearCool > 0) return;
  run.nearMiss = (run.nearMiss || 0) + 1;
  run.score += NEAR_MISS_BONUS * (run.combo || 1);
  flash(run, "CLOSE");
  run.combo = Math.min(4, (run.combo || 1) + 0.25);
  run.nearCool = NEAR_MISS_COOL;
}

export function tickScore(run, pos, speed, turning, dt, extra = {}) {
  if (run.phase !== "running") return run;
  tickFlash(run, dt);
  const d = distToPolyline(pos.x, pos.z, run.pistePts);
  run.pisteDist = d;
  run.onPiste = d <= run.pisteWidth;
  if (!run.clocked) {
    run.styleMult = 1;
    return run;
  }
  if (run.onPiste) {
    run.offTimer = 0;
    const carving = turning && (extra.skid || 0) < CARVE_SKID_M;
    const speedBonus = Math.min(speed / 36, 0.55);
    run.styleMult = 1 + (carving ? 0.4 : 0) + speedBonus;
    if (carving && speed > 8) {
      run.combo = Math.min(4, (run.combo || 1) + dt * 0.15);
      if ((run.flashT || 0) <= 0) flash(run, "CARVE");
    } else {
      run.combo = Math.max(1, (run.combo || 1) - dt * 0.12);
    }
    run.score += speed * dt * 14 * run.styleMult * (run.combo || 1);
  } else {
    run.styleMult = 1;
    run.combo = Math.max(1, (run.combo || 1) - dt * 0.4);
    run.offTimer += dt;
    run.yetiBoost = Math.min(10, (run.yetiBoost || 0) + dt * 0.7);
  }
  if (extra.air) {
    run.airScoreT = extra.airTime || (run.airScoreT || 0) + dt;
    run.styleFlash = `AIR ${run.airScoreT.toFixed(2)}s`;
    run.gateFlash = run.styleFlash;
    run.lastFlash = run.styleFlash;
    run.flashT = 0.3;
  } else if ((extra.airTime || 0) >= 0.22 && (extra.airDist || 0) >= 2.2) {
    const t = extra.airTime;
    const dist = extra.airDist;
    const pts = Math.round((t * 680 + dist * 48) * (run.combo || 1));
    run.score += pts;
    run.shoutLine = `${t.toFixed(2)}s   ${Math.round(dist)} m`;
    run.shoutPts = pts;
    flash(run, `${t.toFixed(2)}s · ${Math.round(dist)}m  +${pts.toLocaleString("en-US")}`, SHOUT_S);
    run.combo = Math.min(4, (run.combo || 1) + 0.4);
    run.airScoreT = 0;
  } else if ((extra.landed || 0) > 2) {
    run.airScoreT = 0;
  }
  if (!run.shoutLine) tickNearMiss(run, extra.gap, extra.grazed, speed, dt);
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

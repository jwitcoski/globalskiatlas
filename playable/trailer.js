/** Cinematic auto-run + canvas capture. Armed with ?trailer=1 */

import { alongTrack } from "./gates.js?v=vis16";

export const TRAILER = new URLSearchParams(location.search).has("trailer");

const DEFAULT_RESORT = "hakuba_47_japan";
const DEFAULT_VER = "v0-190c3318afb3";
const AERIAL_S = 4.2;
const SKI_S = 18;
const STING_S = 2.8;
const ISO_AT = 8;
const CHASE_AT = 13;

let card = "none";
let kicker = "Global Ski Atlas";
let title = "Ski any mountain";
let sub = "";
let rec = null;
let chunks = [];
let film = null;
let filmCtx = null;
let started = false;

export function trailerDefaultPath() {
  const q = new URLSearchParams(location.search);
  if (q.get("resort") && q.get("ver")) return `${q.get("resort")}/${q.get("ver")}`;
  if (q.get("scene")) return q.get("scene").replace(/^\/+|\/+$/g, "");
  return `${DEFAULT_RESORT}/${DEFAULT_VER}`;
}

function setTrailerStatus(extra) {
  window.__trailer = { ...(window.__trailer || {}), ...extra, t: Date.now() };
  try {
    fetch("/__trailer_status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(window.__trailer),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function lookAhead(pts, x, z, dist) {
  if (!pts || pts.length < 2) return null;
  const { along } = alongTrack(pts, x, z);
  let left = along + dist;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const az = pts[i - 1].z;
    const bx = pts[i].x;
    const bz = pts[i].z;
    const seg = Math.hypot(bx - ax, bz - az) || 1e-6;
    if (left <= seg) {
      const t = left / seg;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t };
    }
    left -= seg;
  }
  return pts[pts.length - 1];
}

export function steerTrailer(keys, run, skier, heading, live) {
  for (const c of ["KeyA", "KeyD", "KeyW", "KeyS", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    keys.delete(c);
  }
  if (!live || !run || !skier) return;
  if (run.phase !== "running" && run.phase !== "ready") return;
  const pts = run.pistePts;
  const aim = lookAhead(pts, skier.position.x, skier.position.z, 32);
  const tx = aim?.x ?? run.finish?.x;
  const tz = aim?.z ?? run.finish?.z;
  if (tx == null || tz == null) {
    keys.add("KeyW");
    return;
  }
  const bearing = Math.atan2(tx - skier.position.x, tz - skier.position.z);
  let a = bearing - heading;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  const deg = (a * 180) / Math.PI;
  if (deg > 7) keys.add("KeyA");
  else if (deg < -7) keys.add("KeyD");
  if (Math.abs(deg) < 28) keys.add("KeyW");
  else if (Math.abs(deg) > 55) keys.add("KeyS");
}

function mime() {
  const opts = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const t of opts) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

function ensureFilm(src) {
  const w = src.width || 1280;
  const h = src.height || 720;
  if (!film) {
    film = document.createElement("canvas");
    filmCtx = film.getContext("2d", { alpha: false });
  }
  if (film.width !== w || film.height !== h) {
    film.width = w;
    film.height = h;
  }
  return film;
}

export function trailerNeedsPaint() {
  return !!(TRAILER && rec && rec.state === "recording");
}

export function paintTrailerFrame(src) {
  if (!filmCtx || !src) return;
  const w = film.width;
  const h = film.height;
  filmCtx.fillStyle = "#0b1218";
  filmCtx.fillRect(0, 0, w, h);
  const bar = Math.round(h * 0.09);
  const dw = w;
  const dh = h - bar * 2;
  try {
    filmCtx.drawImage(src, 0, bar, dw, dh);
  } catch {
    /* webgl canvas may be empty one frame */
  }
  filmCtx.fillStyle = "#07090c";
  filmCtx.fillRect(0, 0, w, bar);
  filmCtx.fillRect(0, h - bar, w, bar);
  if (card === "none") return;
  filmCtx.save();
  filmCtx.textAlign = "center";
  filmCtx.fillStyle = "rgba(7,9,12,.38)";
  filmCtx.fillRect(0, bar, w, dh);
  filmCtx.fillStyle = "#f4f6f8";
  filmCtx.font = `600 ${Math.round(h * 0.018)}px "Segoe UI", system-ui, sans-serif`;
  filmCtx.letterSpacing = "0.28em";
  filmCtx.fillText(kicker.toUpperCase(), w / 2, h * 0.42);
  filmCtx.letterSpacing = "0";
  filmCtx.font = `600 ${Math.round(h * 0.072)}px "Segoe UI", system-ui, sans-serif`;
  filmCtx.fillText(title, w / 2, h * 0.54);
  if (sub) {
    filmCtx.globalAlpha = 0.82;
    filmCtx.font = `500 ${Math.round(h * 0.028)}px "Segoe UI", system-ui, sans-serif`;
    filmCtx.fillText(sub, w / 2, h * 0.62);
  }
  filmCtx.restore();
}

function startRecorder() {
  const type = mime();
  const stream = film.captureStream(30);
  rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  rec.start(400);
  setTrailerStatus({ status: "recording", mime: type });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, ms, label) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(80);
  }
  throw new Error(`trailer timeout: ${label}`);
}

async function stopAndSave() {
  const blob = await new Promise((resolve, reject) => {
    if (!rec || rec.state === "inactive") {
      resolve(new Blob(chunks, { type: mime() }));
      return;
    }
    rec.onerror = () => reject(rec.error || new Error("recorder"));
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || mime() }));
    rec.stop();
  });
  setTrailerStatus({ status: "saving", bytes: blob.size });
  try {
    const res = await fetch("/__trailer_capture", {
      method: "POST",
      headers: { "Content-Type": blob.type || "video/webm" },
      body: blob,
    });
    const info = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(info.error || `upload ${res.status}`);
    setTrailerStatus({ status: "done", bytes: blob.size, path: info.path });
    return;
  } catch (err) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ski-atlas-trailer.webm";
    a.click();
    setTrailerStatus({ status: "downloaded", bytes: blob.size, error: String(err) });
  }
}

export function armTrailer(api) {
  if (!TRAILER || started) return;
  started = true;
  document.body.classList.add("trailer");
  setTrailerStatus({ status: "boot" });
  (async () => {
    try {
      await waitFor(() => api.getRun()?.phase === "ready", 180000, "mountain ready");
      const name = api.displayName?.() || api.courseName?.() || "the mountain";
      kicker = "Global Ski Atlas";
      title = "Ski any mountain";
      sub = String(name).replace(" — Prototype", "");
      card = "open";
      api.closeHud?.();
      if (api.orbit) {
        api.orbit.autoRotate = true;
        api.orbit.autoRotateSpeed = 0.55;
      }
      ensureFilm(api.renderer.domElement);
      paintTrailerFrame(api.renderer.domElement);
      startRecorder();
      const t0 = performance.now();
      while (performance.now() - t0 < AERIAL_S * 1000) {
        paintTrailerFrame(api.renderer.domElement);
        await sleep(32);
      }
      if (api.orbit) api.orbit.autoRotate = false;
      card = "none";
      api.start();
      await waitFor(() => api.getRun()?.phase === "running", 20000, "run start");
      const ski0 = performance.now();
      let iso = false;
      while (performance.now() - ski0 < SKI_S * 1000) {
        const elapsed = (performance.now() - ski0) / 1000;
        const phase = api.getRun()?.phase;
        if (phase === "finished" || phase === "dnf") break;
        if (!iso && elapsed >= ISO_AT) {
          api.cyclePov();
          iso = true;
        }
        if (iso && elapsed >= CHASE_AT && api.cameraPov?.() === "iso") api.cyclePov();
        await sleep(40);
      }
      kicker = "Global Ski Atlas";
      title = "Drop in";
      sub = "3D ski · real terrain · every resort";
      card = "sting";
      await sleep(STING_S * 1000);
      card = "none";
      await stopAndSave();
    } catch (e) {
      console.error(e);
      setTrailerStatus({ status: "error", message: String(e) });
      try {
        if (rec && rec.state !== "inactive") rec.stop();
      } catch {
        /* ignore */
      }
    }
  })();
}

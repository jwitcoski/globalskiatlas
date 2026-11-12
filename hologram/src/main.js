import { createHologramViewer } from "./viewer.js";
import { fetchJson } from "./load-clay.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("canvas");
const chrome = document.getElementById("chrome");
const reveal = document.getElementById("reveal");
const resortSelect = document.getElementById("resort");
const mirrorToggle = document.getElementById("mirror");
const spinToggle = document.getElementById("spin");
const statusEl = document.getElementById("status");
const fullscreenBtn = document.getElementById("fullscreen");
const wakeBtn = document.getElementById("wake");
const hideBtn = document.getElementById("hide");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const viewer = createHologramViewer({ canvas, reduceMotion });

let wakeLock = null;
let assetBase = "/clay_scenes";

function setStatus(text) {
  statusEl.textContent = text;
}

function setChromeOpen(open) {
  chrome.classList.toggle("is-open", open);
  reveal.hidden = open;
  // When UI is hidden, allow a tap on the stage to bring controls back.
  stage.classList.toggle("is-interactive", !open);
}

async function loadCatalog() {
  const data = await fetchJson("./resorts.json");
  assetBase = data.asset_base || assetBase;
  const resorts = data.resorts || [];
  resortSelect.innerHTML = "";
  for (const resort of resorts) {
    const opt = document.createElement("option");
    opt.value = resort.id;
    opt.textContent = resort.display_name || resort.id;
    resortSelect.appendChild(opt);
  }
  const procedural = document.createElement("option");
  procedural.value = "procedural";
  procedural.textContent = "Procedural island (offline)";
  resortSelect.appendChild(procedural);
  return resorts;
}

async function showSelected() {
  const id = resortSelect.value || "montage_mountain_pa";
  setStatus(`Loading ${id}…`);
  try {
    viewer.setSpinning(spinToggle.checked);
    const manifest = id === "procedural"
      ? viewer.showProcedural()
      : await viewer.showResort(id, assetBase);
    const name = manifest?.display_name || id;
    setStatus(`${name} ready — place bowl over phone`);
    history.replaceState(null, "", `?resort=${encodeURIComponent(id)}`);
  } catch (err) {
    console.error(err);
    setStatus(String(err.message || err));
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    setStatus("Wake Lock not supported on this browser");
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeBtn.textContent = "Keep screen on";
    });
    wakeBtn.textContent = "Screen lock on";
    setStatus("Screen will stay awake");
  } catch (err) {
    setStatus(`Wake Lock blocked: ${err.message}`);
  }
}

fullscreenBtn.addEventListener("click", async () => {
  const node = document.documentElement;
  if (!document.fullscreenElement) {
    if (node.requestFullscreen) await node.requestFullscreen().catch(() => {});
    else node.webkitRequestFullscreen?.();
  } else if (document.exitFullscreen) {
    await document.exitFullscreen().catch(() => {});
  }
});

wakeBtn.addEventListener("click", () => {
  requestWakeLock();
});

hideBtn.addEventListener("click", () => setChromeOpen(false));
reveal.addEventListener("click", () => setChromeOpen(true));

canvas.addEventListener("pointerdown", () => {
  if (!chrome.classList.contains("is-open")) setChromeOpen(true);
});

mirrorToggle.addEventListener("change", () => {
  viewer.setMirrored(mirrorToggle.checked);
});

spinToggle.addEventListener("change", () => {
  viewer.setSpinning(spinToggle.checked);
});

resortSelect.addEventListener("change", () => {
  showSelected();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLock) requestWakeLock();
});

viewer.setMirrored(mirrorToggle.checked);
viewer.setSpinning(spinToggle.checked && !reduceMotion);
if (reduceMotion) spinToggle.checked = false;

try {
  const resorts = await loadCatalog();
  const wanted = params.get("resort");
  if (wanted && [...resortSelect.options].some((o) => o.value === wanted)) {
    resortSelect.value = wanted;
  } else if (resorts[0]) {
    resortSelect.value = resorts[0].id;
  }
  await showSelected();
} catch (err) {
  console.error(err);
  setStatus("Catalog failed — using procedural island");
  resortSelect.innerHTML = `<option value="procedural">Procedural island</option>`;
  await showSelected();
}

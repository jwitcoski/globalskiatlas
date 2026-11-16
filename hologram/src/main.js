import { initHeroMontageMap } from "/scripts/hero-montage-map.js";

const stage = document.getElementById("stage");
const chrome = document.getElementById("chrome");
const reveal = document.getElementById("reveal");
const resortSelect = document.getElementById("resort");
const mirrorToggle = document.getElementById("mirror");
const statusEl = document.getElementById("status");
const fullscreenBtn = document.getElementById("fullscreen");
const wakeBtn = document.getElementById("wake");
const hideBtn = document.getElementById("hide");

const params = new URLSearchParams(location.search);
let map = null;
let wakeLock = null;
let token = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

function setChromeOpen(open) {
  chrome.classList.toggle("is-open", open);
  reveal.hidden = open;
}

function applyMirror() {
  stage.classList.toggle("is-mirrored", mirrorToggle.checked);
}

async function loadCatalog() {
  const res = await fetch("/clay_scenes/catalog.json");
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const data = await res.json();
  const resorts = (data.resorts || []).slice().sort((a, b) =>
    String(a.display_name || a.id).localeCompare(String(b.display_name || b.id)),
  );
  resortSelect.innerHTML = "";
  for (const resort of resorts) {
    const opt = document.createElement("option");
    opt.value = resort.id;
    opt.textContent = resort.display_name || resort.id;
    resortSelect.appendChild(opt);
  }
  return resorts;
}

async function showSelected() {
  const id = resortSelect.value;
  const my = ++token;
  const name = resortSelect.selectedOptions[0]?.textContent || id;
  setStatus(`Loading ${name}…`);
  map?.dispose();
  map = null;
  stage.replaceChildren();
  const next = await initHeroMontageMap(stage, {
    resortId: id,
    skipNearest: true,
    background: 0x000000,
  });
  if (my !== token) {
    next?.dispose();
    return;
  }
  map = next;
  await map?.whenReady;
  if (my !== token) return;
  setStatus(
    map?.sceneLoaded?.()
      ? `${name} ready — place bowl over phone`
      : `${name} failed to load`,
  );
  history.replaceState(null, "", `?resort=${encodeURIComponent(id)}`);
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
mirrorToggle.addEventListener("change", applyMirror);
resortSelect.addEventListener("change", () => {
  showSelected();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLock) requestWakeLock();
});

applyMirror();

try {
  const resorts = await loadCatalog();
  const wanted = params.get("resort");
  if (wanted && [...resortSelect.options].some((o) => o.value === wanted)) {
    resortSelect.value = wanted;
  } else if (resorts.some((r) => r.id === "montage_mountain_pa")) {
    resortSelect.value = "montage_mountain_pa";
  }
  await showSelected();
} catch (err) {
  console.error(err);
  setStatus(String(err.message || err));
}

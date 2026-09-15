import { initHeroMontageMap } from "./hero-montage-map.js?v=115";

let live = [];
let catalogPromise = null;
let mountToken = 0;
const sceneReadyCache = new Map();
const CLAY_SCENES_WITH_FILES = new Set([
  "montage_mountain_pa",
  "pal_arinsal_andorra",
  "perisher_australia",
  "cerro_perito_moreno_argentina",
  "killington_resort_united_states_of_america",
  "hakuba_cortina_japan",
]);

function loadClayByWs() {
  catalogPromise ||= fetch("/clay_scenes/catalog.json")
    .then((res) => {
      if (!res.ok) throw new Error("clay catalog");
      return res.json();
    })
    .then((data) => {
      const map = new Map();
      for (const row of data.resorts || []) {
        const ws = String(row.winter_sports_id || "");
        if (ws) map.set(ws, row);
      }
      window.__gsaClayByWs = map;
      return map;
    });
  return catalogPromise;
}

async function claySceneReady(id) {
  const key = String(id || "");
  if (!key) return false;
  if (CLAY_SCENES_WITH_FILES.has(key)) {
    sceneReadyCache.set(key, true);
    window.__gsaClaySceneReady = sceneReadyCache;
    return true;
  }
  if (sceneReadyCache.has(key)) return sceneReadyCache.get(key);
  sceneReadyCache.set(key, false);
  window.__gsaClaySceneReady = sceneReadyCache;
  return false;
}

function fillMissingCell(cell) {
  cell.classList.add("is-missing");
  cell.querySelector(".clay-compare-embed")?.remove();
  if (cell.querySelector(".clay-compare-empty")) return;
  const empty = document.createElement("div");
  empty.className = "clay-compare-empty";
  empty.setAttribute("role", "status");
  const badge = document.createElement("span");
  badge.className = "clay-missing-badge";
  badge.textContent = "No 3D map";
  const hint = document.createElement("span");
  hint.className = "clay-missing-hint";
  hint.textContent = "Scene is not available yet";
  empty.append(badge, hint);
  cell.appendChild(empty);
}

async function markMissing3dChips(clayByWs) {
  const in3d = document.body.classList.contains("compare-3d");
  const chips = [...document.querySelectorAll("#selected-chips .sel-chip")];
  for (const chip of chips) {
    const ws = String(chip.getAttribute("data-ws") || "");
    const hit = clayByWs?.get(ws);
    const ready = in3d && hit?.id ? await claySceneReady(hit.id) : false;
    const missing = in3d && !ready;
    chip.classList.toggle("no-3d", missing);
    const mark = chip.querySelector(".chip-3d-mark");
    if (mark) mark.textContent = missing ? "No 3D" : "";
  }
}

async function disposeHandles() {
  const dying = live.splice(0, live.length);
  for (const handle of dying) {
    try { handle.dispose(); } catch (_) { /* ignore */ }
  }
}

export async function disposeCompareClay() {
  mountToken += 1;
  await disposeHandles();
}

export async function syncCompareClay({ host, items, cols }) {
  const token = ++mountToken;
  await disposeHandles();
  if (token !== mountToken) return;
  if (!host) return;
  host.innerHTML = "";
  host.style.gridTemplateColumns = `repeat(${Math.max(1, cols || 1)}, minmax(0, 1fr))`;
  const clayByWs = await loadClayByWs();
  if (token !== mountToken) return;
  await markMissing3dChips(clayByWs);
  const queued = [];
  for (const item of items || []) {
    const cell = document.createElement("div");
    cell.className = "clay-compare-cell";
    const title = document.createElement("div");
    title.className = "clay-compare-name";
    title.textContent = item.name || "Resort";
    cell.appendChild(title);
    const hit = clayByWs.get(String(item.ws || ""));
    const ready = hit?.id ? await claySceneReady(hit.id) : false;
    if (!ready) {
      fillMissingCell(cell);
      host.appendChild(cell);
      continue;
    }
    const embed = document.createElement("div");
    embed.className = "hero-montage-embed clay-compare-embed";
    const stage = document.createElement("div");
    stage.className = "hero-montage-stage";
    embed.appendChild(stage);
    cell.appendChild(embed);
    host.appendChild(cell);
    queued.push({ stage, id: hit.id, cell });
  }
  for (const job of queued) {
    if (token !== mountToken) return;
    const handle = await initHeroMontageMap(job.stage, {
      resortId: job.id,
      lockResort: true,
      skipNearest: true,
      preview: true,
    });
    if (token !== mountToken) {
      try { handle?.dispose(); } catch (_) { /* ignore */ }
      return;
    }
    if (handle) {
      await handle.whenReady;
      if (token !== mountToken) {
        try { handle.dispose(); } catch (_) { /* ignore */ }
        return;
      }
      if (!handle.sceneLoaded()) {
        try { handle.dispose(); } catch (_) { /* ignore */ }
        fillMissingCell(job.cell);
        continue;
      }
      live.push(handle);
    } else {
      fillMissingCell(job.cell);
    }
  }
  if (token !== mountToken || live.length === 0) return;
  const maxTrue = Math.max(...live.map((h) => h.getTrueSpan()), 1);
  live.forEach((h) => h.applySizeCompare(maxTrue, null));
  const sharedR = Math.max(...live.map((h) => h.readRadius()), 1);
  live.forEach((h) => h.applySizeCompare(maxTrue, sharedR));
}

window.addEventListener("gsa-compare-view", (event) => {
  const detail = event.detail || {};
  if (detail.mode !== "3d") {
    disposeCompareClay();
    document.querySelectorAll("#selected-chips .sel-chip").forEach((chip) => {
      chip.classList.remove("no-3d");
      const mark = chip.querySelector(".chip-3d-mark");
      if (mark) mark.textContent = "";
    });
    return;
  }
  syncCompareClay(detail).catch((err) => console.warn("compare clay failed", err));
});

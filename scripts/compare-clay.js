import { initHeroMontageMap } from "./hero-montage-map.js?v=116";

const viewers = new Map();
let catalogPromise = null;
let mountToken = 0;
const sceneReadyCache = new Map();

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
  if (sceneReadyCache.has(key)) return sceneReadyCache.get(key);
  const pending = fetch(`/clay_scenes/${encodeURIComponent(key)}/scene-manifest.json`)
    .then((res) => res.ok)
    .catch(() => false);
  sceneReadyCache.set(key, pending);
  const ok = await pending;
  sceneReadyCache.set(key, ok);
  window.__gsaClaySceneReady = sceneReadyCache;
  return ok;
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

function makeCell(name) {
  const cell = document.createElement("div");
  cell.className = "clay-compare-cell";
  const title = document.createElement("div");
  title.className = "clay-compare-name";
  title.textContent = name || "Resort";
  cell.appendChild(title);
  return { cell, title };
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

async function disposeAllViewers() {
  const dying = [...viewers.values()];
  viewers.clear();
  for (const slot of dying) {
    try { slot.handle?.dispose(); } catch (_) { /* ignore */ }
  }
}

function applySharedScale() {
  const live = [...viewers.values()].map((slot) => slot.handle).filter(Boolean);
  if (live.length === 0) return;
  const maxTrue = Math.max(...live.map((h) => h.getTrueSpan()), 1);
  live.forEach((h) => h.applySizeCompare(maxTrue, null));
  const sharedR = Math.max(...live.map((h) => h.readRadius()), 1);
  live.forEach((h) => h.applySizeCompare(maxTrue, sharedR));
}

export async function disposeCompareClay() {
  mountToken += 1;
  await disposeAllViewers();
}

export async function syncCompareClay({ host, items, cols }) {
  const token = ++mountToken;
  if (!host) return;
  host.style.gridTemplateColumns = `repeat(${Math.max(1, cols || 1)}, minmax(0, 1fr))`;
  const clayByWs = await loadClayByWs();
  if (token !== mountToken) return;
  await markMissing3dChips(clayByWs);
  if (token !== mountToken) return;

  const desired = [];
  const keepIds = new Set();
  for (const item of items || []) {
    const hit = clayByWs.get(String(item.ws || ""));
    const id = hit?.id ? String(hit.id) : "";
    const ready = id ? await claySceneReady(id) : false;
    if (ready) keepIds.add(id);
    desired.push({
      name: item.name || "Resort",
      ws: String(item.ws || ""),
      id,
      ready,
    });
  }
  if (token !== mountToken) return;

  for (const [id, slot] of [...viewers.entries()]) {
    if (keepIds.has(id)) continue;
    try { slot.handle?.dispose(); } catch (_) { /* ignore */ }
    slot.cell.remove();
    viewers.delete(id);
  }
  host.querySelectorAll(".clay-compare-cell.is-missing").forEach((el) => el.remove());

  const toMount = [];
  for (const job of desired) {
    if (!job.ready) {
      const { cell } = makeCell(job.name);
      fillMissingCell(cell);
      host.appendChild(cell);
      continue;
    }
    let slot = viewers.get(job.id);
    if (slot?.handle) {
      slot.title.textContent = job.name;
      host.appendChild(slot.cell);
      continue;
    }
    if (slot) {
      slot.title.textContent = job.name;
      host.appendChild(slot.cell);
      if (!slot.loading) toMount.push({ id: job.id, slot });
      continue;
    }
    const made = makeCell(job.name);
    const embed = document.createElement("div");
    embed.className = "hero-montage-embed clay-compare-embed";
    const stage = document.createElement("div");
    stage.className = "hero-montage-stage";
    embed.appendChild(stage);
    made.cell.appendChild(embed);
    host.appendChild(made.cell);
    slot = { cell: made.cell, title: made.title, handle: null, stage, loading: true };
    viewers.set(job.id, slot);
    toMount.push({ id: job.id, slot });
  }

  for (const job of toMount) {
    job.slot.loading = true;
    const handle = await initHeroMontageMap(job.slot.stage, {
      resortId: job.id,
      lockResort: true,
      skipNearest: true,
      preview: true,
    });
    const slot = viewers.get(job.id);
    if (!slot) {
      try { handle?.dispose(); } catch (_) { /* ignore */ }
      continue;
    }
    if (handle) {
      await handle.whenReady;
      if (viewers.get(job.id) !== slot) {
        try { handle.dispose(); } catch (_) { /* ignore */ }
        continue;
      }
      if (!handle.sceneLoaded()) {
        try { handle.dispose(); } catch (_) { /* ignore */ }
        viewers.delete(job.id);
        fillMissingCell(slot.cell);
        continue;
      }
      if (slot.handle && slot.handle !== handle) {
        try { handle.dispose(); } catch (_) { /* ignore */ }
      } else {
        slot.handle = handle;
      }
    } else if (!slot.handle) {
      viewers.delete(job.id);
      fillMissingCell(slot.cell);
    }
    slot.loading = false;
  }
  applySharedScale();
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

import { initHeroMontageMap } from "./hero-montage-map.js?v=114";

let live = [];
let catalogPromise = null;
let mountToken = 0;

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
      return map;
    });
  return catalogPromise;
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
  const queued = [];
  for (const item of items || []) {
    const cell = document.createElement("div");
    cell.className = "clay-compare-cell";
    const title = document.createElement("div");
    title.className = "clay-compare-name";
    title.textContent = item.name || "Resort";
    cell.appendChild(title);
    const hit = clayByWs.get(String(item.ws || ""));
    if (!hit?.id) {
      const empty = document.createElement("div");
      empty.className = "clay-compare-empty";
      empty.textContent = "No 3D map yet";
      cell.appendChild(empty);
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
    queued.push({ stage, id: hit.id });
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
      live.push(handle);
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
    return;
  }
  syncCompareClay(detail).catch((err) => console.warn("compare clay failed", err));
});

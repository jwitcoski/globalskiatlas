/** HUD and overlay helpers. UI reads game state; it does not own piste/DNF rules. */

export function bindUi() {
  return {
    overlay: document.getElementById("overlay"),
    panel: document.getElementById("panel"),
    clock: document.getElementById("clock"),
    obj: document.getElementById("obj"),
    score: document.getElementById("score-box"),
    minimap: document.getElementById("minimap"),
    chip: document.getElementById("piste"),
    speedFill: document.getElementById("speed-fill"),
    speedRead: document.getElementById("speed-read"),
    remainFill: document.getElementById("remain-fill"),
    distRead: document.getElementById("dist-read"),
    pauseBtn: document.getElementById("pause-btn"),
    loadNote: document.getElementById("load-note"),
    nav: document.getElementById("nav-arrow"),
    povBtn: document.getElementById("pov-btn"),
  };
}

export function setHud(ui, s) {
  const timeLabel = s.timeLabel ?? s.timeLabel ?? "";
  const remain = s.distRemain ?? s.distRemain ?? 0;
  const total = s.distTotal ?? s.distTotal ?? 1;
  const on = s.onPiste ?? s.onPiste;
  const off = s.offTimer ?? s.offTimer ?? 0;
  const speed = s.speedKmh ?? s.speedKmh ?? 0;
  if (ui.clock) ui.clock.textContent = timeLabel;
  if (ui.obj) {
    const g =
      s.gatesTotal > 0 ? `${s.gatesHit || 0} / ${s.gatesTotal}` : s.course;
    const hunt = s.yetiOut ? "  ·  YETI" : "";
    const flash = s.gateFlash ? `  ·  ${s.gateFlash}` : "";
    ui.obj.textContent = `${g}${hunt}${flash}`;
  }
  if (ui.distRead) ui.distRead.textContent = `${Math.round(remain)} meters`;
  if (ui.score) ui.score.textContent = String(Math.round(s.score)).padStart(5, "0");
  if (ui.chip) {
    if (s.yetiOut) {
      ui.chip.className = "bad";
      ui.chip.textContent = "YETI";
    } else {
      ui.chip.className = on ? "ok" : "bad";
      ui.chip.textContent = on ? "ON PISTE" : `OFF ${off.toFixed(1)}s`;
    }
  }
  if (ui.speedFill) ui.speedFill.style.transform = `scaleX(${Math.min(1, speed / 110)})`;
  if (ui.speedRead) ui.speedRead.textContent = `${Math.round(speed)} km/h`;
  if (ui.remainFill) {
    const t = total > 8 ? 1 - remain / total : 0;
    ui.remainFill.style.transform = `scaleX(${Math.min(1, Math.max(0, t))})`;
  }
  if (ui.nav) {
    ui.nav.hidden = !s.navShow;
    ui.nav.style.transform = `translateX(-50%) rotate(${s.navAngle || 0}deg)`;
  }
  if (ui.povBtn) ui.povBtn.textContent = s.pov === "iso" ? "ISO" : "CAM";
}

function actions(rows) {
  return `<div class="actions">${rows
    .map(
      ([act, label, kind]) =>
        `<button type="button" class="btn ${kind || ""}" data-act="${act}">${label}</button>`,
    )
    .join("")}</div>`;
}

function trailMeta(data) {
  const t = (data.trails || []).find((r) => r.id === data.selectedId) || {};
  const drop = Math.round(t.vertical_drop_m || t.drop || 0);
  const len = Math.round(t.length_m || t.length || 0);
  const label = data.diffLabel || "Unrated";
  return `<p class="trail-meta">${data.marker || ""}<span>${label} · ${drop} m drop · ${len} m</span></p>`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function worldMap(resorts) {
  const n = (resorts || []).length;
  return `<div class="world-stage">
      <div id="picker-map" role="application" aria-label="Ski atlas map"></div>
      <div class="search-box" id="searchBox" style="display: none;">
        <input type="text" id="searchInput" placeholder="Search ${n} playable resorts and the full atlas…" autocomplete="off" />
        <div class="search-dropdown" id="searchDropdown"></div>
      </div>
      <div id="legend" class="map-legend" style="display: none;"></div>
      <div id="basemapControl" class="basemap-control" aria-label="Basemap options"></div>
    </div>`;
}

export function openPanel(ui, kind, data) {
  if (!ui.overlay || !ui.panel) return;
  ui.overlay.hidden = false;
  ui.overlay.classList.toggle("lobby", kind === "ready");
  ui.overlay.classList.toggle("picker", kind === "mountains");
  document.body.classList.toggle("lobby", kind === "ready");
  document.body.classList.toggle("picker", kind === "mountains");
  if (kind === "loading") {
    ui.panel.innerHTML = `<p class="kicker">Loading</p>
      <h2>Fetching the mountain</h2>
      <p>${data.message || "DEM + OSM scene…"}</p>`;
    return;
  }
  if (kind === "mountains") {
    ui.panel.innerHTML = `<div class="world-head">
        <p class="kicker"><a class="atlas-home" href="/">Global Ski Atlas</a> · Pick a mountain</p>
        <h2>Where do you want to ski?</h2>
      </div>
      ${worldMap(data.resorts)}
      <p class="fine world-legal">${data.legal || ""}</p>`;
    return;
  }
  if (kind === "ready") {
    ui.panel.innerHTML = `<p class="kicker">Pick a trail</p>
      <h2>${data.course}</h2>
      ${trailMeta(data)}
      ${data.legend || ""}
      <p class="hint">Click a marker on the mountain. Drag to orbit.</p>
      <p class="fine">${data.legal}</p>
      ${actions(
        data.changeMountain
          ? [
              ["start", "Ski", "primary"],
              ["mountains", "Change mountain", "ghost"],
            ]
          : [["start", "Ski", "primary"]],
      )}`;
    return;
  }
  if (kind === "paused") {
    ui.panel.innerHTML = `<p class="kicker">Paused</p>
      <h2>Hold</h2>
      <p>The clock is stopped.</p>
      ${actions([
        ["resume", "Resume", "primary"],
        ["restart", "Restart", "ghost"],
        ["lobby", "Change trail", "ghost"],
      ])}`;
    return;
  }
  if (kind === "finished") {
    ui.panel.innerHTML = `<p class="kicker">Finished</p>
      <h2 class="big">${data.time}</h2>
      <p>${data.course}</p>
      <p>Score ${data.score} · gates ${data.gates || "—"} · best ${data.bestScore}</p>
      <p class="fine">Best time ${data.bestTime}</p>
      ${actions([
        ["restart", "Ski again", "primary"],
        ["lobby", "Other trail", "ghost"],
      ])}`;
    return;
  }
  if (kind === "dnf") {
    const yeti = data.reason === "yeti";
    const tree = data.reason === "tree";
    ui.panel.innerHTML = `<p class="kicker">${yeti ? "Eaten" : tree ? "Wipeout" : "DNF"}</p>
      <h2>${yeti ? "Abominable snowman" : tree ? "Tree" : "Stopped"}</h2>
      <p>${yeti ? "It hunted you down before the finish." : tree ? "You hit a tree." : "Run ended."}</p>
      <p>Score ${data.score} · ${data.time}${data.gates ? ` · gates ${data.gates}` : ""}</p>
      ${actions([
        ["restart", "Restart", "primary"],
        ["lobby", "Other trail", "ghost"],
      ])}`;
    return;
  }
  ui.panel.innerHTML = `<p class="kicker">Error</p><h2>Load failed</h2><p>${data.message || ""}</p>
    ${data.changeMountain ? actions([["mountains", "Other mountains", "ghost"]]) : ""}`;
}

export function closePanel(ui) {
  if (ui.overlay) {
    ui.overlay.hidden = true;
    ui.overlay.classList.remove("lobby", "picker");
  }
  document.body.classList.remove("lobby", "picker");
}

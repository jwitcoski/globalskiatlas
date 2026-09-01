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
    navNeedle: document.getElementById("nav-needle"),
    povBtn: document.getElementById("pov-btn"),
    combo: document.getElementById("combo-read"),
    shout: document.getElementById("air-shout"),
    osmMapNote: document.getElementById("osm-map-note"),
    resortTitle: document.getElementById("resort-title"),
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
  const hunt = s.yetiOut ? " · HUNT" : "";
  if (ui.obj) {
    const g = s.clocked === false ? "GATE" : s.styleFlash || s.gateFlash || (s.combo > 1.05 ? `${s.combo.toFixed(1)}×` : s.course);
    ui.obj.textContent = `${g}${hunt}`;
  }
  if (ui.combo) {
    const show = s.clocked !== false;
    ui.combo.hidden = !show;
    ui.combo.textContent = `${(s.combo || 1).toFixed(1)}×`;
    ui.combo.classList.toggle("pop", !!(s.styleFlash || s.gateFlash));
  }
  if (ui.shout) {
    const key = s.shoutLine ? `${s.shoutLine}|${s.shoutPts}` : "";
    if (ui.shout.dataset.key !== key) {
      ui.shout.dataset.key = key;
      if (s.shoutLine) {
        ui.shout.hidden = false;
        ui.shout.innerHTML = `<span class="air-line">${s.shoutLine}</span><span class="air-pts">+${Math.round(s.shoutPts || 0)}</span>`;
      } else {
        ui.shout.hidden = true;
        ui.shout.textContent = "";
      }
    }
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
    const deg = s.navAngle || 0;
    if (ui.navNeedle) ui.navNeedle.setAttribute("transform", `rotate(${deg} 20 20)`);
    const abs = Math.abs(deg);
    let way = "ahead";
    if (abs > 150) way = "behind you";
    else if (deg > 20) way = "to your right";
    else if (deg < -20) way = "to your left";
    ui.nav.setAttribute("aria-label", `Trail ${way}`);
  }
  if (ui.povBtn) ui.povBtn.textContent = s.pov === "iso" ? "ISO" : "CAM";
}

export function updateLoading(ui, data) {
  if (!ui.panel || !ui.overlay || ui.overlay.hidden) return;
  if (!ui.overlay.dataset.loading) return;
  const stage = data.stage || "Loading";
  const pct = data.pct;
  const bar =
    pct != null
      ? `<div class="load-bar"><span style="width:${Math.round(Math.min(100, Math.max(2, pct * 100)))}%"></span></div>`
      : `<div class="load-bar indet"><span></span></div>`;
  const facts = data.factsHtml || "";
  const size = data.sizeHint ? `<p class="fine">${data.sizeHint}</p>` : "";
  ui.panel.innerHTML = `<p class="kicker">Loading</p>
      <h2>${data.name || "Fetching the mountain"}</h2>
      <p>${data.message || stage}</p>
      ${size}
      ${bar}
      <p class="fine">Large terrain files can take a while. This is still loading.</p>
      ${facts}`;
}

function actions(rows) {
  return `<div class="actions">${rows
    .map(
      ([act, label, kind]) =>
        `<button type="button" class="btn ${kind || ""}" data-act="${act}">${label}</button>`,
    )
    .join("")}</div>`;
}

export function compactUi() {
  return matchMedia("(pointer: coarse)").matches || innerWidth < 720 || innerHeight < 520;
}

let lobbyDetailsUser = null;

function trailMeta(data) {
  const t = (data.trails || []).find((r) => r.id === data.selectedId) || {};
  const drop = Math.round(t.vertical_drop_m || t.drop || 0);
  const len = Math.round(t.length_m || t.length || 0);
  const label = data.diffLabel || "Unrated";
  return `<p class="trail-meta">${data.marker || ""}<span>${label} · ${drop} m drop · ${len} m</span></p>`;
}

function lobbyDetailsHtml(data) {
  const open = (lobbyDetailsUser ?? !compactUi()) ? " open" : "";
  return `<details class="lobby-details"${open}>
      <summary>Resort details</summary>
      <div class="lobby-details-body">
        ${data.atlasStats || ""}
        ${data.legend || ""}
        <p class="hint">Drag to orbit · scroll / pinch to zoom · right-drag or two-finger to pan · double-click to reset.</p>
        <p class="fine">${data.legal}</p>
      </div>
    </details>`;
}

/** Always starts closed — OSM help without cluttering the trail picker. */
function osmFixDetailsHtml(data) {
  if (!data.osmFixHtml) return "";
  return `<details class="lobby-details osm-fix-details">
      <summary>Missing trees or scenery?</summary>
      <div class="lobby-details-body">
        ${data.osmFixHtml}
      </div>
    </details>`;
}

function bindLobbyDetails(ui) {
  const el = ui.panel?.querySelector(".lobby-details:not(.osm-fix-details)");
  if (!el) return;
  el.addEventListener("toggle", () => {
    lobbyDetailsUser = el.open;
  });
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
        <input type="text" id="searchInput" placeholder="Search ${n} playable resorts…" autocomplete="off" />
        <div class="search-dropdown" id="searchDropdown"></div>
      </div>
      <details class="map-legend-fold" id="legendFold">
        <summary class="map-legend-toggle">Legend</summary>
        <div id="legend" class="map-legend"></div>
      </details>
      <details class="basemap-fold" id="basemapFold">
        <summary class="basemap-toggle">Map</summary>
        <div id="basemapControl" class="basemap-control" aria-label="Basemap options"></div>
      </details>
    </div>`;
}

export function openPanel(ui, kind, data) {
  if (!ui.overlay || !ui.panel) return;
  ui.overlay.hidden = false;
  ui.overlay.classList.toggle("lobby", kind === "ready");
  ui.overlay.classList.toggle("picker", kind === "mountains");
  ui.overlay.classList.toggle("finish", kind === "finished" || kind === "dnf");
  document.body.classList.toggle("lobby", kind === "ready");
  document.body.classList.toggle("picker", kind === "mountains");
  setResortTitle(ui, kind === "ready" ? data.resortName || "" : "");
  if (kind !== "ready") setOsmMapNote(ui, "");
  if (kind === "loading") {
    ui.overlay.dataset.loading = "1";
    ui.panel.innerHTML = `<p class="kicker">Loading</p>
      <h2>${data.name || "Fetching the mountain"}</h2>
      <p>${data.message || "DEM + OSM scene…"}</p>
      <div class="load-bar indet"><span></span></div>
      <p class="fine">Large terrain files can take a while. This is still loading.</p>
      ${data.factsHtml || ""}`;
    return;
  }
  delete ui.overlay.dataset.loading;
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
      ${lobbyDetailsHtml(data)}
      ${osmFixDetailsHtml(data)}
      ${actions(
        data.changeMountain
          ? [
              ["start", "Ski", "primary"],
              ["mountains", "Change mountain", "ghost"],
            ]
          : [["start", "Ski", "primary"]],
      )}`;
    bindLobbyDetails(ui);
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
      <p>Score ${data.score} · best ${data.bestScore}</p>
      <p class="fine">Best time ${data.bestTime}</p>
      ${data.osmFixHtml || ""}
      <div class="sf-finish-slot">${data.chartsHtml || ""}</div>
      ${actions([
        ["restart", "Ski again", "primary"],
        ["lobby", "Other trail", "ghost"],
      ])}`;
    return;
  }
  if (kind === "dnf") {
    const yeti = data.reason === "yeti";
    const tree = data.reason === "tree";
    const skierHit = data.reason === "skier";
    ui.panel.innerHTML = `<p class="kicker">${yeti ? "Eaten" : tree || skierHit ? "Wipeout" : "DNF"}</p>
      <h2>${yeti ? "Abominable snowman" : skierHit ? "Skier" : tree ? "Tree" : "Stopped"}</h2>
      <p>${yeti ? "It hunted you down before the finish." : skierHit ? "You hit another skier." : tree ? "You hit a tree." : "Run ended."}</p>
      <p>Score ${data.score} · ${data.time}</p>
      ${data.osmFixHtml || ""}
      <div class="sf-finish-slot">${data.chartsHtml || ""}</div>
      ${actions([
        ["restart", "Restart", "primary"],
        ["lobby", "Other trail", "ghost"],
      ])}`;
    return;
  }
  ui.panel.innerHTML = `<p class="kicker">Error</p><h2>Load failed</h2><p>${data.message || ""}</p>
    ${data.changeMountain ? actions([["mountains", "Other mountains", "ghost"]]) : ""}`;
}

export function setResortTitle(ui, name) {
  const el = ui?.resortTitle || document.getElementById("resort-title");
  if (!el) return;
  const text = String(name || "").trim();
  el.hidden = !text;
  el.textContent = text;
  if (text) el.setAttribute("title", text);
  else el.removeAttribute("title");
}

export function setOsmMapNote(ui, html) {
  if (!ui.osmMapNote) return;
  const show = !!html;
  ui.osmMapNote.hidden = !show;
  if (show) ui.osmMapNote.innerHTML = html;
}

export function closePanel(ui) {
  if (ui.overlay) {
    ui.overlay.hidden = true;
    ui.overlay.classList.remove("lobby", "picker", "finish");
  }
  document.body.classList.remove("lobby", "picker");
  setResortTitle(ui, "");
  setOsmMapNote(ui, "");
}

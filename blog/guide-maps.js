/**
 * Shared blog maps + parquet charts. Wheel zoom off. Tagging/pipeline keep their own scripts.
 */
import { createMapLibre } from "../scripts/map-core.js";
import { addSkiPmtilesToMap, SKI_PMTILES_LAYERS } from "../scripts/pmtiles-core.js";
import { pisteLineColorExpression } from "../scripts/map-colors.js";
import { loadSkiAreasAnalyzed } from "../scripts/geoparquet-browser.js";

function waitForSdk(ms = 8000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (window.maptilersdk) return resolve(true);
      if (Date.now() - t0 > ms) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function parseHost(host) {
  const [lon, lat] = (host.dataset.center || "15,30").split(",").map(Number);
  return { center: [lon, lat], zoom: Number(host.dataset.zoom || 2), minZoom: Number(host.dataset.minzoom || 1) };
}

function quietWheel(host) {
  host.addEventListener("wheel", (e) => e.stopPropagation(), { capture: true, passive: true });
}

function holderFor(host, idx) {
  const holder = document.createElement("div");
  holder.id = "guide-map-" + idx;
  holder.style.width = "100%";
  holder.style.height = "360px";
  host.classList.add("is-home", "is-live");
  host.appendChild(holder);
  return holder;
}

async function bootMap(host, idx) {
  const holder = holderFor(host, idx);
  const parsed = parseHost(host);
  const detail = host.dataset.detail === "1";
  const { map } = await createMapLibre({
    containerId: holder.id,
    center: parsed.center,
    zoom: parsed.zoom,
    minZoom: parsed.minZoom,
    noControl: true,
  });
  quietWheel(host);
  await addSkiPmtilesToMap(map, {
    includeResortDetail: detail,
    pistesWidth: detail ? 3 : 2,
  });
  if (detail) {
    try {
      map.setPaintProperty(SKI_PMTILES_LAYERS.pistes, "line-color", pisteLineColorExpression("american"));
    } catch (err) {
      console.warn("[guide-maps] piste colors", err);
    }
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isDownhill(r) {
  return String(r.resort_type || "").toLowerCase().trim() === "downhill ski resort";
}

function book(c) {
  const s = String(c || "").toLowerCase();
  if (
    /united states|canada|mexico|argentina|chile|brazil|peru|bolivia|colombia|ecuador|venezuela|uruguay|paraguay|guatemala|honduras|costa rica|panama/.test(
      s
    )
  )
    return "Americas";
  if (
    /japan|china|korea|taiwan|mongolia|australia|new zealand|india|nepal|pakistan|kazakhstan|south africa|lesotho|morocco|algeria|egypt/.test(
      s
    )
  )
    return "Asia / Africa / Oceania";
  if (
    /russia|georgia|armenia|azerbaijan|austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|iceland|ireland|italy|latvia|liechtenstein|lithuania|luxembourg|malta|netherlands|norway|poland|portugal|romania|slovakia|slovenia|spain|sweden|switzerland|turkey|ukraine|united kingdom|andorra|monaco|serbia|bosnia|montenegro|albania|macedonia|belarus|moldova/.test(
      s
    )
  )
    return "Europe";
  return "Asia / Africa / Oceania";
}

function trailsOf(r) {
  return num(r.downhill_trails);
}

function sizeBucket(t) {
  if (t >= 100) return "mega";
  if (t >= 30) return "large";
  if (t >= 10) return "medium";
  return "small";
}

function barChart(title, sub, rows) {
  const max = Math.max(...rows.map((r) => r.n), 1);
  const W = 340;
  const left = 118;
  const top = 4;
  const bh = 18;
  const gap = 6;
  const barW = W - left - 40;
  const H = top + rows.length * (bh + gap) + 8;
  const rects = rows
    .map((r, i) => {
      const y = top + i * (bh + gap);
      const w = (r.n / max) * barW;
      return `<text x="0" y="${y + 13}" font-size="11" fill="#334155">${r.k}</text>
        <rect x="${left}" y="${y}" width="${w}" height="${bh}" fill="${r.c || "#0f766e"}"/>
        <text x="${left + w + 6}" y="${y + 13}" font-size="11" fill="#111827">${r.t ?? r.n.toLocaleString()}</text>`;
    })
    .join("");
  return `<div class="guide-chart-title">${title}</div>
    <div class="guide-chart-sub">${sub}</div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${rects}</svg>`;
}

function stats(rows) {
  const dh = rows.filter(isDownhill);
  const byC = {};
  const byB = {};
  const size = { small: 0, medium: 0, large: 0, mega: 0 };
  const lifts = {};
  for (const r of dh) {
    const c = String(r.country || "Unknown");
    byC[c] = (byC[c] || 0) + 1;
    const b = book(r.country);
    byB[b] = (byB[b] || 0) + 1;
    size[sizeBucket(trailsOf(r))]++;
    for (const part of String(r.lift_types || "").split(",")) {
      const m = part.trim().match(/^(.+?):\s*(\d+)/);
      if (m) lifts[m[1]] = (lifts[m[1]] || 0) + Number(m[2]);
    }
  }
  const countries = Object.entries(byC).sort((a, b) => b[1] - a[1]);
  return {
    rows,
    dhRows: dh,
    total: rows.length,
    dh: dh.length,
    notDh: rows.length - dh.length,
    nCountries: countries.length,
    countries,
    byB,
    size,
    lifts,
    japan: byC["Japan"] || 0,
    us: byC["United States of America"] || 0,
  };
}

function fillLive(s, extra) {
  const map = {
    dh: s.dh,
    total: s.total,
    notDh: s.notDh,
    countries: s.nCountries,
    europe: s.byB["Europe"] || 0,
    americas: s.byB["Americas"] || 0,
    asia: s.byB["Asia / Africa / Oceania"] || 0,
    japan: s.japan,
    us: s.us,
    small: s.size.small,
    medium: s.size.medium,
    large: s.size.large,
    mega: s.size.mega,
    ...extra,
  };
  for (const el of document.querySelectorAll("[data-live]")) {
    const k = el.dataset.live;
    if (map[k] != null) el.textContent = Number(map[k]).toLocaleString();
  }
}

function groupCounts(dh, field, country) {
  const by = {};
  for (const r of dh) {
    if (country && String(r.country) !== country) continue;
    const k = String(r[field] || "?").trim() || "?";
    by[k] = (by[k] || 0) + 1;
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}

function topRows(dh, metric, n) {
  return [...dh]
    .filter((r) => num(r[metric]) > 0)
    .sort((a, b) => num(b[metric]) - num(a[metric]))
    .slice(0, n);
}

function shortName(r) {
  return String(r.english_name || r.name || r.winter_sports_id || "?").slice(0, 22);
}

function passCounts(byId) {
  const out = { epic: 0, ikon: 0, indy: 0, other: 0, tagged: 0 };
  for (const v of Object.values(byId || {})) {
    const passes = v.passes || [];
    if (!passes.length) continue;
    out.tagged++;
    for (const p of passes) {
      const k = String(p).toLowerCase();
      if (k === "epic") out.epic++;
      else if (k === "ikon") out.ikon++;
      else if (k === "indy") out.indy++;
      else out.other++;
    }
  }
  return out;
}

function rowById(dh, id) {
  return dh.find((r) => String(r.winter_sports_id) === String(id));
}

function bootCharts(s, passes) {
  const extra = {};
  if (passes) {
    extra.epic = passes.epic;
    extra.ikon = passes.ikon;
    extra.indy = passes.indy;
    extra.passTagged = passes.tagged;
  }
  fillLive(s, extra);
  const teal = "#0f766e";
  const navy = "#1a4d8c";
  for (const el of document.querySelectorAll("[data-chart]")) {
    const kind = el.dataset.chart;
    if (kind === "type") {
      el.innerHTML = barChart("Rows in ski_areas_analyzed.parquet", "resort_type on the current S3 file", [
        { k: "downhill", n: s.dh, c: teal },
        { k: "not downhill", n: s.notDh, c: "#94a3b8" },
      ]);
    }
    if (kind === "countries") {
      el.innerHTML = barChart(
        "Downhill areas by country",
        "Top ten in this file",
        s.countries.slice(0, 10).map(([k, n], i) => ({
          k: k.replace("United States of America", "United States"),
          n,
          c: i === 0 ? navy : teal,
        }))
      );
    }
    if (kind === "books") {
      el.innerHTML = barChart("Downhill areas by book region", "Same country grouping as the wiki ingest", [
        { k: "Europe", n: s.byB["Europe"] || 0, c: navy },
        { k: "Asia / Africa / Oceania", n: s.byB["Asia / Africa / Oceania"] || 0, c: teal },
        { k: "Americas", n: s.byB["Americas"] || 0, c: "#0ea5e9" },
      ]);
    }
    if (kind === "size") {
      el.innerHTML = barChart("Downhill areas by trail-count plate", "small <10, medium 10–29, large 30–99, mega 100+", [
        { k: "small", n: s.size.small, c: "#99f6e4" },
        { k: "medium", n: s.size.medium, c: teal },
        { k: "large", n: s.size.large, c: navy },
        { k: "mega", n: s.size.mega, c: "#111827" },
      ]);
    }
    if (kind === "group") {
      const field = el.dataset.field || "state";
      const country = el.dataset.country || "";
      const n = Number(el.dataset.n || 12);
      const rows = groupCounts(s.dhRows, field, country || undefined).slice(0, n);
      el.innerHTML = barChart(
        el.dataset.title || field,
        el.dataset.sub || "Current parquet",
        rows.map(([k, v], i) => ({ k, n: v, c: i === 0 ? navy : teal }))
      );
    }
    if (kind === "top") {
      const metric = el.dataset.metric || "skiable_terrain_acres";
      const n = Number(el.dataset.n || 8);
      const rows = topRows(s.dhRows, metric, n);
      el.innerHTML = barChart(
        el.dataset.title || metric,
        el.dataset.sub || "Current parquet",
        rows.map((r, i) => ({ k: shortName(r), n: Math.round(num(r[metric])), c: i === 0 ? navy : teal }))
      );
    }
    if (kind === "bars") {
      // data-items="Label:12.5|Other:3"; values are precomputed offline, data-unit is appended to the value label.
      const unit = el.dataset.unit || "";
      const rows = (el.dataset.items || "").split("|").map((s) => {
        const i = s.lastIndexOf(":");
        return { k: s.slice(0, i), n: Number(s.slice(i + 1)) };
      });
      const hi = Math.max(...rows.map((r) => r.n));
      el.innerHTML = barChart(
        el.dataset.title || "",
        el.dataset.sub || "",
        rows.map((r) => ({ ...r, t: r.n.toLocaleString() + unit, c: r.n === hi ? navy : teal }))
      );
    }
    if (kind === "lifts") {
      const rows = Object.entries(s.lifts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(el.dataset.n || 8));
      el.innerHTML = barChart(
        "Tagged lift objects by type",
        "Parsed from lift_types on downhill rows",
        rows.map(([k, v], i) => ({ k, n: v, c: i === 0 ? navy : teal }))
      );
    }
    if (kind === "lats") {
      const pole = el.dataset.pole === "south" ? 1 : -1;
      const rows = [...s.dhRows]
        .filter((r) => Number.isFinite(Number(r.centroid_lat)))
        .sort((a, b) => pole * (num(a.centroid_lat) - num(b.centroid_lat)))
        .slice(0, Number(el.dataset.n || 6));
      el.innerHTML = barChart(
        pole === 1 ? "Southernmost downhill points" : "Northernmost downhill points",
        "Sorted by centroid_lat",
        rows.map((r, i) => ({
          k: shortName(r),
          n: Math.abs(num(r.centroid_lat)),
          c: i === 0 ? navy : teal,
        }))
      );
    }
    if (kind === "mix") {
      const r = rowById(s.dhRows, el.dataset.id);
      if (!r) continue;
      el.innerHTML = barChart("Difficulty mix", shortName(r), [
        { k: "novice", n: num(r.trails_novice), c: "#86efac" },
        { k: "easy", n: num(r.trails_easy), c: "#22c55e" },
        { k: "intermediate", n: num(r.trails_intermediate), c: "#3b82f6" },
        { k: "advanced", n: num(r.trails_advanced), c: "#111827" },
        { k: "expert", n: num(r.trails_expert), c: "#7c3aed" },
      ]);
    }
    if (kind === "passes" && passes) {
      el.innerHTML = barChart("Pass tags in pass-affiliations.json", "2026–27 Storm Skiing workbook match", [
        { k: "indy", n: passes.indy, c: teal },
        { k: "epic", n: passes.epic, c: navy },
        { k: "ikon", n: passes.ikon, c: "#0ea5e9" },
        { k: "other", n: passes.other, c: "#94a3b8" },
      ]);
    }
  }
}

async function bootAllMaps() {
  if (!(await waitForSdk())) return;
  const hosts = [...document.querySelectorAll(".guide-map-host[data-kind]")];
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.target.dataset.booted) continue;
        e.target.dataset.booted = "1";
        io.unobserve(e.target);
        bootMap(e.target, hosts.indexOf(e.target)).catch((err) => console.warn("[guide-maps]", err));
      }
    },
    { rootMargin: "200px", threshold: 0 }
  );
  hosts.forEach((h) => io.observe(h));
}

async function loadPasses() {
  if (!document.querySelector('[data-chart="passes"], [data-live="epic"]')) return null;
  try {
    const res = await fetch("../data/pass-affiliations.json");
    if (!res.ok) return null;
    const j = await res.json();
    return passCounts(j.by_id);
  } catch {
    return null;
  }
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function redundancySvg(rows) {
  if (!rows.length) return '<p class="guide-chart-sub">No scored resorts here.</p>';
  const W = 440, H = 300, L = 40, R = 10, T = 10, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const xMax = Math.max(5, Math.ceil(Math.max(...rows.map((r) => r.lifts)) / 5) * 5);
  const yMax = Math.min(100, Math.max(10, Math.ceil(Math.max(...rows.map((r) => r.worst)) / 10) * 10));
  const sx = (v) => L + (v / xMax) * pw, sy = (v) => T + ph - (v / yMax) * ph;
  const ticks = (max) => [0, 1, 2, 3, 4, 5].map((i) => Math.round((max * i) / 5));
  const byLifts = [...rows].sort((a, b) => b.lifts - a.lifts).slice(0, 4);
  const byWorst = rows.filter((r) => r.lifts >= 6).sort((a, b) => b.worst - a.worst).slice(0, 4);
  const best = rows.filter((r) => r.lifts >= 10).sort((a, b) => a.worst - b.worst).slice(0, 2);
  const minLifts = rows.length <= 25 ? 5 : rows.length <= 150 ? 10 : Infinity;
  const small = rows.length <= 150 ? rows.filter((r) => r.lifts >= minLifts).sort((a, b) => b.lifts - a.lifts) : null;
  const outliers = new Set(small || [...byLifts, ...byWorst, ...best]);
  const boxes = [];
  const labels = [...outliers].map((r) => {
    const short = r.name.replace(/ (Ski & Snowboard Resort|Ski Resort|Resort|Ski Area|Ski Center|Club)$/i, "");
    const name = short.length > 22 ? short.slice(0, 21) + "…" : short;
    const w = name.length * 5.6, y = sy(r.worst) + 4;
    const sides = [sx(r.lifts) - 6 - w, sx(r.lifts) + 6];
    if (sx(r.lifts) <= L + pw * 0.62) sides.reverse();
    const hit = (b) => b.l < L || b.r > W || boxes.some((o) => b.l < o.r && b.r > o.l && b.t < o.b && b.b > o.t);
    const x = sides.find((sx0) => !hit({ l: sx0 - 2, r: sx0 + w + 2, t: y - 11, b: y + 3 }));
    if (x === undefined) return "";
    boxes.push({ l: x - 2, r: x + w + 2, t: y - 11, b: y + 3 });
    return `<text x="${x}" y="${y}" font-size="10" font-weight="600" fill="#1e293b">${esc(name)}</text>`;
  }).join("");
  const dots = rows.map((r) => {
    const o = outliers.has(r);
    return `<circle cx="${sx(r.lifts)}" cy="${sy(r.worst)}" r="${o ? 4.5 : 3}" fill="${o ? "#0f766e" : "#94a3b8"}" opacity="${o ? 0.95 : 0.55}"><title>${esc(r.name)} (${esc(r.state || r.country)})
${r.lifts} lifts in loop · ${r.km} lappable km
Worst closure: ${r.lift}, ${r.worst}% lost · worst split ${r.split}%</title></circle>`;
  }).join("");
  const grid = ticks(yMax).map((v) => `<line x1="${L}" x2="${L + pw}" y1="${sy(v)}" y2="${sy(v)}" stroke="#e5e7eb"/><text x="${L - 5}" y="${sy(v) + 3}" font-size="9" text-anchor="end" fill="#64748b">${v}%</text>`).join("")
    + ticks(xMax).map((v) => `<text x="${sx(v)}" y="${T + ph + 13}" font-size="9" text-anchor="middle" fill="#64748b">${v}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Scatter of lifts in main loop versus worst single closure, ${rows.length} resorts">${grid}
    <text x="${L + pw / 2}" y="${H - 4}" font-size="10" text-anchor="middle" fill="#374151">Lifts in main loop</text>
    <text transform="rotate(-90)" x="${-(T + ph / 2)}" y="10" font-size="10" text-anchor="middle" fill="#374151">Worst single closure (% km lost)</text>
    ${dots}${labels}</svg>`;
}

async function bootRedundancyScatter(el) {
  const data = await (await fetch(el.dataset.src)).json();
  el.innerHTML = `<div class="guide-chart-title">${esc(el.dataset.title || "")}</div>
    <div class="guide-chart-sub">${esc(el.dataset.sub || "")}</div>
    <div class="guide-filter"><label>Country <select></select></label></div>
    <fieldset class="guide-states"><legend>State / province (pick any) <button type="button">Clear</button></legend><div></div></fieldset>
    <div data-plot></div>`;
  const cSel = el.querySelector("select");
  const box = el.querySelector(".guide-states div");
  const plot = el.querySelector("[data-plot]");
  const picked = new Set();
  const uniq = (rows, k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].sort();
  const draw = () => {
    plot.innerHTML = redundancySvg(data.filter((r) => (!cSel.value || r.country === cSel.value) && (!picked.size || picked.has(r.state))));
  };
  cSel.innerHTML = '<option value="">All countries</option>' + uniq(data, "country").map((v) => `<option>${esc(v)}</option>`).join("");
  cSel.addEventListener("change", () => {
    const states = uniq(data.filter((r) => !cSel.value || r.country === cSel.value), "state");
    [...picked].forEach((s) => states.includes(s) || picked.delete(s));
    box.innerHTML = states.map((s) => `<label><input type="checkbox" value="${esc(s)}"${picked.has(s) ? " checked" : ""}> ${esc(s)}</label>`).join("");
    draw();
  });
  box.addEventListener("change", (e) => {
    e.target.checked ? picked.add(e.target.value) : picked.delete(e.target.value);
    draw();
  });
  el.querySelector(".guide-states button").addEventListener("click", () => {
    picked.clear();
    box.querySelectorAll("input").forEach((i) => (i.checked = false));
    draw();
  });
  cSel.dispatchEvent(new Event("change"));
}

async function main() {
  document.querySelectorAll('[data-chart="redundancy"]').forEach((el) => bootRedundancyScatter(el).catch((err) => console.warn("[guide-maps] redundancy", err)));
  const [rows, passes] = await Promise.all([loadSkiAreasAnalyzed(), loadPasses()]);
  bootCharts(stats(rows), passes);
  await bootAllMaps();
}

main().catch((err) => console.warn("[guide-maps]", err));

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
        <text x="${left + w + 6}" y="${y + 13}" font-size="11" fill="#111827">${r.n.toLocaleString()}</text>`;
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

async function main() {
  const [rows, passes] = await Promise.all([loadSkiAreasAnalyzed(), loadPasses()]);
  bootCharts(stats(rows), passes);
  await bootAllMaps();
}

main().catch((err) => console.warn("[guide-maps]", err));

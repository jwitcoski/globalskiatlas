import { foldDiacritics, escapeHtml } from "./utils.js";

const REGION_TYPES = new Set(["country", "state", "continent"]);
const MAX_SUGGESTIONS = 8;

function displayName(p) {
  if (!p) return "";
  const en = String(p.englishName || "").trim();
  const local = String(p.title || p.name || "").trim();
  if (en && local && en !== local) return `${en} (${local})`;
  return en || local || p.pageId || "";
}

function wikiHref(pageId) {
  if (!pageId) return "/wiki/browse.html";
  return `/wiki/resort.html?page=${encodeURIComponent(pageId)}`;
}

function searchable(row) {
  return foldDiacritics(row.searchText || row.name).toLowerCase();
}

function matchRows(rows, rawQ) {
  const q = foldDiacritics(rawQ).toLowerCase().trim();
  if (!q) return [];
  const scored = [];
  for (const row of rows) {
    const hay = searchable(row);
    if (!hay.includes(q)) continue;
    let score = 1;
    if (hay.startsWith(q)) score = 3;
    else if (hay.includes(` ${q}`)) score = 2;
    scored.push({ row, score });
  }
  scored.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  return scored.slice(0, MAX_SUGGESTIONS).map((s) => s.row);
}

async function loadResortRows() {
  const res = await fetch("/api/wiki/index", { cache: "no-store" });
  if (!res.ok) throw new Error(`wiki index ${res.status}`);
  const data = await res.json();
  const pages = Array.isArray(data) ? data : data?.pages || [];
  return pages
    .filter((p) => p?.pageId && !REGION_TYPES.has(p.pageType))
    .map((p) => {
      const name = displayName(p);
      const loc = [p.state, p.country].filter(Boolean).join(", ");
      return {
        name,
        loc,
        pageId: p.pageId,
        searchText: [name, p.englishName, p.title, p.state, p.country].filter(Boolean).join(" "),
      };
    });
}

function bindHomeSearch(rows) {
  const form = document.getElementById("home-search");
  const input = document.getElementById("home-search-q");
  const dropdown = document.getElementById("home-search-dropdown");
  if (!form || !input || !dropdown || !rows.length) return;

  let selectedIndex = -1;
  let currentMatches = [];

  function hide() {
    dropdown.classList.remove("visible");
    dropdown.innerHTML = "";
    selectedIndex = -1;
    currentMatches = [];
  }

  function go(row) {
    if (!row?.pageId) return;
    window.location.assign(wikiHref(row.pageId));
  }

  function render(matches) {
    currentMatches = matches;
    selectedIndex = -1;
    if (!currentMatches.length) {
      hide();
      return;
    }
    dropdown.innerHTML = currentMatches
      .map((r, i) => {
        const loc = r.loc ? `<span class="home-search-loc">${escapeHtml(r.loc)}</span>` : "";
        return `<div class="search-item" data-index="${i}" role="option">${escapeHtml(r.name)}${loc}</div>`;
      })
      .join("");
    dropdown.classList.add("visible");
    dropdown.querySelectorAll(".search-item").forEach((el, i) => {
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        go(currentMatches[i]);
      });
    });
  }

  input.addEventListener("input", () => render(matchRows(rows, input.value)));
  input.addEventListener("focus", () => {
    const q = String(input.value || "").trim();
    if (q) render(matchRows(rows, q));
  });
  input.addEventListener("keydown", (e) => {
    if (!dropdown.classList.contains("visible") || !currentMatches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
      dropdown.querySelectorAll(".search-item").forEach((el, i) => el.classList.toggle("active", i === selectedIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      dropdown.querySelectorAll(".search-item").forEach((el, i) => el.classList.toggle("active", i === selectedIndex));
    } else if (e.key === "Escape") {
      hide();
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      go(currentMatches[selectedIndex]);
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const matches = currentMatches.length ? currentMatches : matchRows(rows, input.value);
    const pick = selectedIndex >= 0 ? matches[selectedIndex] : matches[0];
    if (pick) go(pick);
  });
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) hide();
  });
}

const form = document.getElementById("home-search");
if (form) {
  loadResortRows()
    .then(bindHomeSearch)
    .catch((err) => console.warn("[home-search] catalog skipped", err));
}

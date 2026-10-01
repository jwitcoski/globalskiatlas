/**
 * Shared ski-pass filter. Pages mount the same chips and ask matchesPass().
 * The choice is stored in localStorage (and ?pass= when present) so it follows
 * the visitor from the homepage to the map, drive-time, comparison, and game.
 */
const STORAGE_KEY = "gsa-pass-filter";

export const PASS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "epic", label: "Epic", chip: "epic" },
  { id: "ikon", label: "Ikon", chip: "ikon" },
  { id: "indy", label: "Indy", chip: "indy" },
  { id: "mountain_collective", label: "MC", chip: "mc" },
  { id: "independent", label: "Independent" },
];

const VALID = new Set(PASS_OPTIONS.map((p) => p.id));

let byId = null;
let loadPromise = null;
let filter = null;
const listeners = new Set();

function readStored() {
  try {
    if (typeof location !== "undefined") {
      const q = new URLSearchParams(location.search).get("pass");
      if (VALID.has(q)) {
        try { localStorage.setItem(STORAGE_KEY, q); } catch { /* private mode */ }
        return q;
      }
    }
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (VALID.has(stored)) return stored;
    }
  } catch { /* storage blocked */ }
  return "all";
}

export function getPassFilter() {
  if (filter == null) filter = readStored();
  return filter;
}

export function setPassFilter(id) {
  const next = VALID.has(id) ? id : "all";
  if (next === getPassFilter()) return;
  filter = next;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  } catch { /* private mode */ }
  listeners.forEach((fn) => fn(next));
}

export function onPassFilterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function passesForId(winterSportsId) {
  if (!byId || winterSportsId == null || winterSportsId === "") return [];
  const row = byId[String(winterSportsId)];
  return (row && row.passes) || [];
}

export function matchesPass(passes, active = getPassFilter()) {
  const list = Array.isArray(passes) ? passes : [];
  if (!active || active === "all") return true;
  if (active === "independent") return list.length === 0;
  return list.includes(active);
}

/** MapLibre filter: tier layer AND the active pass. `_pass` is a comma-joined id list. */
export function tierPassFilter(tier, active = getPassFilter()) {
  const tierExpr = ["==", ["get", "_tier"], tier];
  if (!active || active === "all") return tierExpr;
  if (active === "independent") return ["all", tierExpr, ["==", ["get", "_pass"], ""]];
  return ["all", tierExpr, ["in", active, ["get", "_pass"]]];
}

export function passBadgeLabel(id) {
  if (id === "mountain_collective") return "MC";
  return String(id || "").slice(0, 2).toUpperCase();
}

export function loadPassAffiliations(url = "/data/pass-affiliations.json") {
  if (byId) return Promise.resolve(byId);
  if (!loadPromise) {
    loadPromise = fetch(url)
      .then((r) => (r.ok ? r.json() : { by_id: {} }))
      .then((json) => {
        byId = json.by_id || {};
        return byId;
      })
      .catch(() => {
        byId = {};
        return byId;
      });
  }
  return loadPromise;
}

/** Test hook. Production pages load the JSON instead. */
export function setPassIndex(index) {
  byId = index || {};
  loadPromise = Promise.resolve(byId);
}

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById("gsa-pass-filter-css")) return;
  const style = document.createElement("style");
  style.id = "gsa-pass-filter-css";
  style.textContent = `
.pass-filter { display: flex; flex-wrap: wrap; gap: 6px; }
.pass-chip {
  border: 1px solid #d1d5db; background: #fff; color: #111;
  border-radius: 999px; padding: 6px 10px; min-height: 32px;
  font: 600 12px/1.2 system-ui, sans-serif; cursor: pointer;
}
.pass-chip.on { border-color: #111; background: #111; color: #fff; }
.pass-chip.epic.on { background: #1d4ed8; border-color: #1d4ed8; }
.pass-chip.ikon.on { background: #0f766e; border-color: #0f766e; }
.pass-chip.indy.on { background: #b45309; border-color: #b45309; }
.pass-chip.mc.on { background: #6d28d9; border-color: #6d28d9; }
.search-box .pass-filter, .pass-filter-float {
  padding: 6px; background: rgba(255,255,255,.94); border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}
.search-box .pass-filter { margin-bottom: 6px; }
.pass-filter-float {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 1000; width: max-content; max-width: calc(100% - 24px);
}
.hero-search { flex-wrap: wrap; }
.hero-search > .pass-filter { flex: 1 0 100%; }
`;
  document.head.appendChild(style);
}

export function mountPassFilter(root) {
  ensureStyles();
  const el = typeof root === "string" ? document.querySelector(root) : root;
  if (!el || el.dataset.passMounted) return el;
  el.dataset.passMounted = "1";
  if (!el.getAttribute("role")) el.setAttribute("role", "group");
  if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Pass filter");
  if (!el.querySelector("[data-pass]")) {
    el.classList.add("pass-filter");
    el.innerHTML = PASS_OPTIONS.map((p) => {
      const chip = p.chip ? ` ${p.chip}` : "";
      return `<button type="button" class="pass-chip${chip}" data-pass="${p.id}">${p.label}</button>`;
    }).join("");
  }
  const paint = () => {
    const cur = getPassFilter();
    el.querySelectorAll("[data-pass]").forEach((btn) => {
      btn.classList.toggle("on", btn.getAttribute("data-pass") === cur);
    });
  };
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pass]");
    if (!btn || !el.contains(btn)) return;
    setPassFilter(btn.getAttribute("data-pass"));
  });
  paint();
  onPassFilterChange(paint);
  return el;
}

/** Put the chips in #pass-filter, else above #searchBox, else floated on the map. */
export function placePassFilterNear(mapEl) {
  ensureStyles();
  const existing = document.getElementById("pass-filter");
  if (existing) return mountPassFilter(existing);
  const mapNode = typeof mapEl === "string" ? document.getElementById(mapEl) : mapEl;
  const search = document.getElementById("searchBox");
  if (search && mapNode && search.parentElement === mapNode.parentElement) {
    const bar = document.createElement("div");
    bar.id = "pass-filter";
    search.insertBefore(bar, search.firstChild);
    return mountPassFilter(bar);
  }
  if (!mapNode || !mapNode.parentElement) return null;
  const parent = mapNode.parentElement;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
  const bar = document.createElement("div");
  bar.id = "pass-filter";
  bar.className = "pass-filter-float";
  parent.appendChild(bar);
  return mountPassFilter(bar);
}

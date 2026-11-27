// ponytail: runnable check for playable wiki name folding (mirrors playable/index.html)
function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function wikiNameKeys(name) {
  const k = foldName(name);
  if (!k) return [];
  const keys = [k];
  const stripped = k
    .replace(/\b(ski area|ski resort|ski hill|mountain resort)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== k) keys.push(stripped);
  return keys;
}

function buildWikiByName(pages) {
  const byName = new Map();
  for (const p of pages || []) {
    if (p.pageType && p.pageType !== "resort") continue;
    if (!p.pageId) continue;
    for (const key of [...wikiNameKeys(p.title), ...wikiNameKeys(p.englishName)]) {
      if (!byName.has(key)) byName.set(key, p);
    }
  }
  return byName;
}

function wikiHrefFor(w, byName) {
  for (const k of wikiNameKeys(w?.name)) {
    const hit = byName.get(k);
    if (hit?.pageId) return `/wiki/resort.html?page=${encodeURIComponent(hit.pageId)}`;
  }
  return "";
}

const pages = [
  { pageId: "montage-mountain-ski-area-pennsylvania", title: "Montage Mountain Ski Area", englishName: "Montage Mountain Ski Area", pageType: "resort" },
  { pageId: "kvitfjell-oppland", title: "Kvitfjell", pageType: "resort" },
];
const byName = buildWikiByName(pages);
console.assert(wikiHrefFor({ name: "Montage Mountain" }, byName).includes("montage-mountain-ski-area-pennsylvania"), "montage");
console.assert(wikiHrefFor({ name: "Kvitfjell" }, byName).includes("kvitfjell-oppland"), "kvitfjell");
console.assert(wikiHrefFor({ name: "Unknown Hill" }, byName) === "", "miss");
console.assert(wikiNameKeys("Montage Mountain Ski Area").includes("montage mountain"), "strip ski area");
console.log("wiki-name-match.check.js: ok");

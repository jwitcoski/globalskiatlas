// ponytail: runnable check mirroring wikiHrefForClayResort in hero-montage-map.js
function wikiHrefForClayResort(resort, wikiIndexPages, fallbackHref = "/wiki/browse.html") {
  const ws = String(resort?.winter_sports_id || "");
  const name = resort?.display_name || resort?.short_name || "";
  if (Array.isArray(wikiIndexPages)) {
    if (ws) {
      const hit = wikiIndexPages.find(
        (p) => String(p.winterSportsId || p.winter_sports_id || "") === ws,
      );
      if (hit?.pageId) return `/wiki/resort.html?page=${encodeURIComponent(hit.pageId)}`;
    }
    if (name) return `/mainmap.html?q=${encodeURIComponent(name)}`;
  }
  const fb = String(fallbackHref || "");
  if (fb.includes("resort.html") && /[?&]page=/.test(fb)) return fb;
  if (name) return `/mainmap.html?q=${encodeURIComponent(name)}`;
  return "/wiki/browse.html";
}

const pages = [
  { pageId: "montage-mountain-ski-area-pennsylvania", winterSportsId: "45096232" },
  { pageId: "liberty-mountain-resort-pennsylvania", winterSportsId: "123" },
];
const fallback = "/wiki/resort.html?page=montage-mountain-ski-area-pennsylvania";

console.assert(
  wikiHrefForClayResort(
    { winter_sports_id: "45096232", display_name: "Montage Mountain" },
    pages,
    fallback,
  ).includes("montage-mountain-ski-area-pennsylvania"),
  "ws hit montage",
);
console.assert(
  wikiHrefForClayResort(
    { winter_sports_id: "123", display_name: "Liberty Mountain Resort" },
    pages,
    fallback,
  ).includes("liberty-mountain-resort-pennsylvania"),
  "ws hit liberty",
);
console.assert(
  wikiHrefForClayResort(
    { winter_sports_id: "45096232", display_name: "Montage Mountain" },
    null,
    fallback,
  ) === fallback,
  "pending index keeps fallback",
);
console.assert(
  wikiHrefForClayResort(
    { winter_sports_id: "999", display_name: "Mystery Hill" },
    pages,
    fallback,
  ).includes("mainmap.html?q=Mystery%20Hill"),
  "loaded index miss goes to map search",
);
console.assert(
  wikiHrefForClayResort({}, null, "/wiki/browse.html") === "/wiki/browse.html",
  "empty falls back to browse",
);
console.log("wiki-href-for-clay.check.js: ok");

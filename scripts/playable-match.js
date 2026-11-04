import { config } from "./map-config.js";
import { foldDiacritics } from "./utils.js";

function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function matchPlayableResort(lon, lat, name, properties, playableResorts) {
  if (!playableResorts?.length) return null;
  const osm = String(
    properties?.winter_sports_id || properties?.osm_id || properties?.osmId || properties?.id || "",
  ).replace(/^[^0-9]*/, "");
  const nameN = foldDiacritics(name || "").toLowerCase().trim();
  let best = null;
  let bestD = Infinity;
  for (const r of playableResorts) {
    const rid = String(r.id || "");
    const rWs = String(r.winter_sports_id || "");
    if (osm && (rWs === osm || rid === osm || rid.startsWith(`${osm}_`))) {
      return r;
    }
    const rn = foldDiacritics(r.name || r.display_name || r.short_name || "").toLowerCase().trim();
    const nameHit = nameN && rn && (nameN === rn || nameN.includes(rn) || rn.includes(nameN));
    const d = haversineKm(lat, lon, Number(r.lat), Number(r.lon));
    if (!Number.isFinite(d)) {
      if (nameHit && nameN === rn) return r;
      continue;
    }
    const maxD = nameHit ? 8 : 2.2;
    if (d <= maxD && d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

let playableCatalogPromise;

// Each world gets `path` = its id so callers that dedupe/route by path keep working.
export async function fetchPlayableCatalog() {
  if (!playableCatalogPromise) {
    playableCatalogPromise = (async () => {
      const r = await fetch(config.GAME_PLAY_WORLDS_URL);
      if (!r.ok) throw new Error(`Playable catalog fetch failed (${r.status})`);
      const data = await r.json();
      const list = (Array.isArray(data?.resorts) ? data.resorts : []).map((w) => ({ ...w, path: w.id }));
      if (!list.length) throw new Error("Playable catalog is empty");
      return list;
    })();
    playableCatalogPromise.catch(() => {
      playableCatalogPromise = null;
    });
  }
  return playableCatalogPromise;
}

export function playableHrefForWorld(id) {
  const world = String(id || "").trim();
  return world ? `/playable/diorama.html?world=${encodeURIComponent(world)}` : "";
}

export function playableHrefFromClayResort(clay, playableResorts) {
  if (!clay) return "";
  const ws = String(clay.winter_sports_id || "");
  const id = String(clay.id || "");
  const hit = (playableResorts || []).find((r) => {
    if (ws && String(r.winter_sports_id || "") === ws) return true;
    return Boolean(id) && String(r.id || "") === id;
  });
  return hit ? playableHrefForWorld(hit.id) : "";
}

// Accepts a world id; legacy "id/ver" paths are reduced to the id.
export function playableHrefFromPath(path) {
  const rel = String(path || "").replace(/^\/+|\/+$/g, "");
  return playableHrefForWorld(rel.split("/")[0]);
}

export function playableHrefForResort(entity, properties, playableResorts) {
  const props = properties || entity?.properties || {};
  const lon = Number(props.lon ?? props.lng ?? props.longitude);
  const lat = Number(props.lat ?? props.latitude);
  const name = entity?.name || props.english_name || props.name || "";
  const hit = matchPlayableResort(lon, lat, name, {
    ...props,
    winter_sports_id: entity?.winterSportsId || props.winter_sports_id,
    osm_id: props.osm_id || entity?.winterSportsId || props.winter_sports_id,
  }, playableResorts);
  return hit ? playableHrefForWorld(hit.id) : "";
}

let clayCatalogPromise;

export async function fetchClayCatalog() {
  if (!clayCatalogPromise) {
    clayCatalogPromise = fetch("/clay_scenes/catalog.json")
      .then((r) => (r.ok ? r.json() : { resorts: [] }))
      .then((data) => (Array.isArray(data?.resorts) ? data.resorts : []))
      .catch(() => []);
  }
  return clayCatalogPromise;
}

export function clayHomeHrefForWsId(winterSportsId, clayResorts) {
  const ws = String(winterSportsId || "").replace(/^[^0-9]*/, "");
  if (!ws || !clayResorts?.length) return "";
  const hit = clayResorts.find((r) => String(r.winter_sports_id || "") === ws);
  if (!hit?.id) return "";
  return `/?resort=${encodeURIComponent(hit.id)}`;
}

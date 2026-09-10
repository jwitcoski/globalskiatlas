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

export async function fetchPlayableCatalog() {
  const urls = ["/game_scenes/catalog.json", config.GAME_SCENES_CATALOG_URL];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      const list = Array.isArray(data?.resorts) ? data.resorts : [];
      if (list.length) return list;
    } catch {
      /* try next */
    }
  }
  throw new Error("Playable catalog fetch failed");
}

export function playableHrefFromPath(path) {
  const rel = String(path || "").replace(/^\/+|\/+$/g, "");
  if (!rel) return "";
  const slash = rel.indexOf("/");
  const q = new URLSearchParams();
  q.set("resort", slash < 0 ? rel : rel.slice(0, slash));
  if (slash >= 0) q.set("ver", rel.slice(slash + 1));
  return `/playable/?${q.toString()}`;
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
  if (!hit) return "";
  if (hit.path) return playableHrefFromPath(hit.path);
  const ver = hit.scene_version || hit.playable_ver;
  if (hit.id && ver) {
    return `/playable/?resort=${encodeURIComponent(hit.id)}&ver=${encodeURIComponent(ver)}`;
  }
  return "";
}

/**
 * IP city estimate + closest clay-catalog resort (join winter_sports_id to ski-area centroids).
 */

import { config } from "../map-config.js";

const GEO_URL = `https://api.maptiler.com/geolocation/ip.json?key=${config.MAPTILER_KEY}`;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = p2 - p1;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function lookupIpLocation() {
  const res = await fetch(GEO_URL);
  if (!res.ok) throw new Error(`geolocation ${res.status}`);
  const loc = await res.json();
  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("geolocation missing coordinates");
  }
  return {
    lat,
    lon,
    city: loc.city || "",
    region: loc.region || loc.region_name || "",
    country: loc.country || loc.country_code || "",
  };
}

function featureCentroid(feature) {
  const p = feature?.properties || {};
  const lat = Number(p.centroid_lat);
  const lon = Number(p.centroid_lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  const g = feature?.geometry;
  if (g?.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    return { lon: Number(g.coordinates[0]), lat: Number(g.coordinates[1]) };
  }
  return null;
}

let centroidsPromise;

async function loadSkiAreaCentroids() {
  if (!centroidsPromise) {
    centroidsPromise = (async () => {
      const res = await fetch(config.SKI_AREAS_MAPTILER_URL);
      if (!res.ok) throw new Error(`ski areas ${res.status}`);
      const gj = await res.json();
      const byWs = new Map();
      for (const f of gj.features || []) {
        const id = String(f.properties?.winter_sports_id || "");
        const c = featureCentroid(f);
        if (!id || !c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue;
        byWs.set(id, c);
      }
      return byWs;
    })();
  }
  return centroidsPromise;
}

/** Catalog rows nearest-first. Unknown coords go last. */
export async function rankedNearestClayResorts(resorts, origin) {
  if (!resorts?.length) return [];
  if (!origin) return resorts.slice();
  const centroids = await loadSkiAreaCentroids();
  return resorts
    .map((r) => {
      const c = centroids.get(String(r?.winter_sports_id || ""));
      const d = c ? haversineKm(origin.lat, origin.lon, c.lat, c.lon) : Infinity;
      return { r, d };
    })
    .sort((a, b) => a.d - b.d)
    .map((x) => x.r);
}

/**
 * @param {Array<{ winter_sports_id?: string }>} resorts
 * @param {{ lat: number, lon: number }} origin
 * @returns {number} index into resorts, or -1
 */
export async function indexOfNearestClayResort(resorts, origin) {
  const ranked = await rankedNearestClayResorts(resorts, origin);
  if (!ranked.length) return -1;
  const first = ranked[0];
  return resorts.indexOf(first);
}

export async function loadClayResorts() {
  const catalog = await fetch("/clay_scenes/catalog.json").then((r) => {
    if (!r.ok) throw new Error("clay catalog");
    return r.json();
  });
  return catalog?.resorts || [];
}

/** IP city plus nearest clay-catalog resort (e.g. Liberty Mountain). */
export async function resolveVisitorNearestClay() {
  const [origin, resorts] = await Promise.all([lookupIpLocation(), loadClayResorts()]);
  const idx = await indexOfNearestClayResort(resorts, origin);
  return {
    origin,
    nearest: idx >= 0 ? resorts[idx] : null,
  };
}

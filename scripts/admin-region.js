/**
 * Administrative-region helpers for wiki state/country maps:
 * geocode a polygon, mask the rest of the world, match resorts to the region.
 */
import { config } from './map-config.js';
import { getProp, COUNTRY_KEYS, STATE_KEYS } from './utils.js';

const US_STATE_BY_ABBR = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

const US_ABBR_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_BY_ABBR).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

export const ADMIN_MASK_SOURCE = 'gsa-admin-mask';
export const ADMIN_MASK_LAYER = 'gsa-admin-mask-fill';
export const ADMIN_OUTLINE_SOURCE = 'gsa-admin-outline';
export const ADMIN_OUTLINE_FILL = 'gsa-admin-outline-fill';
export const ADMIN_OUTLINE_LINE = 'gsa-admin-outline-line';
export const ADMIN1_SOURCE = 'gsa-admin1';
export const ADMIN1_FILL = 'gsa-admin1-fill';
export const ADMIN1_LINE = 'gsa-admin1-line';

const NE_ADMIN1_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_50m_admin_1_states_provinces.geojson';

let regionCatalogPromise = null;
let naturalEarthPromise = null;

export function clampLonLatBbox(bbox) {
  if (!bbox || bbox.length < 4) return null;
  return [
    Math.max(-179.9, Math.min(179.9, Number(bbox[0]))),
    Math.max(-85, Math.min(85, Number(bbox[1]))),
    Math.max(-179.9, Math.min(179.9, Number(bbox[2]))),
    Math.max(-85, Math.min(85, Number(bbox[3]))),
  ];
}

export function fetchRegionClayCatalog() {
  if (!regionCatalogPromise) {
    regionCatalogPromise = fetch('/clay_scenes/regions/catalog.json')
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .catch(() => ({ regions: [] }));
  }
  return regionCatalogPromise;
}

export async function findReadyRegionRow(pageId) {
  const id = String(pageId || '');
  if (!id) return null;
  const catalog = await fetchRegionClayCatalog();
  return (catalog.regions || []).find((row) => row.pageId === id && row.ready) || null;
}

function fetchNaturalEarthAdmin1() {
  if (!naturalEarthPromise) {
    naturalEarthPromise = fetch(NE_ADMIN1_URL)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .catch(() => ({ features: [] }));
  }
  return naturalEarthPromise;
}

function neMatchesUnit(feature, unit) {
  const props = feature?.properties || {};
  const country = props.admin || props.adm0_name || props.ADM0_NAME || props.geounit;
  const state = props.name || props.woe_name || props.gn_name || props.NAME;
  return countriesMatch(country, unit.country) && statesMatch(state, unit.state || unit.title);
}

export async function loadCountryAdmin1Features(country) {
  const catalog = await fetchRegionClayCatalog();
  const units = (catalog.regions || []).filter((row) => (
    row.pageType === 'state'
    && row.ready
    && countriesMatch(row.country, country)
  ));
  if (!units.length) return { type: 'FeatureCollection', features: [] };

  let neFeatures = [];
  try {
    const ne = await fetchNaturalEarthAdmin1();
    neFeatures = ne.features || [];
  } catch {
    neFeatures = [];
  }

  const features = units.map((unit) => {
    const hit = neFeatures.find((f) => neMatchesUnit(f, unit));
    const geometry = hit?.geometry || bboxToPolygon(unit.bbox);
    return {
      type: 'Feature',
      geometry,
      properties: {
        kind: 'admin1',
        pageId: unit.pageId,
        pageType: 'state',
        title: unit.title || unit.state || unit.pageId,
        state: unit.state || unit.title || '',
        country: unit.country || country,
        resort_count: unit.resort_count || 0,
        has_region_scene: true,
        scene: `clay_scenes/regions/${unit.pageId}/scene-manifest.json`,
      },
    };
  }).filter((f) => f.geometry);

  return { type: 'FeatureCollection', features };
}

export function addAdmin1InteractiveLayer(map, fc) {
  if (!map || !fc?.features?.length) return;
  if (map.getSource(ADMIN1_SOURCE)) {
    map.getSource(ADMIN1_SOURCE).setData(fc);
  } else {
    map.addSource(ADMIN1_SOURCE, { type: 'geojson', data: fc, generateId: true });
    map.addLayer({
      id: ADMIN1_FILL,
      type: 'fill',
      source: ADMIN1_SOURCE,
      paint: {
        'fill-color': '#2563eb',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.28,
          0.08,
        ],
      },
    });
    map.addLayer({
      id: ADMIN1_LINE,
      type: 'line',
      source: ADMIN1_SOURCE,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#f8fafc',
          '#1d4ed8',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          2.4,
          1.1,
        ],
        'line-opacity': 0.95,
      },
    });
  }
}

export function fitMapToBbox(map, rawBbox) {
  const bbox = clampLonLatBbox(rawBbox);
  if (!map || !bbox || bbox[2] <= bbox[0] || bbox[3] <= bbox[1]) return null;
  const lonSpan = Math.max(bbox[2] - bbox[0], 0.01);
  const latSpan = Math.max(bbox[3] - bbox[1], 0.01);
  const lonPad = Math.max(0.35, lonSpan * 0.06);
  const latPad = Math.max(0.35, latSpan * 0.06);
  try {
    map.resize();
    map.fitBounds(
      [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
      { padding: 36, duration: 0, maxZoom: lonSpan > 25 ? 5.5 : 11 },
    );
    map.setMaxBounds([
      [Math.max(-180, bbox[0] - lonPad), Math.max(-85, bbox[1] - latPad)],
      [Math.min(180, bbox[2] + lonPad), Math.min(85, bbox[3] + latPad)],
    ]);
  } catch (err) {
    console.warn('[admin-region] bbox fitBounds failed', err);
  }
  return bbox;
}

export function foldName(s) {
  if (s == null || s === '') return '';
  return String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function normCountryName(c) {
  const s = foldName(c);
  if (!s) return '';
  if (/^(united states|usa|u\.?s\.?a\.?|united states of america|us)$/.test(s)) return 'usa';
  if (/^(uk|united kingdom|great britain)$/.test(s)) return 'united kingdom';
  return s;
}

export function normStateName(s) {
  const raw = String(s || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (US_STATE_BY_ABBR[upper]) return US_STATE_BY_ABBR[upper].toLowerCase();
  const folded = foldName(raw);
  if (US_ABBR_BY_NAME[folded]) return folded;
  return folded;
}

export function countriesMatch(a, b) {
  const na = normCountryName(a);
  const nb = normCountryName(b);
  return !!na && na === nb;
}

export function statesMatch(a, b) {
  const na = normStateName(a);
  const nb = normStateName(b);
  return !!na && na === nb;
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lon, lat, coords) {
  if (!coords?.length) return false;
  if (!pointInRing(lon, lat, coords[0])) return false;
  for (let i = 1; i < coords.length; i++) {
    if (pointInRing(lon, lat, coords[i])) return false;
  }
  return true;
}

export function pointInAdminGeometry(lon, lat, geometry) {
  if (!geometry || !Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  if (geometry.type === 'Polygon') return pointInPolygonCoords(lon, lat, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInPolygonCoords(lon, lat, poly));
  }
  return false;
}

function extendBbox(bbox, lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
  bbox[0] = Math.min(bbox[0], lon);
  bbox[1] = Math.min(bbox[1], lat);
  bbox[2] = Math.max(bbox[2], lon);
  bbox[3] = Math.max(bbox[3], lat);
}

function walkCoords(coords, bbox) {
  if (!coords) return;
  if (typeof coords[0] === 'number') {
    extendBbox(bbox, coords[0], coords[1]);
    return;
  }
  for (const c of coords) walkCoords(c, bbox);
}

export function geometryBbox(geometry) {
  if (!geometry) return null;
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  walkCoords(geometry.coordinates, bbox);
  if (!Number.isFinite(bbox[0])) return null;
  return bbox;
}

export function bboxToPolygon(bbox) {
  if (!bbox || bbox.length < 4) return null;
  const [w, s, e, n] = bbox;
  return {
    type: 'Polygon',
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  };
}

function ringHolesFromGeometry(geometry) {
  const holes = [];
  if (!geometry) return holes;
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates || []) holes.push(ring);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates || []) {
      for (const ring of poly) holes.push(ring);
    }
  }
  return holes;
}

export function worldMaskFeature(geometry) {
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [world, ...ringHolesFromGeometry(geometry)],
    },
  };
}

function featureLooksLike(feature, region) {
  const featText = foldName(feature?.text || '');
  if (region.pageType === 'country') {
    return countriesMatch(feature?.text, region.country || region.title);
  }
  return statesMatch(feature?.text, region.state || region.title);
}

function pickGeocodeFeature(features, region) {
  const list = Array.isArray(features) ? features : [];
  const named = list.find((f) => featureLooksLike(f, region) && f.geometry && f.geometry.type !== 'Point')
    || list.find((f) => f.geometry && f.geometry.type !== 'Point')
    || list.find((f) => featureLooksLike(f, region))
    || list[0];
  return named || null;
}

function geometryFromFeature(feature) {
  if (!feature) return null;
  if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
    return feature.geometry;
  }
  if (Array.isArray(feature.bbox) && feature.bbox.length >= 4) return bboxToPolygon(feature.bbox);
  return null;
}

async function fetchMaptilerHit(region) {
  const query = region.pageType === 'country'
    ? (region.country || region.title || '')
    : [region.state || region.title, region.country].filter(Boolean).join(', ');
  if (!query) return null;
  const types = region.pageType === 'country' ? 'country' : 'region';
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${config.MAPTILER_KEY}&limit=5&types=${types}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return pickGeocodeFeature(data.features, region);
}

function osmIdFromRef(ref) {
  if (!ref || typeof ref !== 'string') return '';
  const m = ref.match(/^osm:([nwr])(\d+)$/i);
  if (!m) return '';
  const type = m[1].toLowerCase() === 'n' ? 'N' : m[1].toLowerCase() === 'w' ? 'W' : 'R';
  return type + m[2];
}

async function fetchNominatimByOsmId(osmId) {
  if (!osmId) return null;
  const params = new URLSearchParams({
    format: 'json',
    polygon_geojson: '1',
    osm_ids: osmId,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/lookup?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const geom = rows?.[0]?.geojson;
  if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) return geom;
  return null;
}

async function fetchNominatimBoundary(region) {
  const params = new URLSearchParams({
    format: 'json',
    polygon_geojson: '1',
    limit: '1',
  });
  if (region.pageType === 'country') {
    params.set('country', region.country || region.title || '');
  } else {
    params.set('state', region.state || region.title || '');
    if (region.country) params.set('country', region.country);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const geom = rows?.[0]?.geojson;
  if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) return geom;
  return null;
}

async function fetchLocalAdminBoundary(osmId, region) {
  const params = new URLSearchParams();
  if (osmId) params.set('osm_id', osmId);
  if (region?.pageType) params.set('pageType', region.pageType);
  if (region?.state) params.set('state', region.state);
  if (region?.country) params.set('country', region.country);
  const res = await fetch(`/api/admin-boundary?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const geom = data?.geometry;
  if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) return geom;
  return null;
}

export async function fetchAdminBoundary(region) {
  if (!region) return null;
  let hit = null;
  try {
    hit = await fetchMaptilerHit(region);
  } catch (err) {
    console.warn('[admin-region] MapTiler geocode failed', err);
  }
  const osmId = osmIdFromRef(hit?.properties?.ref);
  try {
    const local = await fetchLocalAdminBoundary(osmId, region);
    if (local) return local;
  } catch (err) {
    console.warn('[admin-region] local boundary proxy failed', err);
  }
  try {
    const fromOsmId = await fetchNominatimByOsmId(osmId);
    if (fromOsmId) return fromOsmId;
  } catch (err) {
    console.warn('[admin-region] Nominatim lookup failed', err);
  }
  try {
    const osm = await fetchNominatimBoundary(region);
    if (osm) return osm;
  } catch (err) {
    console.warn('[admin-region] Nominatim search failed', err);
  }
  return geometryFromFeature(hit);
}

export function resortInRegion(properties, geometry, lon, lat, region) {
  if (!region) return true;
  if (geometry && pointInAdminGeometry(lon, lat, geometry)) return true;
  if (region.country && !countriesMatch(getProp(properties, COUNTRY_KEYS), region.country)) return false;
  if (region.pageType === 'country') return countriesMatch(getProp(properties, COUNTRY_KEYS), region.country || region.title);
  if (region.pageType === 'state') {
    return statesMatch(getProp(properties, STATE_KEYS), region.state || region.title)
      && (!region.country || countriesMatch(getProp(properties, COUNTRY_KEYS), region.country));
  }
  return false;
}

export function addAdminRegionOverlay(map, geometry) {
  if (!map || !geometry) return null;
  const bbox = geometryBbox(geometry);
  const outline = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry }],
  };
  const mask = {
    type: 'FeatureCollection',
    features: [worldMaskFeature(geometry)],
  };

  if (map.getSource(ADMIN_MASK_SOURCE)) {
    map.getSource(ADMIN_MASK_SOURCE).setData(mask);
  } else {
    map.addSource(ADMIN_MASK_SOURCE, { type: 'geojson', data: mask });
    map.addLayer({
      id: ADMIN_MASK_LAYER,
      type: 'fill',
      source: ADMIN_MASK_SOURCE,
      paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.72 },
    });
  }

  if (map.getSource(ADMIN_OUTLINE_SOURCE)) {
    map.getSource(ADMIN_OUTLINE_SOURCE).setData(outline);
  } else {
    map.addSource(ADMIN_OUTLINE_SOURCE, { type: 'geojson', data: outline });
    map.addLayer({
      id: ADMIN_OUTLINE_FILL,
      type: 'fill',
      source: ADMIN_OUTLINE_SOURCE,
      paint: { 'fill-color': '#1a365d', 'fill-opacity': 0.06 },
    });
    map.addLayer({
      id: ADMIN_OUTLINE_LINE,
      type: 'line',
      source: ADMIN_OUTLINE_SOURCE,
      paint: {
        'line-color': '#1a365d',
        'line-width': 2.2,
        'line-opacity': 0.95,
      },
    });
  }

  if (bbox) {
    fitMapToAdminExtent(map, geometry);
  }
  return bbox;
}

export function fitMapToAdminExtent(map, geometry) {
  return fitMapToBbox(map, geometryBbox(geometry));
}

export function fitFeatures(map, features) {
  if (!map || !features?.length) return;
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) {
    const c = f.geometry?.coordinates;
    if (c) extendBbox(bbox, c[0], c[1]);
  }
  if (!Number.isFinite(bbox[0])) return;
  try {
    map.fitBounds(bbox, { padding: 48, duration: 0, maxZoom: 12 });
  } catch (err) {
    console.warn('[admin-region] feature fitBounds failed', err);
  }
}

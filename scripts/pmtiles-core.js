/**
 * Shared PMTiles protocol + ski layer wiring for MapTiler SDK maps.
 */
import { config } from './map-config.js';
import { ATLAS_COLORS, PISTE_LINE_COLOR } from './map-colors.js';

export { ATLAS_COLORS, PISTE_LINE_COLOR } from './map-colors.js';

export const PMTILES_CORE_VERSION = 'v11';

let protocolReady = null;
let pmtilesProtocol = null;
let overviewPm = null;
let resortPm = null;
let mvtLibs = null;
let turfUnionLib = null;

const LOG = '[PMTiles]';

function pmtilesLog(...args) {
  console.log(LOG, ...args);
}

function pmtilesWarn(...args) {
  console.warn(LOG, ...args);
}

export const SKI_PMTILES_SOURCES = {
  overview: 'ski-overview',
  resort: 'ski-resort'
};

export const SKI_BOUNDARY_OVERLAY_SOURCE = 'ski-boundaries-overlay';

export const SKI_PMTILES_LAYERS = {
  analyzed: 'ski-areas-analyzed',
  areasFill: 'ski-areas-fill',
  areasOutline: 'ski-areas-outline',
  areasPoint: 'ski-areas-point',
  areasLabels: 'ski-areas-labels',
  pistes: 'pistes',
  liftsCasing: 'lifts-casing',
  lifts: 'lifts',
  resortBuffer: 'resort-buffer',
  resortBufferOutline: 'resort-buffer-outline',
  resortOsmFill: 'resort-osm-fill',
  resortOsmLine: 'resort-osm-line',
  resortContours: 'resort-contours',
  boundaryFill: 'ski-boundary-fill',
  boundaryLine: 'ski-boundary-line',
  bufferLine: 'ski-buffer-line'
};

export function toPmtilesUrl(httpUrl) {
  return 'pmtiles://' + String(httpUrl).replace(/^pmtiles:\/\//, '');
}

/** MapLibre strips ':' from nested http(s) inside pmtiles:// URLs — restore before fetch. */
export function fixPmtilesProtocolUrl(url) {
  return String(url)
    .replace(/^pmtiles:\/\/(https?)\/\//, 'pmtiles://$1://')
    .replace(/^(https?)\/\//, '$1://');
}

async function loadPmtilesLib() {
  return import('./vendor/pmtiles.esm.js');
}

/** Register pmtiles:// protocol once (MapTiler SDK extends MapLibre). */
export async function initPmtilesProtocol(sdk) {
  if (protocolReady) return protocolReady;
  protocolReady = (async () => {
    const lib = sdk ?? (typeof maptilersdk !== 'undefined' ? maptilersdk : null);
    if (!lib?.addProtocol) {
      throw new Error('[PMTiles] addProtocol missing — load maptiler-sdk.umd.min.js first');
    }

    const { Protocol, PMTiles } = await loadPmtilesLib();
    pmtilesProtocol = new Protocol();
    let protocolCalls = 0;
    const handler = (req, arg2) => {
      protocolCalls++;
      const fixedUrl = fixPmtilesProtocolUrl(req?.url || '');
      if (req?.url && fixedUrl !== req.url) {
        req = { ...req, url: fixedUrl };
      }
      if (protocolCalls <= 8 || req?.type === 'json') {
        pmtilesLog('protocol call', protocolCalls, req?.type, String(req?.url || '').slice(0, 120));
      }
      return pmtilesProtocol.tile(req, arg2);
    };

    lib.addProtocol('pmtiles', handler);
    pmtilesProtocol.add(new PMTiles(config.PMTILES_OVERVIEW_URL));
    pmtilesProtocol.add(new PMTiles(config.PMTILES_RESORT_URL));
    overviewPm = new PMTiles(config.PMTILES_OVERVIEW_URL);
    resortPm = new PMTiles(config.PMTILES_RESORT_URL);

    pmtilesLog('protocol registered', PMTILES_CORE_VERSION, {
      overview: config.PMTILES_OVERVIEW_URL,
      resort: config.PMTILES_RESORT_URL,
      addProtocol: true
    });
  })();
  return protocolReady;
}

function buildPmtilesVectorSource(httpUrl) {
  return {
    type: 'vector',
    url: toPmtilesUrl(httpUrl),
    attribution: 'Global Ski Atlas'
  };
}

async function getMvtLibs() {
  if (!mvtLibs) {
    const [{ VectorTile }, pbfMod] = await Promise.all([
      import('https://esm.sh/@mapbox/vector-tile@2.0.4'),
      import('https://esm.sh/pbf@3.2.1')
    ]);
    mvtLibs = { VectorTile, Pbf: pbfMod.default };
  }
  return mvtLibs;
}

function lngLatToTileXY(lng, lat, z) {
  const scale = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = Math.floor((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale);
  return [x, y];
}

/** MVT polygons are clipped per tile — key must include geometry, not just resort id. */
function boundaryFragmentKey(f, kind, tileX, tileY) {
  const base = boundaryFeatureKey(f, kind);
  const ring = f.geometry?.type === 'Polygon'
    ? f.geometry.coordinates[0]
    : f.geometry?.coordinates?.[0]?.[0];
  const sig = ring?.length
    ? `${ring[0][0].toFixed(5)},${ring[0][1].toFixed(5)}|${ring.length}`
    : 'empty';
  const tile = tileX != null ? `|${tileX},${tileY}` : '';
  return `${base}|${sig}${tile}`;
}

/** All tiles overlapping the current viewport (+1 tile padding). */
function tilesForViewport(map, tileZ, maxTiles = 36) {
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  const [xMin, yMin] = lngLatToTileXY(sw.lng, ne.lat, tileZ);
  const [xMax, yMax] = lngLatToTileXY(ne.lng, sw.lat, tileZ);
  const tiles = [];
  const pad = 1;
  for (let x = xMin - pad; x <= xMax + pad; x++) {
    for (let y = yMin - pad; y <= yMax + pad; y++) {
      tiles.push([x, y]);
    }
  }
  if (tiles.length > maxTiles) {
    const c = map.getCenter();
    const [cx, cy] = lngLatToTileXY(c.lng, c.lat, tileZ);
    const half = Math.ceil(Math.sqrt(maxTiles) / 2);
    const capped = [];
    for (let dx = -half; dx <= half; dx++) {
      for (let dy = -half; dy <= half; dy++) {
        capped.push([cx + dx, cy + dy]);
      }
    }
    return capped;
  }
  return tiles;
}

async function fetchLayerPolygons(pm, layerName, z, x, y, kind) {
  const { VectorTile, Pbf } = await getMvtLibs();
  const resp = await pm.getZxy(z, x, y);
  if (!resp?.data?.byteLength) return [];
  const tile = new VectorTile(new Pbf(resp.data));
  const layer = tile.layers[layerName];
  if (!layer) return [];
  const out = [];
  for (let i = 0; i < layer.length; i++) {
    const gj = layer.feature(i).toGeoJSON(x, y, z);
    if (!isPolygonGeometry(gj.geometry)) continue;
    gj.properties = { ...(gj.properties || {}), _kind: kind };
    out.push(gj);
  }
  return out;
}

/** Fetch resort boundaries directly from PMTiles (works even when MapLibre protocol fails). */
export async function syncBoundaryOverlayDirect(map) {
  const src = map.getSource(SKI_BOUNDARY_OVERLAY_SOURCE);
  if (!src) return 0;

  const z = map.getZoom();
  if (z < config.OUTLINES_MIN_ZOOM) {
    src.setData({ type: 'FeatureCollection', features: [] });
    map.__lastBoundaryFeatureCount = 0;
    return 0;
  }

  const tileZ = Math.min(14, Math.max(config.OUTLINES_MIN_ZOOM, Math.round(z)));
  const tiles = tilesForViewport(map, tileZ);

  if (!overviewPm) {
    const { PMTiles } = await loadPmtilesLib();
    overviewPm = new PMTiles(config.PMTILES_OVERVIEW_URL);
    resortPm = new PMTiles(config.PMTILES_RESORT_URL);
  }

  const seen = new Map();
  const push = (f, kind, tileX, tileY) => {
    const key = boundaryFragmentKey(f, kind, tileX, tileY);
    if (!seen.has(key)) seen.set(key, f);
  };

  try {
    for (const [x, y] of tiles) {
      for (const f of await fetchLayerPolygons(overviewPm, 'ski_areas', tileZ, x, y, 'area')) {
        push(f, 'area', x, y);
      }
    }
  } catch (err) {
    pmtilesWarn('syncBoundaryOverlayDirect failed', err?.message || err);
    return map.__lastBoundaryFeatureCount ?? 0;
  }

  const fragments = [...seen.values()];
  const features = await mergeTileFragments(fragments);
  src.setData({ type: 'FeatureCollection', features });
  map.__lastBoundaryFeatureCount = features.length;
  return features.length;
}

function isPolygonGeometry(geom) {
  return geom?.type === 'Polygon' || geom?.type === 'MultiPolygon';
}

function boundaryFeatureKey(f, kind) {
  const p = f.properties || {};
  const name = p.name ?? p['Ski Area'] ?? p.Ski_Area ?? '';
  const id = p.osm_id ?? p.osm_way_id ?? p.ref ?? '';
  return `${kind}|${String(id)}|${String(name).toLowerCase()}`;
}

async function getTurfUnionLib() {
  if (!turfUnionLib) {
    const [unionMod, helpersMod] = await Promise.all([
      import('https://esm.sh/@turf/union@7.2.0'),
      import('https://esm.sh/@turf/helpers@7.2.0')
    ]);
    turfUnionLib = {
      union: unionMod.default ?? unionMod.union,
      featureCollection: helpersMod.featureCollection
    };
  }
  return turfUnionLib;
}

/** Merge MVT tile clips into one polygon per resort (removes internal tile-edge strokes). */
async function mergeTileFragments(features) {
  if (!features.length) return features;

  const groups = new Map();
  for (const f of features) {
    const kind = f.properties?._kind || 'area';
    const key = boundaryFeatureKey(f, kind);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }

  const single = [];
  const toMerge = [];
  for (const frags of groups.values()) {
    if (frags.length === 1) single.push(frags[0]);
    else toMerge.push(frags);
  }
  if (!toMerge.length) return single;

  const { union, featureCollection } = await getTurfUnionLib();
  const merged = [...single];

  for (const frags of toMerge) {
    try {
      let result = frags[0];
      for (let i = 1; i < frags.length; i++) {
        const u = union(featureCollection([result, frags[i]]));
        if (u) result = { type: 'Feature', geometry: u.geometry, properties: { ...result.properties } };
      }
      merged.push(result);
    } catch (err) {
      pmtilesWarn('fragment union failed', err?.message || err);
      merged.push(...frags);
    }
  }
  return merged;
}

/** Pull polygon boundaries from loaded vector tiles into a GeoJSON overlay (reliable vs MVT fill). */
export async function syncBoundaryOverlay(map) {
  const src = map.getSource(SKI_BOUNDARY_OVERLAY_SOURCE);
  if (!src) return;

  const z = map.getZoom();
  if (z < config.OUTLINES_MIN_ZOOM) {
    src.setData({ type: 'FeatureCollection', features: [] });
    map.__lastBoundaryFeatureCount = 0;
    return 0;
  }

  if (!map.isSourceLoaded(SKI_PMTILES_SOURCES.overview)) {
    return map.__lastBoundaryFeatureCount ?? 0;
  }

  const seen = new Map();
  const push = (f, kind) => {
    if (!isPolygonGeometry(f.geometry)) return;
    const feat = {
      type: 'Feature',
      geometry: f.geometry,
      properties: { ...(f.properties || {}), _kind: kind }
    };
    const key = boundaryFragmentKey(feat, kind);
    if (seen.has(key)) return;
    seen.set(key, feat);
  };

  try {
    for (const f of map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, { sourceLayer: 'ski_areas' })) {
      push(f, 'area');
    }
  } catch (err) {
    pmtilesWarn('syncBoundaryOverlay query failed', err?.message || err);
  }

  const fragments = [...seen.values()];
  const features = await mergeTileFragments(fragments);
  src.setData({ type: 'FeatureCollection', features });
  map.__lastBoundaryFeatureCount = features.length;
  return features.length;
}

function ensureBoundaryOverlayLayers(map) {
  const addBoundaryLayer = (layer, insertBefore) => {
    if (map.getLayer(layer.id)) return;
    try {
      if (insertBefore && map.getLayer(insertBefore)) map.addLayer(layer, insertBefore);
      else map.addLayer(layer);
    } catch (err) {
      pmtilesWarn('boundary overlay addLayer failed', layer.id, err?.message || err);
    }
  };

  if (map.getLayer(SKI_PMTILES_LAYERS.boundaryFill)) {
    try {
      map.removeLayer(SKI_PMTILES_LAYERS.boundaryFill);
    } catch (err) {
      pmtilesWarn('remove legacy boundary fill failed', err?.message || err);
    }
  }
  if (map.getLayer(SKI_PMTILES_LAYERS.bufferLine)) {
    try {
      map.removeLayer(SKI_PMTILES_LAYERS.bufferLine);
    } catch (err) {
      pmtilesWarn('remove buffer line failed', err?.message || err);
    }
  }

  const bottomAnchor = getFirstSkiContentLayerId(map);

  addBoundaryLayer({
    id: SKI_PMTILES_LAYERS.boundaryLine,
    type: 'line',
    source: SKI_BOUNDARY_OVERLAY_SOURCE,
    minzoom: config.OUTLINES_MIN_ZOOM,
    filter: ['==', ['get', '_kind'], 'area'],
    paint: {
      'line-color': ATLAS_COLORS.boundaryOutline,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 3, 14, 4],
      'line-opacity': 1,
      'line-dasharray': [4, 2]
    }
  }, bottomAnchor);
}

/** Re-apply PMTiles + boundary overlay after map.setStyle(). */
export async function restoreSkiPmtilesAfterStyleChange(map, options = {}) {
  await addSkiPmtilesToMap(map, options);
  ensureBoundaryOverlayLayers(map);
  ensureBoundaryLayersOnBottom(map);
  try {
    let n = await syncBoundaryOverlay(map);
    if (!n) await syncBoundaryOverlayDirect(map);
  } catch (err) {
    pmtilesWarn('boundary resync after style change failed', err?.message || err);
  }
}

export function attachBoundaryOverlay(map) {
  if (!map.getSource(SKI_BOUNDARY_OVERLAY_SOURCE)) {
    map.addSource(SKI_BOUNDARY_OVERLAY_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }

  ensureBoundaryOverlayLayers(map);

  if (map.__boundarySyncAttached) return;
  map.__boundarySyncAttached = true;

  let syncTimer;
  let syncInFlight = false;
  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      if (syncInFlight) return;
      syncInFlight = true;
      try {
        let n = await syncBoundaryOverlay(map);
        let mode = 'mvt';
        if (!n) {
          n = await syncBoundaryOverlayDirect(map);
          mode = 'direct';
        }
        pmtilesLog('boundary overlay synced', {
          features: n,
          zoom: Number(map.getZoom().toFixed(2)),
          mode
        });
      } finally {
        syncInFlight = false;
      }
    }, 200);
  };

  map.on('moveend', scheduleSync);
  map.on('sourcedata', (e) => {
    if (e?.sourceId === SKI_PMTILES_SOURCES.overview || e?.sourceId === SKI_PMTILES_SOURCES.resort) {
      if (e.isSourceLoaded || e.tile) scheduleSync();
    }
  });
  map.once('idle', scheduleSync);

  pmtilesLog('boundary GeoJSON overlay attached');
}

/** Style layers to stack on a MapTiler WINTER basemap (insert below labels when possible). */
export function getSkiPmtilesLayerDefs(options = {}) {
  const {
    liftsColor = ATLAS_COLORS.lift,
    liftsWidth = 2,
    pistesWidth = 2,
    includeResortDetail = true,
    includeLabels = false,
    includeAnalyzedPoints = true
  } = options;

  const layers = [];

  if (includeAnalyzedPoints) {
    layers.push({
      id: SKI_PMTILES_LAYERS.analyzed,
      type: 'circle',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas_analyzed',
      minzoom: 0,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 4, 2, 8, 3, 12, 4],
        'circle-color': ATLAS_COLORS.pisteEasy,
        'circle-opacity': 0.85,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': ATLAS_COLORS.boundaryOutline
      }
    });
  }

  const outlinesMinZoom = config.OUTLINES_MIN_ZOOM;

  if (includeResortDetail) {
    layers.push({
      id: SKI_PMTILES_LAYERS.resortOsmFill,
      type: 'fill',
      source: SKI_PMTILES_SOURCES.resort,
      'source-layer': 'osm',
      minzoom: 12,
      filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
      paint: { 'fill-color': '#95a5a6', 'fill-opacity': 0.12 }
    });
  }

  layers.push(
    {
      id: SKI_PMTILES_LAYERS.areasPoint,
      type: 'circle',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas',
      minzoom: outlinesMinZoom,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4, 'circle-color': ATLAS_COLORS.pisteEasy }
    },
    {
      id: SKI_PMTILES_LAYERS.pistes,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'pistes',
      minzoom: 10,
      paint: { 'line-width': pistesWidth, 'line-color': PISTE_LINE_COLOR }
    },
    {
      id: SKI_PMTILES_LAYERS.liftsCasing,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'lifts',
      minzoom: 10,
      paint: {
        'line-color': ATLAS_COLORS.liftCasing,
        'line-width': liftsWidth + 2,
        'line-opacity': 0.5
      }
    },
    {
      id: SKI_PMTILES_LAYERS.lifts,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'lifts',
      minzoom: 10,
      paint: {
        'line-color': liftsColor,
        'line-width': liftsWidth,
        'line-opacity': 0.85
      }
    }
  );

  if (includeResortDetail) {
    layers.push({
      id: SKI_PMTILES_LAYERS.resortOsmLine,
      type: 'line',
      source: SKI_PMTILES_SOURCES.resort,
      'source-layer': 'osm',
      minzoom: 12,
      filter: ['any', ['==', ['geometry-type'], 'LineString'], ['==', ['geometry-type'], 'MultiLineString']],
      paint: { 'line-color': '#7f8c8d', 'line-width': 1 }
    });
    layers.push({
      id: SKI_PMTILES_LAYERS.resortContours,
      type: 'line',
      source: SKI_PMTILES_SOURCES.resort,
      'source-layer': 'contours',
      minzoom: 12,
      paint: {
        'line-color': ATLAS_COLORS.contour,
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 14, 1.5, 16, 2],
        'line-opacity': 0.85
      }
    });
  }

  // Resort boundaries render via GeoJSON overlay (attachBoundaryOverlay) — MVT fill was not painting.

  if (includeLabels) {
    layers.push({
      id: SKI_PMTILES_LAYERS.areasLabels,
      type: 'symbol',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas',
      minzoom: 11,
      filter: ['!=', ['coalesce', ['get', 'name'], ['get', 'Ski Area'], ['get', 'Ski_Area'], ''], ''],
      layout: {
        'text-field': ['coalesce', ['get', 'name'], ['get', 'Ski Area'], ['get', 'Ski_Area'], ''],
        'text-size': 13,
        'text-anchor': 'center',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#0b3d20',
        'text-halo-color': 'rgba(255,255,255,0.95)',
        'text-halo-width': 1.5
      }
    });
  }

  return layers;
}

/**
 * Add overview + resort PMTiles sources and layers to an existing map.
 * Layers default to the top of the style (above the basemap) so boundaries and
 * contours are not hidden under terrain or hillshade. Pass beforeId to tuck under labels.
 * @returns {Promise<void>}
 */
export async function addSkiPmtilesToMap(map, options = {}) {
  const sdk = options.sdk ?? maptilersdk;
  await initPmtilesProtocol(sdk);

  const overviewUrl = options.overviewUrl ?? config.PMTILES_OVERVIEW_URL;
  const detailUrl = options.detailUrl ?? config.PMTILES_RESORT_URL;
  const beforeId = options.beforeId;

  if (!map.getSource(SKI_PMTILES_SOURCES.overview)) {
    map.addSource(SKI_PMTILES_SOURCES.overview, buildPmtilesVectorSource(overviewUrl));
    pmtilesLog('source added', SKI_PMTILES_SOURCES.overview, overviewUrl);
  }
  if (options.includeResortDetail !== false && !map.getSource(SKI_PMTILES_SOURCES.resort)) {
    map.addSource(SKI_PMTILES_SOURCES.resort, buildPmtilesVectorSource(detailUrl));
    pmtilesLog('source added', SKI_PMTILES_SOURCES.resort, detailUrl);
  }

  const layerDefs = getSkiPmtilesLayerDefs(options);
  const added = [];
  const skipped = [];
  const failed = [];
  for (const layer of layerDefs) {
    if (map.getLayer(layer.id)) {
      skipped.push(layer.id);
      continue;
    }
    try {
      if (beforeId) map.addLayer(layer, beforeId);
      else map.addLayer(layer);
      added.push(layer.id);
    } catch (err) {
      failed.push({ id: layer.id, error: err?.message || String(err) });
      pmtilesWarn('addLayer failed', layer.id, err);
    }
  }
  pmtilesLog('layers', { added, skipped, failed, total: layerDefs.length });
  attachBoundaryOverlay(map);
  ensureBoundaryLayersOnBottom(map);
}

/** First ski overlay layer in stack — boundary lines render underneath these. */
const SKI_CONTENT_LAYER_ORDER = [
  SKI_PMTILES_LAYERS.analyzed,
  SKI_PMTILES_LAYERS.resortOsmFill,
  SKI_PMTILES_LAYERS.areasPoint,
  SKI_PMTILES_LAYERS.pistes,
  SKI_PMTILES_LAYERS.liftsCasing,
  SKI_PMTILES_LAYERS.lifts,
  SKI_PMTILES_LAYERS.resortOsmLine,
  SKI_PMTILES_LAYERS.resortContours,
  SKI_PMTILES_LAYERS.areasLabels
];

function getFirstSkiContentLayerId(map) {
  for (const id of SKI_CONTENT_LAYER_ORDER) {
    if (map.getLayer(id)) return id;
  }
  return undefined;
}

/** Hollow ski-area outline — below trails, lifts, and contours. */
export const SKI_BOUNDARY_LAYER_IDS = [
  SKI_PMTILES_LAYERS.boundaryLine
];

export function ensureBoundaryLayersOnBottom(map) {
  const anchor = getFirstSkiContentLayerId(map);
  const moved = [];
  const missing = [];
  let insertBefore = anchor;
  for (const id of SKI_BOUNDARY_LAYER_IDS) {
    if (!map.getLayer(id)) {
      missing.push(id);
      continue;
    }
    try {
      if (insertBefore) map.moveLayer(id, insertBefore);
      else map.moveLayer(id);
      moved.push(id);
      insertBefore = id;
    } catch (err) {
      pmtilesWarn('moveLayer failed', id, err?.message || err);
    }
  }
  pmtilesLog('ensureBoundaryLayersOnBottom', { anchor: anchor || '(bottom)', moved, missing });
}

/** @deprecated Use ensureBoundaryLayersOnBottom */
export function ensureBoundaryLayersOnTop(map, beforeLayerId) {
  ensureBoundaryLayersOnBottom(map);
}

/** Console diagnostics — source load, layer visibility, rendered feature counts. */
export function attachPmtilesDebugLogging(map) {
  if (map.__pmtilesDebugAttached) return;
  map.__pmtilesDebugAttached = true;

  map.on('error', (e) => {
    const tile = e?.tile;
    pmtilesWarn('map error', {
      message: e?.error?.message || e?.error || e,
      sourceId: e?.sourceId,
      tile: tile ? { z: tile.tileID?.canonical?.z, x: tile.tileID?.canonical?.x, y: tile.tileID?.canonical?.y } : undefined
    });
  });

  map.on('sourcedata', (e) => {
    if (!e?.sourceId || !e.sourceId.startsWith('ski-')) return;
    if (!e.isSourceLoaded) return;
    pmtilesLog('source loaded', e.sourceId, {
      dataType: e.dataType,
      tile: e.tile,
      sourceCache: !!e.sourceCache
    });
  });

  const sampleLayers = [
    ...SKI_BOUNDARY_LAYER_IDS,
    SKI_PMTILES_LAYERS.pistes,
    SKI_PMTILES_LAYERS.lifts
  ];

  let idleTimer;
  const logViewport = () => {
    if (!map.isStyleLoaded()) return;
    const z = Number(map.getZoom().toFixed(2));
    const center = map.getCenter();

    const layerState = {};
    for (const id of sampleLayers) {
      const layer = map.getLayer(id);
      if (!layer) {
        layerState[id] = 'missing';
        continue;
      }
      let visibility = 'visible';
      try {
        visibility = map.getLayoutProperty(id, 'visibility') || 'visible';
      } catch (_) { /* ignore */ }
      let rendered = 0;
      try {
        rendered = map.queryRenderedFeatures({ layers: [id] }).length;
      } catch (_) { /* ignore */ }
      layerState[id] = { visibility, minzoom: layer.minzoom, rendered };
    }

    const sourceFeatures = {};
    try {
      sourceFeatures.ski_areas = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, {
        sourceLayer: 'ski_areas'
      }).length;
      sourceFeatures.pistes = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, {
        sourceLayer: 'pistes'
      }).length;
      sourceFeatures.lifts = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, {
        sourceLayer: 'lifts'
      }).length;
      if (map.getSource(SKI_PMTILES_SOURCES.resort)) {
        sourceFeatures.contours = map.querySourceFeatures(SKI_PMTILES_SOURCES.resort, {
          sourceLayer: 'contours'
        }).length;
      }
    } catch (err) {
      sourceFeatures.error = err?.message || String(err);
    }

    const styleLayers = map.getStyle()?.layers || [];
    const indices = {};
    for (const id of SKI_BOUNDARY_LAYER_IDS) {
      const idx = styleLayers.findIndex((l) => l.id === id);
      if (idx >= 0) indices[id] = `${idx + 1}/${styleLayers.length}`;
    }

    const overlayFeatures = map.__lastBoundaryFeatureCount ?? 0;

    pmtilesLog(
      'viewport summary',
      `z=${z}`,
      `src: areas=${sourceFeatures.ski_areas ?? 0} pistes=${sourceFeatures.pistes ?? 0}`,
      `rendered: boundaryLine=${layerState[SKI_PMTILES_LAYERS.boundaryLine]?.rendered ?? 0}`,
      `pistes=${layerState[SKI_PMTILES_LAYERS.pistes]?.rendered ?? 0}`,
      `overlayGeoJSON=${overlayFeatures}`
    );
    pmtilesLog('viewport detail', {
      zoom: z,
      center: [Number(center.lng.toFixed(4)), Number(center.lat.toFixed(4))],
      layerState,
      sourceFeaturesInTile: sourceFeatures,
      boundaryLayerIndices: indices,
      overlayFeatures
    });
  };

  map.on('moveend', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(logViewport, 400);
  });
  map.once('idle', () => setTimeout(logViewport, 600));

  pmtilesLog('debug logging attached (move map to sample viewport)');
}

/** Standalone style (PMTilestest / no MapTiler basemap). */
export function buildSkiPmtilesStyle(overviewUrl, detailUrl, showBasemap = false) {
  return {
    version: 8,
    name: 'ski-pmtiles',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
        maxzoom: 19
      },
      [SKI_PMTILES_SOURCES.overview]: buildPmtilesVectorSource(overviewUrl),
      [SKI_PMTILES_SOURCES.resort]: buildPmtilesVectorSource(detailUrl)
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        layout: { visibility: showBasemap ? 'visible' : 'none' }
      },
      ...getSkiPmtilesLayerDefs({ includeLabels: true })
    ]
  };
}

/** Load ski_areas_analyzed features from loaded PMTiles tiles (for search / markers). */
export async function queryAllSkiAreaPoints(map) {
  const saved = { center: map.getCenter(), zoom: map.getZoom() };
  await new Promise((resolve) => {
    map.once('idle', resolve);
    map.jumpTo({ center: [0, 25], zoom: 1.2 });
  });

  let feats = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, {
    sourceLayer: 'ski_areas_analyzed'
  });

  if (feats.length < 500) {
    await new Promise((resolve) => {
      map.once('idle', resolve);
      map.setZoom(0.5);
    });
    feats = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, {
      sourceLayer: 'ski_areas_analyzed'
    });
  }

  map.jumpTo({ center: saved.center, zoom: saved.zoom });

  const byKey = new Map();
  for (const f of feats) {
    if (!f.geometry || f.geometry.type !== 'Point') continue;
    const [lon, lat] = f.geometry.coordinates;
    const props = f.properties || {};
    const name = props.name ?? props.resort_name ?? props['Ski Area'] ?? '';
    const key = `${String(name).toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (!byKey.has(key)) byKey.set(key, { geometry: f.geometry, properties: props });
  }

  return [...byKey.values()].map(({ geometry, properties }) => ({
    geometry,
    properties
  }));
}

/** Fetch resort metadata for lookup (MapTiler Data API — not parquet). */
export async function fetchSkiAreaCatalog() {
  const r = await fetch(config.SKI_AREAS_MAPTILER_URL);
  if (!r.ok) throw new Error(`Ski areas catalog fetch failed: ${r.status}`);
  const gj = await r.json();
  return (gj.features || []).map((f) => ({
    geometry: f.geometry,
    properties: f.properties || {}
  }));
}

/**
 * Query features from a PMTiles vector layer by panning a grid (stats / lookup).
 * @param {maptilersdk.Map} map - map with ski-overview source already loaded
 * @param {string} sourceLayer - e.g. 'lifts', 'pistes', 'ski_areas_analyzed'
 * @param {number} [zoom=10]
 */
export async function queryPmtilesLayerGrid(map, sourceLayer, zoom = 10) {
  const saved = { center: map.getCenter(), zoom: map.getZoom() };
  const grid = [];
  for (let lon = -170; lon <= 170; lon += 35) {
    for (let lat = -55; lat <= 72; lat += 18) {
      grid.push([lon, lat]);
    }
  }
  const seen = new Map();
  for (const [lon, lat] of grid) {
    await new Promise((resolve) => {
      map.once('idle', resolve);
      map.jumpTo({ center: [lon, lat], zoom });
    });
    const batch = map.querySourceFeatures(SKI_PMTILES_SOURCES.overview, { sourceLayer });
    for (const f of batch) {
      const key = f.id ?? JSON.stringify(f.properties);
      if (!seen.has(key)) seen.set(key, f);
    }
  }
  map.jumpTo({ center: saved.center, zoom: saved.zoom });
  return [...seen.values()];
}

/** Hidden map probe — load all features from one PMTiles source-layer. */
export async function loadPmtilesLayerFeatures(sourceLayer, zoom = 10) {
  const probeEl = document.createElement('div');
  probeEl.id = 'pmtiles-probe-' + sourceLayer;
  probeEl.style.cssText = 'position:fixed;left:-9999px;width:512px;height:384px;visibility:hidden;pointer-events:none';
  document.body.appendChild(probeEl);
  const probeMap = await createSkiPmtilesMap({
    containerId: probeEl.id,
    center: [0, 30],
    zoom: 2,
    noControl: true,
    pmtilesOptions: { includeResortDetail: false }
  });
  const feats = await queryPmtilesLayerGrid(probeMap, sourceLayer, zoom);
  probeMap.remove();
  probeEl.remove();
  return feats;
}

/**
 * Create map with MapTiler WINTER basemap + ski PMTiles layers.
 */
export async function createSkiPmtilesMap(options = {}) {
  const { createMapLibre } = await import('./map-core.js');
  const { map } = await createMapLibre(options);
  await addSkiPmtilesToMap(map, options.pmtilesOptions);
  return map;
}

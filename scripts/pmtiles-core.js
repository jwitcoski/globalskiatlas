/**
 * Shared PMTiles protocol + ski layer wiring for MapTiler SDK maps.
 */
import { config } from './map-config.js';

let protocolReady = null;

export const SKI_PMTILES_SOURCES = {
  overview: 'ski-overview',
  resort: 'ski-resort'
};

export const SKI_PMTILES_LAYERS = {
  analyzed: 'ski-areas-analyzed',
  areasFill: 'ski-areas-fill',
  areasOutline: 'ski-areas-outline',
  areasPoint: 'ski-areas-point',
  areasLabels: 'ski-areas-labels',
  pistes: 'pistes',
  lifts: 'lifts',
  resortBuffer: 'resort-buffer',
  resortOsmFill: 'resort-osm-fill',
  resortOsmLine: 'resort-osm-line',
  resortContours: 'resort-contours'
};

export const PISTE_LINE_COLOR = [
  'case',
  ['in', 'piste:difficulty"=>"extreme', ['coalesce', ['get', 'other_tags'], '']],
  '#6c3483',
  ['in', 'piste:difficulty"=>"freeride', ['coalesce', ['get', 'other_tags'], '']],
  '#ca6f1e',
  ['in', 'piste:difficulty"=>"expert', ['coalesce', ['get', 'other_tags'], '']],
  '#1a1a1a',
  ['in', 'piste:difficulty"=>"advanced', ['coalesce', ['get', 'other_tags'], '']],
  '#c0392b',
  ['in', 'piste:difficulty"=>"intermediate', ['coalesce', ['get', 'other_tags'], '']],
  '#2980b9',
  ['in', 'piste:difficulty"=>"easy', ['coalesce', ['get', 'other_tags'], '']],
  '#27ae60',
  ['in', 'piste:difficulty"=>"novice', ['coalesce', ['get', 'other_tags'], '']],
  '#2ecc71',
  '#95a5a6'
];

export function toPmtilesUrl(httpUrl) {
  return 'pmtiles://' + String(httpUrl).replace(/^pmtiles:\/\//, '');
}

/** Register pmtiles:// protocol once (MapTiler SDK extends MapLibre). */
export async function initPmtilesProtocol(sdk = maptilersdk) {
  if (protocolReady) return protocolReady;
  protocolReady = (async () => {
    const { Protocol } = await import('https://esm.sh/pmtiles@3.2.0');
    const protocol = new Protocol();
    sdk.addProtocol('pmtiles', protocol.tile);
  })();
  return protocolReady;
}

function skiOverviewSource(overviewUrl = config.PMTILES_OVERVIEW_URL) {
  return {
    type: 'vector',
    url: toPmtilesUrl(overviewUrl),
    attribution: 'Global Ski Atlas'
  };
}

function skiResortSource(detailUrl = config.PMTILES_RESORT_URL) {
  return {
    type: 'vector',
    url: toPmtilesUrl(detailUrl),
    attribution: 'Global Ski Atlas'
  };
}

/** Style layers to stack on a MapTiler WINTER basemap (insert below labels when possible). */
export function getSkiPmtilesLayerDefs(options = {}) {
  const {
    liftsColor = '#2980b9',
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
        'circle-color': '#27ae60',
        'circle-opacity': 0.85,
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#1a1a1a'
      }
    });
  }

  if (includeResortDetail) {
    layers.push(
      {
        id: SKI_PMTILES_LAYERS.resortBuffer,
        type: 'fill',
        source: SKI_PMTILES_SOURCES.resort,
        'source-layer': 'buffer',
        minzoom: 12,
        paint: { 'fill-color': '#3498db', 'fill-opacity': 0.08 }
      },
      {
        id: SKI_PMTILES_LAYERS.resortOsmFill,
        type: 'fill',
        source: SKI_PMTILES_SOURCES.resort,
        'source-layer': 'osm',
        minzoom: 12,
        filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
        paint: { 'fill-color': '#95a5a6', 'fill-opacity': 0.25 }
      }
    );
  }

  layers.push(
    {
      id: SKI_PMTILES_LAYERS.areasFill,
      type: 'fill',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas',
      minzoom: 8,
      filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
      paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.22 }
    },
    {
      id: SKI_PMTILES_LAYERS.areasOutline,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas',
      minzoom: 8,
      filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
      paint: { 'line-color': '#1e8449', 'line-width': 1 }
    },
    {
      id: SKI_PMTILES_LAYERS.areasPoint,
      type: 'circle',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'ski_areas',
      minzoom: 8,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 4, 'circle-color': '#27ae60' }
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
      minzoom: 13,
      paint: {
        'line-color': '#8B7355',
        'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 15, 1],
        'line-opacity': 0.7
      }
    });
  }

  layers.push(
    {
      id: SKI_PMTILES_LAYERS.pistes,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'pistes',
      minzoom: 10,
      paint: { 'line-width': pistesWidth, 'line-color': PISTE_LINE_COLOR }
    },
    {
      id: SKI_PMTILES_LAYERS.lifts,
      type: 'line',
      source: SKI_PMTILES_SOURCES.overview,
      'source-layer': 'lifts',
      minzoom: 10,
      paint: { 'line-color': liftsColor, 'line-width': liftsWidth }
    }
  );

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

function findBeforeId(map) {
  const style = map.getStyle();
  if (!style?.layers) return undefined;
  const labelLayer = style.layers.find((l) => /label/i.test(l.id));
  return labelLayer?.id;
}

/**
 * Add overview + resort PMTiles sources and layers to an existing map.
 * @returns {Promise<void>}
 */
export async function addSkiPmtilesToMap(map, options = {}) {
  const sdk = options.sdk ?? maptilersdk;
  await initPmtilesProtocol(sdk);

  const overviewUrl = options.overviewUrl ?? config.PMTILES_OVERVIEW_URL;
  const detailUrl = options.detailUrl ?? config.PMTILES_RESORT_URL;
  const beforeId = options.beforeId ?? findBeforeId(map);

  if (!map.getSource(SKI_PMTILES_SOURCES.overview)) {
    map.addSource(SKI_PMTILES_SOURCES.overview, skiOverviewSource(overviewUrl));
  }
  if (options.includeResortDetail !== false && !map.getSource(SKI_PMTILES_SOURCES.resort)) {
    map.addSource(SKI_PMTILES_SOURCES.resort, skiResortSource(detailUrl));
  }

  for (const layer of getSkiPmtilesLayerDefs(options)) {
    if (map.getLayer(layer.id)) continue;
    map.addLayer(layer, beforeId);
  }
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
      [SKI_PMTILES_SOURCES.overview]: skiOverviewSource(overviewUrl),
      [SKI_PMTILES_SOURCES.resort]: skiResortSource(detailUrl)
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

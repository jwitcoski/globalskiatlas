/**
 * Map and data URLs for ski atlas maps (MapTiler, MapLibre, OSRM, etc.)
 */
const MAPTILER_KEY = '0P06ORgY8WvmMOnPr0p2';

export const config = {
  MAPTILER_KEY,

  // ── Parquet / GeoJSON data sources (used by MapLibre / TravelMap) ──────
  SKI_AREAS_PARQUET_URL: 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet',
  SKI_AREAS_GEOJSON_URL: 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas.geojson',
  LIFTS_PARQUET_URL:     'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/lifts.parquet',
  PISTES_PARQUET_URL:    'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/pistes.parquet',

  // ── MapTiler vector-tile tilesets (legacy Leaflet / mainmap.html) ───────
  SKI_AREAS_MAPTILER_URL:  `https://api.maptiler.com/data/019c9294-30cd-7aa0-96a0-e552ef79eee8/features.json?key=${MAPTILER_KEY}`,
  OUTLINES_TILESET_URL:    `https://api.maptiler.com/tiles/019c9343-c29a-7aee-8e30-fefd1b0dbe3f/{z}/{x}/{y}.pbf?key=${MAPTILER_KEY}`,
  LIFTS_TILESET_URL:       `https://api.maptiler.com/tiles/019c95ba-6172-7f8d-8037-a3adf0167505/{z}/{x}/{y}.pbf?key=${MAPTILER_KEY}`,
  PISTES_TILESET_URL:      `https://api.maptiler.com/tiles/019c95e3-ddb5-739e-bf2c-c11f450af8e2/{z}/{x}/{y}.pbf?key=${MAPTILER_KEY}`,

  // ── Base map style URLs ──────────────────────────────────────────────────
  MAP_STYLE_URL:   `https://api.maptiler.com/maps/winter-v4/style.json?key=${MAPTILER_KEY}`,
  TILE_LAYER_URL:  `https://api.maptiler.com/maps/winter-v4/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,

  // ── Drive-time isochrones (DriveTimeMap.html) ─────────────────────────────
  // Valhalla (via /api/isochrone when running npm start): 1h, 2h, 4h.
  // Mapbox fallback when server not running: 1h only (API max 60 min).
  // Set your token locally; do not commit real keys.
  MAPBOX_ACCESS_TOKEN: '',

  // OpenRouteService (optional; was used for 1h before Valhalla)
  OPENROUTE_SERVICE_API_KEY: '',

  // ── Zoom thresholds ──────────────────────────────────────────────────────
  OUTLINES_MIN_ZOOM: 10,
  LIFTS_MIN_ZOOM:    10,
  PISTES_MIN_ZOOM:   10
};

export default config;

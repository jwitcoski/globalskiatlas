/**
 * Map and data URLs for ski atlas maps (MapTiler SDK, PMTiles, OSRM, etc.)
 */
const MAPTILER_KEY = '0P06ORgY8WvmMOnPr0p2';

const S3_OUTPUT = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com';

export const config = {
  MAPTILER_KEY,

  // ── PMTiles (Planetiler — all map display) ───────────────────────────────
  PMTILES_OVERVIEW_URL: `${S3_OUTPUT}/pmtiles/ski_overview.pmtiles`,
  PMTILES_RESORT_URL:   `${S3_OUTPUT}/pmtiles/ski_resort_detail.pmtiles`,

  // ── MapTiler Data API (resort catalog / search metadata, not map tiles) ───
  SKI_AREAS_MAPTILER_URL: `https://api.maptiler.com/data/019c9294-30cd-7aa0-96a0-e552ef79eee8/features.json?key=${MAPTILER_KEY}`,

  // ── Playable 3D ski scenes (S3 catalog; client loads heightfield/GLB from same prefix)
  GAME_SCENES_CATALOG_URL: `${S3_OUTPUT}/game_scenes/catalog.json`,

  // ── GeoParquet (D3 comparison/tier tools — full geometries, not map tiles) ─
  PARQUET_SKI_AREAS_ANALYZED_URL: `${S3_OUTPUT}/combined/ski_areas_analyzed.parquet`,
  PARQUET_SKI_AREAS_URL:           `${S3_OUTPUT}/combined/ski_areas.parquet`,
  PARQUET_PISTES_URL:              `${S3_OUTPUT}/combined/pistes.parquet`,
  PARQUET_LIFTS_URL:               `${S3_OUTPUT}/combined/lifts.parquet`,

  // ── Legacy GeoJSON (download page / wiki ingest only — not used by maps) ─
  SKI_AREAS_GEOJSON_URL: `${S3_OUTPUT}/combined/ski_areas.geojson`,

  // ── Drive-time isochrones (DriveTimeMap.html) ─────────────────────────────
  MAPBOX_ACCESS_TOKEN: '',
  OPENROUTE_SERVICE_API_KEY: '',

  // ── Zoom thresholds ──────────────────────────────────────────────────────
  OUTLINES_MIN_ZOOM: 8,
  LIFTS_MIN_ZOOM:    10,
  PISTES_MIN_ZOOM:   10,

  MAX_FEATURES_PER_LAYER: 10000,
  MAX_TOTAL_HEAVY_FEATURES: 100000
};

export default config;

/**
 * GeoParquet loader for D3 tools that need full resort/trail geometries.
 * Map display uses PMTiles; comparison and tier-rank pages use parquet via hyparquet.
 */
import { config } from './map-config.js';

let hyparquetModule = null;
let pisteIndexPromise = null;
/** @type {Map<string, object[]>|null} */
let pisteIndexBySkiArea = null;
/** @type {object[]|null} */
let pistesWithoutSkiArea = null;

async function getHyparquet() {
  if (!hyparquetModule) {
    hyparquetModule = await import('https://esm.sh/hyparquet@1');
  }
  return hyparquetModule;
}

export async function loadParquetRows(url) {
  const { asyncBufferFromUrl, parquetReadObjects } = await getHyparquet();
  const file = await asyncBufferFromUrl({ url });
  return parquetReadObjects({ file }) || [];
}

export function loadSkiAreasAnalyzed() {
  return loadParquetRows(config.PARQUET_SKI_AREAS_ANALYZED_URL);
}

export function loadSkiAreasOutlines() {
  return loadParquetRows(config.PARQUET_SKI_AREAS_URL);
}

function isLineGeometry(geom) {
  return geom && (geom.type === 'LineString' || geom.type === 'MultiLineString');
}

function toBytes(value) {
  if (!value) return null;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function readWkbPoints(view, offset, le, count, dims) {
  const coords = [];
  let o = offset;
  for (let i = 0; i < count; i++) {
    const x = view.getFloat64(o, le);
    const y = view.getFloat64(o + 8, le);
    o += 8 * dims;
    coords.push([x, y]);
  }
  return { coords, offset: o };
}

/** Decode WKB / EWKB line geometries from GeoParquet. */
export function wkbToLineGeometry(value) {
  const bytes = toBytes(value);
  if (!bytes || bytes.length < 9) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const le = view.getUint8(0) === 1;
  let type = view.getUint32(1, le);
  let offset = 5;
  if (type & 0x20000000) offset += 4;
  const hasZ = Boolean(type & 0x80000000) || Math.floor((type % 1000) / 1000) === 1;
  const hasM = Boolean(type & 0x40000000);
  const baseType = type & 0xff;
  const dims = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
  if (baseType === 2) {
    const n = view.getUint32(offset, le);
    offset += 4;
    const { coords } = readWkbPoints(view, offset, le, n, dims);
    return { type: 'LineString', coordinates: coords };
  }
  if (baseType === 5) {
    const nParts = view.getUint32(offset, le);
    offset += 4;
    const parts = [];
    for (let p = 0; p < nParts; p++) {
      const n = view.getUint32(offset, le);
      offset += 4;
      const read = readWkbPoints(view, offset, le, n, dims);
      parts.push(read.coords);
      offset = read.offset;
    }
    return { type: 'MultiLineString', coordinates: parts };
  }
  return null;
}

function asLineGeometry(raw) {
  if (isLineGeometry(raw)) return raw;
  if (raw?.type === 'GeometryCollection' && Array.isArray(raw.geometries)) {
    const lines = raw.geometries.filter(isLineGeometry);
    if (lines.length === 1) return lines[0];
    if (lines.length > 1) {
      return {
        type: 'MultiLineString',
        coordinates: lines.flatMap((g) => g.type === 'LineString' ? [g.coordinates] : g.coordinates),
      };
    }
  }
  return wkbToLineGeometry(raw);
}

/** GeoParquet rows → GeoJSON features for stats / analysis. */
export function parquetRowsToLineFeatures(rows) {
  const out = [];
  for (const row of rows) {
    const geometry = asLineGeometry(row.geometry);
    if (!geometry) continue;
    const { geometry: _geom, ...props } = row;
    out.push({ type: 'Feature', geometry, properties: props });
  }
  return out;
}

export function loadPistesLineFeatures() {
  return loadParquetRows(config.PARQUET_PISTES_URL).then(parquetRowsToLineFeatures);
}

export function loadLiftsLineFeatures() {
  return loadParquetRows(config.PARQUET_LIFTS_URL).then(parquetRowsToLineFeatures);
}

const PISTE_BATCH_SIZE = 20000;
const SKI_AREA_KEYS = ['Ski Area', 'Ski_Area', 'ski_area', 'resort_name', 'name'];

function getSkiAreaFromRow(row) {
  return SKI_AREA_KEYS.map((k) => row[k]).find((v) => v != null && String(v).trim() !== '');
}

/** Collect normalized name keys used to match pistes to a resort row. */
export function getResortPisteMatchKeys(resort, nameKeys, normalizeName) {
  const keys = new Set();
  if (resort.key) keys.add(resort.key);
  const sources = [resort.outlineFeature?.properties, resort.analyzedRow].filter(Boolean);
  for (const props of sources) {
    for (const k of nameKeys) {
      if (props[k] != null && String(props[k]).trim() !== '') {
        keys.add(normalizeName(props[k]));
      }
    }
    for (const k of SKI_AREA_KEYS) {
      if (props[k] != null && String(props[k]).trim() !== '') {
        keys.add(normalizeName(props[k]));
      }
    }
  }
  return keys;
}

/**
 * One-time index: Ski Area name -> line features. ~40k pistes keyed; rest kept for centroid fallback.
 * @param {(rowsRead: number) => void} [onProgress]
 */
export async function ensurePisteIndex(onProgress) {
  if (pisteIndexBySkiArea) return { bySkiArea: pisteIndexBySkiArea, noSkiArea: pistesWithoutSkiArea || [] };
  if (!pisteIndexPromise) {
    pisteIndexPromise = (async () => {
      const { asyncBufferFromUrl, parquetReadObjects } = await getHyparquet();
      const file = await asyncBufferFromUrl({ url: config.PARQUET_PISTES_URL });
      const bySkiArea = new Map();
      const noSkiArea = [];
      let rowStart = 0;

      while (true) {
        const batch = await parquetReadObjects({
          file,
          rowStart,
          rowEnd: rowStart + PISTE_BATCH_SIZE
        });
        if (!batch.length) break;

        for (const row of batch) {
          if (!isLineGeometry(row.geometry)) continue;
          const skiArea = getSkiAreaFromRow(row);
          if (skiArea) {
            const key = String(skiArea).trim().toLowerCase();
            if (!bySkiArea.has(key)) bySkiArea.set(key, []);
            bySkiArea.get(key).push(row);
          } else {
            noSkiArea.push(row);
          }
        }

        rowStart += batch.length;
        if (typeof onProgress === 'function') onProgress(rowStart);
        if (batch.length < PISTE_BATCH_SIZE) break;
      }

      pisteIndexBySkiArea = bySkiArea;
      pistesWithoutSkiArea = noSkiArea;
      return { bySkiArea, noSkiArea };
    })();
  }
  return pisteIndexPromise;
}

/**
 * Load pistes for selected resorts using the cached Ski Area index.
 * @returns {Promise<Map<string, object[]>>} resort key -> GeoJSON Feature[]
 */
export async function loadPistesForResorts(selectedResorts, helpers) {
  const {
    nameKeys,
    normalizeName,
    rowToFeature,
    pointInPolygon,
    lineCentroid,
    onProgress
  } = helpers;

  const results = new Map();
  const outlineByKey = new Map();
  const matchKeyToResortKey = new Map();

  for (const resort of selectedResorts) {
    results.set(resort.key, []);
    outlineByKey.set(resort.key, resort.outlineFeature?.geometry);
    for (const mk of getResortPisteMatchKeys(resort, nameKeys, normalizeName)) {
      matchKeyToResortKey.set(mk, resort.key);
    }
  }

  const { bySkiArea, noSkiArea } = await ensurePisteIndex(onProgress);

  for (const [matchKey, resortKey] of matchKeyToResortKey) {
    const rows = bySkiArea.get(matchKey);
    if (!rows?.length) continue;
    const feats = results.get(resortKey);
    for (const row of rows) {
      const feature = rowToFeature(row);
      if (feature) feats.push(feature);
    }
  }

  const needCentroid = [...results.entries()].filter(([, feats]) => feats.length === 0).map(([key]) => key);
  if (needCentroid.length && noSkiArea.length) {
    for (const row of noSkiArea) {
      if (!isLineGeometry(row.geometry)) continue;
      const centroid = lineCentroid(row.geometry);
      if (!centroid) continue;
      const [lon, lat] = centroid;
      for (const resortKey of needCentroid) {
        const outline = outlineByKey.get(resortKey);
        if (outline && pointInPolygon(lon, lat, outline)) {
          const feature = rowToFeature(row);
          if (feature) results.get(resortKey).push(feature);
          break;
        }
      }
    }
  }

  return results;
}

/** Line coordinates as separate paths (handles MultiLineString correctly for SVG). */
export function lineGeometryPaths(geom) {
  if (!geom) return [];
  if (geom.type === 'LineString') return [geom.coordinates];
  if (geom.type === 'MultiLineString') return geom.coordinates || [];
  return [];
}

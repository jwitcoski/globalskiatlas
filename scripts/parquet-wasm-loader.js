/**
 * Shared parquet-wasm + Apache Arrow loader for GeoParquet in the browser.
 * Exports loadParquetAsRows(url) -> Promise<Array<{ geometry, properties }>>
 */

function parseWKB(wkbBuffer) {
  if (!wkbBuffer || wkbBuffer.byteLength < 5) return null;
  try {
    const view = new DataView(wkbBuffer instanceof ArrayBuffer ? wkbBuffer : wkbBuffer.buffer);
    const offset = wkbBuffer instanceof ArrayBuffer ? 0 : wkbBuffer.byteOffset;
    let o = offset;
    const byteOrder = view.getUint8(o++);
    const littleEndian = byteOrder === 1;
    const geomType = view.getUint32(o, littleEndian);
    o += 4;
    const actualGeomType = geomType & 0xff;
    function readPoint() {
      const x = view.getFloat64(o, littleEndian); o += 8;
      const y = view.getFloat64(o, littleEndian); o += 8;
      return [x, y];
    }
    function readPoints() {
      const n = view.getUint32(o, littleEndian); o += 4;
      const points = [];
      for (let i = 0; i < n; i++) points.push(readPoint());
      return points;
    }
    function readLinearRing() {
      const n = view.getUint32(o, littleEndian); o += 4;
      const points = [];
      for (let i = 0; i < n; i++) points.push(readPoint());
      return points;
    }
    function readPolygonRings() {
      const n = view.getUint32(o, littleEndian); o += 4;
      const rings = [];
      for (let i = 0; i < n; i++) rings.push(readLinearRing());
      return rings;
    }
    switch (actualGeomType) {
      case 1: return { type: 'Point', coordinates: readPoint() };
      case 2: return { type: 'LineString', coordinates: readPoints() };
      case 3: return { type: 'Polygon', coordinates: readPolygonRings() };
      case 4: return { type: 'MultiPoint', coordinates: readPoints() };
      case 5: {
        const numLines = view.getUint32(o, littleEndian); o += 4;
        const lines = [];
        for (let i = 0; i < numLines; i++) { o += 5; lines.push(readPoints()); }
        return { type: 'MultiLineString', coordinates: lines };
      }
      case 6: {
        const numPolygons = view.getUint32(o, littleEndian); o += 4;
        const polygons = [];
        for (let i = 0; i < numPolygons; i++) { o += 5; polygons.push(readPolygonRings()); }
        return { type: 'MultiPolygon', coordinates: polygons };
      }
      default: return null;
    }
  } catch (e) { console.warn('parseWKB', e); return null; }
}

function findGeometryColumnName(row) {
  const names = ['geometry', 'geom', 'wkb_geometry', 'shape', 'wkb', 'geo_shape'];
  for (const name of names) {
    if (row[name] instanceof Uint8Array) return name;
  }
  return null;
}

function isValidCoordinate(v) {
  return v !== undefined && v !== null && typeof v === 'number' && !isNaN(v);
}

/** Try to get [lon, lat] from a row using common column names. */
function getLonLatFromRow(row) {
  const pairs = [
    ['lon', 'lat'],
    ['longitude', 'latitude'],
    ['centroid_lon', 'centroid_lat'],
    ['long', 'lat'],
    ['lng', 'lat'],
    ['x', 'y']
  ];
  for (const [lonKey, latKey] of pairs) {
    let lon = row[lonKey];
    let lat = row[latKey];
    if (lon != null && lat != null) {
      lon = typeof lon === 'number' ? lon : Number(lon);
      lat = typeof lat === 'number' ? lat : Number(lat);
      if (isValidCoordinate(lon) && isValidCoordinate(lat)) return [lon, lat];
    }
  }
  return null;
}

function sanitizeProperties(props) {
  const out = {};
  for (const key in props) {
    const v = props[key];
    out[key] = typeof v === 'bigint' ? v.toString() : v;
  }
  return out;
}

let wasmInit = null;
let initPromise = null;

export async function loadParquetAsRows(url) {
  if (!initPromise) {
    initPromise = (async () => {
      if (wasmInit) return;
      const parquet = await import('https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm.js');
      const wasmUrl = 'https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm_bg.wasm';
      await parquet.default({ module_or_path: wasmUrl });
      wasmInit = parquet;
    })();
  }
  await initPromise;
  const parquet = wasmInit;
  console.log('[parquet-wasm-loader] fetch:', url);
  const arrow = await import('https://esm.sh/apache-arrow@17');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Parquet fetch failed: ${resp.status} ${resp.statusText}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  const wasmTable = parquet.readParquet(buf);
  const ipcStream = wasmTable.intoIPCStream();
  const table = arrow.tableFromIPC(ipcStream);
  const rows = [];
  const arr = table.toArray();
  console.log('[parquet-wasm-loader] rows from', url, ':', arr.length);
  let geometryColumnName = null;
  let firstRowKeys = null;
  for (let i = 0; i < arr.length; i++) {
    const rowObject = arr[i];
    const json = rowObject.toJSON();
    if (i === 0) {
      geometryColumnName = findGeometryColumnName(json);
      firstRowKeys = Object.keys(json);
    }
    const row = {};
    for (const [key, value] of Object.entries(json)) {
      if (value === null) row[key] = null;
      else if (value instanceof Uint8Array) row[key] = new Uint8Array(value);
      else row[key] = value;
    }
    let geometry = null;
    if (geometryColumnName && row[geometryColumnName] instanceof Uint8Array) {
      const wkb = row[geometryColumnName];
      const buffer = wkb.buffer.slice(wkb.byteOffset, wkb.byteOffset + wkb.byteLength);
      geometry = parseWKB(buffer);
    }
    if (!geometry) {
      const coords = getLonLatFromRow(row);
      if (coords) geometry = { type: 'Point', coordinates: coords };
    }
    if (geometry) {
      const properties = { ...row };
      if (geometryColumnName) delete properties[geometryColumnName];
      delete properties.geometry; delete properties.geometry_bbox;
      rows.push({ geometry, properties: sanitizeProperties(properties) });
    }
  }
  if (rows.length === 0 && arr.length > 0 && firstRowKeys) {
    console.warn('[parquet-wasm-loader] 0 rows returned; first row keys:', firstRowKeys);
  }
  console.log('[parquet-wasm-loader] returning', rows.length, 'rows from', url);
  return rows;
}

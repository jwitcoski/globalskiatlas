/**
 * Web Worker: load ski areas, outlines, lifts, pistes via map-loaders; find resort outline and filter lifts/pistes to resort.
 * Message in: { resort: { title, lat, lon } } (URLs come from map-config via loaders)
 * Message out: { outlineFeature, liftFeats, pisteFeats, extentBounds, southToNorthBearing } or { error: string }
 */

const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
const ID_KEYS = ['id', 'ref', 'area_id', 'resort_id', 'skiresort_id'];

function getProp(obj, keyList) {
  if (!obj) return undefined;
  for (const k of keyList) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function getRings(geom) {
  if (!geom || !geom.coordinates) return [];
  if (geom.type === 'Polygon') return geom.coordinates[0] ? [geom.coordinates[0]] : [];
  if (geom.type === 'MultiPolygon') return (geom.coordinates || []).map((p) => p[0]).filter(Boolean);
  return [];
}

function pointInRing(lon, lat, ring) {
  const n = ring.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon, lat, geom) {
  return getRings(geom).some((ring) => pointInRing(lon, lat, ring));
}

function lineCentroid(geom) {
  if (!geom || !geom.coordinates) return null;
  const coords = geom.type === 'LineString' ? geom.coordinates : (geom.coordinates || []).flat();
  let xs = 0, ys = 0, n = 0;
  coords.forEach((c) => { xs += c[0]; ys += c[1]; n++; });
  return n ? [xs / n, ys / n] : null;
}

function boundsFromGeoJSONFeature(feature) {
  const coords = [];
  const geom = feature.geometry;
  if (!geom || !geom.coordinates) return null;
  function flatten(c, depth) {
    if (depth > 4) return;
    if (typeof c[0] === 'number' && c.length >= 2) coords.push([c[0], c[1]]);
    else if (Array.isArray(c)) c.forEach((cc) => flatten(cc, depth + 1));
  }
  flatten(geom.coordinates, 0);
  if (!coords.length) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  });
  return [[minLng, minLat], [maxLng, maxLat]];
}

function extendBbox(bbox, feature) {
  const b = boundsFromGeoJSONFeature(feature);
  if (!b) return bbox;
  if (!bbox) return b;
  return [[Math.min(bbox[0][0], b[0][0]), Math.min(bbox[0][1], b[0][1])], [Math.max(bbox[1][0], b[1][0]), Math.max(bbox[1][1], b[1][1])]];
}

function bearingDeg(lon1, lat1, lon2, lat2) {
  const toRad = (d) => d * Math.PI / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2), dλ = toRad(lon2 - lon1);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  let θ = Math.atan2(y, x) * 180 / Math.PI;
  return (θ + 360) % 360;
}

function southToNorthBearing(geom) {
  const rings = getRings(geom);
  let minLat = Infinity, maxLat = -Infinity, lonAtMin = 0, lonAtMax = 0;
  rings.forEach((ring) => {
    ring.forEach((c) => {
      const lon = c[0], lat = c[1];
      if (lat < minLat) { minLat = lat; lonAtMin = lon; }
      if (lat > maxLat) { maxLat = lat; lonAtMax = lon; }
    });
  });
  if (minLat >= maxLat) return 0;
  return bearingDeg(lonAtMin, minLat, lonAtMax, maxLat);
}

function getResortLatLon(row) {
  const latCol = row.latitude != null ? 'latitude' : row.centroid_lat != null ? 'centroid_lat' : row.lat != null ? 'lat' : null;
  const lonCol = row.longitude != null ? 'longitude' : row.centroid_lon != null ? 'centroid_lon' : row.lon != null ? 'lon' : null;
  if (latCol && lonCol && row[latCol] != null && row[lonCol] != null) {
    return [Number(row[latCol]), Number(row[lonCol])];
  }
  const g = row.geometry;
  if (g && g.type === 'Point' && g.coordinates && g.coordinates.length >= 2) {
    return [g.coordinates[1], g.coordinates[0]];
  }
  return [null, null];
}

self.onmessage = async function (e) {
  const { resort } = e.data || {};
  if (!resort || resort.lat == null || resort.lon == null || !resort.title) {
    self.postMessage({ error: 'Missing resort (title, lat, lon)' });
    return;
  }
  const resortName = String(resort.title).trim();
  const resortLat = Number(resort.lat);
  const resortLon = Number(resort.lon);

  try {
    const scriptsBase = new URL('../../scripts/', import.meta.url).href;
    const [skiAreasMod, outlinesMod, liftsMod, pistesMod] = await Promise.all([
      import(scriptsBase + 'map-loaders/ski-areas.js'),
      import(scriptsBase + 'map-loaders/ski-area-outlines.js'),
      import(scriptsBase + 'map-loaders/lifts.js'),
      import(scriptsBase + 'map-loaders/pistes.js')
    ]);
    const [{ loadSkiAreas }, { loadSkiAreaOutlines }, { loadLifts }, { loadPistes }] = [skiAreasMod, outlinesMod, liftsMod, pistesMod];

    const [skiAreasResult, outlineResult, liftResult, pisteResult] = await Promise.all([
      loadSkiAreas(),
      loadSkiAreaOutlines(),
      loadLifts(),
      loadPistes()
    ]);

    const analyzedRows = skiAreasResult.rows || [];
    const outlineFeatures = outlineResult.features || [];
    const liftFeatures = liftResult.features || [];
    const pisteFeatures = pisteResult.features || [];

    const dataAnalyzed = analyzedRows.map((r) => ({ ...(r.properties || {}), geometry: r.geometry }));
    const resortRow = dataAnalyzed.find((row) => {
      const name = getProp(row, NAME_KEYS);
      const [rowLat, rowLon] = getResortLatLon(row);
      if (!name || rowLat == null || rowLon == null) return false;
      if (String(name).trim().toLowerCase() !== resortName.toLowerCase()) return false;
      const dist = Math.hypot(rowLat - resortLat, rowLon - resortLon);
      return dist < 0.1;
    });

    if (!resortRow) {
      self.postMessage({ error: 'Resort not found in data' });
      return;
    }
    const resortRef = getProp(resortRow, ID_KEYS);

    let outlineFeature = outlineFeatures.find((f) => {
      const name = getProp(f.properties, NAME_KEYS);
      const ref = getProp(f.properties, ['ref', 'id']);
      if (resortRef != null && ref != null && String(ref) === String(resortRef)) return true;
      if (name && resortName && String(name).trim().toLowerCase() === resortName.trim().toLowerCase()) return true;
      return pointInPolygon(resortLon, resortLat, f.geometry);
    });

    const liftFeats = [];
    const pisteFeats = [];
    if (outlineFeature) {
      const outlineGeom = outlineFeature.geometry;
      liftFeatures.forEach((f) => {
        const c = lineCentroid(f.geometry);
        if (c && pointInPolygon(c[0], c[1], outlineGeom)) liftFeats.push(f);
      });
      pisteFeatures.forEach((f) => {
        const c = lineCentroid(f.geometry);
        if (c && pointInPolygon(c[0], c[1], outlineGeom)) pisteFeats.push(f);
      });
    }
    const features = [...liftFeats, ...pisteFeats];

    let extentBounds = outlineFeature ? boundsFromGeoJSONFeature(outlineFeature) : null;
    features.forEach((f) => { extentBounds = extendBbox(extentBounds, f); });

    const bearing = outlineFeature ? southToNorthBearing(outlineFeature.geometry) : 0;

    self.postMessage({
      outlineFeature,
      liftFeats,
      pisteFeats,
      extentBounds,
      southToNorthBearing: bearing
    });
  } catch (err) {
    self.postMessage({ error: err && err.message ? err.message : String(err) });
  }
};

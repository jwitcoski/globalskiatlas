/**
 * Enhances the wiki resort map with boundaries, pistes, lifts, and tooltips.
 * Uses the same parquet data and logic as popup.html.
 * Call window.enhanceResortMap({ title, lat, lon, pageId }) after initResortMap().
 */

const MAPTILER_KEY = '0P06ORgY8WvmMOnPr0p2';
const SKI_AREAS_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const SKI_AREAS_OUTLINES_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas.parquet';
const LIFTS_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/lifts.parquet';
const PISTES_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/pistes.parquet';

const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
const ID_KEYS = ['id', 'ref', 'area_id', 'resort_id', 'skiresort_id'];
const PISTE_DIFFICULTY_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];
const PISTE_LENGTH_KEYS = ['length', 'piste:length', 'piste_length', 'length_km', 'length_m', 'length_mi'];

function getProp(obj, keyList) {
  if (!obj) return undefined;
  for (const k of keyList) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function getPisteDifficulty(props) {
  let v = getProp(props, PISTE_DIFFICULTY_KEYS);
  if (v == null && props && typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) v = m[1];
  }
  return v != null ? String(v).toLowerCase().trim() : '';
}

/** Get length from piste properties (meters or numeric string); parse "1.2 km" / "0.5 mi" style. */
function getPisteLengthFromProps(props) {
  let v = getProp(props, PISTE_LENGTH_KEYS);
  if (v == null && props && typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:length"=>"([^"]+)"/);
    if (m) v = m[1];
    if (v == null) {
      const m2 = props.other_tags.match(/"length"=>"([^"]+)"/);
      if (m2) v = m2[1];
    }
  }
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const num = parseFloat(s.replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return null;
  if (/\bmi\b/i.test(s)) return num * 1609.34;
  if (/\bkm\b/i.test(s)) return num * 1000;
  return num;
}

/** Line length in meters (haversine) for LineString or MultiLineString. */
function lineLengthMeters(geom) {
  if (!geom || !geom.coordinates) return null;
  const segments = geom.type === 'LineString' ? [geom.coordinates] : (geom.coordinates || []);
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  let total = 0;
  for (const coords of segments) {
    const pts = Array.isArray(coords[0]) && typeof coords[0][0] === 'number' ? coords : [];
    if (pts.length < 2) continue;
    for (let i = 1; i < pts.length; i++) {
      const [lon1, lat1] = pts[i - 1];
      const [lon2, lat2] = pts[i];
      const φ1 = toRad(lat1), φ2 = toRad(lat2), Δλ = toRad(lon2 - lon1);
      const a = Math.sin(Δλ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      total += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }
  return total > 0 ? total : null;
}

function formatTrailLength(meters) {
  if (meters == null || !isFinite(meters) || meters < 0) return '';
  const mi = meters / 1609.34;
  if (mi >= 0.1) return mi.toFixed(2) + ' mi';
  return (meters / 1000).toFixed(2) + ' km';
}

function isLift(props) {
  const aerialway = getProp(props, ['aerialway', 'Aerialway']);
  return aerialway != null && String(aerialway).trim() !== '';
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

async function loadFeaturesFromParquet(parquetUrl, geomFilter) {
  const { loadParquetAsRows } = await import('../../scripts/parquet-wasm-loader.js');
  const rows = await loadParquetAsRows(parquetUrl);
  return rows
    .filter((r) => r.geometry && geomFilter(r.geometry.type))
    .map((r) => ({ type: 'Feature', geometry: r.geometry, properties: r.properties || {} }));
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

async function enhanceResortMap(params) {
  const { title, lat, lon, pageId } = params || {};
  const map = window.RESORT_MAP_INSTANCE;
  if (!map || lat == null || lon == null || !title) return;

  const resortName = String(title).trim();
  const resortLat = Number(lat);
  const resortLon = Number(lon);

  try {
    const isPolygon = (t) => t === 'Polygon' || t === 'MultiPolygon';
    const isLine = (t) => t === 'LineString' || t === 'MultiLineString';

    const [analyzedRows, outlineFeatures, liftFeatures, pisteFeatures] = await Promise.all([
      loadFeaturesFromParquet(SKI_AREAS_PARQUET_URL, () => true),
      loadFeaturesFromParquet(SKI_AREAS_OUTLINES_PARQUET_URL, isPolygon),
      loadFeaturesFromParquet(LIFTS_PARQUET_URL, isLine),
      loadFeaturesFromParquet(PISTES_PARQUET_URL, isLine)
    ]);

    const dataAnalyzed = analyzedRows.map((r) => ({ ...r.properties, geometry: r.geometry }));
    const resort = dataAnalyzed.find((row) => {
      const name = getProp(row, NAME_KEYS);
      const [rowLat, rowLon] = getResortLatLon(row);
      if (!name || rowLat == null || rowLon == null) return false;
      if (String(name).trim().toLowerCase() !== resortName.toLowerCase()) return false;
      const dist = Math.hypot(rowLat - resortLat, rowLon - resortLon);
      return dist < 0.1;
    });

    if (!resort) return;
    const resortRef = getProp(resort, ID_KEYS);

    let outlineFeature = outlineFeatures.find((f) => {
      const name = getProp(f.properties, NAME_KEYS);
      const ref = getProp(f.properties, ['ref', 'id']);
      if (resortRef != null && ref != null && String(ref) === String(resortRef)) return true;
      if (name && resortName && String(name).trim().toLowerCase() === resortName.trim().toLowerCase()) return true;
      return pointInPolygon(resortLon, resortLat, f.geometry);
    });

    const features = [];
    if (outlineFeature) {
      const outlineGeom = outlineFeature.geometry;
      liftFeatures.forEach((f) => {
        const c = lineCentroid(f.geometry);
        if (c && pointInPolygon(c[0], c[1], outlineGeom)) features.push(f);
      });
      pisteFeatures.forEach((f) => {
        const c = lineCentroid(f.geometry);
        if (c && pointInPolygon(c[0], c[1], outlineGeom)) features.push(f);
      });
    }

    const liftFeats = features.filter((f) => isLift(f.properties));
    const pisteFeats = features.filter((f) => !isLift(f.properties)).map((f) => ({
      ...f,
      properties: { ...f.properties, _difficulty: getPisteDifficulty(f.properties) }
    }));

    if (!map.getSource('outline') && outlineFeature) {
      map.addSource('outline', { type: 'geojson', data: outlineFeature });
      map.addLayer({
        id: 'outline',
        type: 'line',
        source: 'outline',
        paint: { 'line-color': '#000', 'line-width': 2, 'line-dasharray': [3, 6] }
      });
    }
    if (!map.getSource('lifts') && liftFeats.length) {
      map.addSource('lifts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: liftFeats }
      });
      map.addLayer({
        id: 'lifts',
        type: 'line',
        source: 'lifts',
        paint: { 'line-color': '#f87171', 'line-width': 2 }
      });
    }
    if (!map.getSource('pistes') && pisteFeats.length) {
      map.addSource('pistes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pisteFeats }
      });
      map.addLayer({
        id: 'pistes',
        type: 'line',
        source: 'pistes',
        paint: {
          'line-color': ['match', ['get', '_difficulty'], 'easy', '#22c55e', 'novice', '#22c55e', 'intermediate', '#2563eb', 'medium', '#2563eb', 'advanced', '#1a1a1a', 'hard', '#1a1a1a', 'expert', '#991b1b', 'freeride', '#991b1b', 'extreme', '#991b1b', '#64748b'],
          'line-width': 3
        }
      });
    }

    let tooltipEl = document.getElementById('resort-map-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'resort-map-tooltip';
      tooltipEl.className = 'resort-map-tooltip';
      document.body.appendChild(tooltipEl);
    }
    function setTooltip(html) {
      tooltipEl.innerHTML = html;
      tooltipEl.style.display = 'block';
    }
    function moveTooltip(x, y) {
      const rect = map.getCanvas().getBoundingClientRect();
      tooltipEl.style.left = (rect.left + x + 12) + 'px';
      tooltipEl.style.top = (rect.top + y + 12) + 'px';
    }
    function hideTooltip() {
      tooltipEl.style.display = 'none';
    }

    if (liftFeats.length) {
      map.on('mouseenter', 'lifts', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const name = getProp(p, NAME_KEYS) || p.name || 'Lift';
        const aerialway = getProp(p, ['aerialway', 'Aerialway']);
        const line = aerialway ? '<br/><span style="color:#94a3b8">' + String(aerialway).replace(/_/g, ' ') + '</span>' : '';
        setTooltip('<strong>' + String(name) + '</strong>' + line);
      });
      map.on('mousemove', 'lifts', (e) => moveTooltip(e.point.x, e.point.y));
      map.on('mouseleave', 'lifts', () => { map.getCanvas().style.cursor = ''; hideTooltip(); });
    }
    if (pisteFeats.length) {
      map.on('mouseenter', 'pistes', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        const p = f.properties;
        const name = getProp(p, NAME_KEYS) || p.name || 'Trail';
        const diff = (p._difficulty || getPisteDifficulty(p) || '').toLowerCase();
        const diffLabel = diff ? diff.replace(/^./, (c) => c.toUpperCase()) : '';
        let lengthM = getPisteLengthFromProps(p);
        if (lengthM == null && f.geometry) lengthM = lineLengthMeters(f.geometry);
        const lengthStr = formatTrailLength(lengthM);
        const line = diffLabel ? '<br/><span style="color:#94a3b8">' + diffLabel + (lengthStr ? ' · ' + lengthStr : '') + '</span>' : (lengthStr ? '<br/><span style="color:#94a3b8">' + lengthStr + '</span>' : '');
        setTooltip('<strong>' + String(name) + '</strong>' + line);
      });
      map.on('mousemove', 'pistes', (e) => moveTooltip(e.point.x, e.point.y));
      map.on('mouseleave', 'pistes', () => { map.getCanvas().style.cursor = ''; hideTooltip(); });
    }
    if (outlineFeature) {
      map.on('mouseenter', 'outline', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'outline', () => { map.getCanvas().style.cursor = ''; });
    }

    let extentBounds = outlineFeature ? boundsFromGeoJSONFeature(outlineFeature) : null;
    features.forEach((f) => { extentBounds = extendBbox(extentBounds, f); });

    if (extentBounds) {
      map.fitBounds(extentBounds, { padding: 20, maxZoom: 16 });
      map.once('moveend', () => {
        if (outlineFeature) map.setBearing(-southToNorthBearing(outlineFeature.geometry));
      });
    } else if (outlineFeature) {
      map.setBearing(-southToNorthBearing(outlineFeature.geometry));
    }

    const legendEl = document.getElementById('resort-map-legend');
    if (legendEl && (liftFeats.length || pisteFeats.length)) {
      legendEl.style.display = 'block';
      legendEl.innerHTML =
        '<h3>Map Key</h3>' +
        '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--easy"></span> Easy</div>' +
        '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--intermediate"></span> Intermediate</div>' +
        '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--advanced"></span> Advanced</div>' +
        '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--expert"></span> Expert</div>' +
        '<div class="resort-legend-row resort-legend-row-lift"><span class="resort-legend-swatch resort-legend-swatch--lift"></span> Lift</div>';
    }
  } catch (err) {
    console.warn('[resort-map-layers] enhance failed', err);
  }
}

window.enhanceResortMap = enhanceResortMap;

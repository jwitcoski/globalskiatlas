/**
 * Enhances the wiki resort map with boundaries, pistes, lifts, and tooltips.
 * Parquet fetch + parse + resort filtering run in a Web Worker so the main thread stays responsive.
 * Call window.enhanceResortMap({ title, lat, lon, pageId }) after initResortMap().
 */

const MAPTILER_KEY = '0P06ORgY8WvmMOnPr0p2';
const SKI_AREAS_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const SKI_AREAS_OUTLINES_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas.parquet';
const LIFTS_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/lifts.parquet';
const PISTES_PARQUET_URL = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/pistes.parquet';

const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
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

async function enhanceResortMap(params) {
  const { title, lat, lon, pageId } = params || {};
  const map = window.RESORT_MAP_INSTANCE;
  if (!map || lat == null || lon == null || !title) return;

  const resortName = String(title).trim();
  const resortLat = Number(lat);
  const resortLon = Number(lon);

  const worker = new Worker(new URL('resort-map-worker.js', import.meta.url), { type: 'module' });
  worker.postMessage({
    urls: {
      analyzed: SKI_AREAS_PARQUET_URL,
      outlines: SKI_AREAS_OUTLINES_PARQUET_URL,
      lifts: LIFTS_PARQUET_URL,
      pistes: PISTES_PARQUET_URL
    },
    resort: { title: resortName, lat: resortLat, lon: resortLon }
  });

  worker.onmessage = function (e) {
    const data = e.data;
    if (data.error) {
      console.warn('[resort-map-layers]', data.error);
      worker.terminate();
      return;
    }
    const { outlineFeature, liftFeats, pisteFeats, extentBounds, southToNorthBearing } = data;
    worker.terminate();

    try {
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

      if (extentBounds) {
        map.fitBounds(extentBounds, { padding: 20, maxZoom: 16 });
        map.once('moveend', () => {
          if (outlineFeature) map.setBearing(-southToNorthBearing);
        });
      } else if (outlineFeature) {
        map.setBearing(-southToNorthBearing);
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
      console.warn('[resort-map-layers] apply layers failed', err);
    }
  };

  worker.onerror = function (err) {
    console.warn('[resort-map-layers] worker error', err);
    worker.terminate();
  };
}

window.enhanceResortMap = enhanceResortMap;

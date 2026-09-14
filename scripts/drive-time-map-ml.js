/**
 * Drive-time map — Mapbox Matrix ETAs plus road-following 2 / 3 / 4 hour zones.
 * Sample destinations around the origin are timed via Matrix; Turf.js interpolates
 * them into isobands. If the grid is too sparse, a duration heatmap is shown instead.
 * Entry for DriveTimeMap.html.
 */
import { config } from './map-config.js?v=mb5';
import { initSkiResortMap } from './ski-resort-map-ml.js';
import { escapeHtml } from './utils.js';

const MATRIX_LIMIT = 24;
const HOURS = [2, 3, 4];
const MAX_HOURS = 4;
const RING_COLORS = { 2: '#0d9488', 3: '#2563eb', 4: '#d97706' };
const EARTH_RADIUS_KM = 6371;
const FALLBACK_KMH = 70;
const ISO_BREAKS = [0, 120, 180, 240];
const LAYER_PREFIXES = ['dt-iso-', 'dt-heat-', 'dt-circle-', 'dt-label-'];

let turfIso = null;

function haversineKm(lng0, lat0, lng1, lat1) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ0 = toRad(lat0);
  const φ1 = toRad(lat1);
  const Δφ = toRad(lat1 - lat0);
  const Δλ = toRad(lng1 - lng0);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ0) * Math.cos(φ1) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function destAt(lon, lat, bearingDeg, radiusKm) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ0 = toRad(lat);
  const λ0 = toRad(lon);
  const δ = radiusKm / EARTH_RADIUS_KM;
  const θ = toRad(bearingDeg);
  const φ1 = Math.asin(Math.sin(φ0) * Math.cos(δ) + Math.cos(φ0) * Math.sin(δ) * Math.cos(θ));
  const λ1 = λ0 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ0), Math.cos(δ) - Math.sin(φ0) * Math.sin(φ1));
  return [toDeg(λ1), toDeg(φ1)];
}

function bandLabel(minutes) {
  if (minutes == null || minutes > MAX_HOURS * 60) return null;
  if (minutes <= 120) return 'Within 2 hours';
  if (minutes <= 180) return '2–3 hours';
  return '3–4 hours';
}

function bandColor(key) {
  if (key === 'Within 2 hours') return RING_COLORS[2];
  if (key === '2–3 hours') return RING_COLORS[3];
  if (key === '3–4 hours') return RING_COLORS[4];
  return '#6b7280';
}

function formatEta(d) {
  if (d.minutes == null) return `${d.km.toFixed(0)} km air`;
  const hours = d.minutes / 60;
  const time = hours >= 1.5 ? `${hours.toFixed(1)} hr` : `${d.minutes} min`;
  const how = d.airEst ? 'air est.' : 'drive';
  return `${time} · ${how} · ${d.km.toFixed(0)} km`;
}

function resortKey(d) {
  const r = d.resort;
  return `${r.name}|${r.latlng.lng}|${r.latlng.lat}`;
}

function median(values) {
  if (!values.length) return FALLBACK_KMH;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function circleLineString(lon, lat, radiusKm, numPoints = 96) {
  const coords = [];
  for (let i = 0; i <= numPoints; i++) {
    coords.push(destAt(lon, lat, (i / numPoints) * 360, radiusKm));
  }
  return { type: 'LineString', coordinates: coords };
}

function circleLabelPoint(lon, lat, radiusKm) {
  return { type: 'Point', coordinates: destAt(lon, lat, 0, radiusKm) };
}

function matrixDestLimit(profile) {
  return profile === 'driving-traffic' ? 9 : 24;
}

/** Polar sample grid so Matrix times follow roads instead of air circles. */
function buildSamplePoints(lng, lat, radiusKm, profile) {
  const pts = [];
  const rings = profile === 'driving-traffic' ? [0.28, 0.52, 0.76, 1.0] : [0.2, 0.4, 0.6, 0.8, 1.0];
  const nBearings = profile === 'driving-traffic' ? 12 : 18;
  for (let r = 0; r < rings.length; r++) {
    const dist = radiusKm * rings[r];
    for (let i = 0; i < nBearings; i++) {
      const bearing = i * (360 / nBearings);
      pts.push({ xy: destAt(lng, lat, bearing, dist), bearing, dist });
    }
  }
  return pts;
}

/** Along each bearing, find how far you can drive in `targetMin` minutes. */
function radiusAlongBearing(samples, targetMin) {
  const seq = samples.slice().sort((a, b) => a.dist - b.dist);
  if (!seq.length) return 0;
  if (seq[0].minutes >= targetMin) {
    return seq[0].dist * (targetMin / Math.max(seq[0].minutes, 1));
  }
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1];
    const b = seq[i];
    if (b.minutes >= targetMin) {
      const t = (targetMin - a.minutes) / Math.max(b.minutes - a.minutes, 0.01);
      return a.dist + t * (b.dist - a.dist);
    }
  }
  const last = seq[seq.length - 1];
  const extra = targetMin / Math.max(last.minutes, 1);
  return Math.min(last.dist * extra, last.dist * 1.15);
}

function samplesToZonePolygons(lng, lat, timedSamples) {
  const byBearing = new Map();
  timedSamples.forEach((s) => {
    const key = s.bearing.toFixed(2);
    if (!byBearing.has(key)) byBearing.set(key, []);
    byBearing.get(key).push(s);
  });
  const bearings = [...byBearing.keys()].map(Number).sort((a, b) => a - b);
  if (bearings.length < 6) return null;
  const features = [];
  const labels = [];
  HOURS.slice().reverse().forEach((H) => {
    const ring = bearings.map((b) => {
      const km = radiusAlongBearing(byBearing.get(b.toFixed(2)), H * 60);
      return destAt(lng, lat, b, Math.max(km, 2));
    });
    ring.push(ring[0]);
    const north = destAt(lng, lat, 0, Math.max(radiusAlongBearing(byBearing.get((0).toFixed(2)) || byBearing.get(bearings[0].toFixed(2)), H * 60), 2));
    features.push({
      type: 'Feature',
      properties: {
        hours: H,
        label: `${H} hrs`,
        fill: H === 2 ? '0-120' : H === 3 ? '120-180' : '180-240'
      },
      geometry: { type: 'Polygon', coordinates: [ring] }
    });
    labels.push({
      type: 'Feature',
      properties: { hours: H, label: `${H} hrs` },
      geometry: { type: 'Point', coordinates: north }
    });
  });
  return { type: 'FeatureCollection', features, labels };
}

function northernmostPoint(coords) {
  let best = coords[0];
  for (const c of coords) {
    if (c && c.length >= 2 && (!best || c[1] > best[1])) best = c;
  }
  return best;
}

function labelFeaturesFromBands(bands) {
  if (bands.labels && bands.labels.length) return bands.labels;
  return (bands.features || []).map((f) => {
    const ring = (f.geometry && f.geometry.coordinates && f.geometry.coordinates[0]) || [];
    const hours = f.properties && f.properties.hours;
    return {
      type: 'Feature',
      properties: { hours, label: (f.properties && f.properties.label) || `${hours} hrs` },
      geometry: { type: 'Point', coordinates: northernmostPoint(ring) }
    };
  }).filter((f) => f.geometry.coordinates);
}

async function getTurfIso() {
  if (turfIso) return turfIso;
  const [interpMod, isoMod, helpersMod, bboxMod, smoothMod] = await Promise.all([
    import('https://esm.sh/@turf/interpolate@7.2.0'),
    import('https://esm.sh/@turf/isobands@7.2.0'),
    import('https://esm.sh/@turf/helpers@7.2.0'),
    import('https://esm.sh/@turf/bbox@7.2.0'),
    import('https://esm.sh/@turf/polygon-smooth@7.2.0')
  ]);
  turfIso = {
    interpolate: interpMod.default ?? interpMod.interpolate,
    isobands: isoMod.default ?? isoMod.isobands,
    point: helpersMod.point,
    featureCollection: helpersMod.featureCollection,
    bbox: bboxMod.default ?? bboxMod.bbox,
    polygonSmooth: smoothMod.default ?? smoothMod.polygonSmooth
  };
  return turfIso;
}

async function smoothZonePolygons(fc) {
  if (!fc || !fc.features || !fc.features.length) return fc;
  try {
    const t = await getTurfIso();
    const smoothed = t.polygonSmooth(fc, { iterations: 3 });
    if (smoothed && smoothed.features && smoothed.features.length) {
      smoothed.labels = fc.labels;
      return smoothed;
    }
  } catch (err) {
    console.warn('[drive-time-map-ml] polygonSmooth failed:', err);
  }
  return fc;
}

function firstSymbolLayerId(map) {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  const symbol = layers.find((l) => l.type === 'symbol');
  return symbol ? symbol.id : undefined;
}

(async function main() {
  let map, searchResorts;
  try {
    const out = await initSkiResortMap({ includeRoadTripButton: false });
    map = out.map;
    searchResorts = out.searchResorts || [];
  } catch (err) {
    console.warn('[drive-time-map-ml] init failed:', err);
    return;
  }

  const token = config.MAPBOX_ACCESS_TOKEN || '';
  const panel = document.getElementById('driveTimePanel');
  const toggle = document.getElementById('dt-toggle');
  const closeBtn = document.getElementById('dtClose');
  const originInput = document.getElementById('dtOriginInput');
  const geocodeBtn = document.getElementById('dtGeocodeBtn');
  const useLocBtn = document.getElementById('dtUseLocationBtn');
  const originStatus = document.getElementById('dtOriginStatus');
  const apiWarning = document.getElementById('dtApiWarning');
  const drawBtn = document.getElementById('dtDrawBtn');
  const profileEl = document.getElementById('dtProfile');
  const resultsEl = document.getElementById('dtResults');
  const bandListEl = document.getElementById('dtBandList');

  let originLngLat = null;
  let originMarker = null;

  function setStatus(msg) {
    if (originStatus) originStatus.textContent = msg || '';
  }

  function tokenReady() {
    if (token && token.indexOf('pk.') === 0) return true;
    if (apiWarning) {
      apiWarning.textContent = 'Mapbox public token is missing. Add MAPBOX_ACCESS_TOKEN in scripts/map-config.js.';
      apiWarning.style.display = 'block';
    }
    if (drawBtn) drawBtn.disabled = true;
    return false;
  }

  function setOrigin(lng, lat, label) {
    originLngLat = [lng, lat];
    setStatus(label ? `Set: ${label}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    if (drawBtn) drawBtn.disabled = !originLngLat || !tokenReady();
    if (map && originLngLat) {
      if (originMarker) originMarker.remove();
      const el = document.createElement('div');
      el.innerHTML = '<div style="background:#0d9488;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🚗</div>';
      originMarker = new maptilersdk.Marker({ element: el.firstElementChild, anchor: 'bottom' })
        .setLngLat(originLngLat)
        .addTo(map);
    }
  }

  function clearDriveLayers() {
    const style = map.getStyle();
    const layers = (style && style.layers) || [];
    layers.slice().forEach((layer) => {
      if (LAYER_PREFIXES.some((p) => layer.id.startsWith(p)) && map.getLayer(layer.id)) {
        map.removeLayer(layer.id);
      }
    });
    const sources = (style && style.sources) || {};
    Object.keys(sources).forEach((id) => {
      if (LAYER_PREFIXES.some((p) => id.startsWith(p)) && map.getSource(id)) {
        map.removeSource(id);
      }
    });
  }

  function nearestResorts(lngLat, n) {
    return searchResorts
      .filter((r) => r.latlng && Number.isFinite(r.latlng.lng) && Number.isFinite(r.latlng.lat))
      .map((r) => ({
        resort: r,
        km: haversineKm(lngLat[0], lngLat[1], r.latlng.lng, r.latlng.lat)
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, n);
  }

  async function geocode(query) {
    const url =
      'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
      encodeURIComponent(query) +
      '.json?access_token=' +
      token +
      '&limit=1';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocode HTTP ' + res.status);
    const data = await res.json();
    const f = data.features && data.features[0];
    if (!f) return null;
    return { lng: f.center[0], lat: f.center[1], display_name: f.place_name };
  }

  async function matrixDurations(lngLat, destLngLats, profile) {
    const maxDest = matrixDestLimit(profile);
    const out = new Array(destLngLats.length).fill(null);
    for (let i = 0; i < destLngLats.length; i += maxDest) {
      const chunk = destLngLats.slice(i, i + maxDest);
      const coords = [lngLat]
        .concat(chunk)
        .map((c) => c.join(','))
        .join(';');
      const url =
        'https://api.mapbox.com/directions-matrix/v1/mapbox/' +
        profile +
        '/' +
        coords +
        '?sources=0&annotations=duration&access_token=' +
        token;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Matrix HTTP ' + res.status);
      const data = await res.json();
      const durations = (data.durations && data.durations[0]) || [];
      chunk.forEach((_, j) => {
        const sec = durations[j + 1];
        out[i + j] = typeof sec === 'number' && Number.isFinite(sec) ? sec : null;
      });
    }
    return out;
  }

  async function loadMatrix(lngLat, destinations, profile) {
    if (!destinations.length) return [];
    const chunk = destinations.slice(0, MATRIX_LIMIT);
    const secs = await matrixDurations(
      lngLat,
      chunk.map((d) => [d.resort.latlng.lng, d.resort.latlng.lat]),
      profile
    );
    return chunk.map((d, j) => ({ ...d, durationSec: secs[j], airEst: false }));
  }

  async function sampleDriveTimes(lngLat, radiusKm, profile) {
    const dests = buildSamplePoints(lngLat[0], lngLat[1], radiusKm, profile);
    const secs = await matrixDurations(lngLat, dests.map((d) => d.xy), profile);
    const features = [
      { type: 'Feature', geometry: { type: 'Point', coordinates: lngLat }, properties: { minutes: 0 } }
    ];
    const timed = [];
    dests.forEach((d, i) => {
      if (secs[i] == null) return;
      const minutes = secs[i] / 60;
      if (minutes < 0 || minutes > 360) return;
      timed.push({ ...d, minutes });
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: d.xy },
        properties: { minutes, bearing: d.bearing }
      });
    });
    return { type: 'FeatureCollection', features, timed };
  }

  async function pointsToIsobands(pointFc, radiusKm) {
    const t = await getTurfIso();
    const fc = t.featureCollection(
      pointFc.features.map((f) => t.point(f.geometry.coordinates, f.properties))
    );
    const cell = Math.max(12, Math.min(28, radiusKm / 10));
    const grid = t.interpolate(fc, cell, {
      gridType: 'points',
      property: 'minutes',
      units: 'kilometers'
    });
    const bands = t.isobands(grid, ISO_BREAKS, { zProperty: 'minutes' });
    (bands.features || []).forEach((f) => {
      const raw = String((f.properties && (f.properties.fill || f.properties.level)) || '');
      const low = parseFloat(raw.split('-')[0]);
      if (low < 120) f.properties.hours = 2;
      else if (low < 180) f.properties.hours = 3;
      else f.properties.hours = 4;
      f.properties.label = `${f.properties.hours} hrs`;
    });
    return bands;
  }

  function paintIsochrones(bands) {
    const beforeId = firstSymbolLayerId(map);
    map.addSource('dt-iso-src', { type: 'geojson', data: bands });
    map.addLayer(
      {
        id: 'dt-iso-fill',
        type: 'fill',
        source: 'dt-iso-src',
        paint: {
          'fill-color': [
            'match',
            ['get', 'hours'],
            2,
            RING_COLORS[2],
            3,
            RING_COLORS[3],
            4,
            RING_COLORS[4],
            RING_COLORS[4]
          ],
          'fill-opacity': [
            'match',
            ['get', 'hours'],
            2,
            0.38,
            3,
            0.26,
            4,
            0.16,
            0.12
          ]
        }
      },
      beforeId
    );
    map.addLayer(
      {
        id: 'dt-iso-line',
        type: 'line',
        source: 'dt-iso-src',
        paint: {
          'line-color': [
            'match',
            ['get', 'hours'],
            2,
            RING_COLORS[2],
            3,
            RING_COLORS[3],
            4,
            RING_COLORS[4],
            RING_COLORS[4]
          ],
          'line-width': 2,
          'line-opacity': 0.9
        }
      },
      beforeId
    );
    map.addLayer({
      id: 'dt-iso-label',
      type: 'symbol',
      source: 'dt-iso-src',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'label'], ['concat', ['to-string', ['get', 'hours']], ' hrs']],
        'text-size': 13,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'symbol-spacing': 220,
        'text-max-angle': 40,
        'text-padding': 1,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': [
          'match',
          ['get', 'hours'],
          2,
          RING_COLORS[2],
          3,
          RING_COLORS[3],
          4,
          RING_COLORS[4],
          RING_COLORS[4]
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.2
      }
    });
  }

  function paintHeatmap(pointFc) {
    const beforeId = firstSymbolLayerId(map);
    map.addSource('dt-heat-src', { type: 'geojson', data: pointFc });
    map.addLayer(
      {
        id: 'dt-heat-layer',
        type: 'heatmap',
        source: 'dt-heat-src',
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'minutes'],
            0,
            1,
            120,
            0.7,
            180,
            0.4,
            240,
            0.15,
            360,
            0
          ],
          'heatmap-intensity': 0.9,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 18, 8, 42, 11, 70],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.2,
            'rgba(217,119,6,0.35)',
            0.45,
            'rgba(37,99,235,0.45)',
            0.75,
            'rgba(13,148,136,0.65)',
            1,
            'rgba(13,148,136,0.9)'
          ],
          'heatmap-opacity': 0.85
        }
      },
      beforeId
    );
  }

  function paintRings(lng, lat, radiusByHour) {
    HOURS.forEach((H) => {
      const radiusKm = radiusByHour[H];
      if (!radiusKm) return;
      const color = RING_COLORS[H];
      const lineId = `dt-circle-${H}h`;
      const labelId = `dt-label-${H}h`;
      const lineGeom = circleLineString(lng, lat, radiusKm);
      const labelText = `${H} hrs`;

      map.addSource(lineId, { type: 'geojson', data: { type: 'Feature', geometry: lineGeom, properties: {} } });
      map.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        paint: {
          'line-color': color,
          'line-width': 2.5,
          'line-opacity': 0.95
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });

      map.addSource(labelId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: circleLabelPoint(lng, lat, radiusKm), properties: { label: labelText } }
      });
      map.addLayer({
        id: labelId,
        type: 'symbol',
        source: labelId,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true
        },
        paint: {
          'text-color': color,
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });
    });
  }

  function fitToData(lngLat, geojson, radiusKm) {
    try {
      if (geojson && geojson.features && geojson.features.length) {
        const t = turfIso;
        if (t && t.bbox) {
          const b = t.bbox(geojson);
          map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, duration: 800, maxZoom: 8 });
          return;
        }
      }
    } catch (_) { /* fall through */ }
    const pad = 1.1 * (radiusKm / 111);
    map.fitBounds(
      [[lngLat[0] - pad, lngLat[1] - pad], [lngLat[0] + pad, lngLat[1] + pad]],
      { padding: 80, duration: 800, maxZoom: 8 }
    );
  }

  function renderBands(withEta) {
    const groups = {
      'Within 2 hours': [],
      '2–3 hours': [],
      '3–4 hours': []
    };
    withEta.forEach((d) => {
      const mins = d.durationSec == null ? null : Math.round(d.durationSec / 60);
      const key = bandLabel(mins);
      if (!key) return;
      groups[key].push({ ...d, minutes: mins });
    });

    bandListEl.innerHTML = '';
    Object.keys(groups).forEach((key) => {
      const list = groups[key];
      if (!list.length) return;
      list.sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999));
      const color = bandColor(key);
      const div = document.createElement('div');
      div.className = 'dt-band';
      const heading = document.createElement('h4');
      heading.innerHTML =
        `<span class="dt-band-fill" style="background:${color}"></span> ${escapeHtml(key)} <span class="dt-count">(${list.length})</span>`;
      const ul = document.createElement('ul');
      list.forEach((d) => {
        const li = document.createElement('li');
        const country = d.resort.country ? ` <span style="color:#6b7280">${escapeHtml(d.resort.country)}</span>` : '';
        const eta = formatEta(d);
        li.innerHTML = `${escapeHtml(d.resort.name)}${country}<small>${escapeHtml(eta)}</small>`;
        li.addEventListener('click', () => {
          map.flyTo({ center: [d.resort.latlng.lng, d.resort.latlng.lat], zoom: 10, duration: 800 });
        });
        ul.appendChild(li);
      });
      div.appendChild(heading);
      div.appendChild(ul);
      bandListEl.appendChild(div);
    });
    resultsEl.classList.add('visible');
  }

  async function runAt(lngLat, placeLabel) {
    if (!tokenReady() || !map || !bandListEl) return;
    setOrigin(lngLat[0], lngLat[1], placeLabel);
    const profile = (profileEl && profileEl.value) || 'driving';
    drawBtn.disabled = true;
    setStatus('Loading drive times…');
    if (apiWarning) apiWarning.style.display = 'none';
    clearDriveLayers();

    try {
      const allNear = nearestResorts(lngLat, searchResorts.length);
      const withEta = await loadMatrix(lngLat, allNear.slice(0, MATRIX_LIMIT), profile);
      const speeds = withEta
        .filter((d) => d.durationSec > 60 && d.km > 5)
        .map((d) => d.km / (d.durationSec / 3600))
        .filter((s) => s > 20 && s < 130);
      const kmh = Math.min(95, Math.max(40, median(speeds)));
      const radiusByHour = {};
      HOURS.forEach((H) => { radiusByHour[H] = kmh * H; });
      const maxKm = kmh * MAX_HOURS;
      const maxSec = MAX_HOURS * 3600;
      const matrixKeys = new Set(withEta.map(resortKey));
      const listed = withEta.filter((d) => d.durationSec != null && d.durationSec <= maxSec);
      for (const d of allNear) {
        if (d.km > maxKm) break;
        if (matrixKeys.has(resortKey(d))) continue;
        listed.push({
          ...d,
          durationSec: (d.km / kmh) * 3600,
          airEst: true
        });
      }

      setStatus('Building road-time zones…');
      const sampleFc = await sampleDriveTimes(lngLat, maxKm * 1.05, profile);
      let zoneFc = samplesToZonePolygons(lngLat[0], lngLat[1], sampleFc.timed || []);
      let mode = 'circles';
      if (zoneFc && zoneFc.features.length) {
        zoneFc = await smoothZonePolygons(zoneFc);
        paintIsochrones(zoneFc);
        mode = 'isobands';
      } else if (sampleFc.features.length >= 12) {
        try {
          zoneFc = await pointsToIsobands(sampleFc, maxKm);
          if (zoneFc && zoneFc.features && zoneFc.features.length) {
            zoneFc = await smoothZonePolygons(zoneFc);
            paintIsochrones(zoneFc);
            mode = 'isobands';
          }
        } catch (isoErr) {
          console.warn('[drive-time-map-ml] isobands failed:', isoErr);
        }
      }
      if (mode !== 'isobands') {
        if (sampleFc.features.length >= 8) {
          paintHeatmap(sampleFc);
          mode = 'heatmap';
        } else {
          paintRings(lngLat[0], lngLat[1], radiusByHour);
        }
      }

      renderBands(listed);
      fitToData(lngLat, zoneFc || sampleFc, maxKm);
      const modeNote =
        mode === 'isobands'
          ? 'road-time zones'
          : mode === 'heatmap'
            ? 'drive-time heatmap'
            : 'air rings (fallback)';
      setStatus((placeLabel || 'Origin') + ' · ' + modeNote);
    } catch (err) {
      console.warn('[drive-time-map-ml] error:', err);
      clearDriveLayers();
      setStatus((err && err.message) ? err.message : 'Drive-time request failed.');
    }
    drawBtn.disabled = !originLngLat;
  }

  if (toggle) toggle.addEventListener('click', () => panel.classList.toggle('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  geocodeBtn.addEventListener('click', async () => {
    const q = (originInput && originInput.value) ? originInput.value.trim() : '';
    if (!q) {
      setStatus('Enter an address or city.');
      return;
    }
    if (!tokenReady()) return;
    setStatus('Searching…');
    geocodeBtn.disabled = true;
    try {
      const result = await geocode(q);
      if (result) {
        if (originInput) originInput.value = result.display_name;
        await runAt([result.lng, result.lat], result.display_name);
      } else {
        setStatus('Address not found.');
      }
    } catch (e) {
      setStatus((e && e.message) ? e.message : 'Geocoding failed.');
    }
    geocodeBtn.disabled = false;
  });

  originInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') geocodeBtn.click();
  });

  useLocBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported.');
      return;
    }
    if (!tokenReady()) return;
    setStatus('Getting location…');
    useLocBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (originInput) originInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        runAt([lng, lat], 'Your location').finally(() => {
          useLocBtn.disabled = false;
        });
      },
      () => {
        setStatus('Location denied or unavailable.');
        useLocBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  drawBtn.addEventListener('click', () => {
    if (!originLngLat) return;
    runAt(originLngLat, originStatus?.textContent?.replace(/^Set:\s*/, '') || 'Origin');
  });

  profileEl?.addEventListener('change', () => {
    if (originLngLat) runAt(originLngLat, 'Origin');
  });

  tokenReady();
  if (panel) panel.classList.add('open');

  try {
    const { lookupIpLocation } = await import('./clay/nearest-resort.js');
    const loc = await lookupIpLocation();
    const label = [loc.city, loc.region].filter(Boolean).join(', ') || 'Near you';
    if (originInput) originInput.value = label;
    map.flyTo({ center: [loc.lon, loc.lat], zoom: 8, duration: 900 });
    if (tokenReady()) await runAt([loc.lon, loc.lat], label);
    else setOrigin(loc.lon, loc.lat, label);
  } catch (err) {
    console.warn('[drive-time-map-ml] IP origin skipped', err);
  }
})();

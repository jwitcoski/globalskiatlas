/**
 * Drive-time map — Mapbox Matrix ETAs plus labeled 2 / 3 / 4 hour rings.
 * Ring radius is calibrated from Mapbox drive times (km per hour in that region).
 * Entry for DriveTimeMap.html.
 */
import { config } from './map-config.js?v=mb4';
import { initSkiResortMap } from './ski-resort-map-ml.js';
import { escapeHtml } from './utils.js';

const MATRIX_LIMIT = 24;
const HOURS = [2, 3, 4];
const MAX_HOURS = 4;
const RING_COLORS = { 2: '#0d9488', 3: '#2563eb', 4: '#d97706' };
const EARTH_RADIUS_KM = 6371;
const FALLBACK_KMH = 70;

function haversineKm(lng0, lat0, lng1, lat1) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ0 = toRad(lat0);
  const φ1 = toRad(lat1);
  const Δφ = toRad(lat1 - lat0);
  const Δλ = toRad(lng1 - lng0);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ0) * Math.cos(φ1) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
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
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const R = EARTH_RADIUS_KM;
  const coords = [];
  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i / numPoints) * 2 * Math.PI;
    const φ0 = toRad(lat);
    const λ0 = toRad(lon);
    const δ = radiusKm / R;
    const φ1 = Math.asin(Math.sin(φ0) * Math.cos(δ) + Math.cos(φ0) * Math.sin(δ) * Math.cos(bearing));
    const λ1 = λ0 + Math.atan2(Math.sin(bearing) * Math.sin(δ) * Math.cos(φ0), Math.cos(δ) - Math.sin(φ0) * Math.sin(φ1));
    coords.push([toDeg(λ1), toDeg(φ1)]);
  }
  return { type: 'LineString', coordinates: coords };
}

function circleLabelPoint(lon, lat, radiusKm) {
  return { type: 'Point', coordinates: [lon, lat + radiusKm / 111.32] };
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

  function clearRings() {
    const style = map.getStyle();
    const layers = (style && style.layers) || [];
    layers.slice().forEach((layer) => {
      if (layer.id.startsWith('dt-circle-') || layer.id.startsWith('dt-label-')) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      }
    });
    const sources = (style && style.sources) || {};
    Object.keys(sources).forEach((id) => {
      if (id.startsWith('dt-circle-') || id.startsWith('dt-label-')) {
        if (map.getSource(id)) map.removeSource(id);
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

  async function loadMatrix(lngLat, destinations, profile) {
    if (!destinations.length) return [];
    const chunk = destinations.slice(0, MATRIX_LIMIT);
    const coords = [lngLat]
      .concat(chunk.map((d) => [d.resort.latlng.lng, d.resort.latlng.lat]))
      .map((c) => c.join(','))
      .join(';');
    const url =
      'https://api.mapbox.com/directions-matrix/v1/mapbox/' +
      profile +
      '/' +
      coords +
      '?sources=0&annotations=duration,distance&access_token=' +
      token;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Matrix HTTP ' + res.status);
    const data = await res.json();
    const durations = (data.durations && data.durations[0]) || [];
    return chunk.map((d, j) => ({ ...d, durationSec: durations[j + 1], airEst: false }));
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
    clearRings();

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

      paintRings(lngLat[0], lngLat[1], radiusByHour);
      renderBands(listed);

      const maxR = radiusByHour[4];
      const pad = 1.1 * (maxR / 111);
      map.fitBounds(
        [[lngLat[0] - pad, lngLat[1] - pad], [lngLat[0] + pad, lngLat[1] + pad]],
        { padding: 80, duration: 800, maxZoom: 8 }
      );
      setStatus((placeLabel || 'Origin') + ' · Mapbox driving');
    } catch (err) {
      console.warn('[drive-time-map-ml] error:', err);
      clearRings();
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
})();

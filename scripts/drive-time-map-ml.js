/**
 * Drive-time map – estimated drive-time rings from nearest 10 resorts.
 * Finds 10 nearest resorts by straight-line distance, gets drive times via OSRM table,
 * then draws concentric circles at radii that approximate 1h, 2h, 3h, … (nearest hour).
 * Entry for DriveTimeMap.html.
 */
import { initSkiResortMap } from './ski-resort-map-ml.js';
import { escapeHtml } from './utils.js';

const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving';
const NEAREST_N = 10;
const EARTH_RADIUS_KM = 6371;

// Colors for 1h, 2h, 3h, … rings (teal, blue, amber, purple, red, emerald, orange, indigo)
const RING_COLORS = ['#0d9488', '#2563eb', '#ca8a04', '#9333ea', '#dc2626', '#059669', '#ea580c', '#4f46e5'];

// ── Haversine distance (km) between [lon, lat] and { lat, lng } ───────────
function haversineKm(lon0, lat0, lon1, lat1) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = EARTH_RADIUS_KM;
  const φ0 = toRad(lat0), φ1 = toRad(lat1);
  const Δφ = toRad(lat1 - lat0), Δλ = toRad(lon1 - lon0);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ0) * Math.cos(φ1) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Circle polygon (center [lon, lat], radius km, num points) ──────────────
function circlePolygon(lon, lat, radiusKm, numPoints = 64) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const R = EARTH_RADIUS_KM;
  const coords = [];
  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i / numPoints) * 2 * Math.PI;
    const φ0 = toRad(lat), λ0 = toRad(lon);
    const φ1 = Math.asin(Math.sin(φ0) * Math.cos(radiusKm / R) + Math.cos(φ0) * Math.sin(radiusKm / R) * Math.cos(bearing));
    const λ1 = λ0 + Math.atan2(Math.sin(bearing) * Math.sin(radiusKm / R) * Math.cos(φ0), Math.cos(radiusKm / R) - Math.sin(φ0) * Math.sin(φ1));
    coords.push([toDeg(λ1), toDeg(φ1)]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

// Circle as LineString for outline-only ring
function circleLineString(lon, lat, radiusKm, numPoints = 64) {
  const poly = circlePolygon(lon, lat, radiusKm, numPoints);
  return { type: 'LineString', coordinates: poly.coordinates[0] };
}

// Point at "north" of circle for label (radiusKm to degrees approx)
function circleLabelPoint(lon, lat, radiusKm) {
  const latOffset = radiusKm / 111.32;
  return { type: 'Point', coordinates: [lon, lat + latOffset] };
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

  const panel = document.getElementById('driveTimePanel');
  const toggle = document.getElementById('dt-toggle');
  const closeBtn = document.getElementById('dtClose');
  const originInput = document.getElementById('dtOriginInput');
  const geocodeBtn = document.getElementById('dtGeocodeBtn');
  const useLocBtn = document.getElementById('dtUseLocationBtn');
  const originStatus = document.getElementById('dtOriginStatus');
  const apiWarning = document.getElementById('dtApiWarning');
  const drawBtn = document.getElementById('dtDrawBtn');
  const resultsEl = document.getElementById('dtResults');
  const bandListEl = document.getElementById('dtBandList');

  let originLngLat = null;
  let originMarker = null;

  function setOrigin(lng, lat, label) {
    originLngLat = [lng, lat];
    if (originStatus) originStatus.textContent = label ? `Set: ${label}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    drawBtn.disabled = !originLngLat;
    if (map && originLngLat) {
      if (originMarker) originMarker.remove();
      const el = document.createElement('div');
      el.innerHTML = '<div style="background:#0d9488;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🚗</div>';
      originMarker = new maplibregl.Marker({ element: el.firstElementChild, anchor: 'bottom' })
        .setLngLat(originLngLat)
        .addTo(map);
    }
  }

  function clearIsochrones() {
    const sources = (map.getStyle().sources) || {};
    Object.keys(sources).forEach((id) => {
      if (id.startsWith('dt-circle-') || id.startsWith('dt-label-')) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
    });
  }

  // ── Panel ─────────────────────────────────────────────────────────────
  if (toggle) toggle.addEventListener('click', () => panel.classList.toggle('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  // ── Geocode (Nominatim) ───────────────────────────────────────────────
  async function geocode(address) {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address),
      { headers: { Accept: 'application/json' } }
    );
    const data = await res.json();
    if (!data || !data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng, display_name: data[0].display_name };
  }

  geocodeBtn.addEventListener('click', async () => {
    const q = (originInput && originInput.value) ? originInput.value.trim() : '';
    if (!q) {
      if (originStatus) originStatus.textContent = 'Enter an address or city.';
      return;
    }
    if (originStatus) originStatus.textContent = 'Searching…';
    geocodeBtn.disabled = true;
    try {
      const result = await geocode(q);
      if (result) {
        setOrigin(result.lng, result.lat, result.display_name);
        if (originInput) originInput.value = result.display_name;
        map.flyTo({ center: [result.lng, result.lat], zoom: Math.max(map.getZoom(), 8), duration: 800 });
      } else {
        if (originStatus) originStatus.textContent = 'Address not found.';
      }
    } catch (e) {
      if (originStatus) originStatus.textContent = 'Geocoding failed.';
    }
    geocodeBtn.disabled = false;
  });

  useLocBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (originStatus) originStatus.textContent = 'Geolocation not supported.';
      return;
    }
    if (originStatus) originStatus.textContent = 'Getting location…';
    useLocBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOrigin(lng, lat, null);
        if (originInput) originInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 10), duration: 800 });
        useLocBtn.disabled = false;
      },
      () => {
        if (originStatus) originStatus.textContent = 'Location denied or unavailable.';
        useLocBtn.disabled = false;
      }
    );
  });

  // ── Build estimated drive-time circles from 10 nearest resorts ──────────
  drawBtn.addEventListener('click', async () => {
    if (!originLngLat || !map || !bandListEl) return;

    clearIsochrones();
    drawBtn.disabled = true;
    if (originStatus) originStatus.textContent = 'Finding nearest resorts & drive times…';
    if (apiWarning) apiWarning.style.display = 'none';

    const [originLng, originLat] = originLngLat;

    try {
      // 1. Straight-line distance to every resort; take nearest NEAREST_N
      const withDist = searchResorts.map((r) => ({
        resort: r,
        distKm: haversineKm(originLng, originLat, r.latlng.lng, r.latlng.lat)
      }));
      withDist.sort((a, b) => a.distKm - b.distKm);
      const nearest = withDist.slice(0, NEAREST_N);
      if (nearest.length === 0) {
        throw new Error('No resorts to measure');
      }

      // 2. OSRM table: origin (index 0) → destinations 1..N
      const coordStrCorrect = nearest.reduce((acc, n) => acc + `${n.resort.latlng.lng},${n.resort.latlng.lat};`, `${originLng},${originLat};`).slice(0, -1);
      const destinations = nearest.map((_, i) => i + 1).join(';');
      const url = `${OSRM_TABLE_URL}/${coordStrCorrect}?sources=0&destinations=${destinations}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.durations || !data.durations[0]) {
        throw new Error(data.message || 'OSRM table request failed');
      }

      const durationsSec = data.durations[0];
      const samples = nearest.map((n, i) => ({
        distKm: n.distKm,
        driveSec: durationsSec[i] != null ? durationsSec[i] : Infinity
      })).filter((s) => s.driveSec != null && Number.isFinite(s.driveSec));

      if (samples.length === 0) throw new Error('No drive times returned');

      // 3. Radius per hour: for each hour H, max straight-line dist among resorts with drive time <= H*3600
      const radiusByHour = {};
      for (let H = 1; H <= 10; H++) {
        const maxSec = H * 3600;
        const within = samples.filter((s) => s.driveSec <= maxSec);
        if (within.length) {
          radiusByHour[H] = Math.max(...within.map((s) => s.distKm));
        }
      }
      const hours = Object.keys(radiusByHour).map(Number).sort((a, b) => a - b);
      if (hours.length === 0) throw new Error('No hour bands from sample resorts');

      // 4. Draw each hour as an outline ring (line only) with distinct color + label
      hours.forEach((H, idx) => {
        const radiusKm = radiusByHour[H];
        const color = RING_COLORS[idx % RING_COLORS.length];
        const lineGeom = circleLineString(originLng, originLat, radiusKm);
        const lineId = `dt-circle-${H}h`;
        const labelId = `dt-label-${H}h`;
        const labelText = H === 1 ? '1 hr' : `${H} hrs`;

        if (map.getSource(lineId)) {
          map.getSource(lineId).setData({ type: 'Feature', geometry: lineGeom, properties: {} });
        } else {
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
        }

        const labelPoint = circleLabelPoint(originLng, originLat, radiusKm);
        if (map.getSource(labelId)) {
          map.getSource(labelId).setData({ type: 'Feature', geometry: labelPoint, properties: { label: labelText } });
        } else {
          map.addSource(labelId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: labelPoint, properties: { label: labelText } }
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
        }
      });

      // 5. Assign every resort to an hour band by straight-line distance
      const bands = {};
      hours.forEach((H) => { bands[H] = []; });
      const maxRadius = radiusByHour[hours[hours.length - 1]];

      searchResorts.forEach((r) => {
        const d = haversineKm(originLng, originLat, r.latlng.lng, r.latlng.lat);
        if (d > maxRadius) return;
        for (let i = 0; i < hours.length; i++) {
          const H = hours[i];
          const prevR = i === 0 ? 0 : radiusByHour[hours[i - 1]];
          if (d > prevR && d <= radiusByHour[H]) {
            bands[H].push(r);
            break;
          }
        }
      });

      // 6. Dynamic results UI (swatch color matches ring color)
      bandListEl.innerHTML = '';
      hours.forEach((H, i) => {
        const list = bands[H] || [];
        const color = RING_COLORS[i % RING_COLORS.length];
        const div = document.createElement('div');
        div.className = 'dt-band';
        div.innerHTML =
          `<h4><span class="dt-band-fill" style="background:${color}"></span> Within ~${H} hour${H > 1 ? 's' : ''} <span class="dt-count">(${list.length})</span></h4>` +
          `<ul>${list.map((r) => `<li>${escapeHtml(r.name)}${r.country ? ` <span style="color:#6b7280">${escapeHtml(r.country)}</span>` : ''}</li>`).join('')}</ul>`;
        bandListEl.appendChild(div);
      });

      resultsEl.classList.add('visible');

      // Fit map to largest circle with padding
      const maxR = radiusByHour[hours[hours.length - 1]];
      const bounds = 1.1 * (maxR / 111); // rough deg from km
      map.fitBounds(
        [[originLng - bounds, originLat - bounds], [originLng + bounds, originLat + bounds]],
        { padding: 80, duration: 800, maxZoom: 10 }
      );

      if (originStatus) originStatus.textContent = '';
    } catch (err) {
      console.warn('[drive-time-map-ml] error:', err);
      const message = (err && err.message) ? err.message : 'Drive-time request failed.';
      if (originStatus) originStatus.textContent = message;
    }
    drawBtn.disabled = !originLngLat;
  });
})();

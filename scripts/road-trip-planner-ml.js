/**
 * Road Trip Planner – MapLibre GL JS edition.
 * Routing via OSRM; geocoding via MapTiler; route + turn-by-turn directions on the map.
 *
 * initRoadTripPlanner({ map, searchResorts, escapeHtml })
 */
import { config } from './map-config.js';

const RTP_MAX_RESORTS = 25;
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
const RTP_ROUTE_SOURCE = 'rtp-route';
const RTP_ROUTE_CASING = 'rtp-route-casing';
const RTP_ROUTE_LINE = 'rtp-route-line';

function foldDiacritics(str) { if (str == null || str === '') return ''; return String(str).normalize('NFD').replace(/\p{M}/gu, ''); }

function countryToRegion(c) {
  if (!c || typeof c !== 'string') return null;
  const s = c.toLowerCase().trim();
  if (/^(united states|usa|u\.?s\.?a\.?|canada|mexico|guatemala|belize|honduras|el salvador|nicaragua|costa rica|panama)$/i.test(s)) return 'Americas';
  if (/^(argentina|bolivia|brazil|chile|colombia|ecuador|peru|venezuela|uruguay|paraguay)$/i.test(s))                             return 'Americas';
  if (/^(japan|china|south korea|north korea|taiwan|mongolia)$/i.test(s))                                                         return 'Asia Pacific';
  if (/^(australia|new zealand)$/i.test(s))                                                                                       return 'Asia Pacific';
  if (/^(india|nepal|pakistan|kazakhstan|uzbekistan|kyrgyzstan|tajikistan)$/i.test(s))                                            return 'Asia Pacific';
  if (/^(russia|georgia|armenia|azerbaijan)$/i.test(s))                                                                           return 'Europe';
  if (/(austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|iceland|ireland|italy|latvia|liechtenstein|lithuania|luxembourg|malta|netherlands|norway|poland|portugal|romania|slovakia|slovenia|spain|sweden|switzerland|turkey|ukraine|united kingdom|uk|andorra|monaco|serbia|bosnia|montenegro|albania|macedonia|belarus|moldova)/i.test(s)) return 'Europe';
  return 'Other';
}

export function initRoadTripPlanner({ map, searchResorts, escapeHtml }) {
  let rtpHomeWaypoint    = null;
  let rtpResortWaypoints = [];
  let rtpEndMode         = 'last';
  let rtpEndWaypoint     = null;
  let waypointMarkers    = [];

  // ── DOM refs ───────────────────────────────────────────────────────────
  const rtpPanel          = document.getElementById('roadTripPanel');
  const rtpToggle         = document.getElementById('roadTripToggle');
  const rtpClose          = document.getElementById('roadTripClose');
  const rtpHomeInput      = document.getElementById('homeAddressInput');
  const rtpGeoBtn         = document.getElementById('geocodeHomeBtn');
  const rtpLocBtn         = document.getElementById('useMyLocationBtn');
  const rtpHomeStatus     = document.getElementById('homePointStatus');
  const rtpWpList         = document.getElementById('waypointList');
  const rtpCalcBtn        = document.getElementById('rtpCalcBtn');
  const rtpClearBtn       = document.getElementById('rtpClearBtn');
  const rtpSummary        = document.getElementById('routeSummary');
  const rtpAddInput       = document.getElementById('resortAddInput');
  const rtpAddDrop        = document.getElementById('resortAddDropdown');
  const rtpEndAddressRow  = document.getElementById('rtpEndAddressRow');
  const rtpEndInput       = document.getElementById('endAddressInput');
  const rtpEndGeoBtn      = document.getElementById('geocodeEndBtn');
  const rtpEndStatus      = document.getElementById('endPointStatus');

  if (!rtpPanel || !rtpToggle || !rtpCalcBtn || !rtpSummary) {
    console.warn('[road-trip-planner-ml] Road trip panel DOM missing — planner not initialized');
    return;
  }

  // ── Panel open / close ─────────────────────────────────────────────────
  rtpToggle.addEventListener('click', () => rtpPanel.classList.toggle('open'));
  rtpClose?.addEventListener('click', () => rtpPanel.classList.remove('open'));

  // ── Region warning ─────────────────────────────────────────────────────
  function getWaypointRegions() {
    const regions = new Set();
    if (rtpHomeWaypoint?.country)   regions.add(countryToRegion(rtpHomeWaypoint.country));
    rtpResortWaypoints.forEach(wp => { if (wp.country) regions.add(countryToRegion(wp.country)); });
    if (rtpEndMode === 'custom' && rtpEndWaypoint?.country) regions.add(countryToRegion(rtpEndWaypoint.country));
    regions.delete(null); regions.delete(undefined);
    return regions;
  }
  function rtpUpdateRegionWarning() {
    const el = document.getElementById('rtpRegionWarning');
    if (!el) return;
    const regions = getWaypointRegions();
    if (regions.size > 1) {
      el.textContent = 'Stops are in different regions (e.g. North America and Asia). Driving routes can\'t cross oceans—you may get "Route not found" or only a partial route.';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  // ── Max-hint ───────────────────────────────────────────────────────────
  function rtpSetMaxHint(atLimit) {
    const hint = document.querySelector('.rtp-max-hint');
    if (!hint) return;
    if (atLimit) { hint.textContent = '(max 25 – remove a stop to add more)'; hint.style.color = '#dc2626'; }
    else         { hint.textContent = '(max 25 – routing API limit)';          hint.style.color = ''; }
  }

  const resorts = () => searchResorts || [];

  function rtpCanCalculate() {
    if (rtpEndMode === 'custom' && !rtpEndWaypoint) return false;
    if (rtpEndMode === 'start' && !rtpHomeWaypoint) return false;
    const n = rtpResortWaypoints.length;
    if (rtpHomeWaypoint && n >= 1) return true;
    if (n >= 2) return true;
    return false;
  }

  function rtpCalcHintText() {
    if (rtpEndMode === 'custom' && !rtpEndWaypoint) {
      return 'Enter an ending address and click Go, or choose a different end option.';
    }
    if (rtpEndMode === 'start' && !rtpHomeWaypoint) {
      return 'Return-to-start needs a starting point — enter an address or use my location.';
    }
    const n = rtpResortWaypoints.length;
    if (n === 0) return 'Add at least one ski resort (search below or Road Trip on a resort popup).';
    if (!rtpHomeWaypoint && n < 2) {
      return 'Set a starting point (address + Go, or Use my location). Or add 2+ resorts to route between them.';
    }
    return '';
  }

  function buildRouteWaypoints() {
    const resortWps = rtpResortWaypoints.map((wp) => ({
      lat: wp.lat, lng: wp.lng, label: wp.name
    }));
    let allWps;
    if (rtpHomeWaypoint) {
      allWps = [
        { lat: rtpHomeWaypoint.lat, lng: rtpHomeWaypoint.lng, label: rtpHomeWaypoint.label },
        ...resortWps
      ];
    } else {
      allWps = [...resortWps];
    }
    const hasExplicitEnd = rtpEndMode === 'start' || (rtpEndMode === 'custom' && rtpEndWaypoint);
    if (rtpEndMode === 'start' && rtpHomeWaypoint) {
      allWps.push({ lat: rtpHomeWaypoint.lat, lng: rtpHomeWaypoint.lng, label: rtpHomeWaypoint.label });
    } else if (rtpEndMode === 'custom' && rtpEndWaypoint) {
      allWps.push({ lat: rtpEndWaypoint.lat, lng: rtpEndWaypoint.lng, label: rtpEndWaypoint.label });
    }
    return { allWps, hasExplicitEnd, usesHome: !!rtpHomeWaypoint };
  }

  // ── Waypoint list UI ───────────────────────────────────────────────────
  function rtpUpdateUI() {
    const countEl = document.getElementById('waypointCount');
    if (countEl) countEl.textContent = rtpResortWaypoints.length ? `(${rtpResortWaypoints.length})` : '';

    if (!rtpWpList) return;

    if (rtpResortWaypoints.length === 0) {
      rtpWpList.innerHTML = '<div class="waypoint-empty">No resorts added yet.<br>Search below or click a resort on the map.</div>';
      rtpSetMaxHint(false);
    } else {
      rtpWpList.innerHTML = rtpResortWaypoints.map((wp, i) =>
        `<div class="waypoint-item">` +
        `<span class="wp-num">${i + 1}</span>` +
        `<span class="wp-name" title="${escapeHtml(wp.name)}">${escapeHtml(wp.name)}</span>` +
        `<div class="wp-move">` +
        `<button class="wp-up"   data-idx="${i}" title="Move up"   ${i === 0                         ? 'disabled' : ''}>&#x25B2;</button>` +
        `<button class="wp-down" data-idx="${i}" title="Move down" ${i === rtpResortWaypoints.length - 1 ? 'disabled' : ''}>&#x25BC;</button>` +
        `</div>` +
        `<button class="wp-remove" data-idx="${i}" title="Remove">&#x2715;</button>` +
        `</div>`
      ).join('');
      rtpWpList.querySelectorAll('.wp-remove').forEach(btn =>
        btn.addEventListener('click', () => { rtpResortWaypoints.splice(+btn.dataset.idx, 1); rtpUpdateUI(); })
      );
      rtpWpList.querySelectorAll('.wp-up').forEach(btn =>
        btn.addEventListener('click', () => {
          const i = +btn.dataset.idx;
          if (i > 0) { [rtpResortWaypoints[i - 1], rtpResortWaypoints[i]] = [rtpResortWaypoints[i], rtpResortWaypoints[i - 1]]; rtpUpdateUI(); }
        })
      );
      rtpWpList.querySelectorAll('.wp-down').forEach(btn =>
        btn.addEventListener('click', () => {
          const i = +btn.dataset.idx;
          if (i < rtpResortWaypoints.length - 1) { [rtpResortWaypoints[i], rtpResortWaypoints[i + 1]] = [rtpResortWaypoints[i + 1], rtpResortWaypoints[i]]; rtpUpdateUI(); }
        })
      );
    }
    const canCalc = rtpCanCalculate();
    rtpCalcBtn.disabled = !canCalc;
    const hintEl = document.getElementById('rtpCalcHint');
    const hint = rtpCalcHintText();
    if (hintEl) {
      hintEl.textContent = hint;
      hintEl.classList.toggle('rtp-calc-hint-warn', !canCalc && !!hint);
    }
    rtpSetMaxHint(rtpResortWaypoints.length >= RTP_MAX_RESORTS);
    rtpUpdateRegionWarning();
  }

  // ── Geocoding (MapTiler — works in browser; Nominatim blocks missing User-Agent) ─
  async function rtpGeocode(address) {
    const q = encodeURIComponent(address.trim());
    const url = `https://api.maptiler.com/geocoding/${q}.json?key=${config.MAPTILER_KEY}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat?.geometry?.coordinates) return null;
    const [lng, lat] = feat.geometry.coordinates;
    const label = (feat.place_name || feat.text || address).split(',').slice(0, 2).join(',').trim();
    const countryCtx = (feat.context || []).find((c) => String(c.id || '').startsWith('country.'));
    const country = countryCtx?.text || undefined;
    return { lat, lng, label, country };
  }

  async function ensureHomeWaypointFromInput() {
    if (rtpHomeWaypoint) return true;
    const addr = rtpHomeInput?.value?.trim();
    if (!addr || /^my location$/i.test(addr)) return false;
    try {
      const result = await rtpGeocode(addr);
      if (!result) return false;
      rtpHomeWaypoint = result;
      if (rtpHomeStatus) {
        rtpHomeStatus.textContent = '✓ ' + result.label;
        rtpHomeStatus.style.color = '#16a34a';
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function ensureEndWaypointFromInput() {
    if (rtpEndWaypoint || rtpEndMode !== 'custom') return rtpEndMode !== 'custom' || !!rtpEndWaypoint;
    const addr = rtpEndInput?.value?.trim();
    if (!addr) return false;
    try {
      const result = await rtpGeocode(addr);
      if (!result) return false;
      rtpEndWaypoint = result;
      if (rtpEndStatus) {
        rtpEndStatus.textContent = '✓ ' + result.label;
        rtpEndStatus.style.color = '#16a34a';
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // Home geocode
  rtpGeoBtn?.addEventListener('click', async () => {
    const address = rtpHomeInput.value.trim();
    if (!address) return;
    rtpGeoBtn.textContent = '…'; rtpGeoBtn.disabled = true;
    try {
      const result = await rtpGeocode(address);
      if (result) {
        rtpHomeWaypoint = result;
        rtpHomeStatus.textContent = '✓ ' + result.label;
        rtpHomeStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo({ center: [result.lng, result.lat], zoom: 10, duration: 800 });
      } else {
        rtpHomeStatus.textContent = 'Address not found – try being more specific.';
        rtpHomeStatus.style.color = '#ef4444';
      }
    } catch (_) {
      rtpHomeStatus.textContent = 'Geocoding failed – check your connection.';
      rtpHomeStatus.style.color = '#ef4444';
    } finally {
      rtpGeoBtn.textContent = 'Go'; rtpGeoBtn.disabled = false;
    }
  });
  rtpHomeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') rtpGeoBtn?.click(); });
  rtpHomeInput?.addEventListener('input', () => rtpUpdateUI());

  // Geolocation
  rtpLocBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      rtpHomeStatus.textContent = 'Geolocation not supported in this browser.';
      rtpHomeStatus.style.color = '#ef4444';
      return;
    }
    rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Locating…';
    rtpLocBtn.disabled  = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        rtpHomeWaypoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location' };
        rtpHomeInput.value = 'My Location';
        rtpHomeStatus.textContent = '✓ Using your current location';
        rtpHomeStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 10, duration: 800 });
        rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Use my location';
        rtpLocBtn.disabled  = false;
      },
      (err) => {
        rtpHomeStatus.textContent = 'Location denied: ' + err.message;
        rtpHomeStatus.style.color = '#ef4444';
        rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Use my location';
        rtpLocBtn.disabled  = false;
      }
    );
  });

  // End-point radio buttons
  document.querySelectorAll('input[name="rtpEnd"]').forEach(radio =>
    radio.addEventListener('change', () => {
      rtpEndMode = radio.value;
      if (rtpEndAddressRow) rtpEndAddressRow.style.display = rtpEndMode === 'custom' ? 'flex' : 'none';
      if (rtpEndMode !== 'custom') { rtpEndWaypoint = null; rtpEndInput.value = ''; rtpEndStatus.textContent = ''; }
      rtpUpdateUI();
    })
  );

  // End geocode
  rtpEndGeoBtn?.addEventListener('click', async () => {
    const address = rtpEndInput.value.trim();
    if (!address) return;
    rtpEndGeoBtn.textContent = '…'; rtpEndGeoBtn.disabled = true;
    try {
      const result = await rtpGeocode(address);
      if (result) {
        rtpEndWaypoint = result;
        rtpEndStatus.textContent = '✓ ' + result.label;
        rtpEndStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo({ center: [result.lng, result.lat], zoom: 10, duration: 800 });
      } else {
        rtpEndStatus.textContent = 'Address not found – try being more specific.';
        rtpEndStatus.style.color = '#ef4444';
      }
    } catch (_) {
      rtpEndStatus.textContent = 'Geocoding failed – check your connection.';
      rtpEndStatus.style.color = '#ef4444';
    } finally {
      rtpEndGeoBtn.textContent = 'Go'; rtpEndGeoBtn.disabled = false;
    }
  });
  rtpEndInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') rtpEndGeoBtn?.click(); });

  // ── Add resort to waypoints ────────────────────────────────────────────
  function rtpAddResort(resort) {
    if (rtpResortWaypoints.length >= RTP_MAX_RESORTS) {
      rtpSetMaxHint(true); return;
    }
    const dup = rtpResortWaypoints.some(wp => Math.abs(wp.lat - resort.lat) < 0.001 && Math.abs(wp.lng - resort.lng) < 0.001);
    if (!dup) {
      rtpResortWaypoints.push({ name: resort.name, lat: resort.lat, lng: resort.lng, country: resort.country != null ? String(resort.country).trim() : undefined });
      rtpUpdateUI();
    }
    rtpSetMaxHint(false);
    rtpPanel.classList.add('open');
  }

  // Resort search-in-panel
  let rtpAddMatches = [];
  rtpAddInput?.addEventListener('input', () => {
    const q = foldDiacritics(rtpAddInput.value).toLowerCase().trim();
    if (!q) { rtpAddDrop?.classList.remove('visible'); return; }
    rtpAddMatches = resorts().filter((r) => foldDiacritics(r.name).toLowerCase().includes(q)).slice(0, 7);
    if (!rtpAddMatches.length) { rtpAddDrop?.classList.remove('visible'); return; }
    if (!rtpAddDrop) return;
    rtpAddDrop.innerHTML = rtpAddMatches.map((r, i) =>
      `<div class="rtp-search-item" data-index="${i}">${escapeHtml(r.name)}</div>`
    ).join('');
    rtpAddDrop.classList.add('visible');
    rtpAddDrop.querySelectorAll('.rtp-search-item').forEach((el, i) =>
      el.addEventListener('click', () => {
        const r = rtpAddMatches[i];
        rtpAddResort({ name: r.name, lat: r.latlng.lat, lng: r.latlng.lng, country: r.country });
        rtpAddInput.value = '';
        rtpAddDrop.classList.remove('visible');
      })
    );
  });
  document.addEventListener('click', (e) => {
    if (rtpAddInput && rtpAddDrop
        && !rtpAddInput.contains(e.target) && !rtpAddDrop.contains(e.target)) {
      rtpAddDrop.classList.remove('visible');
    }
  });

  // "Road Trip" button inside resort popups
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rtp-add-btn');
    if (!btn) return;
    e.preventDefault();
    const name = btn.getAttribute('data-resort-name');
    const lat  = parseFloat(btn.getAttribute('data-resort-lat'));
    const lng  = parseFloat(btn.getAttribute('data-resort-lon'));
    const country = btn.getAttribute('data-resort-country') || undefined;
    if (!isNaN(lat) && !isNaN(lng)) rtpAddResort({ name, lat, lng, country });
  });

  // ── Route drawing helpers ──────────────────────────────────────────────
  let lastRouteGeometry = null;

  function clearRoute() {
    waypointMarkers.forEach(m => m.remove());
    waypointMarkers = [];
    for (const id of [RTP_ROUTE_LINE, RTP_ROUTE_CASING]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(RTP_ROUTE_SOURCE)) map.removeSource(RTP_ROUTE_SOURCE);
    lastRouteGeometry = null;
  }

  function drawRouteLine(routeGeometry) {
    lastRouteGeometry = routeGeometry;
    const feature = { type: 'Feature', geometry: routeGeometry, properties: {} };
    if (map.getSource(RTP_ROUTE_SOURCE)) {
      map.getSource(RTP_ROUTE_SOURCE).setData(feature);
    } else {
      map.addSource(RTP_ROUTE_SOURCE, { type: 'geojson', data: feature });
      map.addLayer({
        id: RTP_ROUTE_CASING,
        type: 'line',
        source: RTP_ROUTE_SOURCE,
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      });
      map.addLayer({
        id: RTP_ROUTE_LINE,
        type: 'line',
        source: RTP_ROUTE_SOURCE,
        paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.88 },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      });
    }
    for (const id of [RTP_ROUTE_CASING, RTP_ROUTE_LINE]) {
      if (map.getLayer(id)) map.moveLayer(id);
    }
  }

  function buildDirectionsHtml(route) {
    const steps = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        const instruction = step.maneuver?.instruction || step.name;
        if (instruction) steps.push({ instruction, distance: step.distance || 0 });
      }
    }
    if (!steps.length) return '';
    const items = steps.map((step, i) => {
      const distMi = step.distance > 0 ? `${(step.distance / 1609.34).toFixed(1)} mi` : '';
      return `<li class="rtp-dir-step">` +
        `<span class="rtp-dir-num">${i + 1}</span>` +
        `<span class="rtp-dir-text">${escapeHtml(step.instruction)}</span>` +
        (distMi ? `<span class="rtp-dir-dist">${distMi}</span>` : '') +
        `</li>`;
    }).join('');
    return `<div class="rtp-directions"><div class="rtp-dir-title">Turn-by-turn directions</div><ol class="rtp-dir-list">${items}</ol></div>`;
  }

  function makeWaypointMarker(lng, lat, html, popupHtml) {
    const el = document.createElement('div');
    el.innerHTML = html;
    const popup = new maptilersdk.Popup({ closeButton: false, offset: [0, -18] }).setHTML(popupHtml);
    const marker = new maptilersdk.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);
    waypointMarkers.push(marker);
    return marker;
  }

  // ── Calculate Route ────────────────────────────────────────────────────
  rtpCalcBtn.addEventListener('click', async () => {
    if (!rtpCanCalculate()) {
      await ensureHomeWaypointFromInput();
      await ensureEndWaypointFromInput();
      rtpUpdateUI();
    }
    if (!rtpCanCalculate()) return;

    clearRoute();

    const { allWps, hasExplicitEnd, usesHome } = buildRouteWaypoints();

    rtpCalcBtn.textContent = 'Calculating…';
    rtpCalcBtn.disabled    = true;

    try {
      const coordStr = allWps.map(wp => `${wp.lng},${wp.lat}`).join(';');
      const url = `${OSRM_ROUTE_URL}/${coordStr}?overview=full&geometries=geojson&steps=true`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (!data.routes?.length || data.code !== 'Ok') {
        throw new Error(data.message || 'Route not found');
      }

      const route = data.routes[0];
      drawRouteLine(route.geometry);

      // Fit map to route
      const coords = route.geometry.coordinates;
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maptilersdk.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 80, duration: 1000 });

      // Waypoint markers
      allWps.forEach((wp, i) => {
        const isStart = i === 0;
        const isEnd   = hasExplicitEnd && i === allWps.length - 1;
        let html, popupHtml;

        if (isStart && usesHome) {
          html      = `<div style="background:#16a34a;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏠</div>`;
          popupHtml = `<strong>Start:</strong> ${escapeHtml(wp.label || '')}`;
        } else if (isEnd) {
          html      = `<div style="background:#dc2626;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏁</div>`;
          popupHtml = `<strong>End:</strong> ${escapeHtml(wp.label || '')}`;
        } else {
          const num = usesHome ? i : i + 1;
          html      = `<div style="background:#2563eb;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${num}</div>`;
          popupHtml = `<strong>${num}. ${escapeHtml(wp.label || '')}</strong>`;
        }
        makeWaypointMarker(wp.lng, wp.lat, html, popupHtml);
      });

      // Summary
      const distKm  = (route.distance / 1000).toFixed(1);
      const distMi  = (route.distance / 1609.34).toFixed(1);
      const totalMin = Math.round(route.duration / 60);
      const hours    = Math.floor(totalMin / 60);
      const mins     = totalMin % 60;
      const timeStr  = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      rtpSummary.style.display = 'block';
      rtpSummary.innerHTML =
        `<div class="rtp-sum-row">🛣 ${distKm} km (${distMi} mi)</div>` +
        `<div class="rtp-sum-row">⏱ ~${timeStr} driving</div>` +
        `<div class="rtp-sum-row" style="font-size:11px;color:#64748b;font-weight:400">Routing via OSRM / OpenStreetMap</div>` +
        buildDirectionsHtml(route);

      rtpCalcBtn.textContent = 'Recalculate Route';
      rtpUpdateUI();
    } catch (err) {
      console.warn('[road-trip-planner-ml] routing error:', err);
      rtpSummary.style.display = 'block';
      rtpSummary.innerHTML = `<div style="color:#ef4444;font-size:13px">Route not found. Some resorts may be unreachable by road.</div>`;
      rtpCalcBtn.textContent = 'Calculate Route';
      rtpUpdateUI();
    }
  });

  // ── Clear all ──────────────────────────────────────────────────────────
  rtpClearBtn?.addEventListener('click', () => {
    rtpHomeWaypoint    = null;
    rtpResortWaypoints = [];
    rtpEndMode         = 'last';
    rtpEndWaypoint     = null;
    if (rtpHomeInput) rtpHomeInput.value = '';
    if (rtpHomeStatus) rtpHomeStatus.textContent = '';
    if (rtpEndAddressRow) rtpEndAddressRow.style.display = 'none';
    if (rtpEndInput) rtpEndInput.value = '';
    if (rtpEndStatus) rtpEndStatus.textContent = '';
    const lastRadio = document.querySelector('input[name="rtpEnd"][value="last"]');
    if (lastRadio) lastRadio.checked = true;
    rtpSummary.style.display = 'none';
    rtpSummary.innerHTML     = '';
    clearRoute();
    rtpCalcBtn.textContent = 'Calculate Route';
    rtpUpdateUI();
  });

  rtpUpdateUI();
  console.log('[road-trip-planner-ml] initialized');

  return {
    restoreOverlays() {
      if (lastRouteGeometry) drawRouteLine(lastRouteGeometry);
    }
  };
}

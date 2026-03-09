/**
 * Road Trip Planner – MapLibre GL JS edition.
 * Replaces road-trip-planner.js (Leaflet / LRM) for TravelMap.html.
 * Routing via direct OSRM API; route drawn as a GeoJSON layer on the MapLibre map.
 *
 * initRoadTripPlanner({ map, searchResorts, escapeHtml })
 */

const RTP_MAX_RESORTS = 25;

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
  let waypointMarkers    = []; // maplibregl.Marker instances drawn on the map

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

  // ── Panel open / close ─────────────────────────────────────────────────
  rtpToggle.addEventListener('click', () => rtpPanel.classList.toggle('open'));
  rtpClose.addEventListener('click',  () => rtpPanel.classList.remove('open'));

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

  // ── Waypoint list UI ───────────────────────────────────────────────────
  function rtpUpdateUI() {
    const countEl = document.getElementById('waypointCount');
    if (countEl) countEl.textContent = rtpResortWaypoints.length ? `(${rtpResortWaypoints.length})` : '';

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
    rtpCalcBtn.disabled = !(rtpHomeWaypoint && rtpResortWaypoints.length > 0 && (rtpEndMode !== 'custom' || rtpEndWaypoint));
    rtpSetMaxHint(rtpResortWaypoints.length >= RTP_MAX_RESORTS);
    rtpUpdateRegionWarning();
  }

  // ── Geocoding (Nominatim) ──────────────────────────────────────────────
  async function rtpGeocode(address) {
    const res  = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address), { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (data?.length) {
      const item    = data[0];
      const country = item.address?.country || item.address?.country_code || null;
      return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), label: item.display_name.split(',').slice(0, 2).join(',').trim(), country: country || undefined };
    }
    return null;
  }

  // Home geocode
  rtpGeoBtn.addEventListener('click', async () => {
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
  rtpHomeInput.addEventListener('keydown', e => { if (e.key === 'Enter') rtpGeoBtn.click(); });

  // Geolocation
  rtpLocBtn.addEventListener('click', () => {
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
      rtpEndAddressRow.style.display = rtpEndMode === 'custom' ? 'flex' : 'none';
      if (rtpEndMode !== 'custom') { rtpEndWaypoint = null; rtpEndInput.value = ''; rtpEndStatus.textContent = ''; }
      rtpUpdateUI();
    })
  );

  // End geocode
  rtpEndGeoBtn.addEventListener('click', async () => {
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
  rtpEndInput.addEventListener('keydown', e => { if (e.key === 'Enter') rtpEndGeoBtn.click(); });

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
  rtpAddInput.addEventListener('input', () => {
    const q = foldDiacritics(rtpAddInput.value).toLowerCase().trim();
    if (!q) { rtpAddDrop.classList.remove('visible'); return; }
    rtpAddMatches = searchResorts.filter(r => foldDiacritics(r.name).toLowerCase().includes(q)).slice(0, 7);
    if (!rtpAddMatches.length) { rtpAddDrop.classList.remove('visible'); return; }
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
    if (!rtpAddInput.contains(e.target) && !rtpAddDrop.contains(e.target)) rtpAddDrop.classList.remove('visible');
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
  function clearRoute() {
    waypointMarkers.forEach(m => m.remove());
    waypointMarkers = [];
    if (map.getLayer('rtp-route-line')) map.removeLayer('rtp-route-line');
    if (map.getSource('rtp-route'))     map.removeSource('rtp-route');
  }

  function makeWaypointMarker(lng, lat, html, popupHtml) {
    const el = document.createElement('div');
    el.innerHTML = html;
    const popup = new maplibregl.Popup({ closeButton: false, offset: [0, -18] }).setHTML(popupHtml);
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);
    waypointMarkers.push(marker);
    return marker;
  }

  // ── Calculate Route ────────────────────────────────────────────────────
  rtpCalcBtn.addEventListener('click', async () => {
    if (!rtpHomeWaypoint || rtpResortWaypoints.length === 0) return;
    if (rtpEndMode === 'custom' && !rtpEndWaypoint) return;

    clearRoute();

    const allWps = [
      { lat: rtpHomeWaypoint.lat, lng: rtpHomeWaypoint.lng, label: rtpHomeWaypoint.label },
      ...rtpResortWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng, label: wp.name }))
    ];
    const hasExplicitEnd = rtpEndMode === 'start' || (rtpEndMode === 'custom' && rtpEndWaypoint);
    if (rtpEndMode === 'start') {
      allWps.push({ lat: rtpHomeWaypoint.lat, lng: rtpHomeWaypoint.lng, label: rtpHomeWaypoint.label });
    } else if (rtpEndMode === 'custom' && rtpEndWaypoint) {
      allWps.push({ lat: rtpEndWaypoint.lat, lng: rtpEndWaypoint.lng, label: rtpEndWaypoint.label });
    }

    rtpCalcBtn.textContent = 'Calculating…';
    rtpCalcBtn.disabled    = true;

    try {
      const coordStr = allWps.map(wp => `${wp.lng},${wp.lat}`).join(';');
      const url      = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
      const resp     = await fetch(url);
      const data     = await resp.json();

      if (!data.routes?.length || data.code !== 'Ok') {
        throw new Error(data.message || 'Route not found');
      }

      const route = data.routes[0];

      // Draw route line
      const routeGeoJSON = { type: 'Feature', geometry: route.geometry, properties: {} };
      if (map.getSource('rtp-route')) {
        map.getSource('rtp-route').setData(routeGeoJSON);
      } else {
        map.addSource('rtp-route', { type: 'geojson', data: routeGeoJSON });
        map.addLayer({
          id: 'rtp-route-line',
          type: 'line',
          source: 'rtp-route',
          paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.78 },
          layout: { 'line-cap': 'round', 'line-join': 'round' }
        });
      }

      // Fit map to route
      const coords = route.geometry.coordinates;
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 80, duration: 1000 });

      // Waypoint markers
      allWps.forEach((wp, i) => {
        const isStart = i === 0;
        const isEnd   = hasExplicitEnd && i === allWps.length - 1;
        let html, popupHtml;

        if (isStart) {
          html      = `<div style="background:#16a34a;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏠</div>`;
          popupHtml = `<strong>Start:</strong> ${escapeHtml(wp.label || '')}`;
        } else if (isEnd) {
          html      = `<div style="background:#dc2626;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏁</div>`;
          popupHtml = `<strong>End:</strong> ${escapeHtml(wp.label || '')}`;
        } else {
          const num = i; // 1-indexed resort
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
        `<div class="rtp-sum-row" style="font-size:11px;color:#64748b;font-weight:400">Routing via OSRM / OpenStreetMap</div>`;

      rtpCalcBtn.textContent = 'Recalculate Route';
      rtpCalcBtn.disabled    = false;
    } catch (err) {
      console.warn('[road-trip-planner-ml] routing error:', err);
      rtpSummary.style.display = 'block';
      rtpSummary.innerHTML = `<div style="color:#ef4444;font-size:13px">Route not found. Some resorts may be unreachable by road.</div>`;
      rtpCalcBtn.textContent = 'Calculate Route';
      rtpCalcBtn.disabled    = false;
    }
  });

  // ── Clear all ──────────────────────────────────────────────────────────
  rtpClearBtn.addEventListener('click', () => {
    rtpHomeWaypoint    = null;
    rtpResortWaypoints = [];
    rtpEndMode         = 'last';
    rtpEndWaypoint     = null;
    rtpHomeInput.value = '';
    rtpHomeStatus.textContent = '';
    rtpEndAddressRow.style.display = 'none';
    rtpEndInput.value  = '';
    rtpEndStatus.textContent = '';
    const lastRadio = document.querySelector('input[name="rtpEnd"][value="last"]');
    if (lastRadio) lastRadio.checked = true;
    rtpSummary.style.display = 'none';
    rtpSummary.innerHTML     = '';
    clearRoute();
    rtpCalcBtn.textContent = 'Calculate Route';
    rtpUpdateUI();
  });

  rtpUpdateUI();
}

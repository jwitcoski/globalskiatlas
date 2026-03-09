/**
 * Road Trip Planner: start/end, waypoints, OSRM routing, region warning.
 * initRoadTripPlanner({ map, searchResorts, escapeHtml })
 */
const RTP_MAX_RESORTS = 25;

function foldDiacritics(str) { if (str == null || str === '') return ''; return String(str).normalize('NFD').replace(/\p{M}/gu, ''); }

function countryToRegion(c) {
  if (!c || typeof c !== 'string') return null;
  const s = c.toLowerCase().trim();
  if (/^(united states|usa|u\.?s\.?a\.?|canada|mexico|guatemala|belize|honduras|el salvador|nicaragua|costa rica|panama)$/i.test(s)) return 'Americas';
  if (/^(argentina|bolivia|brazil|chile|colombia|ecuador|peru|venezuela|uruguay|paraguay)$/i.test(s)) return 'Americas';
  if (/^(japan|china|south korea|north korea|taiwan|mongolia)$/i.test(s)) return 'Asia Pacific';
  if (/^(australia|new zealand)$/i.test(s)) return 'Asia Pacific';
  if (/^(india|nepal|pakistan|kazakhstan|uzbekistan|kyrgyzstan|tajikistan)$/i.test(s)) return 'Asia Pacific';
  if (/^(russia|georgia|armenia|azerbaijan)$/i.test(s)) return 'Europe';
  if (/(austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|iceland|ireland|italy|latvia|liechtenstein|lithuania|luxembourg|malta|netherlands|norway|poland|portugal|romania|slovakia|slovenia|spain|sweden|switzerland|turkey|ukraine|united kingdom|uk|andorra|monaco|serbia|bosnia|montenegro|albania|macedonia|belarus|moldova)/i.test(s)) return 'Europe';
  return 'Other';
}

export function initRoadTripPlanner({ map, searchResorts, escapeHtml }) {
  let rtpHomeWaypoint = null;
  let rtpResortWaypoints = [];
  let rtpRoutingControl = null;
  let rtpEndMode = 'last';
  let rtpEndWaypoint = null;

  function getWaypointRegions() {
    const regions = new Set();
    if (rtpHomeWaypoint && rtpHomeWaypoint.country) regions.add(countryToRegion(rtpHomeWaypoint.country));
    rtpResortWaypoints.forEach((wp) => { if (wp.country) regions.add(countryToRegion(wp.country)); });
    if (rtpEndMode === 'custom' && rtpEndWaypoint && rtpEndWaypoint.country) regions.add(countryToRegion(rtpEndWaypoint.country));
    regions.delete(null);
    regions.delete(undefined);
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

  const rtpPanel = document.getElementById('roadTripPanel');
  const rtpToggle = document.getElementById('roadTripToggle');
  const rtpClose = document.getElementById('roadTripClose');
  const rtpHomeInput = document.getElementById('homeAddressInput');
  const rtpGeoBtn = document.getElementById('geocodeHomeBtn');
  const rtpLocBtn = document.getElementById('useMyLocationBtn');
  const rtpHomeStatus = document.getElementById('homePointStatus');
  const rtpWpList = document.getElementById('waypointList');
  const rtpCalcBtn = document.getElementById('rtpCalcBtn');
  const rtpClearBtn = document.getElementById('rtpClearBtn');
  const rtpSummary = document.getElementById('routeSummary');
  const rtpAddInput = document.getElementById('resortAddInput');
  const rtpAddDrop = document.getElementById('resortAddDropdown');
  const rtpEndAddressRow = document.getElementById('rtpEndAddressRow');
  const rtpEndInput = document.getElementById('endAddressInput');
  const rtpEndGeoBtn = document.getElementById('geocodeEndBtn');
  const rtpEndStatus = document.getElementById('endPointStatus');

  rtpToggle.addEventListener('click', () => rtpPanel.classList.toggle('open'));
  rtpClose.addEventListener('click', () => rtpPanel.classList.remove('open'));

  function rtpSetMaxHint(atLimit) {
    const hint = document.querySelector('.rtp-max-hint');
    if (!hint) return;
    if (atLimit) { hint.textContent = '(max 25 – remove a stop to add more)'; hint.style.color = '#dc2626'; }
    else { hint.textContent = '(max 25 – routing API limit)'; hint.style.color = ''; }
  }

  function rtpUpdateUI() {
    const countEl = document.getElementById('waypointCount');
    if (countEl) countEl.textContent = rtpResortWaypoints.length ? '(' + rtpResortWaypoints.length + ')' : '';
    if (rtpResortWaypoints.length === 0) {
      rtpWpList.innerHTML = '<div class="waypoint-empty">No resorts added yet.<br>Search below or click a resort on the map.</div>';
      rtpSetMaxHint(false);
    } else {
      rtpWpList.innerHTML = rtpResortWaypoints.map((wp, i) =>
        '<div class="waypoint-item">' +
        '<span class="wp-num">' + (i + 1) + '</span>' +
        '<span class="wp-name" title="' + escapeHtml(wp.name) + '">' + escapeHtml(wp.name) + '</span>' +
        '<div class="wp-move">' +
        '<button class="wp-up" data-idx="' + i + '" title="Move up" ' + (i === 0 ? 'disabled' : '') + '>&#x25B2;</button>' +
        '<button class="wp-down" data-idx="' + i + '" title="Move down" ' + (i === rtpResortWaypoints.length - 1 ? 'disabled' : '') + '>&#x25BC;</button>' +
        '</div>' +
        '<button class="wp-remove" data-idx="' + i + '" title="Remove">&#x2715;</button>' +
        '</div>'
      ).join('');
      rtpWpList.querySelectorAll('.wp-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          rtpResortWaypoints.splice(parseInt(btn.getAttribute('data-idx')), 1);
          rtpUpdateUI();
        });
      });
      rtpWpList.querySelectorAll('.wp-up').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-idx'));
          if (i > 0) {
            const t = rtpResortWaypoints[i];
            rtpResortWaypoints[i] = rtpResortWaypoints[i - 1];
            rtpResortWaypoints[i - 1] = t;
            rtpUpdateUI();
          }
        });
      });
      rtpWpList.querySelectorAll('.wp-down').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.getAttribute('data-idx'));
          if (i < rtpResortWaypoints.length - 1) {
            const t = rtpResortWaypoints[i];
            rtpResortWaypoints[i] = rtpResortWaypoints[i + 1];
            rtpResortWaypoints[i + 1] = t;
            rtpUpdateUI();
          }
        });
      });
    }
    rtpCalcBtn.disabled = !(rtpHomeWaypoint && rtpResortWaypoints.length > 0 && (rtpEndMode !== 'custom' || rtpEndWaypoint));
    rtpSetMaxHint(rtpResortWaypoints.length >= RTP_MAX_RESORTS);
    rtpUpdateRegionWarning();
  }

  async function rtpGeocode(address) {
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address),
      { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (data && data.length > 0) {
      const item = data[0];
      const addr = item.address;
      const country = (addr && (addr.country || addr.country_code)) ? (addr.country || addr.country_code) : null;
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        label: item.display_name.split(',').slice(0, 2).join(',').trim(),
        country: country || undefined
      };
    }
    return null;
  }

  rtpGeoBtn.addEventListener('click', async () => {
    const address = rtpHomeInput.value.trim();
    if (!address) return;
    rtpGeoBtn.textContent = '…';
    rtpGeoBtn.disabled = true;
    try {
      const result = await rtpGeocode(address);
      if (result) {
        rtpHomeWaypoint = result;
        rtpHomeStatus.textContent = '✓ ' + result.label;
        rtpHomeStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo([result.lat, result.lng], 10, { duration: 0.8 });
      } else {
        rtpHomeStatus.textContent = 'Address not found – try being more specific.';
        rtpHomeStatus.style.color = '#ef4444';
      }
    } catch (_) {
      rtpHomeStatus.textContent = 'Geocoding failed – check your connection.';
      rtpHomeStatus.style.color = '#ef4444';
    } finally {
      rtpGeoBtn.textContent = 'Go';
      rtpGeoBtn.disabled = false;
    }
  });
  rtpHomeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') rtpGeoBtn.click(); });

  rtpLocBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      rtpHomeStatus.textContent = 'Geolocation not supported in this browser.';
      rtpHomeStatus.style.color = '#ef4444';
      return;
    }
    rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Locating…';
    rtpLocBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        rtpHomeWaypoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My Location' };
        rtpHomeInput.value = 'My Location';
        rtpHomeStatus.textContent = '✓ Using your current location';
        rtpHomeStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 10, { duration: 0.8 });
        rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Use my location';
        rtpLocBtn.disabled = false;
      },
      (err) => {
        rtpHomeStatus.textContent = 'Location denied: ' + err.message;
        rtpHomeStatus.style.color = '#ef4444';
        rtpLocBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Use my location';
        rtpLocBtn.disabled = false;
      }
    );
  });

  document.querySelectorAll('input[name="rtpEnd"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      rtpEndMode = radio.value;
      rtpEndAddressRow.style.display = rtpEndMode === 'custom' ? 'flex' : 'none';
      if (rtpEndMode !== 'custom') {
        rtpEndWaypoint = null;
        rtpEndInput.value = '';
        rtpEndStatus.textContent = '';
      }
      rtpUpdateUI();
    });
  });

  rtpEndGeoBtn.addEventListener('click', async () => {
    const address = rtpEndInput.value.trim();
    if (!address) return;
    rtpEndGeoBtn.textContent = '…';
    rtpEndGeoBtn.disabled = true;
    try {
      const result = await rtpGeocode(address);
      if (result) {
        rtpEndWaypoint = result;
        rtpEndStatus.textContent = '✓ ' + result.label;
        rtpEndStatus.style.color = '#16a34a';
        rtpUpdateUI();
        map.flyTo([result.lat, result.lng], 10, { duration: 0.8 });
      } else {
        rtpEndStatus.textContent = 'Address not found – try being more specific.';
        rtpEndStatus.style.color = '#ef4444';
      }
    } catch (_) {
      rtpEndStatus.textContent = 'Geocoding failed – check your connection.';
      rtpEndStatus.style.color = '#ef4444';
    } finally {
      rtpEndGeoBtn.textContent = 'Go';
      rtpEndGeoBtn.disabled = false;
    }
  });
  rtpEndInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') rtpEndGeoBtn.click(); });

  function rtpAddResort(resort) {
    if (rtpResortWaypoints.length >= RTP_MAX_RESORTS) {
      const hint = document.querySelector('.rtp-max-hint');
      if (hint) { hint.textContent = '(max 25 – remove a stop to add more)'; hint.style.color = '#dc2626'; }
      return;
    }
    const dup = rtpResortWaypoints.some(
      (wp) => Math.abs(wp.lat - resort.lat) < 0.001 && Math.abs(wp.lng - resort.lng) < 0.001
    );
    if (!dup) {
      rtpResortWaypoints.push({
        name: resort.name,
        lat: resort.lat,
        lng: resort.lng,
        country: resort.country != null ? String(resort.country).trim() : undefined
      });
      rtpUpdateUI();
    }
    rtpSetMaxHint(false);
    rtpPanel.classList.add('open');
  }

  let rtpAddMatches = [];
  rtpAddInput.addEventListener('input', () => {
    const q = foldDiacritics(rtpAddInput.value).toLowerCase().trim();
    if (!q) { rtpAddDrop.classList.remove('visible'); return; }
    rtpAddMatches = searchResorts.filter((r) => foldDiacritics(r.name).toLowerCase().includes(q)).slice(0, 7);
    if (!rtpAddMatches.length) { rtpAddDrop.classList.remove('visible'); return; }
    rtpAddDrop.innerHTML = rtpAddMatches.map((r, i) =>
      '<div class="rtp-search-item" data-index="' + i + '">' + escapeHtml(r.name) + '</div>'
    ).join('');
    rtpAddDrop.classList.add('visible');
    rtpAddDrop.querySelectorAll('.rtp-search-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const r = rtpAddMatches[i];
        rtpAddResort({ name: r.name, lat: r.latlng.lat, lng: r.latlng.lng, country: r.country });
        rtpAddInput.value = '';
        rtpAddDrop.classList.remove('visible');
      });
    });
  });
  document.addEventListener('click', (e) => {
    if (!rtpAddInput.contains(e.target) && !rtpAddDrop.contains(e.target))
      rtpAddDrop.classList.remove('visible');
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rtp-add-btn');
    if (btn) {
      e.preventDefault();
      const name = btn.getAttribute('data-resort-name');
      const lat = parseFloat(btn.getAttribute('data-resort-lat'));
      const lng = parseFloat(btn.getAttribute('data-resort-lon'));
      const country = btn.getAttribute('data-resort-country') || undefined;
      if (!isNaN(lat) && !isNaN(lng)) rtpAddResort({ name, lat, lng, country });
    }
  });

  rtpCalcBtn.addEventListener('click', () => {
    if (!rtpHomeWaypoint || rtpResortWaypoints.length === 0) return;
    if (rtpEndMode === 'custom' && !rtpEndWaypoint) return;
    if (rtpRoutingControl) { map.removeControl(rtpRoutingControl); rtpRoutingControl = null; }

    let waypoints = [
      L.latLng(rtpHomeWaypoint.lat, rtpHomeWaypoint.lng),
      ...rtpResortWaypoints.map((wp) => L.latLng(wp.lat, wp.lng))
    ];
    if (rtpEndMode === 'start') {
      waypoints.push(L.latLng(rtpHomeWaypoint.lat, rtpHomeWaypoint.lng));
    } else if (rtpEndMode === 'custom' && rtpEndWaypoint) {
      waypoints.push(L.latLng(rtpEndWaypoint.lat, rtpEndWaypoint.lng));
    }
    const hasExplicitEnd = rtpEndMode === 'start' || (rtpEndMode === 'custom' && rtpEndWaypoint);
    const endLabel = rtpEndMode === 'start' ? rtpHomeWaypoint.label : (rtpEndWaypoint ? rtpEndWaypoint.label : '');

    rtpCalcBtn.textContent = 'Calculating…';
    rtpCalcBtn.disabled = true;

    const homeLabel = escapeHtml(rtpHomeWaypoint.label);
    rtpRoutingControl = L.Routing.control({
      waypoints,
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 5, opacity: 0.78 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false,
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving'
      }),
      createMarker: (i, wp) => {
        if (i === 0) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: 'mountain-marker',
              html: '<div style="background:#16a34a;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏠</div>',
              iconSize: [30, 30], iconAnchor: [15, 30]
            })
          }).bindPopup('<strong>Start:</strong> ' + homeLabel);
        }
        if (hasExplicitEnd && i === waypoints.length - 1) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: 'mountain-marker',
              html: '<div style="background:#dc2626;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">🏁</div>',
              iconSize: [30, 30], iconAnchor: [15, 30]
            })
          }).bindPopup('<strong>End:</strong> ' + escapeHtml(endLabel));
        }
        const rp = rtpResortWaypoints[i - 1];
        if (rp) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: 'mountain-marker',
              html: '<div style="background:#2563eb;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.35)">' + i + '</div>',
              iconSize: [28, 28], iconAnchor: [14, 28]
            })
          }).bindPopup('<strong>' + i + '. ' + escapeHtml(rp.name) + '</strong>');
        }
        return null;
      }
    }).addTo(map);

    rtpRoutingControl.on('routesfound', (e) => {
      const route = e.routes[0];
      const distKm = (route.summary.totalDistance / 1000).toFixed(1);
      const distMi = (route.summary.totalDistance / 1609.34).toFixed(1);
      const totalMin = Math.round(route.summary.totalTime / 60);
      const hours = Math.floor(totalMin / 60), mins = totalMin % 60;
      const timeStr = hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
      rtpSummary.style.display = 'block';
      rtpSummary.innerHTML =
        '<div class="rtp-sum-row">🛣 ' + distKm + ' km (' + distMi + ' mi)</div>' +
        '<div class="rtp-sum-row">⏱ ~' + timeStr + ' driving</div>' +
        '<div class="rtp-sum-row" style="font-size:11px;color:#64748b;font-weight:400">Routing via OSRM / OpenStreetMap</div>';
      rtpCalcBtn.textContent = 'Recalculate Route';
      rtpCalcBtn.disabled = false;
    });

    rtpRoutingControl.on('routingerror', () => {
      rtpSummary.style.display = 'block';
      rtpSummary.innerHTML = '<div style="color:#ef4444;font-size:13px">Route not found. Some resorts may be unreachable by road.</div>';
      rtpCalcBtn.textContent = 'Calculate Route';
      rtpCalcBtn.disabled = false;
    });
  });

  rtpClearBtn.addEventListener('click', () => {
    rtpHomeWaypoint = null;
    rtpResortWaypoints = [];
    rtpEndMode = 'last';
    rtpEndWaypoint = null;
    rtpHomeInput.value = '';
    rtpHomeStatus.textContent = '';
    rtpEndAddressRow.style.display = 'none';
    rtpEndInput.value = '';
    rtpEndStatus.textContent = '';
    const lastRadio = document.querySelector('input[name="rtpEnd"][value="last"]');
    if (lastRadio) lastRadio.checked = true;
    rtpSummary.style.display = 'none';
    rtpSummary.innerHTML = '';
    if (rtpRoutingControl) { map.removeControl(rtpRoutingControl); rtpRoutingControl = null; }
    rtpCalcBtn.textContent = 'Calculate Route';
    rtpUpdateUI();
  });

  rtpUpdateUI();
}

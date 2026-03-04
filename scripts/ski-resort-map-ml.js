/**
 * Ski resort map – MapLibre GL JS edition.
 * Replaces ski-resort-map.js (Leaflet) for TravelMap.html.
 * Data: ski areas from parquet-wasm; lifts + pistes lazily from parquet on zoom ≥ 10.
 *
 * Export: initSkiResortMap(options) → { map, searchResorts, escapeHtml, updateResortVisibility }
 */
import { config } from './map-config.js';
import { loadParquetAsRows } from './parquet-wasm-loader.js';
import {
  getProp, escapeHtml,
  RESORT_TYPE_KEYS, NOT_DOWNHILL,
  SIZE_BY_KEYS, COLOR_BY_KEYS,
  NAME_KEYS, ID_KEYS, COUNTRY_KEYS, LIFTS_KEYS
} from './utils.js';

const {
  SKI_AREAS_PARQUET_URL,
  LIFTS_PARQUET_URL,
  PISTES_PARQUET_URL,
  MAP_STYLE_URL,
  LIFTS_MIN_ZOOM,
  PISTES_MIN_ZOOM
} = config;

// ── Zoom thresholds (mirrors Leaflet version) ─────────────────────────────
const MEDIUM_ICON_MIN = 9;
const SMALL_ICON_MIN  = 11;

// ── Size / colour tier helpers ─────────────────────────────────────────────
const TRAILS_SMALL = 50, TRAILS_MEDIUM = 100;
const ACRES_SMALL  = 1000, ACRES_MEDIUM = 5000;

function isNotDownhill(props) {
  const v = getProp(props, RESORT_TYPE_KEYS);
  return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
}
function getTrailCount(props) {
  const v = getProp(props, COLOR_BY_KEYS);
  const n = typeof v === 'number' ? v : Number(v);
  return (!v || Number.isNaN(n)) ? 0 : n;
}
function getAcres(props) {
  const v = getProp(props, SIZE_BY_KEYS);
  const n = typeof v === 'number' ? v : Number(v);
  return (!v || Number.isNaN(n)) ? 0 : n;
}
function getSizeTier(props) {
  if (isNotDownhill(props)) return 'small';
  const t = getTrailCount(props), a = getAcres(props);
  if (t > TRAILS_MEDIUM || a > ACRES_MEDIUM) return 'large';
  if (t >= TRAILS_SMALL  || a >= ACRES_SMALL)  return 'medium';
  return 'small';
}
function getColorFor(props) {
  if (isNotDownhill(props)) return '#999999';
  const tier = getSizeTier(props);
  if (tier === 'large')  return '#2d8a3e';
  if (tier === 'medium') return '#e6c229';
  return '#c44d34';
}

// ── SVG mountain icons ─────────────────────────────────────────────────────
const hillSvg      = (c, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L0 11 Q6 6 12 11 Q18 6 24 11 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;
const mountainSvg  = (c, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L8 5 L16 10 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;
const mountainsSvg = (c, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="${w}" height="${h}" style="display:block"><path d="M0 16 L4 10 L8 14 L10 9 L14 5 L18 10 L20 7 L24 16 Z" fill="${c}" stroke="#1a1a1a" stroke-width="0.8"/></svg>`;

function makeMountainMarkerEl(props) {
  const tier  = getSizeTier(props);
  const color = getColorFor(props);
  let w = 20, h = 14;
  if (tier === 'medium') { w = 26; h = 18; }
  else if (tier === 'large')  { w = 32; h = 20; }
  const svg = tier === 'small' ? hillSvg(color, w, h) : tier === 'medium' ? mountainSvg(color, w, h) : mountainsSvg(color, w, h);
  const el = document.createElement('div');
  el.className = 'mountain-marker';
  el.style.cssText = `width:${w}px;height:${h}px;cursor:pointer;`;
  el.innerHTML = `<div style="line-height:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${svg}</div>`;
  return { el, w, h };
}

// ── Popup HTML ─────────────────────────────────────────────────────────────
function buildPopupHtml(properties, latlng, options = {}) {
  if (!properties || !Object.keys(properties).length) return '<em>No data</em>';
  const name        = getProp(properties, NAME_KEYS);
  const displayName = name ? escapeHtml(String(name)) : 'Resort';
  const id          = getProp(properties, ID_KEYS);
  const trails      = getProp(properties, COLOR_BY_KEYS);
  const lifts       = getProp(properties, LIFTS_KEYS);
  const country     = getProp(properties, COUNTRY_KEYS);
  const trailsNum   = trails != null && trails !== '' ? Number(trails) : null;
  const liftsNum    = lifts  != null && lifts  !== '' ? Number(lifts)  : null;
  const trailsStr   = trailsNum != null && !Number.isNaN(trailsNum) ? trailsNum.toLocaleString() + ' slopes' : null;
  const liftsStr    = liftsNum  != null && !Number.isNaN(liftsNum)  ? liftsNum.toLocaleString()  + ' lifts'  : null;
  let countryStr    = country != null && String(country).trim() !== '' ? String(country).trim() : null;
  if (countryStr && /^united states/i.test(countryStr)) countryStr = 'USA';
  const factsHtml = [trailsStr, liftsStr, countryStr].filter(Boolean).length
    ? `<p style="margin:4px 0 8px 0;font-size:13px;color:#6b7280">${[trailsStr, liftsStr, countryStr].filter(Boolean).map(escapeHtml).join(' \u2022 ')}</p>`
    : '';
  const lat = latlng?.lat ?? null;
  const lon = latlng?.lng ?? null;
  const params = new URLSearchParams();
  if (id   != null && id   !== '') params.set('id',   String(id));
  if (name != null && name !== '') params.set('name', String(name));
  if (lat  != null && !Number.isNaN(lat)) params.set('lat', String(lat));
  if (lon  != null && !Number.isNaN(lon)) params.set('lon', String(lon));
  const popupUrl  = new URL('popup.html', location.href).href + (params.toString() ? '?' + params.toString() : '');
  const stored    = JSON.stringify({ name: name || null, id: id != null ? String(id) : null, lat, lon });
  const storedAttr = stored.replace(/"/g, '&quot;');
  let extraButtons = '';
  if (options.includeRoadTripButton) {
    const rn = escapeHtml(String(name || 'Resort'));
    const rc = country != null && String(country).trim() ? escapeHtml(String(country).trim()) : '';
    extraButtons = `<button class="rtp-add-btn" data-resort-name="${rn}" data-resort-lat="${lat ?? 0}" data-resort-lon="${lon ?? 0}" data-resort-country="${rc}"><i class="bi bi-plus-circle"></i> Road Trip</button>`;
  }
  return `<p style="margin:0 0 4px 0;font-weight:600">${displayName}</p>${factsHtml}` +
    `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">` +
    `<a href="#" data-resort-url="${escapeHtml(popupUrl)}" data-resort-stored="${storedAttr}" class="resort-details-link" style="display:inline-flex;align-items:center;gap:4px;border-radius:8px;background:#2563eb;color:#fff;padding:8px 12px;font-size:13px;font-weight:500;text-decoration:none;cursor:pointer;">View details <i class="bi bi-arrow-up-right"></i></a>` +
    extraButtons + `</div>`;
}

// ── Piste / lift helpers ───────────────────────────────────────────────────
const PISTE_DIFF_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];
function getPisteDifficulty(props) {
  for (const k of PISTE_DIFF_KEYS) {
    if (props[k] != null) return String(props[k]).toLowerCase().trim();
  }
  if (typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) return m[1].toLowerCase().trim();
  }
  return '';
}
function pisteDiffColor(d) {
  if (d === 'easy'   || d === 'novice')                    return '#22c55e';
  if (d === 'intermediate' || d === 'medium')              return '#2563eb';
  if (d === 'advanced'     || d === 'hard')                return '#1a1a1a';
  if (d === 'expert' || d === 'freeride' || d === 'extreme') return '#991b1b';
  return '#64748b';
}
function aerialwayLabel(type) {
  const L = { gondola: 'Gondola', cable_car: 'Cable car', chair_lift: 'Chairlift', mixed_lift: 'Mixed lift', drag_lift: 'Drag lift', 't-bar': 'T-bar', j_bar: 'J-bar', platter: 'Platter', rope_tow: 'Rope tow', magic_carpet: 'Magic carpet' };
  return L[type] || (type ? type.replace(/_/g, ' ') : 'Lift');
}
function difficultyBadge(d) {
  const tbl = { easy: ['#22c55e', 'Easy'], novice: ['#22c55e', 'Novice'], intermediate: ['#2563eb', 'Intermediate'], medium: ['#2563eb', 'Medium'], advanced: ['#1a1a1a', 'Advanced'], hard: ['#1a1a1a', 'Hard'], expert: ['#991b1b', 'Expert'], freeride: ['#991b1b', 'Freeride'], extreme: ['#991b1b', 'Extreme'] };
  const [color, label] = tbl[d] || ['#64748b', 'Unrated'];
  return `<span class="tt-diff" style="background:${color}"></span>${label}`;
}

const LIFT_LINE_TYPES = new Set(['gondola', 'cable_car', 'chair_lift', 'mixed_lift', 'drag_lift', 't-bar', 'j_bar', 'platter', 'rope_tow', 'magic_carpet', 'zip_line', 'goods', 'canopy']);

const OLYMPIC_HOSTS = [
  { name: 'Milan',              lat: 45.4642, lon: 9.19   },
  { name: "Cortina d'Ampezzo", lat: 46.5369, lon: 12.1356 }
];

// ── Main export ────────────────────────────────────────────────────────────
export async function initSkiResortMap(options = {}) {
  const includeRoadTripButton = !!options.includeRoadTripButton;

  // ── Initialise MapLibre map ──────────────────────────────────────────────
  const map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLE_URL,
    center: [0, 30],
    zoom: 2.5,
    minZoom: 2,
    maxZoom: 18
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  // Wait for style to load before adding sources / layers
  await new Promise(resolve => map.on('load', resolve));

  // ── Olympic host markers ─────────────────────────────────────────────────
  const olympicRingsSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="36" height="18" style="display:block"><circle cx="12" cy="15" r="6" fill="none" stroke="#0081C8" stroke-width="2"/><circle cx="30" cy="15" r="6" fill="none" stroke="#000" stroke-width="2"/><circle cx="48" cy="15" r="6" fill="none" stroke="#EE334E" stroke-width="2"/><circle cx="21" cy="21" r="6" fill="none" stroke="#FCB131" stroke-width="2"/><circle cx="39" cy="21" r="6" fill="none" stroke="#00A651" stroke-width="2"/></svg>';
  OLYMPIC_HOSTS.forEach((host) => {
    const el = document.createElement('div');
    el.className = 'olympic-rings-marker';
    el.style.cssText = 'background:#fff;border-radius:50%;padding:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);line-height:0;cursor:default;';
    el.innerHTML = olympicRingsSvg;
    new maplibregl.Marker({ element: el })
      .setLngLat([host.lon, host.lat])
      .setPopup(new maplibregl.Popup({ closeButton: false, offset: [0, -12] }).setHTML(`${host.name} – Milan–Cortina 2026`))
      .addTo(map);
  });

  // ── Load ski areas from parquet ──────────────────────────────────────────
  const rows = await loadParquetAsRows(SKI_AREAS_PARQUET_URL);

  const searchResorts = [];
  const markerPool    = []; // { marker, latlng: {lat,lng}, tier, inMap }
  const circleFeatures = [];

  rows.forEach(({ geometry, properties }) => {
    if (!geometry || geometry.type !== 'Point') return;
    const [lon, lat] = geometry.coordinates;
    const tier    = getSizeTier(properties);
    const color   = getColorFor(properties);
    const name    = getProp(properties, NAME_KEYS);
    const country = getProp(properties, COUNTRY_KEYS);
    const trails  = getProp(properties, COLOR_BY_KEYS);
    const trailsNum = trails != null && trails !== '' ? Number(trails) : 0;
    const countryDisp = country ? (String(country).match(/^united states/i) ? 'USA' : String(country).trim()) : '';

    // Circle layer feature (medium + small only; large always use icon markers)
    if (tier !== 'large') {
      circleFeatures.push({
        type: 'Feature',
        geometry,
        properties: {
          _tier:    tier,
          _color:   color,
          _name:    name ? String(name).trim() : '',
          _country: countryDisp,
          _trails:  Number.isNaN(trailsNum) ? 0 : trailsNum
        }
      });
    }

    // HTML marker for icon display (all tiers, viewport-culled)
    const { el } = makeMountainMarkerEl(properties);
    const latlng  = { lat, lng: lon };
    const popup   = new maplibregl.Popup({ maxWidth: '340px', closeButton: true })
      .setHTML(buildPopupHtml(properties, latlng, { includeRoadTripButton }));
    const marker  = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lon, lat])
      .setPopup(popup);

    const poolItem = { marker, latlng, tier, inMap: false };
    markerPool.push(poolItem);

    if (name) {
      searchResorts.push({
        name:     String(name).trim(),
        latlng,
        country:  country ? String(country).trim() : '',
        poolItem
      });
    }
  });

  // ── Legend ───────────────────────────────────────────────────────────────
  const legendEl = document.getElementById('legend');
  if (legendEl) {
    legendEl.style.display = 'block';
    legendEl.innerHTML =
      '<h3>Resort size</h3>' +
      `<div class="legend-row"><span class="legend-mountain-icon">${hillSvg('#c44d34', 20, 14)}</span> Small hill (&lt; 50 trails / 1,000 ac)</div>` +
      `<div class="legend-row"><span class="legend-mountain-icon">${mountainSvg('#e6c229', 22, 15)}</span> Ski mountain (50–100 trails / 1,000–5,000 ac)</div>` +
      `<div class="legend-row"><span class="legend-mountain-icon">${mountainsSvg('#2d8a3e', 24, 16)}</span> Multiple mountains (100+ trails / 5,000+ ac)</div>` +
      `<div class="legend-row" style="margin-top:6px"><span class="legend-mountain-icon">${hillSvg('#999', 18, 12)}</span> Grey = not a downhill ski resort</div>` +
      '<h3 style="margin-top:10px">Pistes (zoom 10+) – US colors</h3>' +
      '<div class="legend-row"><span class="legend-line" style="background:#22c55e"></span> Green = easy</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#2563eb"></span> Blue = intermediate</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#1a1a1a"></span> Black = advanced</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#991b1b"></span> Red = expert</div>';
  }

  // ── Circle layers for medium + small (low zoom) ──────────────────────────
  map.addSource('ski-circles', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: circleFeatures }
  });

  map.addLayer({
    id: 'ski-medium-circles',
    type: 'circle',
    source: 'ski-circles',
    filter: ['==', ['get', '_tier'], 'medium'],
    maxzoom: MEDIUM_ICON_MIN,
    paint: {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 6],
      'circle-color':        ['get', '_color'],
      'circle-stroke-color': 'rgba(255,255,255,0.65)',
      'circle-stroke-width': 1.2,
      'circle-opacity':      0.85
    }
  });

  map.addLayer({
    id: 'ski-small-circles',
    type: 'circle',
    source: 'ski-circles',
    filter: ['==', ['get', '_tier'], 'small'],
    maxzoom: SMALL_ICON_MIN,
    paint: {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 3, 1.5, 8, 4],
      'circle-color':        ['get', '_color'],
      'circle-stroke-color': 'rgba(255,255,255,0.65)',
      'circle-stroke-width': 1.2,
      'circle-opacity':      0.85
    }
  });

  // ── VT tooltip (fixed-position div) ──────────────────────────────────────
  const vtTipEl = document.createElement('div');
  vtTipEl.id = 'vt-tooltip';
  document.body.appendChild(vtTipEl);

  function showVtTip(point, html) {
    vtTipEl.innerHTML = html;
    vtTipEl.style.display  = 'block';
    vtTipEl.style.left = (point.x + 14) + 'px';
    vtTipEl.style.top  = (point.y - 36) + 'px';
  }
  function hideVtTip() { vtTipEl.style.display = 'none'; }

  document.addEventListener('mousemove', (ev) => {
    if (vtTipEl.style.display !== 'none') {
      vtTipEl.style.left = (ev.clientX + 14) + 'px';
      vtTipEl.style.top  = (ev.clientY - 36) + 'px';
    }
  });

  // Tooltip + click → zoom-in on circle layers
  ['ski-medium-circles', 'ski-small-circles'].forEach((id) => {
    map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mousemove',  id, (e) => {
      if (!e.features.length) return;
      const p = e.features[0].properties;
      const facts = [p._trails > 0 ? `${p._trails} slopes` : null, p._country || null].filter(Boolean).join(' · ');
      showVtTip(e.point,
        `<div class="tt-name">${escapeHtml(p._name || 'Resort')}</div>` +
        (facts ? `<div class="tt-hint">${escapeHtml(facts)}</div>` : '') +
        `<div class="tt-hint" style="margin-top:3px;color:#7dd3fc">🔍 Click to zoom in</div>`
      );
    });
    map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });
    map.on('click',      id, (e) => {
      if (!e.features.length) return;
      map.flyTo({ center: e.features[0].geometry.coordinates, zoom: Math.max(map.getZoom() + 4, 11), duration: 500 });
    });
  });

  // ── HTML-marker viewport culling ─────────────────────────────────────────
  // Large resorts: always visible (no bounds or zoom check – mirrors Leaflet behaviour)
  // Medium:        show icon when zoom ≥ 9 and in viewport
  // Small:         show icon when zoom ≥ 11 and in viewport

  function updateResortVisibility() {
    const z      = map.getZoom();
    const bounds = map.getBounds();

    markerPool.forEach((item) => {
      const { marker, latlng, tier } = item;
      let shouldShow;
      if (tier === 'large') {
        shouldShow = true; // always visible – initial zoom may be < 3 so never gate on zoom
      } else {
        const minZ   = tier === 'medium' ? MEDIUM_ICON_MIN : SMALL_ICON_MIN;
        const inView = bounds.contains([latlng.lng, latlng.lat]);
        shouldShow   = z >= minZ && inView;
      }
      if (shouldShow && !item.inMap) {
        marker.addTo(map);
        item.inMap = true;
      } else if (!shouldShow && item.inMap) {
        marker.remove();
        item.inMap = false;
      }
    });
  }

  map.on('zoomend',  updateResortVisibility);
  map.on('moveend',  updateResortVisibility);
  updateResortVisibility();

  // ── Search box ────────────────────────────────────────────────────────────
  const searchBox      = document.getElementById('searchBox');
  const searchInput    = document.getElementById('searchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  if (searchResorts.length && searchBox) searchBox.style.display = 'block';

  const maxSuggestions = 8;
  let selectedIndex = -1, currentMatches = [];

  function renderDropdown(matches) {
    currentMatches = matches.slice(0, maxSuggestions);
    selectedIndex  = -1;
    if (!currentMatches.length) {
      searchDropdown.classList.remove('visible');
      searchDropdown.innerHTML = '';
      return;
    }
    searchDropdown.innerHTML = currentMatches.map((r, i) =>
      `<div class="search-item" data-index="${i}">${escapeHtml(r.name)}</div>`
    ).join('');
    searchDropdown.classList.add('visible');
    searchDropdown.querySelectorAll('.search-item').forEach((el, i) =>
      el.addEventListener('click', () => selectMatch(currentMatches[i]))
    );
  }

  function selectMatch(r) {
    searchDropdown.classList.remove('visible');
    searchInput.value = r.name;
    searchInput.blur();
    map.flyTo({ center: [r.latlng.lng, r.latlng.lat], zoom: 16, duration: 600 });
    map.once('moveend', () => {
      updateResortVisibility();
      const item = r.poolItem;
      if (!item.inMap) { item.marker.addTo(map); item.inMap = true; }
      if (!item.marker.getPopup().isOpen()) item.marker.togglePopup();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () =>
      renderDropdown(searchResorts.filter(r => r.name.toLowerCase().includes(searchInput.value.toLowerCase().trim())).slice(0, maxSuggestions))
    );
    searchInput.addEventListener('focus', () => {
      const q = searchInput.value.trim();
      renderDropdown(q ? searchResorts.filter(r => r.name.toLowerCase().includes(q)).slice(0, maxSuggestions) : []);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (!searchDropdown.classList.contains('visible') || !currentMatches.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
        searchDropdown.querySelectorAll('.search-item').forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        searchDropdown.querySelectorAll('.search-item').forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = selectedIndex >= 0 ? currentMatches[selectedIndex] : currentMatches[0];
        if (pick) selectMatch(pick);
      }
    });
  }
  document.addEventListener('click', (e) => {
    if (searchBox && !searchBox.contains(e.target)) searchDropdown.classList.remove('visible');
  });

  // ── Resort details link (localStorage + popup window) ────────────────────
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.resort-details-link');
    if (!link) return;
    e.preventDefault();
    const url    = link.getAttribute('data-resort-url');
    const stored = link.getAttribute('data-resort-stored');
    if (stored) {
      try { localStorage.setItem('resortDetails', stored); } catch (err) { console.error('[resort-details]', err); }
    }
    if (url) window.open(url, '_blank', 'noopener');
  });

  // ── Deferred AdSense ──────────────────────────────────────────────────────
  const loadAd = () => {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  };
  if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(loadAd, { timeout: 2000 });
  else setTimeout(loadAd, 1500);

  // ── Heavy layers: lifts + pistes from parquet (lazy, first zoom ≥ 10) ────
  // All features are stored in memory; only a viewport-bbox slice is ever pushed
  // into the MapLibre GeoJSON source, keeping rendering fast and non-blocking.
  const heavyLoadEl = document.getElementById('heavyLoadIndicator');
  let heavyLayersReady = false, heavyLayersLoading = false;
  let allLiftFeatures  = null; // full parsed lift feature array (kept in memory)
  let allPisteFeatures = null; // full parsed piste feature array

  // Return features whose geometry has at least one coordinate inside an
  // expanded bounding box around the current viewport.
  function bboxFilter(features, bufDeg = 0.5) {
    const b      = map.getBounds();
    const minLng = b.getWest()  - bufDeg, maxLng = b.getEast()  + bufDeg;
    const minLat = b.getSouth() - bufDeg, maxLat = b.getNorth() + bufDeg;
    function inBox(coords) {
      if (typeof coords[0] === 'number')
        return coords[0] >= minLng && coords[0] <= maxLng && coords[1] >= minLat && coords[1] <= maxLat;
      for (let i = 0; i < coords.length; i++) { if (inBox(coords[i])) return true; }
      return false;
    }
    return features.filter(f => f.geometry && inBox(f.geometry.coordinates));
  }

  // Push viewport-filtered slices into already-registered GeoJSON sources.
  function updateHeavyLayerData() {
    if (!heavyLayersReady) return;
    if (allLiftFeatures  && map.getSource('lifts'))
      map.getSource('lifts').setData({ type: 'FeatureCollection', features: bboxFilter(allLiftFeatures) });
    if (allPisteFeatures && map.getSource('pistes'))
      map.getSource('pistes').setData({ type: 'FeatureCollection', features: bboxFilter(allPisteFeatures) });
  }

  // Process a large row array in chunks, yielding to the browser between each
  // chunk so the map stays interactive throughout.
  async function buildFeaturesAsync(rows, filterFn, mapFn, chunkSize = 20000) {
    const features = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, rows.length);
      for (let j = i; j < end; j++) {
        if (filterFn(rows[j])) features.push(mapFn(rows[j]));
      }
      if (end < rows.length) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return features;
  }

  async function initHeavyLayers() {
    if (heavyLayersReady || heavyLayersLoading) return;
    heavyLayersLoading = true;
    if (heavyLoadEl) { heavyLoadEl.style.display = 'block'; heavyLoadEl.textContent = 'Loading trail & lift data…'; }

    try {
      const [liftsRows, pistesRows] = await Promise.all([
        loadParquetAsRows(LIFTS_PARQUET_URL),
        loadParquetAsRows(PISTES_PARQUET_URL)
      ]);

      // ── Build full in-memory feature arrays (chunked to stay non-blocking) ─
      allLiftFeatures = await buildFeaturesAsync(
        liftsRows,
        ({ geometry, properties }) =>
          geometry &&
          (geometry.type === 'LineString' || geometry.type === 'MultiLineString') &&
          LIFT_LINE_TYPES.has(String(properties.aerialway || properties.Aerialway || '')),
        ({ geometry, properties }) => ({
          type: 'Feature',
          geometry,
          properties: {
            _aerialway: String(properties.aerialway || properties.Aerialway || ''),
            _name:      String(properties.name      || properties.Name      || ''),
            _ski_area:  String(properties['Ski Area'] || properties.ski_area || '')
          }
        })
      );

      allPisteFeatures = await buildFeaturesAsync(
        pistesRows,
        ({ geometry, properties }) =>
          geometry &&
          (geometry.type === 'LineString' || geometry.type === 'MultiLineString' || geometry.type === 'Polygon') &&
          !!(properties.osm_way_id || properties.osm_id),
        ({ geometry, properties }) => {
          const diff = getPisteDifficulty(properties);
          return {
            type: 'Feature',
            geometry,
            properties: {
              _difficulty: diff,
              _color:      pisteDiffColor(diff),
              _name:       String(properties.name || properties.Name || ''),
              _ski_area:   String(properties['Ski Area'] || properties.ski_area || '')
            }
          };
        }
      );

      // ── Add sources with viewport-filtered data only ───────────────────
      map.addSource('lifts',  { type: 'geojson', data: { type: 'FeatureCollection', features: bboxFilter(allLiftFeatures)  } });
      map.addSource('pistes', { type: 'geojson', data: { type: 'FeatureCollection', features: bboxFilter(allPisteFeatures) } });

      map.addLayer({
        id: 'lifts-line',
        type: 'line',
        source: 'lifts',
        minzoom: LIFTS_MIN_ZOOM,
        paint: { 'line-color': '#f87171', 'line-width': 2, 'line-opacity': 0.9 },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      });
      map.on('mouseenter', 'lifts-line', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mousemove',  'lifts-line', (e) => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        showVtTip(e.point,
          `<div class="tt-name">${escapeHtml(aerialwayLabel(p._aerialway))}${p._name ? ' · ' + escapeHtml(p._name) : ''}</div>` +
          (p._ski_area ? `<div class="tt-hint">${escapeHtml(p._ski_area)}</div>` : '')
        );
      });
      map.on('mouseleave', 'lifts-line', () => { map.getCanvas().style.cursor = ''; hideVtTip(); });

      map.addLayer({
        id: 'pistes-fill',
        type: 'fill',
        source: 'pistes',
        minzoom: PISTES_MIN_ZOOM,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': ['get', '_color'], 'fill-opacity': 0.25 }
      });
      map.addLayer({
        id: 'pistes-line',
        type: 'line',
        source: 'pistes',
        minzoom: PISTES_MIN_ZOOM,
        paint: { 'line-color': ['get', '_color'], 'line-width': 3, 'line-opacity': 0.5 },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      });
      ['pistes-line', 'pistes-fill'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mousemove',  layerId, (e) => {
          if (!e.features.length) return;
          const p = e.features[0].properties;
          showVtTip(e.point,
            `<div class="tt-name">${p._name ? escapeHtml(p._name) + ' · ' : ''}${difficultyBadge(p._difficulty)}</div>` +
            (p._ski_area ? `<div class="tt-hint">${escapeHtml(p._ski_area)}</div>` : '')
          );
        });
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });
      });

      heavyLayersReady = true;

      // Keep sources in sync with the viewport as the user pans / zooms
      map.on('moveend', updateHeavyLayerData);
      map.on('zoomend', updateHeavyLayerData);
    } catch (err) {
      console.warn('[ski-resort-map-ml] heavy layers failed:', err);
    } finally {
      heavyLayersLoading = false;
      if (heavyLoadEl) heavyLoadEl.style.display = 'none';
    }
  }

  function checkZoomForHeavyLayers() {
    if (map.getZoom() >= Math.min(LIFTS_MIN_ZOOM, PISTES_MIN_ZOOM)) initHeavyLayers();
  }

  map.on('zoomend', checkZoomForHeavyLayers);
  checkZoomForHeavyLayers();

  return { map, searchResorts, escapeHtml, updateResortVisibility };
}

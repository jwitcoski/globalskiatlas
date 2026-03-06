/**
 * Ski resort map: base map, GeoJSON load, markers, search, vector layers.
 * Export initSkiResortMap(options) -> { map, searchResorts, escapeHtml, updateResortVisibility }.
 */
import { config } from './map-config.js';
import {
  getProp,
  escapeHtml,
  RESORT_TYPE_KEYS,
  NOT_DOWNHILL,
  SIZE_BY_KEYS,
  COLOR_BY_KEYS,
  NAME_KEYS,
  ID_KEYS,
  COUNTRY_KEYS,
  STATE_KEYS,
  LIFTS_KEYS,
  slug,
  SKIABLE_TERRAIN_ACRES_KEYS,
  SKIABLE_TERRAIN_HA_KEYS,
  formatSkiableTerrain
} from './utils.js';

const {
  SKI_AREAS_MAPTILER_URL,
  SKI_AREAS_PARQUET_URL,
  OUTLINES_TILESET_URL,
  LIFTS_TILESET_URL,
  PISTES_TILESET_URL,
  TILE_LAYER_URL,
  OUTLINES_MIN_ZOOM,
  LIFTS_MIN_ZOOM,
  PISTES_MIN_ZOOM
} = config;

const TRAILS_SMALL = 50;
const TRAILS_MEDIUM = 100;
const ACRES_SMALL = 1000;
const ACRES_MEDIUM = 5000;
const MEDIUM_DOT_MIN = 3;
const MEDIUM_ICON_MIN = 9;
const SMALL_DOT_MIN = 3;
const SMALL_ICON_MIN = 11;

const OLYMPIC_HOSTS = [
  { name: 'Milan', lat: 45.4642, lon: 9.19 },
  { name: "Cortina d'Ampezzo", lat: 46.5369, lon: 12.1356 }
];

function isNotDownhill(props) {
  const v = getProp(props, RESORT_TYPE_KEYS);
  return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
}

function getTrailCount(feature) {
  const v = getProp(feature.properties, COLOR_BY_KEYS);
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function getAcres(feature) {
  const v = getProp(feature.properties, SIZE_BY_KEYS);
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function getSizeTier(feature) {
  if (isNotDownhill(feature.properties)) return 'small';
  const trails = getTrailCount(feature);
  const acres = getAcres(feature);
  if (trails > TRAILS_MEDIUM || acres > ACRES_MEDIUM) return 'large';
  if (trails >= TRAILS_SMALL || acres >= ACRES_SMALL) return 'medium';
  return 'small';
}

function getColorFor(feature) {
  if (isNotDownhill(feature.properties)) return '#999999';
  const tier = getSizeTier(feature);
  if (tier === 'large') return '#2d8a3e';
  if (tier === 'medium') return '#e6c229';
  return '#c44d34';
}

const hillSvg = (color, w, h) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '" style="display:block"><path d="M0 16 L0 11 Q6 6 12 11 Q18 6 24 11 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';
const mountainSvg = (color, w, h) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '" style="display:block"><path d="M0 16 L8 5 L16 10 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';
const mountainsSvg = (color, w, h) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '" style="display:block"><path d="M0 16 L4 10 L8 14 L10 9 L14 5 L18 10 L20 7 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';

function getMountainIcon(feature) {
  const tier = getSizeTier(feature);
  const color = getColorFor(feature);
  let w = 20, h = 14;
  if (tier === 'medium') { w = 26; h = 18; } else if (tier === 'large') { w = 32; h = 20; }
  let svg = tier === 'small' ? hillSvg(color, w, h) : tier === 'medium' ? mountainSvg(color, w, h) : mountainsSvg(color, w, h);
  return L.divIcon({
    className: 'mountain-marker',
    html: '<div style="line-height:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">' + svg + '</div>',
    iconSize: [w, h],
    iconAnchor: [w / 2, h]
  });
}

function buildPopupHtml(properties, latlng, options = {}) {
  if (!properties || !Object.keys(properties).length) return '<em>No data</em>';
  const name = getProp(properties, NAME_KEYS);
  const displayName = name ? escapeHtml(String(name)) : 'Resort';
  const id = getProp(properties, ID_KEYS);
  const trails = getProp(properties, COLOR_BY_KEYS);
  const lifts = getProp(properties, LIFTS_KEYS);
  const country = getProp(properties, COUNTRY_KEYS);
  const trailsNum = trails != null && trails !== '' ? (typeof trails === 'number' ? trails : Number(trails)) : null;
  const liftsNum = lifts != null && lifts !== '' ? (typeof lifts === 'number' ? lifts : Number(lifts)) : null;
  const trailsStr = trailsNum != null && !Number.isNaN(trailsNum) ? trailsNum.toLocaleString() + ' slopes' : null;
  const liftsStr = liftsNum != null && !Number.isNaN(liftsNum) ? liftsNum.toLocaleString() + ' lifts' : null;
  let countryStr = country != null && String(country).trim() !== '' ? String(country).trim() : null;
  if (countryStr && /^united states/i.test(countryStr)) countryStr = 'USA';
  const terrainStr = formatSkiableTerrain(getProp(properties, SKIABLE_TERRAIN_ACRES_KEYS), getProp(properties, SKIABLE_TERRAIN_HA_KEYS));
  const terrainFact = terrainStr ? 'Skiable Terrain ' + terrainStr : null;
  const facts = [trailsStr, liftsStr, terrainFact, countryStr].filter(Boolean);
  const factsHtml = facts.length > 0 ? '<p style="margin:4px 0 8px 0;font-size:13px;color:#6b7280">' + facts.map(escapeHtml).join(' \u2022 ') + '</p>' : '';
  const lat = latlng && latlng.lat != null ? latlng.lat : null;
  const lon = latlng && latlng.lng != null ? latlng.lng : null;
  const state = getProp(properties, STATE_KEYS);
  const nameSlug = slug(name);
  const stateSlug = state != null && String(state).trim() !== '' ? slug(String(state).trim()) : '';
  const countrySlug = country != null && String(country).trim() !== '' ? slug(String(country).trim()) : '';
  const pageParam = nameSlug ? (stateSlug ? nameSlug + '-' + stateSlug : countrySlug ? nameSlug + '-' + countrySlug : nameSlug) : '';
  const popupUrl = pageParam
    ? new URL('wiki/resort.html', location.href).href + '?page=' + encodeURIComponent(pageParam)
    : new URL('wiki/browse.html', location.href).href;
  const stored = JSON.stringify({ name: name || null, id: id != null ? String(id) : null, lat, lon });
  const storedAttr = stored.replace(/"/g, '&quot;');
  let extraButtons = '';
  if (options.includeRoadTripButton) {
    const resortNameAttr = escapeHtml(String(name || 'Resort'));
    const countryAttr = (country != null && String(country).trim() !== '') ? escapeHtml(String(country).trim()) : '';
    extraButtons = '<button class="rtp-add-btn" data-resort-name="' + resortNameAttr + '" data-resort-lat="' + (lat || 0) + '" data-resort-lon="' + (lon || 0) + '" data-resort-country="' + countryAttr + '"><i class="bi bi-plus-circle"></i> Road Trip</button>';
  }
  return '<p style="margin:0 0 4px 0;font-weight:600">' + displayName + '</p>' + factsHtml +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">' +
    '<a href="#" data-resort-url="' + escapeHtml(popupUrl) + '" data-resort-stored="' + storedAttr + '" class="resort-details-link tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-bg-[#2563eb] tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-no-underline hover:tw-bg-[#1d4ed8]" style="display:inline-flex;align-items:center;gap:4px;border-radius:8px;background:#2563eb;color:#fff;padding:8px 12px;text-decoration:none;cursor:pointer;">View details <i class="bi bi-arrow-up-right"></i></a>' +
    extraButtons +
    '</div>';
}

function buildTooltipHtml(feature, hint) {
  const name = getProp(feature.properties, NAME_KEYS);
  const trails = getProp(feature.properties, COLOR_BY_KEYS);
  const country = getProp(feature.properties, COUNTRY_KEYS);
  const n = trails != null && trails !== '' ? Number(trails) : null;
  const terrainStr = formatSkiableTerrain(getProp(feature.properties, SKIABLE_TERRAIN_ACRES_KEYS), getProp(feature.properties, SKIABLE_TERRAIN_HA_KEYS));
  const terrainFact = terrainStr ? 'Skiable Terrain ' + terrainStr : null;
  const facts = [
    (!Number.isNaN(n) && n > 0) ? n + ' slopes' : null,
    terrainFact,
    country ? (String(country).match(/^united states/i) ? 'USA' : String(country)) : null
  ].filter(Boolean).join(' · ');
  return '<div class="tt-name">' + escapeHtml(String(name || 'Resort').trim()) + '</div>' +
    (facts ? '<div class="tt-hint">' + escapeHtml(facts) + '</div>' : '') +
    '<div class="tt-hint" style="margin-top:3px;color:#7dd3fc">' + hint + '</div>';
}

const PISTE_DIFFICULTY_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];
function getPisteDifficultyVT(props) {
  let v = getProp(props, PISTE_DIFFICULTY_KEYS);
  if (v == null && props && typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) v = m[1];
  }
  return v != null ? String(v).toLowerCase().trim() : '';
}

function pisteVTStyle(properties) {
  const d = getPisteDifficultyVT(properties);
  function ps(color, weight) {
    return { color, weight, opacity: 0.5, fill: true, fillColor: color, fillOpacity: 0.25, interactive: true };
  }
  if (d === 'easy' || d === 'novice') return ps('#22c55e', 3);
  if (d === 'intermediate' || d === 'medium') return ps('#2563eb', 3);
  if (d === 'advanced' || d === 'hard') return ps('#1a1a1a', 3.5);
  if (d === 'expert' || d === 'freeride' || d === 'extreme') return ps('#991b1b', 4);
  return ps('#64748b', 2);
}

function aerialwayLabel(type) {
  const labels = { gondola: 'Gondola', cable_car: 'Cable car', chair_lift: 'Chairlift', mixed_lift: 'Mixed lift', drag_lift: 'Drag lift', 't-bar': 'T-bar', j_bar: 'J-bar', platter: 'Platter', rope_tow: 'Rope tow', magic_carpet: 'Magic carpet' };
  return labels[type] || (type ? type.replace(/_/g, ' ') : 'Lift');
}

function difficultyBadge(d) {
  const map = { easy: ['#22c55e', 'Easy'], novice: ['#22c55e', 'Novice'], intermediate: ['#2563eb', 'Intermediate'], medium: ['#2563eb', 'Medium'], advanced: ['#1a1a1a', 'Advanced'], hard: ['#1a1a1a', 'Hard'], expert: ['#991b1b', 'Expert'], freeride: ['#991b1b', 'Freeride'], extreme: ['#991b1b', 'Extreme'] };
  const [color, label] = map[d] || ['#64748b', 'Unrated'];
  return `<span class="tt-diff" style="background:${color}"></span>${label}`;
}

const vtBase = { fill: false, fillOpacity: 0, radius: 0 };
let tilesetErrorLogged = {};

export async function initSkiResortMap(options = {}) {
  const includeRoadTripButton = !!options.includeRoadTripButton;

  const map = L.map('map', {
    center: [0, 0],
    zoom: 3,
    minZoom: 3,
    maxZoom: 18
  });

  L.tileLayer(TILE_LAYER_URL, {
    attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    tileSize: 256,
    minZoom: 3,
    maxZoom: 18,
    crossOrigin: true
  }).addTo(map);

  const olympicRingsSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="36" height="18" style="display:block"><circle cx="12" cy="15" r="6" fill="none" stroke="#0081C8" stroke-width="2"/><circle cx="30" cy="15" r="6" fill="none" stroke="#000" stroke-width="2"/><circle cx="48" cy="15" r="6" fill="none" stroke="#EE334E" stroke-width="2"/><circle cx="21" cy="21" r="6" fill="none" stroke="#FCB131" stroke-width="2"/><circle cx="39" cy="21" r="6" fill="none" stroke="#00A651" stroke-width="2"/></svg>';
  const olympicIcon = L.divIcon({
    className: 'olympic-rings-marker',
    html: '<div title="Milan–Cortina 2026" style="background:#fff;border-radius:50%;padding:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);line-height:0">' + olympicRingsSvg + '</div>',
    iconSize: [40, 22],
    iconAnchor: [20, 11]
  });
  OLYMPIC_HOSTS.forEach((host) => {
    L.marker([host.lat, host.lon], { icon: olympicIcon })
      .bindTooltip(host.name + ' – Milan–Cortina 2026', { permanent: false, direction: 'top', offset: [0, -10] })
      .addTo(map);
  });

  let geojson;
  if (SKI_AREAS_MAPTILER_URL) {
    const r = await fetch(SKI_AREAS_MAPTILER_URL);
    if (!r.ok) throw new Error(`Ski areas fetch failed: ${r.status} ${r.statusText}`);
    geojson = await r.json();
  } else {
    const { asyncBufferFromUrl, parquetReadObjects } = await import('https://esm.sh/hyparquet@1');
    const file = await asyncBufferFromUrl({ url: SKI_AREAS_PARQUET_URL });
    const data = await parquetReadObjects({ file });
    const latCol = data.length && (data[0].latitude != null ? 'latitude' : data[0].lat != null ? 'lat' : data[0].centroid_lat != null ? 'centroid_lat' : null);
    const lonCol = data.length && (data[0].longitude != null ? 'longitude' : data[0].lon != null ? 'lon' : data[0].centroid_lon != null ? 'centroid_lon' : null);
    geojson = {
      type: 'FeatureCollection',
      features: data
        .filter((row) => row.geometry || (latCol && lonCol && row[latCol] != null && row[lonCol] != null))
        .map((row) => {
          if (row.geometry) {
            const { geometry, ...properties } = row;
            return { type: 'Feature', geometry, properties };
          }
          const lat = Number(row[latCol]), lon = Number(row[lonCol]);
          const { [latCol]: _lat, [lonCol]: _lon, ...properties } = row;
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties };
        })
    };
  }

  const legendEl = document.getElementById('legend');
  if (legendEl) {
    legendEl.style.display = 'block';
    legendEl.innerHTML =
      '<h3>Resort size</h3>' +
      '<div class="legend-row"><span class="legend-mountain-icon">' + hillSvg('#c44d34', 20, 14) + '</span> Small hill (&lt; 50 trails / 1,000 ac)</div>' +
      '<div class="legend-row"><span class="legend-mountain-icon">' + mountainSvg('#e6c229', 22, 15) + '</span> Ski mountain (50–100 trails / 1,000–5,000 ac)</div>' +
      '<div class="legend-row"><span class="legend-mountain-icon">' + mountainsSvg('#2d8a3e', 24, 16) + '</span> Multiple mountains (100+ trails / 5,000+ ac)</div>' +
      '<div class="legend-row" style="margin-top:6px"><span class="legend-mountain-icon">' + hillSvg('#999', 18, 12) + '</span> Grey = not a downhill ski resort</div>' +
      '<h3 style="margin-top:10px">Pistes (zoom 10+) – US colors</h3>' +
      '<div class="legend-row"><span class="legend-line" style="background:#22c55e"></span> Green = easy</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#2563eb"></span> Blue = intermediate</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#1a1a1a"></span> Black = advanced</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#991b1b"></span> Red = expert</div>';
  }

  const searchResorts = [];
  const canvasRenderer = L.canvas({ padding: 0.5 });
  const largeBucket = [], mediumBucket = [], smallBucket = [];
  geojson.features.forEach((feature) => {
    if (!feature.geometry || feature.geometry.type !== 'Point') return;
    const [lon, lat] = feature.geometry.coordinates;
    const latlng = L.latLng(lat, lon);
    const tier = getSizeTier(feature);
    (tier === 'large' ? largeBucket : tier === 'medium' ? mediumBucket : smallBucket).push({ feature, latlng });
  });

  function makeIconMarker(feature, latlng) {
    const marker = L.marker(latlng, { icon: getMountainIcon(feature) });
    marker.bindPopup(buildPopupHtml(feature.properties, latlng, { includeRoadTripButton }), { maxWidth: 320 });
    marker.bindTooltip(buildTooltipHtml(feature, '🖱 Click for resort details'), { direction: 'top', offset: [0, -14], className: 'resort-tooltip' });
    const name = getProp(feature.properties, NAME_KEYS);
    if (name != null && String(name).trim() !== '') {
      const country = getProp(feature.properties, COUNTRY_KEYS);
      searchResorts.push({ name: String(name).trim(), layer: marker, latlng, country: country != null ? String(country).trim() : '' });
    }
    return marker;
  }

  function makeDot(latlng, feature, radius) {
    const dot = L.circleMarker(latlng, {
      renderer: canvasRenderer, radius, interactive: true,
      fillColor: getColorFor(feature), fillOpacity: 0.85,
      color: 'rgba(255,255,255,0.65)', weight: 1.5
    });
    dot.bindTooltip(buildTooltipHtml(feature, '🔍 Click to zoom in'), { direction: 'top', offset: [0, -radius - 2], className: 'resort-tooltip' });
    dot.on('click', () => map.flyTo(latlng, Math.max(map.getZoom() + 4, 11), { duration: 0.5 }));
    return dot;
  }

  const largeLayer = L.layerGroup();
  largeBucket.forEach(({ feature, latlng }) => largeLayer.addLayer(makeIconMarker(feature, latlng)));

  const mediumDotLayer = L.layerGroup();
  const mediumIconLayer = L.layerGroup();
  const mediumIconPool = [];
  mediumBucket.forEach(({ feature, latlng }) => {
    mediumDotLayer.addLayer(makeDot(latlng, feature, 5));
    mediumIconPool.push({ marker: makeIconMarker(feature, latlng), latlng });
  });

  const smallDotLayer = L.layerGroup();
  const smallIconLayer = L.layerGroup();
  const smallIconPool = [];
  smallBucket.forEach(({ feature, latlng }) => {
    smallDotLayer.addLayer(makeDot(latlng, feature, 3.5));
    smallIconPool.push({ marker: makeIconMarker(feature, latlng), latlng });
  });

  function refreshViewportIcons(pool, iconLayer, minZoom) {
    iconLayer.clearLayers();
    if (map.getZoom() < minZoom) return;
    const bounds = map.getBounds().pad(0.15);
    pool.forEach(({ marker, latlng }) => {
      if (bounds.contains(latlng)) iconLayer.addLayer(marker);
    });
  }

  function updateResortVisibility() {
    const z = map.getZoom();
    const toggle = (layer, show) => {
      if (show) { if (!map.hasLayer(layer)) map.addLayer(layer); }
      else { if (map.hasLayer(layer)) map.removeLayer(layer); }
    };
    toggle(largeLayer, true);
    toggle(mediumDotLayer, z >= MEDIUM_DOT_MIN && z < MEDIUM_ICON_MIN);
    toggle(mediumIconLayer, z >= MEDIUM_ICON_MIN);
    toggle(smallDotLayer, z >= SMALL_DOT_MIN && z < SMALL_ICON_MIN);
    toggle(smallIconLayer, z >= SMALL_ICON_MIN);
    refreshViewportIcons(mediumIconPool, mediumIconLayer, MEDIUM_ICON_MIN);
    refreshViewportIcons(smallIconPool, smallIconLayer, SMALL_ICON_MIN);
  }

  map.addLayer(largeLayer);
  map.on('zoomend moveend', updateResortVisibility);
  updateResortVisibility();

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }, 1500);
  }

  const searchBox = document.getElementById('searchBox');
  const searchInput = document.getElementById('searchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  if (searchResorts.length && searchBox) searchBox.style.display = 'block';

  const maxSuggestions = 8;
  let selectedIndex = -1;
  let currentMatches = [];

  function renderDropdown(matches) {
    currentMatches = matches.slice(0, maxSuggestions);
    selectedIndex = -1;
    if (currentMatches.length === 0) {
      searchDropdown.classList.remove('visible');
      searchDropdown.innerHTML = '';
      return;
    }
    searchDropdown.innerHTML = currentMatches.map((r, i) =>
      '<div class="search-item" data-index="' + i + '">' + escapeHtml(r.name) + '</div>'
    ).join('');
    searchDropdown.classList.add('visible');
    searchDropdown.querySelectorAll('.search-item').forEach((el, i) => {
      el.addEventListener('click', () => selectMatch(currentMatches[i]));
    });
  }

  function selectMatch(r) {
    searchDropdown.classList.remove('visible');
    searchInput.value = r.name;
    searchInput.blur();
    map.flyTo(r.latlng, 16, { duration: 0.6 });
    map.once('moveend', () => { updateResortVisibility(); r.layer.openPopup(); });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderDropdown(searchResorts.filter((r) => r.name.toLowerCase().includes(searchInput.value.toLowerCase().trim())).slice(0, maxSuggestions)));
    searchInput.addEventListener('focus', () => {
      const q = searchInput.value.trim();
      renderDropdown(q.length ? searchResorts.filter((r) => r.name.toLowerCase().includes(q)).slice(0, maxSuggestions) : []);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (!searchDropdown.classList.contains('visible') || currentMatches.length === 0) return;
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
        if (selectedIndex >= 0 && currentMatches[selectedIndex]) selectMatch(currentMatches[selectedIndex]);
        else if (currentMatches[0]) selectMatch(currentMatches[0]);
      }
    });
  }
  document.addEventListener('click', (e) => {
    if (searchBox && !searchBox.contains(e.target)) searchDropdown.classList.remove('visible');
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('.resort-details-link');
    if (link) {
      e.preventDefault();
      const url = link.getAttribute('data-resort-url');
      const stored = link.getAttribute('data-resort-stored');
      if (stored) {
        try { localStorage.setItem('resortDetails', stored); } catch (err) { console.error('[resort-details] localStorage error', err); }
      }
      if (url) window.open(url, '_blank', 'noopener');
    }
  });

  let outlinesLayer = null;
  let liftsLayer = null;
  let pistesLayer = null;
  const vtTipEl = document.createElement('div');
  vtTipEl.id = 'vt-tooltip';
  document.body.appendChild(vtTipEl);

  function showVtTip(e, html) {
    vtTipEl.innerHTML = html;
    vtTipEl.style.display = 'block';
    moveVtTip(e);
  }
  function moveVtTip(e) {
    const oe = e.originalEvent || e;
    const x = oe.clientX, y = oe.clientY;
    if (x != null) { vtTipEl.style.left = (x + 14) + 'px'; vtTipEl.style.top = (y - 36) + 'px'; }
  }
  function hideVtTip() { vtTipEl.style.display = 'none'; }
  document.addEventListener('mousemove', (ev) => {
    if (vtTipEl.style.display !== 'none') {
      vtTipEl.style.left = (ev.clientX + 14) + 'px';
      vtTipEl.style.top = (ev.clientY - 36) + 'px';
    }
  });

  function bindVtTooltips(layer, buildHtml) {
    layer.on('mouseover', (e) => { showVtTip(e, buildHtml(e.propagatedFrom || e.layer)); });
    layer.on('mousemove', moveVtTip);
    layer.on('mouseout', hideVtTip);
  }

  function onTileError(layerName, url) {
    return (err) => {
      if (!tilesetErrorLogged[layerName]) {
        tilesetErrorLogged[layerName] = true;
        const status = err && err.status ? ` (HTTP ${err.status})` : '';
        console.warn(`[ski-resort-map] ${layerName} tileset error${status}: ${url}`);
      }
    };
  }

  function initHeavyLayers() {
    outlinesLayer = L.vectorGrid.protobuf(OUTLINES_TILESET_URL, {
      vectorTileLayerStyles: {
        ski_areas: { ...vtBase, color: '#1a1a1a', weight: 2, opacity: 0.9, dashArray: '4, 6', fill: true, fillOpacity: 0.03, fillColor: '#1a1a1a' }
      },
      maxNativeZoom: 16, interactive: true
    });
    outlinesLayer.on('tileerror', onTileError('outlines', OUTLINES_TILESET_URL));
    bindVtTooltips(outlinesLayer, (layer) => {
      const p = layer.properties || {};
      return `<div class="tt-name">${escapeHtml(p.name || p.Name || 'Ski area')}</div>` + (p.Country || p.country ? `<div class="tt-hint">${escapeHtml(p.Country || p.country)}</div>` : '');
    });

    const LIFT_LINE_TYPES = new Set(['gondola', 'cable_car', 'chair_lift', 'mixed_lift', 'drag_lift', 't-bar', 'j_bar', 'platter', 'rope_tow', 'magic_carpet', 'zip_line', 'goods', 'canopy']);
    liftsLayer = L.vectorGrid.protobuf(LIFTS_TILESET_URL, {
      vectorTileLayerStyles: {
        lifts: (props) => {
          if (!LIFT_LINE_TYPES.has(props.aerialway)) return { stroke: false, fill: false, opacity: 0, fillOpacity: 0, radius: 0, interactive: false };
          return { ...vtBase, color: '#f87171', weight: 2, opacity: 0.9, interactive: true };
        }
      },
      maxNativeZoom: 14, interactive: true
    });
    liftsLayer.on('tileerror', onTileError('lifts', LIFTS_TILESET_URL));
    bindVtTooltips(liftsLayer, (layer) => {
      const p = layer.properties || {};
      const type = aerialwayLabel(p.aerialway || p.Aerialway || '');
      return `<div class="tt-name">${escapeHtml(type)}${p.name || p.Name ? ' · ' + escapeHtml(p.name || p.Name) : ''}</div>` + (p['Ski Area'] ? `<div class="tt-hint">${escapeHtml(p['Ski Area'])}</div>` : '');
    });

    pistesLayer = L.vectorGrid.protobuf(PISTES_TILESET_URL, {
      vectorTileLayerStyles: {
        pistes_tmp: (props) => {
          if (!props.osm_way_id) return { stroke: false, fill: false, opacity: 0, fillOpacity: 0, radius: 0, interactive: false };
          return { ...vtBase, ...pisteVTStyle(props) };
        }
      },
      maxNativeZoom: 14, interactive: true
    });
    pistesLayer.on('tileerror', onTileError('pistes', PISTES_TILESET_URL));
    bindVtTooltips(pistesLayer, (layer) => {
      const p = layer.properties || {};
      const diff = getPisteDifficultyVT(p);
      return `<div class="tt-name">${p.name || p.Name ? escapeHtml(p.name || p.Name) + ' · ' : ''}${difficultyBadge(diff)}</div>` + (p['Ski Area'] ? `<div class="tt-hint">${escapeHtml(p['Ski Area'])}</div>` : '');
    });
  }

  function updateZoomLayersVisibility() {
    if (!outlinesLayer) initHeavyLayers();
    const zoom = map.getZoom();
    const show = (layer, minZoom) => {
      if (zoom >= minZoom) { if (!map.hasLayer(layer)) map.addLayer(layer); }
      else { if (map.hasLayer(layer)) map.removeLayer(layer); }
    };
    show(outlinesLayer, OUTLINES_MIN_ZOOM);
    show(liftsLayer, LIFTS_MIN_ZOOM);
    show(pistesLayer, PISTES_MIN_ZOOM);
  }

  map.on('zoomend', updateZoomLayersVisibility);
  updateZoomLayersVisibility();

  return { map, searchResorts, escapeHtml, updateResortVisibility };
}

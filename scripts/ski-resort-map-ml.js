/**
 * Ski resort map – MapTiler SDK + Planetiler PMTiles.
 * Data: ski_areas_analyzed / ski_areas / pistes / lifts from PMTiles; resort detail at z12+.
 */
import { config } from './map-config.js';
import { createMapLibre } from './map-core.js';
import {
  addSkiPmtilesToMap,
  attachPmtilesDebugLogging,
  ensureBoundaryLayersOnTop,
  fetchSkiAreaCatalog,
  SKI_PMTILES_LAYERS
} from './pmtiles-core.js?v=7';
import {
  getProp, escapeHtml, resortDisplayName, ENGLISH_NAME_KEYS,
  NAME_KEYS, ID_KEYS, COUNTRY_KEYS, STATE_KEYS, LIFTS_KEYS,
  slug,
  foldDiacritics,
  SKIABLE_TERRAIN_ACRES_KEYS,
  SKIABLE_TERRAIN_HA_KEYS,
  formatSkiableTerrain,
  COLOR_BY_KEYS
} from './utils.js';
import {
  getMapSizeTier,
  getMapTierColorForProps,
  MAP_TIER_LEGEND,
  MAP_TIER_COLORS,
  isNotDownhill,
  getTrailCount
} from './resort-categories.js';
import {
  hillSvg,
  mountainSvg,
  largeMountainsSvg,
  megaMountainsSvg,
  getIconId,
  addResortIconImages
} from './resort-tier-icons.js';

const {
  LIFTS_MIN_ZOOM,
  PISTES_MIN_ZOOM
} = config;

function getPisteDifficultyFromProps(p) {
  if (!p) return '';
  let v = getProp(p, ['piste:difficulty', 'piste_difficulty', 'difficulty']);
  if (v == null && typeof p.other_tags === 'string') {
    const m = p.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) v = m[1];
  }
  return v != null ? String(v).toLowerCase().trim() : '';
}

function getAerialwayFromProps(p) {
  return getProp(p, ['aerialway', 'Aerialway']) || '';
}

// ── Zoom thresholds: circles when zoomed out, shaped icons when zoomed in ──
const RESORT_ICON_MIN_ZOOM = 9;

const circlePaint = {
  'circle-color':        ['get', '_color'],
  'circle-stroke-color': 'rgba(255,255,255,0.65)',
  'circle-stroke-width': 1.2,
  'circle-opacity':      0.85
};

/** Same format as wiki resort/browse: "English (local)" from a wiki page object. */
function wikiDisplayName(p) {
  if (!p) return '';
  const en = (p.englishName != null && p.englishName !== '') ? String(p.englishName).trim() : '';
  const ti = (p.title != null && p.title !== '') ? String(p.title).trim() : '';
  if (en && ti && en !== ti) return en + ' (' + ti + ')';
  return en || ti || '';
}

// ── Popup HTML ─────────────────────────────────────────────────────────────
function buildPopupHtml(properties, latlng, options = {}, wikiPage = null) {
  if (!properties || !Object.keys(properties).length) return '<em>No data</em>';
  const name        = getProp(properties, NAME_KEYS);
  const displayStr  = wikiPage ? wikiDisplayName(wikiPage) : (resortDisplayName(properties) || (name ? String(name).trim() : ''));
  const displayName = displayStr ? escapeHtml(displayStr) : 'Resort';
  const id          = getProp(properties, ID_KEYS);
  const trails      = getProp(properties, COLOR_BY_KEYS);
  const lifts       = getProp(properties, LIFTS_KEYS);
  const country     = getProp(properties, COUNTRY_KEYS);
  const state       = getProp(properties, STATE_KEYS);
  const trailsNum   = trails != null && trails !== '' ? Number(trails) : null;
  const liftsNum    = lifts  != null && lifts  !== '' ? Number(lifts)  : null;
  const trailsStr   = trailsNum != null && !Number.isNaN(trailsNum) ? trailsNum.toLocaleString() + ' slopes' : null;
  const liftsStr    = liftsNum  != null && !Number.isNaN(liftsNum)  ? liftsNum.toLocaleString()  + ' lifts'  : null;
  let countryStr    = country != null && String(country).trim() !== '' ? String(country).trim() : null;
  if (countryStr && /^united states/i.test(countryStr)) countryStr = 'USA';
  const terrainStr  = formatSkiableTerrain(getProp(properties, SKIABLE_TERRAIN_ACRES_KEYS), getProp(properties, SKIABLE_TERRAIN_HA_KEYS));
  const terrainFact = terrainStr ? 'Skiable Terrain ' + terrainStr : null;
  const factsHtml = [trailsStr, liftsStr, terrainFact, countryStr].filter(Boolean).length
    ? `<p style="margin:4px 0 8px 0;font-size:13px;color:#6b7280">${[trailsStr, liftsStr, terrainFact, countryStr].filter(Boolean).map(escapeHtml).join(' \u2022 ')}</p>`
    : '';
  const lat = latlng?.lat ?? null;
  const lon = latlng?.lng ?? null;
  let pageParam = '';
  if (wikiPage && wikiPage.pageId) {
    pageParam = wikiPage.pageId;
  } else {
    const englishName = getProp(properties, ENGLISH_NAME_KEYS);
    const nameForSlug = (englishName != null && englishName !== '') ? String(englishName).trim() : (name != null ? String(name).trim() : '');
    const nameSlug    = slug(nameForSlug);
    const stateSlug  = state != null && String(state).trim() !== '' ? slug(String(state).trim()) : '';
    const countrySlug = country != null && String(country).trim() !== '' ? slug(String(country).trim()) : '';
    pageParam = nameSlug ? (stateSlug ? nameSlug + '-' + stateSlug : countrySlug ? nameSlug + '-' + countrySlug : nameSlug) : '';
  }
  const popupUrl   = pageParam
    ? new URL('wiki/resort.html', location.href).href + '?page=' + encodeURIComponent(pageParam)
    : new URL('wiki/browse.html', location.href).href;
  const stored    = JSON.stringify({ name: displayStr || name || null, id: id != null ? String(id) : null, lat, lon });
  const storedAttr = stored.replace(/"/g, '&quot;');
  let extraButtons = '';
  if (options.includeRoadTripButton) {
    const rn = escapeHtml(String(displayStr || name || 'Resort'));
    const rc = country != null && String(country).trim() ? escapeHtml(String(country).trim()) : '';
    extraButtons = `<button class="rtp-add-btn" data-resort-name="${rn}" data-resort-lat="${lat ?? 0}" data-resort-lon="${lon ?? 0}" data-resort-country="${rc}"><i class="bi bi-plus-circle"></i> Road Trip</button>`;
  }
  return `<p style="margin:0 0 4px 0;font-weight:600">${displayName}</p>${factsHtml}` +
    `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">` +
    `<a href="#" data-resort-url="${escapeHtml(popupUrl)}" data-resort-stored="${storedAttr}" class="resort-details-link" style="display:inline-flex;align-items:center;gap:4px;border-radius:8px;background:#2563eb;color:#fff;padding:8px 12px;font-size:13px;font-weight:500;text-decoration:none;cursor:pointer;">View details <i class="bi bi-arrow-up-right"></i></a>` +
    extraButtons + `</div>`;
}

// ── Tooltip labels for lifts/pistes (data comes from loaders) ──────────────
function aerialwayLabel(type) {
  const L = { gondola: 'Gondola', cable_car: 'Cable car', chair_lift: 'Chairlift', mixed_lift: 'Mixed lift', drag_lift: 'Drag lift', 't-bar': 'T-bar', j_bar: 'J-bar', platter: 'Platter', rope_tow: 'Rope tow', magic_carpet: 'Magic carpet' };
  return L[type] || (type ? type.replace(/_/g, ' ') : 'Lift');
}
function difficultyBadge(d) {
  const tbl = { easy: ['#22c55e', 'Easy'], novice: ['#22c55e', 'Novice'], intermediate: ['#2563eb', 'Intermediate'], medium: ['#2563eb', 'Medium'], advanced: ['#1a1a1a', 'Advanced'], hard: ['#1a1a1a', 'Hard'], expert: ['#991b1b', 'Expert'], freeride: ['#991b1b', 'Freeride'], extreme: ['#991b1b', 'Extreme'] };
  const [color, label] = tbl[d] || ['#64748b', 'Unrated'];
  return `<span class="tt-diff" style="background:${color}"></span>${label}`;
}

const OLYMPIC_HOSTS = [
  { name: 'Milan',              lat: 45.4642, lon: 9.19   },
  { name: "Cortina d'Ampezzo", lat: 46.5369, lon: 12.1356 }
];

// ── Main export ────────────────────────────────────────────────────────────
export async function initSkiResortMap(options = {}) {
  const includeRoadTripButton = !!options.includeRoadTripButton;

  // ── Initialise MapLibre map (map-core) ──────────────────────────────────
  const { map } = await createMapLibre({ containerId: 'map' });
  console.log('[ski-resort-map-ml] map ready, adding PMTiles…');
  await addSkiPmtilesToMap(map, {
    liftsColor: '#f87171',
    liftsWidth: 2,
    pistesWidth: 3,
    includeAnalyzedPoints: false
  });
  attachPmtilesDebugLogging(map);

  // MapTiler Data API has correct WGS84 coordinates (querySourceFeatures geometry is unreliable).
  let rows = [];
  try {
    rows = await fetchSkiAreaCatalog();
  } catch (e) {
    console.warn('[ski-resort-map-ml] catalog load failed:', e);
  }
  const olympicRingsSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="36" height="18" style="display:block"><circle cx="12" cy="15" r="6" fill="none" stroke="#0081C8" stroke-width="2"/><circle cx="30" cy="15" r="6" fill="none" stroke="#000" stroke-width="2"/><circle cx="48" cy="15" r="6" fill="none" stroke="#EE334E" stroke-width="2"/><circle cx="21" cy="21" r="6" fill="none" stroke="#FCB131" stroke-width="2"/><circle cx="39" cy="21" r="6" fill="none" stroke="#00A651" stroke-width="2"/></svg>';
  OLYMPIC_HOSTS.forEach((host) => {
    const el = document.createElement('div');
    el.className = 'olympic-rings-marker';
    el.style.cssText = 'background:#fff;border-radius:50%;padding:2px;box-shadow:0 1px 4px rgba(0,0,0,0.3);line-height:0;cursor:default;';
    el.innerHTML = olympicRingsSvg;
    new maptilersdk.Marker({ element: el })
      .setLngLat([host.lon, host.lat])
      .setPopup(new maptilersdk.Popup({ closeButton: false, offset: [0, -12] }).setHTML(`${host.name} – Milan–Cortina 2026`))
      .addTo(map);
  });

  let wikiPages = [];
  try {
    const wikiResp = await fetch('/api/wiki/index', { cache: 'no-store' });
    if (wikiResp.ok) {
      const wikiData = await wikiResp.json();
      const raw = wikiData.pages || [];
      wikiPages = raw.filter((p) => {
        const pt = p.pageType || '';
        return pt !== 'country' && pt !== 'state' && pt !== 'continent';
      });
    }
  } catch (e) {
    // Wiki index optional (e.g. static hosting)
  }

  function findWikiPage(properties) {
    const name = getProp(properties, NAME_KEYS);
    if (name == null || String(name).trim() === '') return null;
    const nameTrim = String(name).trim();
    const state = getProp(properties, STATE_KEYS);
    const stateTrim = state != null && state !== '' ? String(state).trim() : '';
    const country = getProp(properties, COUNTRY_KEYS);
    const countryTrim = country != null && country !== '' ? String(country).trim() : '';
    for (const p of wikiPages) {
      const pState = (p.state != null && p.state !== '') ? String(p.state).trim() : '';
      const pCountry = (p.country != null && p.country !== '') ? String(p.country).trim() : '';
      if (pCountry !== countryTrim || pState !== stateTrim) continue;
      const pTitle = (p.title != null && p.title !== '') ? String(p.title).trim() : '';
      const pEn = (p.englishName != null && p.englishName !== '') ? String(p.englishName).trim() : '';
      if (pTitle === nameTrim || pEn === nameTrim) return p;
    }
    return null;
  }

  const searchResorts = [];
  const resortFeatures = [];

  rows.forEach(({ geometry, properties }) => {
    if (!geometry || geometry.type !== 'Point') return;
    const [lon, lat] = geometry.coordinates;
    const tier    = getMapSizeTier(properties);
    const color   = getMapTierColorForProps(properties);
    const name    = getProp(properties, NAME_KEYS);
    const country = getProp(properties, COUNTRY_KEYS);
    const trails  = getProp(properties, COLOR_BY_KEYS);
    const trailsNum = trails != null && trails !== '' ? Number(trails) : 0;
    const countryDisp = country ? (String(country).match(/^united states/i) ? 'USA' : String(country).trim()) : '';
    const terrainStr = formatSkiableTerrain(getProp(properties, SKIABLE_TERRAIN_ACRES_KEYS), getProp(properties, SKIABLE_TERRAIN_HA_KEYS));
    const terrainDisp = terrainStr ? 'Skiable Terrain ' + terrainStr : null;

    const wikiPage   = findWikiPage(properties);
    const displayStr = wikiPage ? wikiDisplayName(wikiPage) : (resortDisplayName(properties) || (name ? String(name).trim() : ''));
    const en         = wikiPage ? (wikiPage.englishName || '') : (getProp(properties, ENGLISH_NAME_KEYS) || '');
    const searchText = [displayStr, en, wikiPage ? wikiPage.title : ''].filter(Boolean).join(' ').trim() || displayStr;
    const latlng = { lat, lng: lon };

    resortFeatures.push({
      type: 'Feature',
      geometry,
      properties: {
        _tier: tier,
        _color: color,
        _icon: getIconId(tier, color),
        _name: displayStr || (name ? String(name).trim() : ''),
        _country: countryDisp,
        _trails: Number.isNaN(trailsNum) ? 0 : trailsNum,
        _terrain: terrainDisp || '',
        _propsJson: JSON.stringify(properties)
      }
    });

    if (name) {
      searchResorts.push({
        name: displayStr,
        searchText,
        latlng,
        country: country ? String(country).trim() : '',
        properties,
        wikiPage,
        popupHtml: buildPopupHtml(properties, latlng, { includeRoadTripButton }, wikiPage)
      });
    }
  });

  // ── Legend ───────────────────────────────────────────────────────────────
  const legendEl = document.getElementById('legend');
  if (legendEl) {
    legendEl.style.display = 'block';
    legendEl.innerHTML =
      '<h3>Resort size</h3>' +
      `<div class="legend-row"><span class="legend-mountain-icon">${hillSvg(MAP_TIER_COLORS.small, 20, 14)}</span> ${MAP_TIER_LEGEND.small}</div>` +
      `<div class="legend-row"><span class="legend-mountain-icon">${mountainSvg(MAP_TIER_COLORS.medium, 22, 15)}</span> ${MAP_TIER_LEGEND.medium}</div>` +
      `<div class="legend-row"><span class="legend-mountain-icon">${largeMountainsSvg(MAP_TIER_COLORS.large, 24, 16)}</span> ${MAP_TIER_LEGEND.large}</div>` +
      `<div class="legend-row"><span class="legend-mountain-icon">${megaMountainsSvg(MAP_TIER_COLORS.mega, 26, 16)}</span> ${MAP_TIER_LEGEND.mega}</div>` +
      `<div class="legend-row" style="margin-top:6px"><span class="legend-mountain-icon">${hillSvg('#999', 18, 12)}</span> Grey = not a downhill ski resort</div>` +
      `<div class="legend-row" style="margin-top:8px;font-size:11px;color:#64748b">Colored dots at wide zoom; mountain icons from zoom ${RESORT_ICON_MIN_ZOOM}+</div>` +
      '<h3 style="margin-top:10px">Resort boundary (zoom 8+)</h3>' +
      '<div class="legend-row"><span class="legend-line" style="background:#145a32;height:3px"></span> Green outline = ski area boundary</div>' +
      '<div class="legend-row" style="font-size:11px;color:#64748b">Blue outline at zoom 12+ = 1,000 ft resort buffer</div>' +
      '<div class="legend-row" style="font-size:11px;color:#64748b">Brown lines at zoom 12+ = elevation contours (where available)</div>' +
      '<h3 style="margin-top:10px">Pistes (zoom 10+) – US colors</h3>' +
      '<div class="legend-row"><span class="legend-line" style="background:#22c55e"></span> Green = easy</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#2563eb"></span> Blue = intermediate</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#1a1a1a"></span> Black = advanced</div>' +
      '<div class="legend-row"><span class="legend-line" style="background:#991b1b"></span> Red = expert</div>';
  }

  // ── Resort dots + icon symbols (single GeoJSON source, aligned coordinates) ─
  map.addSource('ski-resorts', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: resortFeatures }
  });

  const resortPopup = new maptilersdk.Popup({ maxWidth: '340px', closeButton: true });

  const vtTipEl = document.createElement('div');
  vtTipEl.id = 'vt-tooltip';
  document.body.appendChild(vtTipEl);

  function showVtTip(point, html) {
    vtTipEl.innerHTML = html;
    vtTipEl.style.display = 'block';
    vtTipEl.style.left = (point.x + 14) + 'px';
    vtTipEl.style.top  = (point.y - 36) + 'px';
  }
  function hideVtTip() { vtTipEl.style.display = 'none'; }

  function showResortPopup(lngLat, props) {
    let properties = {};
    try { properties = JSON.parse(props._propsJson || '{}'); } catch (_) { /* ignore */ }
    const latlng = { lat: lngLat.lat, lng: lngLat.lng };
    const wikiPage = findWikiPage(properties);
    resortPopup
      .setLngLat(lngLat)
      .setHTML(buildPopupHtml(properties, latlng, { includeRoadTripButton }, wikiPage))
      .addTo(map);
  }

  function attachResortLayerEvents(layerIds) {
    layerIds.forEach((id) => {
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mousemove', id, (e) => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        const facts = [p._trails > 0 ? `${p._trails} slopes` : null, p._terrain || null, p._country || null].filter(Boolean).join(' · ');
        showVtTip(e.point,
          `<div class="tt-name">${escapeHtml(p._name || 'Resort')}</div>` +
          (facts ? `<div class="tt-hint">${escapeHtml(facts)}</div>` : '') +
          (id.includes('circles') ? `<div class="tt-hint" style="margin-top:3px;color:#7dd3fc">🔍 Click to zoom in</div>` : '')
        );
      });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });
      map.on('click', id, (e) => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        if (id.includes('circles')) {
          map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom() + 4, 11), duration: 500 });
        } else {
          showResortPopup(e.lngLat, p);
        }
      });
    });
  }

  map.addLayer({
    id: 'ski-small-circles',
    type: 'circle',
    source: 'ski-resorts',
    filter: ['==', ['get', '_tier'], 'small'],
    maxzoom: RESORT_ICON_MIN_ZOOM,
    paint: {
      ...circlePaint,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 8, 4]
    }
  });

  map.addLayer({
    id: 'ski-medium-circles',
    type: 'circle',
    source: 'ski-resorts',
    filter: ['==', ['get', '_tier'], 'medium'],
    maxzoom: RESORT_ICON_MIN_ZOOM,
    paint: {
      ...circlePaint,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 6]
    }
  });

  map.addLayer({
    id: 'ski-large-circles',
    type: 'circle',
    source: 'ski-resorts',
    filter: ['==', ['get', '_tier'], 'large'],
    maxzoom: RESORT_ICON_MIN_ZOOM,
    paint: {
      ...circlePaint,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 8, 7]
    }
  });

  map.addLayer({
    id: 'ski-mega-circles',
    type: 'circle',
    source: 'ski-resorts',
    filter: ['==', ['get', '_tier'], 'mega'],
    maxzoom: RESORT_ICON_MIN_ZOOM,
    paint: {
      ...circlePaint,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 8]
    }
  });

  attachResortLayerEvents([
    'ski-small-circles',
    'ski-medium-circles',
    'ski-large-circles',
    'ski-mega-circles'
  ]);

  const symbolLayout = {
    'icon-image': ['get', '_icon'],
    'icon-size': 1,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-anchor': 'center'
  };

  await addResortIconImages(map);

  map.addLayer({
    id: 'ski-icons-small',
    type: 'symbol',
    source: 'ski-resorts',
    minzoom: RESORT_ICON_MIN_ZOOM,
    filter: ['==', ['get', '_tier'], 'small'],
    layout: symbolLayout
  });
  map.addLayer({
    id: 'ski-icons-medium',
    type: 'symbol',
    source: 'ski-resorts',
    minzoom: RESORT_ICON_MIN_ZOOM,
    filter: ['==', ['get', '_tier'], 'medium'],
    layout: symbolLayout
  });
  map.addLayer({
    id: 'ski-icons-large',
    type: 'symbol',
    source: 'ski-resorts',
    minzoom: RESORT_ICON_MIN_ZOOM,
    filter: ['==', ['get', '_tier'], 'large'],
    layout: symbolLayout
  });
  map.addLayer({
    id: 'ski-icons-mega',
    type: 'symbol',
    source: 'ski-resorts',
    minzoom: RESORT_ICON_MIN_ZOOM,
    filter: ['==', ['get', '_tier'], 'mega'],
    layout: symbolLayout
  });

  attachResortLayerEvents(['ski-icons-large', 'ski-icons-mega', 'ski-icons-medium', 'ski-icons-small']);

  // Keep resort boundary rings above trail/lift linework (still below resort markers).
  ensureBoundaryLayersOnTop(map, 'ski-icons-small');
  console.log('[ski-resort-map-ml] init complete', {
    resortMarkers: resortFeatures.length,
    zoom: map.getZoom(),
    boundaryLayers: ['ski-boundary-fill', 'ski-boundary-line', 'ski-buffer-line']
      .map((id) => ({ id, present: !!map.getLayer(id) }))
  });

  document.addEventListener('mousemove', (ev) => {
    if (vtTipEl.style.display !== 'none') {
      vtTipEl.style.left = (ev.clientX + 14) + 'px';
      vtTipEl.style.top  = (ev.clientY - 36) + 'px';
    }
  });

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
      resortPopup.setLngLat([r.latlng.lng, r.latlng.lat]).setHTML(r.popupHtml).addTo(map);
    });
  }

  const searchable = (r) => foldDiacritics(r.searchText || r.name).toLowerCase();
  if (searchInput) {
    searchInput.addEventListener('input', () =>
      renderDropdown(searchResorts.filter(r => searchable(r).includes(foldDiacritics(searchInput.value).toLowerCase().trim())).slice(0, maxSuggestions))
    );
    searchInput.addEventListener('focus', () => {
      const q = foldDiacritics(searchInput.value).toLowerCase().trim();
      renderDropdown(q ? searchResorts.filter(r => searchable(r).includes(q)).slice(0, maxSuggestions) : []);
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

  // ── PMTiles lift / piste tooltips (vector tiles, z ≥ 10) ─────────────────
  map.on('mouseenter', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.lifts, (e) => {
    if (!e.features.length) return;
    const p = e.features[0].properties || {};
    const aw = getAerialwayFromProps(p);
    const name = getProp(p, NAME_KEYS) || p.name || '';
    showVtTip(e.point,
      `<div class="tt-name">${escapeHtml(aerialwayLabel(aw))}${name ? ' · ' + escapeHtml(String(name)) : ''}</div>`
    );
  });
  map.on('mouseleave', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });

  map.on('mouseenter', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.pistes, (e) => {
    if (!e.features.length) return;
    const p = e.features[0].properties || {};
    const diff = getPisteDifficultyFromProps(p);
    const name = getProp(p, NAME_KEYS) || p.name || '';
    showVtTip(e.point,
      `<div class="tt-name">${name ? escapeHtml(String(name)) + ' · ' : ''}${difficultyBadge(diff)}</div>`
    );
  });
  map.on('mouseleave', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });

  return { map, searchResorts, escapeHtml };
}

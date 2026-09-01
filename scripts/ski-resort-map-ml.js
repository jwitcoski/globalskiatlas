/**
 * Ski resort map – MapTiler SDK + Planetiler PMTiles.
 * Data: ski_areas_analyzed / ski_areas / pistes / lifts from PMTiles; resort detail at z12+.
 */
import { config } from './map-config.js';
import { createMapLibre } from './map-core.js';
import { getBasemapStyle, getSavedBasemapId } from './basemap-options.js';
import {
  addSkiPmtilesToMap,
  ATLAS_COLORS,
  ensureBoundaryLayersOnBottom,
  fetchSkiAreaCatalog,
  restoreSkiPmtilesAfterStyleChange
} from './pmtiles-core.js?v=bound2';
import {
  getProp, escapeHtml, resortDisplayName, ENGLISH_NAME_KEYS,
  NAME_KEYS, COUNTRY_KEYS, STATE_KEYS,
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
  MAP_TIER_COLORS
} from './resort-categories.js';
import {
  hillSvg,
  mountainSvg,
  largeMountainsSvg,
  megaMountainsSvg,
  getIconId,
  addResortIconImages
} from './resort-tier-icons.js';
import { initSkiFeaturePopups } from './ski-feature-popups.js?v=8';
import {
  buildResortPopupHtml,
  buildResortHoverHtml,
  buildResortStatsIndex,
  initResortPopupScopeSwitcher
} from './ski-resort-popups.js?v=5';

const {
  LIFTS_MIN_ZOOM,
  PISTES_MIN_ZOOM
} = config;

const RESORT_ICON_MIN_ZOOM = 9;

function circlePaintFor(playableMode) {
  return {
    'circle-color': ['get', '_color'],
    'circle-stroke-color': playableMode
      ? ['case', ['==', ['get', '_playable'], 1], '#0d9488', 'rgba(255,255,255,0.65)']
      : 'rgba(255,255,255,0.65)',
    'circle-stroke-width': playableMode
      ? ['case', ['==', ['get', '_playable'], 1], 2.2, 1.2]
      : 1.2,
    'circle-opacity': 0.85
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

function matchPlayableResort(lon, lat, name, properties, playableResorts) {
  if (!playableResorts?.length) return null;
  const osm = String(
    properties.osm_id || properties.osmId || properties.id || properties.winter_sports_id || ''
  ).replace(/^[^0-9]*/, '');
  const nameN = foldDiacritics(name || '').toLowerCase().trim();
  let best = null;
  let bestD = Infinity;
  for (const r of playableResorts) {
    const rid = String(r.id || r.winter_sports_id || '');
    if (osm && rid && (rid === osm || rid.startsWith(`${osm}_`) || String(r.winter_sports_id || '') === osm)) {
      return r;
    }
    const d = haversineKm(lat, lon, Number(r.lat), Number(r.lon));
    if (!Number.isFinite(d)) continue;
    const rn = foldDiacritics(r.name || '').toLowerCase().trim();
    const nameHit = nameN && rn && (nameN === rn || nameN.includes(rn) || rn.includes(nameN));
    const maxD = nameHit ? 8 : 2.2;
    if (d <= maxD && d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

async function fetchPlayableCatalog() {
  const r = await fetch(config.GAME_SCENES_CATALOG_URL);
  if (!r.ok) throw new Error(`Playable catalog ${r.status}`);
  const data = await r.json();
  return Array.isArray(data?.resorts) ? data.resorts : [];
}

function playableHrefFromPath(path) {
  const rel = String(path || '').replace(/^\/+|\/+$/g, '');
  if (!rel) return '';
  const slash = rel.indexOf('/');
  const q = new URLSearchParams();
  q.set('resort', slash < 0 ? rel : rel.slice(0, slash));
  if (slash >= 0) q.set('ver', rel.slice(slash + 1));
  return `/playable/?${q.toString()}`;
}

/** Same format as wiki resort/browse: "English (local)" from a wiki page object. */
function wikiDisplayName(p) {
  if (!p) return '';
  const en = (p.englishName != null && p.englishName !== '') ? String(p.englishName).trim() : '';
  const ti = (p.title != null && p.title !== '') ? String(p.title).trim() : '';
  if (en && ti && en !== ti) return en + ' (' + ti + ')';
  return en || ti || '';
}

// ── Popup HTML (see ski-resort-popups.js for charts + fun facts) ─────────────

const OLYMPIC_HOSTS = [
  { name: 'Milan',              lat: 45.4642, lon: 9.19   },
  { name: "Cortina d'Ampezzo", lat: 46.5369, lon: 12.1356 }
];

const SKI_PMTILES_OPTIONS = {
  liftsWidth: 2,
  pistesWidth: 3,
  includeAnalyzedPoints: false
};

async function addResortMarkerLayers(map, resortFeatures) {
  const data = { type: 'FeatureCollection', features: resortFeatures };
  if (!map.getSource('ski-resorts')) {
    map.addSource('ski-resorts', { type: 'geojson', data });
  } else {
    map.getSource('ski-resorts').setData(data);
  }

  const symbolLayout = {
    'icon-image': ['get', '_icon'],
    'icon-size': 1,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-anchor': 'center'
  };

  const circleLayerDefs = [
    { id: 'ski-small-circles', tier: 'small', radius: ['interpolate', ['linear'], ['zoom'], 3, 1.5, 8, 4] },
    { id: 'ski-medium-circles', tier: 'medium', radius: ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 6] },
    { id: 'ski-large-circles', tier: 'large', radius: ['interpolate', ['linear'], ['zoom'], 3, 3.5, 8, 7] },
    { id: 'ski-mega-circles', tier: 'mega', radius: ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 8] }
  ];

  for (const def of circleLayerDefs) {
    if (map.getLayer(def.id)) continue;
    map.addLayer({
      id: def.id,
      type: 'circle',
      source: 'ski-resorts',
      filter: ['==', ['get', '_tier'], def.tier],
      maxzoom: RESORT_ICON_MIN_ZOOM,
      paint: { ...(map._skiCirclePaint || circlePaintFor(false)), 'circle-radius': def.radius }
    });
  }

  await addResortIconImages(map);

  for (const tier of ['small', 'medium', 'large', 'mega']) {
    const id = `ski-icons-${tier}`;
    if (map.getLayer(id)) continue;
    map.addLayer({
      id,
      type: 'symbol',
      source: 'ski-resorts',
      minzoom: RESORT_ICON_MIN_ZOOM,
      filter: ['==', ['get', '_tier'], tier],
      layout: symbolLayout
    });
  }

  ensureBoundaryLayersOnBottom(map);
}

// ── Main export ────────────────────────────────────────────────────────────
export async function initSkiResortMap(options = {}) {
  const includeRoadTripButton = !!options.includeRoadTripButton;
  const containerId = options.containerId || 'map';
  const loadAds = options.loadAds !== false;
  const onPlayablePick = typeof options.onPlayablePick === 'function' ? options.onPlayablePick : null;
  let gameResorts = options.playableResorts || null;
  if (!gameResorts) {
    try {
      gameResorts = await fetchPlayableCatalog();
    } catch (e) {
      console.warn('[ski-resort-map-ml] playable catalog failed:', e);
      gameResorts = [];
    }
  }
  const playableMode = !!(gameResorts.length && onPlayablePick);
  const playableDotsOnly = !!options.playableDotsOnly && gameResorts.length > 0;

  // ── Initialise MapLibre map (map-core) ──────────────────────────────────
  const { map } = await createMapLibre({
    containerId,
    style: getBasemapStyle(getSavedBasemapId())
  });
  map._skiCirclePaint = circlePaintFor(playableMode);
  await addSkiPmtilesToMap(map, SKI_PMTILES_OPTIONS);

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

  const resortStatsIndex = buildResortStatsIndex(rows, (p) => {
    const wp = findWikiPage(p);
    return wp ? wikiDisplayName(wp) : (resortDisplayName(p) || getProp(p, NAME_KEYS) || '');
  });

  function makeResortPopup(properties, latlng, wikiPage, playablePath) {
    return buildResortPopupHtml(properties, latlng, {
      includeRoadTripButton,
      wikiPage,
      statsIndex: resortStatsIndex,
      escapeHtml,
      playableHref: playablePath ? playableHrefFromPath(playablePath) : '',
    });
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
    const playable = gameResorts.length ? matchPlayableResort(lon, lat, displayStr || name, properties, gameResorts) : null;
    if (playableDotsOnly && !playable) return;

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
        _playable: playable ? 1 : 0,
        _playablePath: playable ? String(playable.path) : '',
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
        playablePath: playable ? String(playable.path) : ''
      });
    }
  });

  if (playableDotsOnly) {
    const seenPaths = new Set();
    const uniqueFeatures = [];
    for (const f of resortFeatures) {
      const path = f.properties._playablePath;
      if (path) {
        if (seenPaths.has(path)) continue;
        seenPaths.add(path);
      }
      uniqueFeatures.push(f);
    }
    resortFeatures.length = 0;
    resortFeatures.push(...uniqueFeatures);

    const uniqueSearch = [];
    const seenSearch = new Set();
    for (const r of searchResorts) {
      if (!r.playablePath || seenSearch.has(r.playablePath)) continue;
      seenSearch.add(r.playablePath);
      uniqueSearch.push(r);
    }
    searchResorts.length = 0;
    searchResorts.push(...uniqueSearch);

    for (const r of gameResorts) {
      const path = String(r.path || '');
      if (!path || seenPaths.has(path)) continue;
      const lon = Number(r.lon);
      const lat = Number(r.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      seenPaths.add(path);
      const properties = {
        name: r.name,
        country: r.country,
        osm_id: r.winter_sports_id || r.id
      };
      const tier = getMapSizeTier(properties);
      const color = getMapTierColorForProps(properties);
      const displayStr = String(r.name || r.id || 'Ski area');
      const country = r.country ? String(r.country).trim() : '';
      const countryDisp = country.match(/^united states/i) ? 'USA' : country;
      const latlng = { lat, lng: lon };
      resortFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          _tier: tier,
          _color: color,
          _icon: getIconId(tier, color),
          _name: displayStr,
          _country: countryDisp,
          _trails: 0,
          _terrain: '',
          _playable: 1,
          _playablePath: path,
          _propsJson: JSON.stringify(properties)
        }
      });
      searchResorts.push({
        name: displayStr,
        searchText: [displayStr, r.location, country].filter(Boolean).join(' '),
        latlng,
        country,
        properties,
        wikiPage: null,
        playablePath: path
      });
    }
  }

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
      (playableDotsOnly
        ? '<div class="legend-row" style="margin-top:8px"><span class="legend-swatch" style="background:#0d9488;border:2px solid #0d9488;border-radius:50%"></span> Markers = mountains with playable 3D terrain (click to ski)</div>'
        : playableMode
        ? '<div class="legend-row" style="margin-top:8px"><span class="legend-swatch" style="background:#0d9488;border:2px solid #0d9488;border-radius:50%"></span> Teal ring = playable in Ski Game (click to ski)</div>'
        : '') +
      '<h3 style="margin-top:10px">Resort boundary (zoom 8+)</h3>' +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.boundaryOutline};height:2px;border-top:2px dashed ${ATLAS_COLORS.boundaryOutline}"></span> Dashed outline = ski area boundary</div>` +
      `<div class="legend-row" style="font-size:11px;color:#64748b">Tan lines at zoom 12+ = elevation contours (where available)</div>` +
      '<h3 style="margin-top:10px">Pistes (zoom 10+)</h3>' +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.pisteEasy}"></span> Green = easy / novice</div>` +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.pisteIntermediate}"></span> Blue = intermediate</div>` +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.pisteAdvanced}"></span> Black = advanced</div>` +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.pisteExpert}"></span> Red = expert</div>` +
      `<div class="legend-row"><span class="legend-line" style="background:${ATLAS_COLORS.lift}"></span> Orange = lifts</div>`;
  }

  // ── Resort dots + icon symbols (single GeoJSON source, aligned coordinates) ─
  await addResortMarkerLayers(map, resortFeatures);

  const resortPopup = new maptilersdk.Popup({
    maxWidth: '780px',
    closeButton: true,
    className: 'ski-resort-popup'
  });

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
      .setHTML(makeResortPopup(properties, latlng, wikiPage, props._playablePath))
      .addTo(map);
  }

  function attachResortLayerEvents(layerIds) {
    layerIds.forEach((id) => {
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mousemove', id, (e) => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        let properties = {};
        try { properties = JSON.parse(p._propsJson || '{}'); } catch (_) { /* ignore */ }
        showVtTip(e.point, buildResortHoverHtml(properties, p._name, resortStatsIndex, escapeHtml, {
          circleLayer: id.includes('circles')
        }) + (playableMode && p._playablePath
          ? '<div class="tt-hint">Click to ski this mountain</div>'
          : (p._playablePath ? '<div class="tt-hint">3D ski game available</div>' : '')));
      });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; hideVtTip(); });
      map.on('click', id, (e) => {
        if (!e.features.length) return;
        const p = e.features[0].properties;
        if (playableMode && p._playablePath && onPlayablePick) {
          onPlayablePick(p._playablePath);
          return;
        }
        if (id.includes('circles')) {
          map.flyTo({ center: e.lngLat, zoom: Math.max(map.getZoom() + 4, 11), duration: 500 });
        } else {
          showResortPopup(e.lngLat, p);
        }
      });
    });
  }

  attachResortLayerEvents([
    'ski-small-circles',
    'ski-medium-circles',
    'ski-large-circles',
    'ski-mega-circles'
  ]);

  attachResortLayerEvents(['ski-icons-large', 'ski-icons-mega', 'ski-icons-medium', 'ski-icons-small']);

  async function restoreOverlays() {
    await restoreSkiPmtilesAfterStyleChange(map, SKI_PMTILES_OPTIONS);
    await addResortMarkerLayers(map, resortFeatures);
  }

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
    if (playableMode && r.playablePath && onPlayablePick) {
      onPlayablePick(r.playablePath);
      return;
    }
    map.flyTo({ center: [r.latlng.lng, r.latlng.lat], zoom: 16, duration: 600 });
    map.once('moveend', () => {
      resortPopup.setLngLat([r.latlng.lng, r.latlng.lat])
        .setHTML(makeResortPopup(r.properties, r.latlng, r.wikiPage, r.playablePath))
        .addTo(map);
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

  if (loadAds) {
    const loadAd = () => {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    };
    if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(loadAd, { timeout: 2000 });
    else setTimeout(loadAd, 1500);
  }

  initSkiFeaturePopups(map, { escapeHtml, tipEl: vtTipEl });
  initResortPopupScopeSwitcher(resortStatsIndex, escapeHtml);

  return { map, searchResorts, escapeHtml, restoreOverlays };
}

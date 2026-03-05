var RESORT_MAP_INSTANCE = null;
var MAPTILER_KEY = '0P06ORgY8WvmMOnPr0p2';
var RESORT_STATIC_MAP_BASE = 'https://globalskiatlas-resort-maps.s3.us-east-1.amazonaws.com/';

// Plan section 2.3: max main-stat rank per category (facts 12-14 yes/no; 15 = vertical drop)
var RESORT_FACT_MAX_RANK = { small_hill: 4, ski_mountain: 10, multiple_mountains: 11, mega_resort: 14, unknown: 4 };
var RESORT_TEXT_LIMIT = { small_hill: 1500, ski_mountain: 3000, multiple_mountains: 5500, mega_resort: 11000, unknown: 1500 };
var RESORT_CATEGORY_LABEL = { small_hill: 'Small hill', ski_mountain: 'Ski mountain', multiple_mountains: 'Multiple mountains', mega_resort: 'Mega resort', unknown: 'Not a downhill ski hill' };
// Plan section 2.3 / 9.1: fact rank -> label for Customize facts checkboxes
var RESORT_FACT_LABELS = {
  1: 'Location', 2: 'Skiable terrain', 3: 'Trails count', 4: 'Lifts count', 5: 'Longest trail', 6: 'Longest lift',
  7: 'Total area', 8: 'Trail breakdown', 9: 'High elevation', 10: 'Low elevation', 11: 'Lift types',
  12: 'Gladed terrain', 13: 'Snow park', 14: 'Sledding / tubing', 15: 'Vertical drop'
};

// Dual units: m ↔ ft, acres ↔ ha, mi ↔ km (show both for all audiences)
var M_TO_FT = 3.28084;
var HA_TO_ACRES = 2.471054;
var MI_TO_KM = 1.60934;
function formatElevation(m) {
  if (m == null || typeof m !== 'number' || isNaN(m)) return '';
  var ft = Math.round(m * M_TO_FT);
  return m.toLocaleString() + ' m (' + ft.toLocaleString() + ' ft)';
}
function formatAreaAcres(acres) {
  if (acres == null || typeof acres !== 'number' || isNaN(acres)) return '';
  var ha = (acres / HA_TO_ACRES).toFixed(1).replace(/\.0$/, '');
  return acres.toLocaleString() + ' acres (' + ha + ' ha)';
}
function formatAreaHa(ha) {
  if (ha == null || typeof ha !== 'number' || isNaN(ha)) return '';
  var acres = Math.round(ha * HA_TO_ACRES);
  return ha.toLocaleString() + ' ha (' + acres.toLocaleString() + ' acres)';
}
function formatDistanceMi(mi) {
  if (mi == null || typeof mi !== 'number' || isNaN(mi)) return '';
  var km = (mi * MI_TO_KM).toFixed(1).replace(/\.0$/, '');
  return mi + ' mi (' + km + ' km)';
}

function switchMapTab(tab) {
  var livePanel = document.getElementById('resort-map-gl');
  var staticPanel = document.getElementById('resort-map-static');
  var tabLive = document.getElementById('tab-live');
  var tabStatic = document.getElementById('tab-static');
  var legendEl = document.getElementById('resort-map-legend');
  if (!livePanel || !staticPanel) return;
  if (tab === 'live') {
    livePanel.style.display = '';
    staticPanel.style.display = 'none';
    if (tabLive) { tabLive.classList.add('resort-map-tab--active'); }
    if (tabStatic) { tabStatic.classList.remove('resort-map-tab--active'); }
    if (legendEl) { legendEl.style.display = ''; }
    if (RESORT_MAP_INSTANCE) { RESORT_MAP_INSTANCE.resize(); }
  } else {
    livePanel.style.display = 'none';
    staticPanel.style.display = '';
    if (tabLive) { tabLive.classList.remove('resort-map-tab--active'); }
    if (tabStatic) { tabStatic.classList.add('resort-map-tab--active'); }
    if (legendEl) { legendEl.style.display = 'none'; }
  }
}

function initResortMap(lat, lon, pageId, zoom) {
  var aside = document.getElementById('resort-map-aside');
  var container = document.getElementById('resort-map-gl');
  if (!aside || !container) return;

  aside.style.display = '';

  // Static map: point at S3, fall back to placeholder on error
  var staticImg = document.getElementById('resort-map-static-img');
  if (staticImg && pageId) {
    staticImg.src = RESORT_STATIC_MAP_BASE + encodeURIComponent(pageId) + '.png';
  }

  var useZoom = zoom != null && !isNaN(Number(zoom)) ? Number(zoom) : 11;

  if (lat == null || lon == null || typeof maplibregl === 'undefined') {
    // No coords: show only the static/placeholder tab
    var tabLive = document.getElementById('tab-live');
    if (tabLive) tabLive.style.display = 'none';
    switchMapTab('static');
    return;
  }
  if (RESORT_MAP_INSTANCE) {
    RESORT_MAP_INSTANCE.remove();
    RESORT_MAP_INSTANCE = null;
    window.RESORT_MAP_INSTANCE = null;
    container.innerHTML = '';
  }
  var m = new maplibregl.Map({
    container: 'resort-map-gl',
    style: {
      version: 8,
      sources: {
        raster: {
          type: 'raster',
          tiles: ['https://api.maptiler.com/maps/winter-v4/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY],
          tileSize: 256,
        },
      },
      layers: [{ id: 'raster', type: 'raster', source: 'raster', minzoom: 3, maxzoom: 18 }],
    },
    center: [lon, lat],
    zoom: useZoom,
    attributionControl: false,
  });
  RESORT_MAP_INSTANCE = m;
  window.RESORT_MAP_INSTANCE = m;
  // Single marker only for resort-level zoom (e.g. zoom >= 10); region pages use lower zoom
  if (useZoom >= 10) {
    new maplibregl.Marker({ color: '#1a365d' }).setLngLat([lon, lat]).addTo(m);
  }
}

var YWIKI_PATH = (function () {
  var p = new URLSearchParams(window.location.search).get('page') || '';
  if (!p) { window.location.replace('/wiki/browse.html'); }
  return p;
}());

function renderFromMarkdown(text) {
  var target = document.querySelector('.js-resort-body');
  if (!target) return;

  var converter = new showdown.Converter();
  var html = converter.makeHtml(text || '');
  target.innerHTML = html;

  var firstP = target.querySelector('p');
  if (firstP) firstP.classList.add('resort-body-first');
}

function run() {
  var text = document.getElementById('sourceTA').value || '';
  renderFromMarkdown(text);
}

async function saveEntry() {
  var textarea = document.getElementById('sourceTA');
  var commentInput = document.getElementById('revision-comment');
  if (!textarea) return;

  var content = textarea.value || '';
  var comment = commentInput ? (commentInput.value || '').trim() : '';
  if (!comment) {
    alert('Revision comment is required. Describe what you changed.');
    if (commentInput) commentInput.focus();
    return;
  }

  var titleEl = document.querySelector('.resort-title');
  var title = titleEl ? titleEl.textContent.trim() : YWIKI_PATH;
  var page = (window._ywikiLastPage && window._ywikiLastPage.pageId === YWIKI_PATH) ? window._ywikiLastPage : null;
  var category = page && (page.resortSizeCategory || page.categorization && page.categorization.size) ? page.resortSizeCategory || page.categorization.size : 'unknown';
  var textLimit = RESORT_TEXT_LIMIT[category] != null ? RESORT_TEXT_LIMIT[category] : 1500;
  if (content.length > textLimit) {
    var label = RESORT_CATEGORY_LABEL[category] || category;
    alert('Body exceeds the limit for ' + label + ' (' + content.length.toLocaleString() + ' / ' + textLimit.toLocaleString() + ' characters). Shorten the text to save.');
    return;
  }

  var user = (window.ywikiAuth && typeof ywikiAuth.getUser === 'function')
    ? (ywikiAuth.getUser() || '')
    : '';

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function')
    ? ywikiAuth.getToken()
    : null;

  var body = {
    path: YWIKI_PATH,
    title: title,
    user: user || 'anonymous',
    content: content,
    comment: comment
  };

  var headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var resp = await fetch('/api/wiki', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (resp.ok) {
      if (resp.status === 202) {
        alert('Proposed. Pending accept/reject.');
        loadRevisions();
        loadComments();
        if (commentInput) commentInput.value = '';
      } else {
        alert('Saved!');
        loadRevisions();
        loadEntry();
        loadComments();
        if (commentInput) commentInput.value = '';
      }
    } else if (resp.status === 401) {
      alert('Sign in required to save changes.');
    } else if (resp.status === 400) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'Comment required.');
    } else {
      alert('Save failed: ' + resp.status + ' ' + (resp.statusText || ''));
    }
  } catch (e) {
    alert('Save failed (network error).');
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val || '';
}

/** Build allowed fact ranks for category: 1..maxRank plus 12,13,14; plus 15 (vertical drop) when elevation tier. */
function getAllowedFactRanks(maxRank) {
  var ranks = [];
  for (var r = 1; r <= maxRank && r <= 14; r++) ranks.push(r);
  if (maxRank < 12) { ranks.push(12); ranks.push(13); ranks.push(14); }
  if (maxRank >= 9) ranks.push(15); // vertical drop for ski_mountain and above
  return ranks;
}

/**
 * Render stats block, trail breakdown, and meta line. Used by populatePage and by live preview when toggling Customize facts.
 * useRanksOverride: when provided (array of rank numbers), use it as the visible set; otherwise use page.visibleFactRanks or category default.
 */
function renderStatsTrailAndMeta(page, useRanksOverride) {
  var category = page.resortSizeCategory || (page.categorization && page.categorization.size) || 'unknown';
  var maxRank = RESORT_FACT_MAX_RANK[category] != null ? RESORT_FACT_MAX_RANK[category] : 4;
  var useRanks = useRanksOverride !== undefined
    ? (Array.isArray(useRanksOverride) && useRanksOverride.length ? useRanksOverride : null)
    : (page.visibleFactRanks && Array.isArray(page.visibleFactRanks) && page.visibleFactRanks.length ? page.visibleFactRanks : null);
  function rankAllowed(r) {
    if (useRanks) return useRanks.indexOf(r) !== -1;
    if (r >= 12) return true;
    if (r === 15) return maxRank >= 9;
    return r <= maxRank;
  }
  var stats = [];
  if (rankAllowed(2)) {
    if (page.skiableTerrainAcres != null && !isNaN(Number(page.skiableTerrainAcres))) stats.push(['SKIABLE TERRAIN', formatAreaAcres(Number(page.skiableTerrainAcres))]);
    else if (page.skiableTerrainHa != null && !isNaN(Number(page.skiableTerrainHa))) stats.push(['SKIABLE TERRAIN', formatAreaHa(Number(page.skiableTerrainHa))]);
    else if (page.skiableTerrainAcres) stats.push(['SKIABLE TERRAIN', page.skiableTerrainAcres + ' acres']);
    else if (page.skiableTerrainHa) stats.push(['SKIABLE TERRAIN', page.skiableTerrainHa + ' ha']);
  }
  var verticalDrop = page.verticalDropM;
  if (verticalDrop == null && page.highElevationM != null && page.lowElevationM != null && page.highElevationM >= page.lowElevationM) {
    verticalDrop = page.highElevationM - page.lowElevationM;
  }
  if (rankAllowed(15) && verticalDrop != null && verticalDrop >= 0) {
    stats.push(['VERTICAL DROP', formatElevation(Number(verticalDrop))]);
  }
  if (rankAllowed(3) && page.downhillTrails) stats.push(['TRAILS', page.downhillTrails]);
  if (rankAllowed(4) && page.totalLifts) stats.push(['LIFTS', page.totalLifts]);
  if (rankAllowed(5) && page.longestTrailMi != null && !isNaN(Number(page.longestTrailMi))) stats.push(['LONGEST TRAIL', formatDistanceMi(Number(page.longestTrailMi))]);
  else if (rankAllowed(5) && page.longestTrailMi) stats.push(['LONGEST TRAIL', page.longestTrailMi + ' mi']);
  if (rankAllowed(6) && page.longestLiftMi != null && !isNaN(Number(page.longestLiftMi))) stats.push(['LONGEST LIFT', formatDistanceMi(Number(page.longestLiftMi))]);
  else if (rankAllowed(6) && page.longestLiftMi) stats.push(['LONGEST LIFT', page.longestLiftMi + ' mi']);
  if (rankAllowed(7)) {
    if (page.totalAreaAcres != null && !isNaN(Number(page.totalAreaAcres))) stats.push(['TOTAL AREA', formatAreaAcres(Number(page.totalAreaAcres))]);
    else if (page.totalAreaHa != null && !isNaN(Number(page.totalAreaHa))) stats.push(['TOTAL AREA', formatAreaHa(Number(page.totalAreaHa))]);
    else if (page.totalAreaAcres) stats.push(['TOTAL AREA', page.totalAreaAcres + ' acres']);
    else if (page.totalAreaHa) stats.push(['TOTAL AREA', page.totalAreaHa + ' ha']);
  }
  if (rankAllowed(9) && page.highElevationM != null) stats.push(['ELEVATION (HIGH)', formatElevation(Number(page.highElevationM))]);
  if (rankAllowed(10) && page.lowElevationM != null) stats.push(['ELEVATION (LOW)', formatElevation(Number(page.lowElevationM))]);
  var statsEl = document.getElementById('resort-stats');
  if (statsEl) {
    statsEl.innerHTML = stats.map(function (s) {
      return '<div class="resort-stat"><span class="stat-label">' + esc(s[0]) + '</span> <span class="stat-value">' + esc(String(s[1])) + '</span></div>';
    }).join('');
    statsEl.style.display = stats.length ? '' : 'none';
  }
  var trailParts = [];
  if (rankAllowed(8)) {
    if (page.trailsNovice) trailParts.push('Novice ' + page.trailsNovice);
    if (page.trailsEasy) trailParts.push('Easy ' + page.trailsEasy);
    if (page.trailsIntermediate) trailParts.push('Intermediate ' + page.trailsIntermediate);
    if (page.trailsAdvanced) trailParts.push('Advanced ' + page.trailsAdvanced);
    if (page.trailsExpert) trailParts.push('Expert ' + page.trailsExpert);
    if (page.trailsFreeride) trailParts.push('Freeride ' + page.trailsFreeride);
    if (page.trailsExtreme) trailParts.push('Extreme ' + page.trailsExtreme);
  }
  var tbEl = document.getElementById('resort-trail-breakdown');
  if (tbEl) {
    if (trailParts.length) {
      tbEl.innerHTML = '<span class="stat-label">Trail breakdown</span> ' + esc(trailParts.join(' · '));
      tbEl.style.display = '';
    } else {
      tbEl.style.display = 'none';
    }
  }
  var metaParts = [];
  if (rankAllowed(11) && page.liftTypes) metaParts.push('Lift types: ' + page.liftTypes);
  if (rankAllowed(12) && (page.gladedTerrain || page.gladedTerrain === 'yes' || page.gladedTerrain === 'no')) metaParts.push('Gladed: ' + (page.gladedTerrain === 'yes' ? 'Yes' : page.gladedTerrain === 'no' ? 'No' : page.gladedTerrain));
  if (rankAllowed(13) && (page.snowPark || page.snowPark === 'yes' || page.snowPark === 'no')) metaParts.push('Snow park: ' + (page.snowPark === 'yes' ? 'Yes' : page.snowPark === 'no' ? 'No' : page.snowPark));
  if (rankAllowed(14) && (page.sleddingTubing || page.sleddingTubing === 'yes' || page.sleddingTubing === 'no')) metaParts.push('Sledding/tubing: ' + (page.sleddingTubing === 'yes' ? 'Yes' : page.sleddingTubing === 'no' ? 'No' : page.sleddingTubing));
  var metaEl = document.getElementById('resort-meta');
  if (metaEl) {
    metaEl.textContent = metaParts.join(' · ');
    metaEl.style.display = metaParts.length ? '' : 'none';
  }
  var osmNoteEl = document.getElementById('resort-osm-note');
  if (osmNoteEl) {
    osmNoteEl.style.display = (stats.length || category === 'unknown') ? '' : 'none';
  }
}

/** Populate Customize facts checkboxes (plan 9.1). Shows all facts 1–15; user can select any subset. */
function renderFactCheckboxes(page, category, maxRank) {
  var wrap = document.getElementById('resort-customize-facts-wrap');
  var container = document.getElementById('resort-fact-checkboxes');
  if (!wrap || !container) return;
  if (page.pageType === 'country' || page.pageType === 'state' || page.pageType === 'continent') {
    wrap.style.display = 'none';
    return;
  }
  var defaultRanks = getAllowedFactRanks(maxRank);
  var current = page.visibleFactRanks && Array.isArray(page.visibleFactRanks) && page.visibleFactRanks.length
    ? page.visibleFactRanks
    : null;
  var checkedSet = {};
  if (current) {
    current.forEach(function (r) { if (r >= 1 && r <= 15) checkedSet[r] = true; });
  } else {
    defaultRanks.forEach(function (r) { checkedSet[r] = true; });
  }
  var allRanks = [];
  for (var r = 1; r <= 15; r++) allRanks.push(r);
  container.innerHTML = allRanks.map(function (rank) {
    var label = RESORT_FACT_LABELS[rank] || 'Fact ' + rank;
    var checked = checkedSet[rank] ? ' checked' : '';
    return '<label class="resort-fact-checkbox"><input type="checkbox" name="resort-fact-rank" value="' + rank + '"' + checked + (page.locked ? ' disabled' : '') + '> ' + esc(label) + '</label>';
  }).join('');
  wrap.style.display = '';
  var saveFactsBtn = document.getElementById('resort-save-facts-btn');
  var resetFactsBtn = document.getElementById('resort-reset-facts-btn');
  if (saveFactsBtn) saveFactsBtn.disabled = !!page.locked;
  if (resetFactsBtn) resetFactsBtn.disabled = !!page.locked;
  if (!container._factsPreviewBound) {
    container._factsPreviewBound = true;
    container.addEventListener('change', function (e) {
      if (e.target.name !== 'resort-fact-rank') return;
      var page = window._ywikiLastPage;
      if (!page) return;
      var inputs = document.querySelectorAll('input[name="resort-fact-rank"]:checked');
      var ranks = [];
      inputs.forEach(function (inp) { ranks.push(parseInt(inp.value, 10)); });
      renderStatsTrailAndMeta(page, ranks);
    });
  }
}

function saveFactSelection() {
  var pageId = YWIKI_PATH;
  var inputs = document.querySelectorAll('input[name="resort-fact-rank"]:checked');
  var ranks = [];
  inputs.forEach(function (inp) { ranks.push(parseInt(inp.value, 10)); });
  ranks.sort(function (a, b) { return a - b; });
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('You must be signed in to save fact selection.');
    return;
  }
  var btn = document.getElementById('resort-save-facts-btn');
  if (btn) btn.disabled = true;
  fetch('/api/wiki/' + encodeURIComponent(pageId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ visibleFactRanks: ranks })
  }).then(function (r) {
    if (r.ok) { loadEntry(); } else { alert('Failed to save fact selection.'); }
  }).catch(function () { alert('Network error.'); }).then(function () { if (btn) btn.disabled = false; });
}

function resetFactSelection() {
  var pageId = YWIKI_PATH;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('You must be signed in to reset fact selection.');
    return;
  }
  var btn = document.getElementById('resort-reset-facts-btn');
  if (btn) btn.disabled = true;
  fetch('/api/wiki/' + encodeURIComponent(pageId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ visibleFactRanks: [] })
  }).then(function (r) {
    if (r.ok) { loadEntry(); } else { alert('Failed to reset.'); }
  }).catch(function () { alert('Network error.'); }).then(function () { if (btn) btn.disabled = false; });
}

/** For continent pages: list countries. For country pages: list states. For state pages: list resorts. */
function loadRegionList(page) {
  var sectionEl = document.getElementById('resort-region-list');
  var titleEl = document.getElementById('resort-region-list-title');
  var bodyEl = document.getElementById('resort-region-list-body');
  if (!sectionEl || !titleEl || !bodyEl) return;
  var isContinent = page.pageType === 'continent';
  var isCountry = page.pageType === 'country';
  var isState = page.pageType === 'state';
  if (!isContinent && !isCountry && !isState) return;
  var sectionTitle = isContinent ? 'Countries in this region' : isCountry ? 'States and regions' : 'Resorts in this region';
  if (titleEl) titleEl.textContent = sectionTitle;
  bodyEl.innerHTML = '<p class="resort-workflow-hint">Loading…</p>';
  sectionEl.style.display = '';
  fetch('/api/wiki/index', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Index failed')); })
    .then(function (data) {
      var pages = data.pages || [];
      var list;
      if (isContinent) {
        list = pages.filter(function (p) {
          return p.pageType === 'country' && p.book === page.book;
        });
        list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        bodyEl.innerHTML = list.length === 0
          ? '<p class="resort-workflow-hint">No countries in this region.</p>'
          : '<ul class="resort-region-links">' + list.map(function (p) {
              return '<li><a href="/wiki/resort.html?page=' + encodeURIComponent(p.pageId) + '">' + esc(p.title || p.pageId) + '</a></li>';
            }).join('') + '</ul>';
      } else if (isCountry) {
        list = pages.filter(function (p) {
          return p.pageType === 'state' && p.country === page.country;
        });
        list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        bodyEl.innerHTML = list.length === 0
          ? '<p class="resort-workflow-hint">No states or regions in this country.</p>'
          : '<ul class="resort-region-links">' + list.map(function (p) {
              return '<li><a href="/wiki/resort.html?page=' + encodeURIComponent(p.pageId) + '">' + esc(p.title || p.pageId) + '</a></li>';
            }).join('') + '</ul>';
      } else {
        list = pages.filter(function (p) {
          return (p.pageType === 'resort' || !p.pageType) && p.country === page.country && p.state === page.state;
        });
        list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        bodyEl.innerHTML = list.length === 0
          ? '<p class="resort-workflow-hint">No resorts in this region.</p>'
          : '<ul class="resort-region-links">' + list.map(function (p) {
              return '<li><a href="/wiki/resort.html?page=' + encodeURIComponent(p.pageId || '') + '">' + esc(p.title || p.pageId) + '</a></li>';
            }).join('') + '</ul>';
      }
    })
    .catch(function () {
      bodyEl.innerHTML = '<p class="resort-workflow-hint">Could not load list.</p>';
    });
}

function bindOsmActionButtons() {
  var pageId = YWIKI_PATH;
  var flagBtn = document.getElementById('resort-flag-wrong-btn');
  var fixedBtn = document.getElementById('resort-fixed-osm-btn');
  var refreshBtn = document.getElementById('resort-refresh-data-btn');
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    if (flagBtn) flagBtn.disabled = true;
    if (fixedBtn) fixedBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;
    return;
  }
  if (flagBtn && !flagBtn._bound) {
    flagBtn._bound = true;
    flagBtn.addEventListener('click', function () {
      fetch('/api/wiki/' + encodeURIComponent(pageId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ dataFlaggedWrong: true })
      }).then(function (r) {
        if (r.ok) { loadEntry(); } else { alert('Failed to flag.'); }
      }).catch(function () { alert('Network error.'); });
    });
  }
  if (fixedBtn && !fixedBtn._bound) {
    fixedBtn._bound = true;
    fixedBtn.addEventListener('click', function () {
      fetch('/api/wiki/' + encodeURIComponent(pageId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ fixedInOsm: true })
      }).then(function (r) {
        if (r.ok) { loadEntry(); } else { alert('Failed to update.'); }
      }).catch(function () { alert('Network error.'); });
    });
  }
  if (refreshBtn && !refreshBtn._bound) {
    refreshBtn._bound = true;
    refreshBtn.addEventListener('click', function () {
      refreshBtn.disabled = true;
      fetch('/api/wiki/' + encodeURIComponent(pageId) + '/refresh-from-parquet', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (r) {
        return r.json().then(function (data) {
          if (r.ok) { loadEntry(); } else { alert(data.message || data.error || 'Refresh failed.'); }
        });
      }).catch(function () { alert('Network error.'); }).then(function () { refreshBtn.disabled = false; });
    });
  }
}

function bindHideUnhideButtons() {
  var pageId = YWIKI_PATH;
  var hideBtn = document.getElementById('resort-hide-page-btn');
  var unhideBtn = document.getElementById('resort-unhide-page-btn');
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) return;
  if (hideBtn && !hideBtn._hideBound) {
    hideBtn._hideBound = true;
    hideBtn.addEventListener('click', function () {
      hideBtn.disabled = true;
      fetch('/api/wiki/' + encodeURIComponent(pageId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ hidden: true })
      }).then(function (r) {
        if (r.ok) loadEntry(); else alert('Failed to hide page.');
      }).catch(function () { alert('Network error.'); }).finally(function () { hideBtn.disabled = false; });
    });
  }
  if (unhideBtn && !unhideBtn._hideBound) {
    unhideBtn._hideBound = true;
    unhideBtn.addEventListener('click', function () {
      unhideBtn.disabled = true;
      fetch('/api/wiki/' + encodeURIComponent(pageId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ hidden: false })
      }).then(function (r) {
        if (r.ok) loadEntry(); else alert('Failed to unhide page.');
      }).catch(function () { alert('Network error.'); }).finally(function () { unhideBtn.disabled = false; });
    });
  }
}

function bindCategorySaveButton() {
  var pageId = YWIKI_PATH;
  var selectEl = document.getElementById('resort-admin-category-select');
  var saveBtn = document.getElementById('resort-save-category-btn');
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token || !selectEl || !saveBtn) return;
  if (saveBtn._categoryBound) return;
  saveBtn._categoryBound = true;
  saveBtn.addEventListener('click', function () {
    var value = selectEl.value;
    if (!value) return;
    saveBtn.disabled = true;
    fetch('/api/wiki/' + encodeURIComponent(pageId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ resortSizeCategory: value })
    }).then(function (r) {
      if (r.ok) loadEntry(); else alert('Failed to update category.');
    }).catch(function () { alert('Network error.'); }).finally(function () { saveBtn.disabled = false; });
  });
}

function bindStatusButtons() {
  var pageId = YWIKI_PATH;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) return;
  var markFinishedBtn = document.getElementById('resort-mark-finished-btn');
  var markUnfinishedBtn = document.getElementById('resort-mark-unfinished-btn');
  var lockBtn = document.getElementById('resort-lock-page-btn');
  var unlockBtn = document.getElementById('resort-unlock-page-btn');
  var api = '/api/wiki/' + encodeURIComponent(pageId);
  var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  if (markFinishedBtn && !markFinishedBtn._statusBound) {
    markFinishedBtn._statusBound = true;
    markFinishedBtn.addEventListener('click', function () {
      markFinishedBtn.disabled = true;
      fetch(api, { method: 'PATCH', headers: headers, body: JSON.stringify({ finished: true }) })
        .then(function (r) { if (r.ok) loadEntry(); else alert('Failed to mark as finished.'); })
        .catch(function () { alert('Network error.'); })
        .finally(function () { markFinishedBtn.disabled = false; });
    });
  }
  if (markUnfinishedBtn && !markUnfinishedBtn._statusBound) {
    markUnfinishedBtn._statusBound = true;
    markUnfinishedBtn.addEventListener('click', function () {
      markUnfinishedBtn.disabled = true;
      fetch(api, { method: 'PATCH', headers: headers, body: JSON.stringify({ finished: false }) })
        .then(function (r) { if (r.ok) loadEntry(); else alert('Failed to mark as unfinished.'); })
        .catch(function () { alert('Network error.'); })
        .finally(function () { markUnfinishedBtn.disabled = false; });
    });
  }
  if (lockBtn && !lockBtn._statusBound) {
    lockBtn._statusBound = true;
    lockBtn.addEventListener('click', function () {
      lockBtn.disabled = true;
      fetch(api + '/lock', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (r) { if (r.ok) loadEntry(); else alert('Failed to lock page.'); })
        .catch(function () { alert('Network error.'); })
        .finally(function () { lockBtn.disabled = false; });
    });
  }
  if (unlockBtn && !unlockBtn._statusBound) {
    unlockBtn._statusBound = true;
    unlockBtn.addEventListener('click', function () {
      unlockBtn.disabled = true;
      fetch(api + '/lock', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (r) { if (r.ok) loadEntry(); else alert('Failed to unlock page.'); })
        .catch(function () { alert('Network error.'); })
        .finally(function () { unlockBtn.disabled = false; });
    });
  }
}

function populatePage(page) {
  if (!page) {
    document.title = 'Not Found – Ski Atlas';
    setText('resort-title', 'Resort not found: ' + YWIKI_PATH);
    setText('resort-subtitle', 'This page does not exist yet.');
    var hiddenCalloutEl = document.getElementById('resort-hidden-callout');
    var hideActionsEl = document.getElementById('resort-hide-actions');
    if (hiddenCalloutEl) hiddenCalloutEl.style.display = 'none';
    if (hideActionsEl) hideActionsEl.style.display = 'none';
    var categoryWrapEl = document.getElementById('resort-admin-category-wrap');
    if (categoryWrapEl) categoryWrapEl.style.display = 'none';
    var finishedCalloutEl = document.getElementById('resort-finished-callout');
    var statusActionsEl = document.getElementById('resort-admin-status-actions');
    if (finishedCalloutEl) finishedCalloutEl.style.display = 'none';
    if (statusActionsEl) statusActionsEl.style.display = 'none';
    return;
  }

  window._ywikiLastPage = page;
  document.title = (page.title || YWIKI_PATH) + ' – Ski Atlas';
  setText('resort-location', [page.state, page.country].filter(Boolean).join(', '));
  setText('resort-title', page.title || YWIKI_PATH);

  function slug(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || '';
  }
  var bcEl = document.getElementById('resort-breadcrumb');
  if (bcEl && (page.pageType === 'resort' || !page.pageType) && (page.state || page.country)) {
    var bcParts = [];
    if (page.state && page.country) {
      var statePageId = 'state-' + slug(page.state) + '-' + slug(page.country);
      bcParts.push('<a href="/wiki/resort.html?page=' + encodeURIComponent(statePageId) + '">' + esc(page.state) + '</a>');
    }
    if (page.country) {
      var countryPageId = 'country-' + slug(page.country);
      bcParts.push('<a href="/wiki/resort.html?page=' + encodeURIComponent(countryPageId) + '">' + esc(page.country) + '</a>');
    }
    if (bcParts.length) {
      bcEl.innerHTML = bcParts.join(' · ');
      bcEl.style.display = '';
    } else {
      bcEl.style.display = 'none';
    }
  } else if (bcEl && page.pageType === 'country' && page.book) {
    var continentSlug = slug((page.book || '').replace(/\//g, '-'));
    if (continentSlug) {
      bcEl.innerHTML = '<a href="/wiki/resort.html?page=' + encodeURIComponent('continent-' + continentSlug) + '">' + esc(page.book) + '</a>';
      bcEl.style.display = '';
    } else {
      bcEl.style.display = 'none';
    }
  } else if (bcEl && page.pageType === 'state' && page.country) {
    var stateBcParts = [];
    if (page.book) {
      var contSlug = slug((page.book || '').replace(/\//g, '-'));
      if (contSlug) stateBcParts.push('<a href="/wiki/resort.html?page=' + encodeURIComponent('continent-' + contSlug) + '">' + esc(page.book) + '</a>');
    }
    var countryPageId = 'country-' + slug(page.country);
    stateBcParts.push('<a href="/wiki/resort.html?page=' + encodeURIComponent(countryPageId) + '">' + esc(page.country) + '</a>');
    bcEl.innerHTML = stateBcParts.join(' · ');
    bcEl.style.display = '';
  } else if (bcEl) {
    bcEl.style.display = 'none';
  }

  if (page.pageType === 'country' || page.pageType === 'state' || page.pageType === 'continent') {
    setText('resort-subtitle', (page.book || page.title || '') + (page.pageType === 'state' && page.country ? ' · ' + page.country : ''));
    var statsEl = document.getElementById('resort-stats');
    if (statsEl) { statsEl.style.display = 'none'; }
    var tbEl = document.getElementById('resort-trail-breakdown');
    if (tbEl) { tbEl.style.display = 'none'; }
    var metaEl = document.getElementById('resort-meta');
    if (metaEl) { metaEl.style.display = 'none'; }
    var osmNoteEl = document.getElementById('resort-osm-note');
    if (osmNoteEl) { osmNoteEl.style.display = 'none'; }
    var textarea = document.getElementById('sourceTA');
    if (textarea) textarea.value = page.content || '';
    renderFromMarkdown(page.content || '');
    var charCountEl = document.getElementById('resort-char-count');
    if (charCountEl) { charCountEl.style.display = 'none'; }
    var aside = document.getElementById('resort-map-aside');
    var regionLat = page.latitude != null ? Number(page.latitude) : null;
    var regionLon = page.longitude != null ? Number(page.longitude) : null;
    var regionHasCoords = regionLat != null && !isNaN(regionLat) && regionLon != null && !isNaN(regionLon);
    if (regionHasCoords && aside) {
      initResortMap(regionLat, regionLon, page.pageId || YWIKI_PATH, page.mapZoom != null ? Number(page.mapZoom) : undefined);
    } else if (aside) {
      aside.style.display = 'none';
    }
    loadRegionList(page);
    return;
  }

  var category = page.resortSizeCategory || page.categorization && page.categorization.size || 'unknown';
  var maxRank = RESORT_FACT_MAX_RANK[category] != null ? RESORT_FACT_MAX_RANK[category] : 4;

  var subParts = [];
  if (category === 'unknown') {
    subParts.push('Not a downhill ski hill');
  } else {
    if (page.resortType && category !== 'unknown') subParts.push(page.resortType);
    if (page.totalLifts) subParts.push(page.totalLifts + ' lifts');
    if (page.downhillTrails) subParts.push(page.downhillTrails + ' trails');
    if (category === 'mega_resort') subParts.push('Mega resort');
  }
  setText('resort-subtitle', subParts.join(' · '));

  renderStatsTrailAndMeta(page);

  var osmNoteEl = document.getElementById('resort-osm-note');
  var osmEditLink = document.getElementById('resort-osm-edit-link');
  if (osmNoteEl) {
    var osmId = page.winterSportsId || null;
    var osmType = (page.winterSportsType || '').toLowerCase().trim();
    var validTypes = { node: true, way: true, relation: true };
    if (osmId && validTypes[osmType]) {
      var osmUrl = 'https://www.openstreetmap.org/' + osmType + '/' + encodeURIComponent(osmId);
      if (osmEditLink) osmEditLink.href = osmUrl;
    }
  }
  var osmActionsEl = document.getElementById('resort-osm-actions');
  var osmActionsWrap = document.getElementById('resort-osm-actions-wrap');
  var flagCalloutEl = document.getElementById('resort-flag-callout');
  var refreshCalloutEl = document.getElementById('resort-refresh-callout');
  if (osmActionsWrap) osmActionsWrap.style.display = (page.pageType !== 'country' && page.pageType !== 'state' && page.pageType !== 'continent') ? '' : 'none';
  if (osmActionsEl) osmActionsEl.style.display = '';
  if (flagCalloutEl) flagCalloutEl.style.display = page.dataFlaggedWrong ? '' : 'none';
  if (refreshCalloutEl) refreshCalloutEl.style.display = page.fixedInOsm ? '' : 'none';
  var lockedNoteEl = document.getElementById('resort-locked-note');
  if (lockedNoteEl) lockedNoteEl.style.display = page.locked ? '' : 'none';
  var editSection = document.querySelector('.resort-edit');
  if (editSection) {
    var ta = document.getElementById('sourceTA');
    var saveBtn = editSection.querySelector('button[onclick="saveEntry()"]');
    if (page.locked) {
      if (ta) ta.disabled = true;
      if (saveBtn) saveBtn.disabled = true;
    } else {
      if (ta) ta.disabled = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }
  bindOsmActionButtons();
  renderFactCheckboxes(page, category, maxRank);

  var hiddenCalloutEl = document.getElementById('resort-hidden-callout');
  var hideActionsEl = document.getElementById('resort-hide-actions');
  var hideBtn = document.getElementById('resort-hide-page-btn');
  var unhideBtn = document.getElementById('resort-unhide-page-btn');
  var isResortPage = page.pageType === 'resort' || !page.pageType;
  if (hiddenCalloutEl) hiddenCalloutEl.style.display = (page.hidden && isResortPage) ? '' : 'none';
  if (hideActionsEl && isResortPage && window._ywikiIsAdmin) {
    hideActionsEl.style.display = '';
    if (hideBtn) { hideBtn.style.display = page.hidden ? 'none' : ''; hideBtn.disabled = !!page.locked; }
    if (unhideBtn) { unhideBtn.style.display = page.hidden ? '' : 'none'; unhideBtn.disabled = !!page.locked; }
    bindHideUnhideButtons();
  } else if (hideActionsEl) {
    hideActionsEl.style.display = 'none';
  }
  var categoryWrapEl = document.getElementById('resort-admin-category-wrap');
  var categorySelectEl = document.getElementById('resort-admin-category-select');
  if (categoryWrapEl && categorySelectEl && isResortPage && window._ywikiIsAdmin) {
    categoryWrapEl.style.display = '';
    var currentCategory = page.resortSizeCategory || (page.categorization && page.categorization.size) || 'unknown';
    categorySelectEl.value = currentCategory;
    categorySelectEl.disabled = !!page.locked;
    bindCategorySaveButton();
  } else if (categoryWrapEl) {
    categoryWrapEl.style.display = 'none';
  }
  var finishedCalloutEl = document.getElementById('resort-finished-callout');
  var statusActionsEl = document.getElementById('resort-admin-status-actions');
  var markFinishedBtn = document.getElementById('resort-mark-finished-btn');
  var markUnfinishedBtn = document.getElementById('resort-mark-unfinished-btn');
  var lockBtn = document.getElementById('resort-lock-page-btn');
  var unlockBtn = document.getElementById('resort-unlock-page-btn');
  if (finishedCalloutEl && isResortPage) finishedCalloutEl.style.display = page.finished ? '' : 'none';
  if (statusActionsEl && isResortPage && window._ywikiIsAdmin) {
    statusActionsEl.style.display = '';
    if (markFinishedBtn) { markFinishedBtn.style.display = page.finished ? 'none' : ''; }
    if (markUnfinishedBtn) { markUnfinishedBtn.style.display = page.finished ? '' : 'none'; }
    if (lockBtn) { lockBtn.style.display = page.locked ? 'none' : ''; }
    if (unlockBtn) { unlockBtn.style.display = page.locked ? '' : 'none'; }
    bindStatusButtons();
  } else if (statusActionsEl) {
    statusActionsEl.style.display = 'none';
  }

  var textarea = document.getElementById('sourceTA');
  if (textarea) textarea.value = page.content || '';
  renderFromMarkdown(page.content || '');

  var textLimit = RESORT_TEXT_LIMIT[category] != null ? RESORT_TEXT_LIMIT[category] : 1500;
  var charCountEl = document.getElementById('resort-char-count');
  var categoryLabel = RESORT_CATEGORY_LABEL[category] || category;
  if (charCountEl) {
    var len = (page.content || '').length;
    charCountEl.textContent = len.toLocaleString() + ' / ' + textLimit.toLocaleString() + ' characters (limit for ' + categoryLabel + ')';
    charCountEl.style.display = '';
  }
  if (textarea) {
    function updateCharCount() {
      var el = document.getElementById('resort-char-count');
      if (el) {
        var len = (textarea.value || '').length;
        el.textContent = len.toLocaleString() + ' / ' + textLimit.toLocaleString() + ' characters (limit for ' + categoryLabel + ')';
        if (len > textLimit) el.classList.add('resort-char-count-over');
        else el.classList.remove('resort-char-count-over');
      }
    }
    textarea.removeEventListener('input', updateCharCount);
    textarea.addEventListener('input', updateCharCount);
  }

  var lat = (page.centroidLat != null) ? Number(page.centroidLat) : null;
  var lon = (page.centroidLon != null) ? Number(page.centroidLon) : null;
  var hasCoords = lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
  if (hasCoords || page.pageId) {
    initResortMap(hasCoords ? lat : null, hasCoords ? lon : null, page.pageId || YWIKI_PATH);
    if (hasCoords && window.enhanceResortMap) {
      window.enhanceResortMap({
        title: page.title || YWIKI_PATH,
        lat: lat,
        lon: lon,
        pageId: page.pageId || YWIKI_PATH
      });
    }
  } else {
    var aside = document.getElementById('resort-map-aside');
    if (aside) aside.style.display = 'none';
  }
}

/** Require sign-in before opening edit/OSM details; show message if not logged in. */
function bindEditDetailsSignIn() {
  var editWrap = document.getElementById('resort-edit-wrap');
  var osmWrap = document.getElementById('resort-osm-actions-wrap');
  function getToken() {
    return (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  }
  if (editWrap && !editWrap._signInBound) {
    editWrap._signInBound = true;
    var editSummary = editWrap.querySelector('summary');
    if (editSummary) {
      editSummary.addEventListener('click', function (e) {
        if (!getToken()) {
          e.preventDefault();
          alert('Please sign in to edit.');
        }
      });
    }
  }
  if (osmWrap && !osmWrap._signInBound) {
    osmWrap._signInBound = true;
    var osmSummary = osmWrap.querySelector('summary');
    if (osmSummary) {
      osmSummary.addEventListener('click', function (e) {
        if (!getToken()) {
          e.preventDefault();
          alert('Please sign in to improve or correct this data.');
        }
      });
    }
  }
}

async function loadEntry() {
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH));
    if (!resp.ok) { populatePage(null); return; }
    var page = await resp.json();
    window._ywikiLastPage = page;
    var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
    if (token) {
      try {
        var meResp = await fetch('/api/wiki/admin/me', { headers: { 'Authorization': 'Bearer ' + token } });
        if (meResp.ok) {
          var me = await meResp.json();
          window._ywikiIsAdmin = !!me.admin;
        } else {
          window._ywikiIsAdmin = false;
        }
      } catch (_) { window._ywikiIsAdmin = false; }
    } else {
      window._ywikiIsAdmin = false;
    }
    populatePage(page);
  } catch (e) {
    populatePage(null);
  }
}

var _contributorsCache = {};

function updateContributorsFromRevisions(revisions) {
  (revisions || []).forEach(function (r) {
    var uid = r.userId || '';
    if (uid) _contributorsCache[uid] = r.userDisplayName || r.userId || uid;
  });
  renderContributors();
}

function updateContributorsFromComments(comments) {
  (comments || []).forEach(function (c) {
    var uid = c.userId || '';
    if (uid) _contributorsCache[uid] = c.userDisplayName || c.userId || uid;
  });
  renderContributors();
}

function renderContributors() {
  var el = document.getElementById('resort-contributors');
  if (!el) return;
  var names = Object.keys(_contributorsCache).map(function (uid) {
    return (_contributorsCache[uid] || uid).replace(/</g, '&lt;');
  });
  if (names.length === 0) {
    el.textContent = '';
  } else {
    el.textContent = ' · contributed by: ' + names.join(', ');
  }
}

function updateContributors(revisions) {
  _contributorsCache = {};
  (revisions || []).forEach(function (r) {
    var uid = r.userId || '';
    if (uid) _contributorsCache[uid] = r.userDisplayName || r.userId || uid;
  });
  renderContributors();
}

function formatDiffHtml(diffText) {
  if (!diffText || typeof diffText !== 'string') return '';
  var lines = diffText.split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var first = line.charAt(0);
    var cls = first === '+' ? 'resort-diff-add' : first === '-' ? 'resort-diff-remove' : 'resort-diff-context';
    out.push('<span class="' + cls + '">' + escaped + '</span>');
  }
  return out.join('\n');
}

function toggleRevisionDiff(revId) {
  var block = document.getElementById('revision-diff-' + revId);
  var btn = document.getElementById('revision-diff-btn-' + revId);
  if (!block || !btn) return;
  if (block.style.display === 'none' || !block.style.display) {
    block.style.display = 'block';
    btn.textContent = 'Hide changes';
  } else {
    block.style.display = 'none';
    btn.textContent = 'View changes';
  }
}

async function loadRevisions() {
  var el = document.getElementById('revisions-list');
  if (!el) return;
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions?limit=20');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.revisions) ? data.revisions : [];
    var currentUserId = (window.ywikiAuth && typeof ywikiAuth.getUserId === 'function') ? ywikiAuth.getUserId() : null;
    updateContributorsFromRevisions(list);
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No revisions yet.</p>';
    } else {
      el.innerHTML = list.map(function (r) {
        var ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
        var user = (r.userDisplayName || r.userId || 'anonymous').replace(/</g, '&lt;');
        var summary = (r.summary || 'Edit').replace(/</g, '&lt;');
        var status = (r.status || 'approved').toLowerCase();
        var statusLabel = status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'accepted';
        var statusClass = 'resort-revision-status resort-revision-status-' + statusLabel;
        var actions = '';
        if (status === 'pending') {
          var isOwnRevision = currentUserId && r.userId && currentUserId === r.userId;
          if (!isOwnRevision) {
            actions = ' <button type="button" class="resort-revision-action resort-revision-accept" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="acceptRevision(this.getAttribute(\'data-revision-id\'))">Accept</button>';
          }
          actions += ' <button type="button" class="resort-revision-action resort-revision-reject" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="rejectRevision(this.getAttribute(\'data-revision-id\'))">Reject</button>';
        }
        var revId = r.revisionId || '';
        var revIdEsc = revId.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
        var viewChanges = '';
        var diffBlock = '';
        if (r.diff) {
          viewChanges = ' <button type="button" class="resort-revision-view-diff" id="revision-diff-btn-' + revId + '" onclick="toggleRevisionDiff(\'' + revIdEsc + '\')">View changes</button>';
          diffBlock = '<div class="resort-revision-diff" id="revision-diff-' + revId + '" style="display:none"><pre class="resort-diff-pre">' + formatDiffHtml(r.diff) + '</pre></div>';
        }
        return '<div class="resort-revision-item"><div class="resort-revision-head"><span class="resort-revision-time">' + ts + '</span> <span class="resort-revision-user">' + user + '</span>: ' + summary + ' <span class="' + statusClass + '">(' + statusLabel + ')</span>' + actions + viewChanges + '</div>' + diffBlock + '</div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load revisions.</p>';
    updateContributors([]);
  }
}

async function acceptRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to accept a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you accepting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadEntry();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 403) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'You cannot accept your own revision; another user must accept it.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to accept: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to accept revision.');
  }
}

async function rejectRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to reject a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you rejecting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to reject: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to reject revision.');
  }
}

async function loadComments() {
  var el = document.getElementById('comments-list');
  if (!el) return;
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments?limit=100');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.comments) ? data.comments : [];
    updateContributorsFromComments(list);
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No comments yet.</p>';
    } else {
      el.innerHTML = list.map(function (c) {
        var ts = c.timestamp ? new Date(c.timestamp).toLocaleString() : '';
        var user = (c.userDisplayName || c.userId || 'anonymous').replace(/</g, '&lt;');
        var content = (c.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
        return '<div class="resort-comment-item"><span class="resort-comment-meta">' + user + ' · ' + ts + '</span><p class="resort-comment-content">' + content + '</p></div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load comments.</p>';
  }
}

async function postComment() {
  var input = document.getElementById('comment-input');
  var btn = document.getElementById('comment-submit-btn');
  if (!input || !btn) return;

  var content = (input.value || '').trim();
  if (!content) {
    alert('Enter a comment.');
    return;
  }

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to post a comment.');
    return;
  }

  btn.disabled = true;
  try {
    var resp = await fetch('/api/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content: content })
    });
    if (resp.ok) {
      input.value = '';
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required to post a comment.');
    } else {
      alert('Failed to post comment: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to post comment.');
  }
  btn.disabled = false;
}

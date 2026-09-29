/**
 * Logged-in "Add a new resort": search OSM landuse=winter_sports by name,
 * click one outline, then POST /api/wiki/resort-jobs.
 * The queue secret stays on the server.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ywikiAddResort = api;
    if (root.document) api.mount();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  var MATCH_CAP = 40;
  var NORMAL = { color: '#1a4d8c', weight: 3, fillColor: '#0f766e', fillOpacity: 0.35 };
  var SELECTED = { color: '#1a4d8c', weight: 5, fillColor: '#0f766e', fillOpacity: 0.62 };
  var leafletPromise = null;

  function existingPage(pages, id) {
    var want = String(id || '');
    if (!/^\d+$/.test(want)) return null;
    var list = Array.isArray(pages) ? pages : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].winterSportsId || '') === want) return list[i];
    }
    return null;
  }

  function jobBody(feature) {
    var id = feature && feature.id != null ? String(feature.id).trim() : '';
    var name = feature && feature.name != null ? String(feature.name).trim() : '';
    if (!/^\d+$/.test(id) || !name) throw new Error('outline required');
    return { action: 'add', winter_sports_id: id, name: name };
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      css.crossOrigin = '';
      document.head.appendChild(css);
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = function () { resolve(window.L); };
      script.onerror = function () { leafletPromise = null; reject(new Error('map')); };
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  function bind(form) {
    var nameInput = form.querySelector('#wiki-add-name');
    var statusEl = form.querySelector('#wiki-add-status');
    var mapEl = form.querySelector('#wiki-add-map');
    var picks = form.querySelector('#wiki-add-picks');
    var confirmBtn = form.querySelector('#wiki-add-confirm');
    var searchBtn = form.querySelector('button[type="submit"]');
    var map = null;
    var layers = [];
    var selected = null;
    var features = [];
    var searchGen = 0;
    var searchTimer = null;
    var catalog = null;

    function loadCatalog() {
      if (!catalog) {
        catalog = fetch('/api/wiki/index', { headers: { Accept: 'application/json' } })
          .then(function (resp) {
            if (!resp.ok) throw new Error('index');
            return resp.json();
          })
          .then(function (data) { return data && data.pages ? data.pages : []; })
          .catch(function () { catalog = null; return []; });
      }
      return catalog;
    }

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text;
    }

    function paint() {
      layers.forEach(function (item) {
        item.layer.setStyle(selected && item.feature.id === selected.id ? SELECTED : NORMAL);
        if (selected && item.feature.id === selected.id) {
          item.layer.eachLayer(function (sub) { if (sub.bringToFront) sub.bringToFront(); });
        }
      });
      if (picks) {
        picks.querySelectorAll('button').forEach(function (btn) {
          btn.setAttribute('aria-pressed', selected && btn.getAttribute('data-id') === selected.id ? 'true' : 'false');
        });
      }
    }

    function showExisting(feature, page) {
      selected = null;
      if (confirmBtn) {
        confirmBtn.hidden = true;
        confirmBtn.disabled = true;
      }
      paint();
      if (!statusEl) return;
      statusEl.replaceChildren();
      statusEl.appendChild(document.createTextNode(feature.name + ' is already in the atlas. '));
      if (page && page.pageId) {
        var link = document.createElement('a');
        link.href = '/wiki/resort.html?page=' + encodeURIComponent(page.pageId);
        link.textContent = 'Open ' + (page.title || feature.name);
        statusEl.appendChild(link);
      }
    }

    function choose(feature) {
      selected = feature;
      if (confirmBtn) {
        confirmBtn.hidden = false;
        confirmBtn.disabled = false;
      }
      paint();
      setStatus('Selected ' + feature.name + '.');
      loadCatalog().then(function (pages) {
        if (selected !== feature) return;
        var page = existingPage(pages, feature.id);
        if (page) showExisting(feature, page);
      });
    }

    function clearResults() {
      selected = null;
      features = [];
      layers = [];
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.hidden = true;
      }
      if (picks) {
        picks.hidden = true;
        picks.replaceChildren();
      }
      if (map) {
        map.remove();
        map = null;
      }
      if (mapEl) {
        mapEl.hidden = true;
        mapEl.replaceChildren();
      }
    }

    function renderPicks(list) {
      if (!picks) return;
      picks.replaceChildren();
      var counts = {};
      list.forEach(function (feature) { counts[feature.name] = (counts[feature.name] || 0) + 1; });
      list.forEach(function (feature) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-id', feature.id);
        btn.setAttribute('aria-pressed', 'false');
        var title = document.createElement('span');
        title.className = 'wiki-add-pick-name';
        title.textContent = counts[feature.name] > 1 ? (feature.name + ' (' + feature.id + ')') : feature.name;
        btn.appendChild(title);
        if (feature.place) {
          var place = document.createElement('span');
          place.className = 'wiki-add-pick-place';
          place.textContent = feature.place;
          btn.appendChild(place);
        }
        btn.addEventListener('click', function () {
          choose(feature);
          var item = layers.filter(function (entry) { return entry.feature.id === feature.id; })[0];
          if (item && map) map.fitBounds(item.layer.getBounds(), { padding: [24, 24], maxZoom: 15 });
        });
        picks.appendChild(btn);
      });
      picks.hidden = list.length === 0;
    }

    function draw(list) {
      return loadLeaflet().then(function (L) {
        mapEl.hidden = false;
        if (!map) {
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          map = L.map(mapEl, { zoomAnimation: !reduce, fadeAnimation: !reduce, scrollWheelZoom: true });
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);
        }
        layers.forEach(function (item) { map.removeLayer(item.layer); });
        layers = [];
        var group = L.featureGroup();
        list.forEach(function (feature) {
          var layer = L.geoJSON(feature.geojson, {
            style: NORMAL,
            onEachFeature: function (_feat, sub) {
              sub.on('click', function (e) {
                L.DomEvent.stopPropagation(e);
                choose(feature);
              });
            }
          });
          layer.addTo(group);
          layers.push({ feature: feature, layer: layer });
        });
        group.addTo(map);
        if (group.getBounds().isValid()) map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 15 });
        requestAnimationFrame(function () { if (map) map.invalidateSize(); });
      });
    }

    function promptFor(list) {
      if (!list.length) {
        setStatus('No OpenStreetMap winter sports area has that name.');
        return;
      }
      var more = list.length >= MATCH_CAP ? ' Showing the first ' + MATCH_CAP + '. Use a more specific name.' : '';
      if (list.length === 1) setStatus('Click the outline to select it.' + more);
      else setStatus(list.length + ' outlines match. Click the correct one.' + more);
    }

    function runSearch(raw) {
      var q = String(raw || '').trim().replace(/\s+/g, ' ');
      var gen = ++searchGen;
      selected = null;
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.hidden = true;
      }
      if (q.length < 2) {
        clearResults();
        setStatus('');
        return;
      }
      setStatus('Searching OpenStreetMap…');
      var headers = { Accept: 'application/json' };
      if (window.ywikiAuth && ywikiAuth.getToken()) headers.Authorization = 'Bearer ' + ywikiAuth.getToken();
      fetch('/api/wiki/resort-search?q=' + encodeURIComponent(q), { headers: headers })
        .then(function (resp) {
          if (resp.status === 401) throw new Error('auth');
          if (!resp.ok) throw new Error('search ' + resp.status);
          return resp.json();
        })
        .then(function (data) {
          if (gen !== searchGen) return;
          var next = data && Array.isArray(data.features) ? data.features.slice(0, MATCH_CAP) : [];
          if (!next.length) {
            clearResults();
            promptFor(next);
            return;
          }
          features = next;
          renderPicks(next);
          return draw(next).then(function () {
            if (gen !== searchGen) return;
            promptFor(features);
          });
        })
        .catch(function (err) {
          if (gen !== searchGen) return;
          clearResults();
          setStatus(err && err.message === 'auth' ? 'Sign in to add a missing resort.' : 'OpenStreetMap search failed. Try again.');
        });
    }

    function scheduleSearch() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { runSearch(nameInput.value); }, 400);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearTimeout(searchTimer);
      runSearch(nameInput.value);
    });
    nameInput.addEventListener('input', scheduleSearch);
    confirmBtn.addEventListener('click', function () {
      var body;
      try { body = jobBody(selected); }
      catch (e) {
        setStatus(features.length > 1 ? 'Click the correct outline before adding it.' : 'Click the outline to select it.');
        return;
      }
      if (!window.ywikiResortJobs) return;
      confirmBtn.disabled = true;
      ywikiResortJobs.submit(body, statusEl).then(function (ok) {
        if (!ok && selected) confirmBtn.disabled = false;
      }).catch(function () {
        if (selected) confirmBtn.disabled = false;
        setStatus('Could not queue this change.');
      });
    });
  }

  function mount() {
    function arm() {
      var form = document.getElementById('wiki-add-resort');
      if (!form || !window.ywikiAuth || !ywikiAuth.getToken()) return;
      form.hidden = false;
      if (!form._addBound) {
        form._addBound = true;
        bind(form);
      }
    }
    function start() {
      if (!window.ywikiAuth) return;
      ywikiAuth.init(arm);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  return {
    existingPage: existingPage,
    jobBody: jobBody,
    mount: mount
  };
});

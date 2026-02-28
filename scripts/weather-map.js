/**
 * MapTiler Weather map – uses official MapTiler SDK JS + MapTiler Weather SDK.
 * Expects globals: maptilersdk, maptilerweather, and window.MAPTILER_API_KEY.
 * @see https://docs.maptiler.com/sdk-js/examples/weather-layer-switcher/
 */
(function () {
  'use strict';

  if (typeof maptilersdk === 'undefined' || typeof maptilerweather === 'undefined') {
    console.error('weather-map: maptilersdk and maptilerweather must be loaded first.');
    return;
  }

  const apiKey = window.MAPTILER_API_KEY || '';
  if (!apiKey) {
    console.warn('weather-map: Set window.MAPTILER_API_KEY for the weather map.');
  }
  maptilersdk.config.apiKey = apiKey;

  const SKI_AREAS_URL = 'https://api.maptiler.com/data/019c9294-30cd-7aa0-96a0-e552ef79eee8/features.json?key=' + encodeURIComponent(apiKey);

  function getProp(props, keys) {
    if (!props) return undefined;
    for (let i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(props, keys[i])) return props[keys[i]];
    }
    return undefined;
  }
  const RESORT_TYPE_KEYS = ['resort_type', 'Resort Type'];
  const NOT_DOWNHILL = 'not a downhill ski resort';
  const SIZE_BY_KEYS = ['total_area_acres', 'Total Area Acres', 'area_acres'];
  const COLOR_BY_KEYS = ['downhill_trails', 'number_of_downhill_trails', 'Downhill Trails', 'trails'];
  const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
  const COUNTRY_KEYS = ['country', 'Country', 'country_name', 'addr:country'];
  const TRAILS_SMALL = 50;
  const TRAILS_MEDIUM = 100;
  const ACRES_SMALL = 1000;
  const ACRES_MEDIUM = 5000;
  const MEDIUM_ICON_MIN = 9;
  const SMALL_ICON_MIN = 11;

  var hillSvg = function (color, w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '"><path d="M0 16 L0 11 Q6 6 12 11 Q18 6 24 11 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';
  };
  var mountainSvg = function (color, w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '"><path d="M0 16 L8 5 L16 10 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';
  };
  var mountainsSvg = function (color, w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="' + w + '" height="' + h + '"><path d="M0 16 L4 10 L8 14 L10 9 L14 5 L18 10 L20 7 L24 16 Z" fill="' + color + '" stroke="#1a1a1a" stroke-width="0.8"/></svg>';
  };

  var COLOR_TO_KEY = { '#c44d34': 'red', '#e6c229': 'yellow', '#2d8a3e': 'green', '#999999': 'grey' };
  function getIconId(tier, color) {
    var key = COLOR_TO_KEY[color] || 'red';
    if (tier === 'large') return 'mountains-' + key;
    if (tier === 'medium') return 'mountain-' + key;
    return 'hill-' + key;
  }

  function svgToImageData(svgString, pixelRatio) {
    pixelRatio = pixelRatio || 2;
    var parser = new DOMParser();
    var doc = parser.parseFromString(svgString, 'image/svg+xml');
    var svg = doc.documentElement;
    var w = parseInt(svg.getAttribute('width'), 10) || 24;
    var h = parseInt(svg.getAttribute('height'), 10) || 16;
    var width = w * pixelRatio;
    var height = h * pixelRatio;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    var dataUrl = 'data:image/svg+xml,' + encodeURIComponent(svgString.replace(/width="[^"]+"/, 'width="' + width + '"').replace(/height="[^"]+"/, 'height="' + height + '"'));
    return new Promise(function (resolve, reject) {
      img.onload = function () {
        ctx.drawImage(img, 0, 0);
        try {
          var imageData = ctx.getImageData(0, 0, width, height);
          resolve({ width: width, height: height, data: imageData.data });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  function addResortIconImages(map) {
    var colors = [
      { key: 'red', hex: '#c44d34' },
      { key: 'yellow', hex: '#e6c229' },
      { key: 'green', hex: '#2d8a3e' },
      { key: 'grey', hex: '#999999' }
    ];
    var promises = [];
    colors.forEach(function (c) {
      promises.push(
        svgToImageData(hillSvg(c.hex, 20, 14)).then(function (d) { map.addImage('hill-' + c.key, d); }),
        svgToImageData(mountainSvg(c.hex, 26, 18)).then(function (d) { map.addImage('mountain-' + c.key, d); }),
        svgToImageData(mountainsSvg(c.hex, 32, 20)).then(function (d) { map.addImage('mountains-' + c.key, d); })
      );
    });
    return Promise.all(promises);
  }

  function getTrailCount(props) {
    const v = getProp(props, COLOR_BY_KEYS);
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  function getAcres(props) {
    const v = getProp(props, SIZE_BY_KEYS);
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  function isNotDownhill(props) {
    const v = getProp(props, RESORT_TYPE_KEYS);
    return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
  }
  function getSizeTier(feature) {
    const props = feature.properties || {};
    if (isNotDownhill(props)) return 'small';
    const trails = getTrailCount(props);
    const acres = getAcres(props);
    if (trails > TRAILS_MEDIUM || acres > ACRES_MEDIUM) return 'large';
    if (trails >= TRAILS_SMALL || acres >= ACRES_SMALL) return 'medium';
    return 'small';
  }
  function getColorFor(feature) {
    const props = feature.properties || {};
    if (isNotDownhill(props)) return '#999999';
    const tier = getSizeTier(feature);
    if (tier === 'large') return '#2d8a3e';
    if (tier === 'medium') return '#e6c229';
    return '#c44d34';
  }

  const weatherLayers = {
    precipitation: { layer: null, value: 'value', units: ' mm' },
    pressure: { layer: null, value: 'value', units: ' hPa' },
    radar: { layer: null, value: 'value', units: ' dBZ' },
    temperature: { layer: null, value: 'value', units: '°' },
    wind: { layer: null, value: 'speedMetersPerSecond', units: ' m/s' }
  };

  const map = (window.weatherMap = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.BACKDROP,
    zoom: 2,
    center: [-42.66, 37.63],
    hash: true,
    projectionControl: true,
    projection: 'globe'
  }));

  const initWeatherLayer = 'radar';
  const timeInfoContainer = document.getElementById('time-info');
  const timeTextDiv = document.getElementById('time-text');
  const timeSlider = document.getElementById('time-slider');
  const playPauseButton = document.getElementById('play-pause-bt');
  const pointerDataDiv = document.getElementById('pointer-data');
  const variableNameDiv = document.getElementById('variable-name');
  let pointerLngLat = null;
  let activeLayer = null;
  let isPlaying = false;
  let currentTime = null;
  var skiResortFeatures = [];
  var useImperial = false;

  function formatValue(layerId, rawValue) {
    if (rawValue == null || typeof rawValue !== 'number') return null;
    if (!useImperial) {
      if (layerId === 'precipitation') return { v: rawValue, u: ' mm/h' };
      if (layerId === 'pressure') return { v: rawValue, u: ' hPa' };
      if (layerId === 'radar') return { v: rawValue, u: ' dBZ' };
      if (layerId === 'temperature') return { v: rawValue, u: '°C' };
      if (layerId === 'wind') return { v: rawValue, u: ' m/s' };
    } else {
      if (layerId === 'precipitation') return { v: rawValue * 0.03937, u: ' in/h' };
      if (layerId === 'pressure') return { v: rawValue * 0.02953, u: ' inHg' };
      if (layerId === 'radar') return { v: rawValue, u: ' dBZ' };
      if (layerId === 'temperature') return { v: (rawValue * 9 / 5) + 32, u: '°F' };
      if (layerId === 'wind') return { v: rawValue * 2.237, u: ' mph' };
    }
    return { v: rawValue, u: '' };
  }

  function updateUnitSwitch() {
    var metricBtn = document.getElementById('unit-metric');
    var imperialBtn = document.getElementById('unit-imperial');
    if (metricBtn) metricBtn.classList.toggle('active', !useImperial);
    if (imperialBtn) imperialBtn.classList.toggle('active', useImperial);
  }

  var metricBtn = document.getElementById('unit-metric');
  var imperialBtn = document.getElementById('unit-imperial');
  if (metricBtn) metricBtn.addEventListener('click', function () { useImperial = false; updateUnitSwitch(); updatePointerValue(pointerLngLat); });
  if (imperialBtn) imperialBtn.addEventListener('click', function () { useImperial = true; updateUnitSwitch(); updatePointerValue(pointerLngLat); });

  timeSlider.addEventListener('input', function () {
    const weatherLayer = weatherLayers[activeLayer]?.layer;
    if (weatherLayer) {
      weatherLayer.setAnimationTime(parseInt(timeSlider.value, 10) / 1000);
    }
  });

  playPauseButton.addEventListener('click', function () {
    const weatherLayer = weatherLayers[activeLayer]?.layer;
    if (weatherLayer) {
      if (isPlaying) {
        pauseAnimation(weatherLayer);
      } else {
        playAnimation(weatherLayer);
      }
    }
  });

  function pauseAnimation(weatherLayer) {
    weatherLayer.animateByFactor(0);
    playPauseButton.innerText = 'Play 3600x';
    isPlaying = false;
  }

  function playAnimation(weatherLayer) {
    weatherLayer.animateByFactor(3600);
    playPauseButton.innerText = 'Pause';
    isPlaying = true;
  }

  map.on('load', function () {
    map.setPaintProperty('Water', 'fill-color', 'rgba(0, 0, 0, 0.4)');
    initWeatherMap(initWeatherLayer);
    addSkiResortsLayer();
  });

  function escapeHtmlAttr(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function findWettestResort(direction) {
    if (!skiResortFeatures.length) {
      if (typeof window.wettestResortPopup !== 'undefined') window.wettestResortPopup.remove();
      return;
    }
    var precLayer = weatherLayers.precipitation.layer;
    if (!precLayer) {
      changeWeatherLayer('precipitation');
      precLayer = weatherLayers.precipitation.layer;
    }
    if (!precLayer) return;

    var isNext = direction === 'next';

    function runSearch() {
      var currentTimeSec = precLayer.getAnimationTime();
      var start24h = isNext ? currentTimeSec : Math.max(precLayer.getAnimationStart(), currentTimeSec - 86400);
      var end24h = isNext ? Math.min(precLayer.getAnimationEnd(), currentTimeSec + 86400) : currentTimeSec;
      var stepSec = 3600;
      var accumulation = {};
      var bounds = map.getBounds();
      var inView = skiResortFeatures.filter(function (f) {
        return bounds.contains(f.geometry.coordinates);
      });
      var toSearch = inView.length ? inView : skiResortFeatures;
      for (var i = 0; i < toSearch.length; i++) accumulation[toSearch[i].geometry.coordinates.join(',')] = 0;

      for (var t = start24h; t <= end24h; t += stepSec) {
        precLayer.setAnimationTime(t);
        for (var j = 0; j < toSearch.length; j++) {
          var c = toSearch[j].geometry.coordinates;
          var key = c.join(',');
          var v = precLayer.pickAt(c[0], c[1]);
          if (v != null && typeof v.value === 'number') accumulation[key] += v.value;
        }
      }
      precLayer.setAnimationTime(currentTimeSec);
      if (typeof timeSlider !== 'undefined') timeSlider.value = String(currentTimeSec * 1000);
      refreshTime();

      var best = null;
      var bestVal = -Infinity;
      for (var k = 0; k < toSearch.length; k++) {
        var key = toSearch[k].geometry.coordinates.join(',');
        var val = accumulation[key];
        if (val > bestVal) {
          bestVal = val;
          best = toSearch[k];
        }
      }

      if (typeof window.wettestResortPopup === 'undefined') {
        window.wettestResortPopup = new maptilersdk.Popup({ closeButton: true, closeOnClick: false });
      }
      var periodLabel = isNext ? 'next 24h' : 'last 24h';
      var helpLabel = isNext ? 'forecast precipitation over the next 24 hours' : 'accumulated precipitation over the last 24 hours';
      if (!best || bestVal <= 0) {
        window.wettestResortPopup.remove();
        var center = map.getCenter();
        window.wettestResortPopup.setLngLat(center).setHTML(
          '<p style="margin:0;font-size:13px">No precipitation data for resorts in view.</p>' +
          '<p style="margin:6px 0 0 0;font-size:12px;color:#6b7280">Switch to Precipitation, wait for the layer to load, then try again. Uses ' + helpLabel + '.</p>'
        ).addTo(map);
        return;
      }
      var coords = best.geometry.coordinates;
      var name = (best.properties && best.properties.name != null) ? String(best.properties.name).trim() : 'Resort';
      var country = (best.properties && best.properties.country != null) ? String(best.properties.country).trim() : '';
      if (country && /^united states/i.test(country)) country = 'USA';
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 10), duration: 1500 });
      var accumDisplay = useImperial ? (bestVal * 0.03937).toFixed(2) + ' in' : bestVal.toFixed(1) + ' mm';
      var html = '<p style="margin:0 0 4px 0;font-weight:600">' + escapeHtmlAttr(name) + '</p>' +
        '<p style="margin:0;font-size:13px;color:#6b7280">Most precipitation (' + periodLabel + '): <strong>' + accumDisplay + '</strong></p>' +
        (country ? '<p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af">' + escapeHtmlAttr(country) + '</p>' : '');
      window.wettestResortPopup.setLngLat(coords).setHTML(html).addTo(map);
    }

    if (typeof precLayer.onSourceReadyAsync === 'function') {
      precLayer.onSourceReadyAsync().then(runSearch).catch(function () { runSearch(); });
    } else {
      var fired = false;
      precLayer.once('sourceReady', function () {
        fired = true;
        runSearch();
      });
      setTimeout(function () {
        if (!fired) runSearch();
      }, 4000);
    }
  }

  function addSkiResortsLayer() {
    fetch(SKI_AREAS_URL)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('Ski areas fetch failed: ' + r.status)); })
      .then(function (geojson) {
        var features = (geojson.features || []).filter(function (f) {
          return f.geometry && f.geometry.type === 'Point';
        });
        var collection = {
          type: 'FeatureCollection',
          features: features.map(function (f) {
            var tier = getSizeTier(f);
            var color = getColorFor(f);
            return {
              type: 'Feature',
              geometry: f.geometry,
              properties: {
                name: getProp(f.properties, NAME_KEYS),
                country: getProp(f.properties, COUNTRY_KEYS),
                trails: getProp(f.properties, COLOR_BY_KEYS),
                tier: tier,
                color: color,
                icon: getIconId(tier, color)
              }
            };
          })
        };
        map.addSource('ski-resorts', { type: 'geojson', data: collection });
        skiResortFeatures = collection.features;

        function addResortLayerEvents(layerIds) {
          layerIds.forEach(function (layerId) {
            map.on('click', layerId, function (e) {
              var props = e.features[0].properties;
              var name = props.name != null ? String(props.name).trim() : 'Resort';
              var country = props.country != null ? String(props.country).trim() : '';
              if (country && /^united states/i.test(country)) country = 'USA';
              var trails = props.trails;
              var trailsStr = trails != null && trails !== '' && !Number.isNaN(Number(trails)) ? Number(trails).toLocaleString() + ' slopes' : '';
              var html = '<p style="margin:0 0 4px 0;font-weight:600">' + escapeHtmlAttr(name) + '</p>';
              if (trailsStr || country) html += '<p style="margin:0;font-size:13px;color:#6b7280">' + [trailsStr, country].filter(Boolean).join(' · ') + '</p>';
              popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
            });
            map.on('mouseenter', layerId, function (e) {
              map.getCanvas().style.cursor = 'pointer';
              var props = e.features[0].properties;
              var name = props.name != null ? String(props.name).trim() : 'Resort';
              hoverPopup.setLngLat(e.lngLat).setHTML('<div class="tt-name">' + escapeHtmlAttr(name) + '</div><div class="tt-hint" style="color:#7dd3fc">🖱 Click for resort details</div>').addTo(map);
            });
            map.on('mouseleave', layerId, function () {
              map.getCanvas().style.cursor = '';
              hoverPopup.remove();
            });
          });
        }

        var popup = new maptilersdk.Popup({ closeButton: true, closeOnClick: false });
        var hoverPopup = new maptilersdk.Popup({ closeButton: false, closeOnClick: false, className: 'ski-resort-hover-popup' });

        map.addLayer({
          id: 'ski-resorts-dots-medium',
          type: 'circle',
          source: 'ski-resorts',
          minzoom: 2,
          maxzoom: MEDIUM_ICON_MIN,
          filter: ['==', ['get', 'tier'], 'medium'],
          paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.65)',
            'circle-opacity': 0.85
          }
        });
        map.addLayer({
          id: 'ski-resorts-dots-small',
          type: 'circle',
          source: 'ski-resorts',
          minzoom: 2,
          maxzoom: SMALL_ICON_MIN,
          filter: ['==', ['get', 'tier'], 'small'],
          paint: {
            'circle-radius': 3.5,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.65)',
            'circle-opacity': 0.85
          }
        });
        addResortLayerEvents(['ski-resorts-dots-medium', 'ski-resorts-dots-small']);

        addResortIconImages(map).then(function () {
          map.addLayer({
            id: 'ski-resorts-icons-large',
            type: 'symbol',
            source: 'ski-resorts',
            minzoom: 2,
            filter: ['==', ['get', 'tier'], 'large'],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'bottom'
            }
          });
          map.addLayer({
            id: 'ski-resorts-icons-medium',
            type: 'symbol',
            source: 'ski-resorts',
            minzoom: MEDIUM_ICON_MIN,
            filter: ['==', ['get', 'tier'], 'medium'],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'bottom'
            }
          });
          map.addLayer({
            id: 'ski-resorts-icons-small',
            type: 'symbol',
            source: 'ski-resorts',
            minzoom: SMALL_ICON_MIN,
            filter: ['==', ['get', 'tier'], 'small'],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': 1,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'bottom'
            }
          });
          addResortLayerEvents([
            'ski-resorts-icons-large',
            'ski-resorts-icons-medium',
            'ski-resorts-icons-small'
          ]);
        }).catch(function (err) { console.warn('weather-map: resort icons load failed', err); });
      })
      .catch(function (err) { console.warn('weather-map: ski resorts load failed', err); });
  }

  map.on('mouseout', function (evt) {
    if (!evt.originalEvent.relatedTarget) {
      pointerDataDiv.innerText = '';
      pointerLngLat = null;
    }
  });

  function updatePointerValue(lngLat) {
    if (!lngLat) return;
    pointerLngLat = lngLat;
    const weatherLayer = weatherLayers[activeLayer]?.layer;
    const weatherLayerValue = weatherLayers[activeLayer]?.value;
    if (weatherLayer && activeLayer) {
      const value = weatherLayer.pickAt(lngLat.lng, lngLat.lat);
      if (!value) {
        pointerDataDiv.innerText = '';
        return;
      }
      const raw = value[weatherLayerValue];
      const formatted = formatValue(activeLayer, raw);
      pointerDataDiv.innerText = formatted ? (typeof formatted.v === 'number' ? formatted.v.toFixed(1) : formatted.v) + formatted.u : '';
    }
  }

  map.on('mousemove', function (e) {
    updatePointerValue(e.lngLat);
  });

  document.getElementById('buttons').addEventListener('click', function (event) {
    const clicked = event.target.closest('li[id]') || event.target.closest('button[id]') || event.target;
    const id = clicked.id;
    if (weatherLayers[id]) changeWeatherLayer(id);
  });

  var findWettestBtn = document.getElementById('find-wettest-resort');
  var findWettestNextBtn = document.getElementById('find-wettest-resort-next');
  if (findWettestBtn) findWettestBtn.addEventListener('click', function () { findWettestResort('last'); });
  if (findWettestNextBtn) findWettestNextBtn.addEventListener('click', function () { findWettestResort('next'); });

  function changeWeatherLayer(type) {
    if (type === activeLayer) return weatherLayers[type].layer;
    if (activeLayer && map.getLayer(activeLayer)) {
      const activeWeatherLayer = weatherLayers[activeLayer]?.layer;
      if (activeWeatherLayer) {
        currentTime = activeWeatherLayer.getAnimationTime();
        map.setLayoutProperty(activeLayer, 'visibility', 'none');
      }
    }
    activeLayer = type;
    const weatherLayer = weatherLayers[activeLayer].layer || createWeatherLayer(activeLayer);
    if (map.getLayer(activeLayer)) {
      map.setLayoutProperty(activeLayer, 'visibility', 'visible');
    } else {
      map.addLayer(weatherLayer, 'Water');
    }
    changeLayerLabel(activeLayer);
    activateButton(activeLayer);
    changeLayerAnimation(weatherLayer);
    return weatherLayer;
  }

  function activateButton(active) {
    const buttons = document.getElementsByClassName('button');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      btn.classList.toggle('active', btn.id === active);
    }
  }

  function changeLayerAnimation(weatherLayer) {
    weatherLayer.setAnimationTime(parseInt(timeSlider.value, 10) / 1000);
    if (isPlaying) {
      playAnimation(weatherLayer);
    } else {
      pauseAnimation(weatherLayer);
    }
  }

  function createWeatherLayer(type) {
    let weatherLayer = null;
    switch (type) {
      case 'precipitation':
        weatherLayer = new maptilerweather.PrecipitationLayer({ id: 'precipitation' });
        break;
      case 'pressure':
        weatherLayer = new maptilerweather.PressureLayer({ opacity: 0.8, id: 'pressure' });
        break;
      case 'radar':
        weatherLayer = new maptilerweather.RadarLayer({ opacity: 0.8, id: 'radar' });
        break;
      case 'temperature':
        weatherLayer = new maptilerweather.TemperatureLayer({
          colorramp: maptilerweather.ColorRamp.builtin.TEMPERATURE_3,
          id: 'temperature'
        });
        break;
      case 'wind':
        weatherLayer = new maptilerweather.WindLayer({ id: 'wind' });
        break;
      default:
        return null;
    }

    weatherLayer.on('tick', function () {
      refreshTime();
      updatePointerValue(pointerLngLat);
    });

    weatherLayer.on('animationTimeSet', function () {
      refreshTime();
    });

    weatherLayer.on('sourceReady', function () {
      const startDate = weatherLayer.getAnimationStartDate();
      const endDate = weatherLayer.getAnimationEndDate();
      if (timeSlider.min > 0) {
        weatherLayer.setAnimationTime(currentTime);
        changeLayerAnimation(weatherLayer);
      } else {
        const currentDate = weatherLayer.getAnimationTimeDate();
        timeSlider.min = Number(startDate);
        timeSlider.max = Number(endDate);
        timeSlider.value = Number(currentDate);
      }
    });

    weatherLayers[type].layer = weatherLayer;
    return weatherLayer;
  }

  function refreshTime() {
    const weatherLayer = weatherLayers[activeLayer]?.layer;
    if (weatherLayer) {
      const d = weatherLayer.getAnimationTimeDate();
      timeTextDiv.innerText = d.toString();
      timeSlider.value = Number(d);
    }
  }

  function changeLayerLabel(type) {
    if (variableNameDiv) variableNameDiv.innerText = type;
  }

  function initWeatherMap(type) {
    return changeWeatherLayer(type);
  }
})();

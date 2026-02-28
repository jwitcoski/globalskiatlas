/**
 * MapTiler Weather layers for Leaflet.
 * Uses the Weather API catalog (https://api.maptiler.com/weather/latest.json) to add
 * switchable raster overlay layers (Temperature, Pressure, Precipitation, Wind, Radar)
 * with optional time (keyframe) control. Compatible with the existing Leaflet map.
 * @see https://docs.maptiler.com/sdk-js/examples/weather-layer-switcher/
 * @see https://docs.maptiler.com/cloud/api/weather/
 */

const WEATHER_CATALOG_URL = 'https://api.maptiler.com/weather/latest.json';
const TILES_BASE = 'https://api.maptiler.com/tiles';

// Color ramps: [dataValue, [r, g, b, a]] – decoded tile values are mapped to these colors
const COLOR_RAMPS = {
  temperature: [[-40, [33, 78, 168, 220]], [-20, [66, 146, 198, 220]], [0, [255, 255, 255, 200]], [15, [254, 224, 144, 220]], [25, [253, 141, 60, 220]], [40, [215, 48, 39, 220]]],
  pressure: [[900, [30, 58, 115, 220]], [960, [69, 117, 180, 220]], [1010, [255, 255, 191, 200]], [1040, [252, 141, 89, 220]], [1080, [215, 25, 28, 220]]],
  precipitation: [[0, [255, 255, 255, 0]], [0.1, [158, 202, 225, 180]], [2, [107, 174, 214, 220]], [10, [33, 113, 181, 220]], [25, [8, 48, 107, 230]], [50, [8, 24, 58, 240]]],
  wind: [[0, [255, 255, 255, 0]], [2, [209, 229, 240, 150]], [10, [146, 197, 222, 200]], [25, [67, 147, 195, 230]], [50, [33, 102, 172, 240]], [75, [5, 48, 97, 250]]],
  radar: [[-20, [255, 255, 255, 0]], [0, [0, 255, 0, 120]], [20, [0, 255, 255, 180]], [40, [0, 0, 255, 220]], [60, [255, 0, 255, 230]], [80, [255, 0, 0, 240]]]
};

function lerpStops(stops, value) {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i][0] && value <= stops[i + 1][0]) {
      const t = (value - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      const a = stops[i][1], b = stops[i + 1][1];
      return [Math.round(a[0] + t * (b[0] - a[0])), Math.round(a[1] + t * (b[1] - a[1])), Math.round(a[2] + t * (b[2] - a[2])), Math.round(a[3] + t * (b[3] - a[3]))];
    }
  }
  return stops[0][1];
}

function decodePixel(data, i, decoding) {
  const ch = (decoding.channels || 'R').toUpperCase();
  const min = decoding.min != null ? decoding.min : 0;
  const max = decoding.max != null ? decoding.max : 255;
  const scale = (v) => min + (v / 255) * (max - min);
  if (ch === 'RG' || ch === 'GR') {
    const r = scale(data[i]);
    const g = scale(data[i + 1]);
    return Math.sqrt(r * r + g * g);
  }
  if (ch === 'G') return scale(data[i + 1]);
  if (ch === 'B') return scale(data[i + 2]);
  return scale(data[i]);
}

function drawDecodedTile(inImg, outCanvas, decoding, colorRamp) {
  const w = inImg.width;
  const h = inImg.height;
  outCanvas.width = w;
  outCanvas.height = h;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(inImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < data.length; i += 4) {
    const value = decodePixel(data, i, decoding);
    const color = lerpStops(colorRamp, value);
    out.data[i] = color[0];
    out.data[i + 1] = color[1];
    out.data[i + 2] = color[2];
    out.data[i + 3] = color[3];
  }
  ctx.putImageData(out, 0, 0);
}

const DecodedWeatherLayer = L.GridLayer.extend({
  options: { tileSize: 512, minZoom: 0, maxNativeZoom: 3, maxZoom: 18, opacity: 0.7 },
  initialize(tilesetId, apiKey, decoding, variableName, options = {}) {
    L.GridLayer.prototype.initialize.call(this, options);
    this._tilesetId = tilesetId;
    this._apiKey = apiKey;
    this._decoding = decoding || { channels: 'R', min: 0, max: 255 };
    this._variableName = variableName || '';
    this._colorRamp = (variableName || '').toLowerCase().includes('temp') ? COLOR_RAMPS.temperature
      : (variableName || '').toLowerCase().includes('pressure') ? COLOR_RAMPS.pressure
      : (variableName || '').toLowerCase().includes('precip') ? COLOR_RAMPS.precipitation
      : (variableName || '').toLowerCase().includes('wind') ? COLOR_RAMPS.wind
      : (variableName || '').toLowerCase().includes('radar') ? COLOR_RAMPS.radar
      : COLOR_RAMPS.temperature;
    this._canvas = document.createElement('canvas');
  },
  createTile(coords) {
    const img = document.createElement('img');
    const url = `${TILES_BASE}/${this._tilesetId}/${coords.z}/${coords.x}/${coords.y}.png?key=${encodeURIComponent(this._apiKey)}`;
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.crossOrigin = '';
        img2.onload = () => {
          try {
            drawDecodedTile(img2, this._canvas, this._decoding, this._colorRamp);
            img.src = this._canvas.toDataURL('image/png');
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        };
        img2.onerror = () => URL.revokeObjectURL(blobUrl);
        img2.src = blobUrl;
      })
      .catch(() => {});
    return img;
  }
});

/**
 * Fetch the weather catalog from MapTiler.
 * @param {string} apiKey - MapTiler API key
 * @returns {Promise<{ variables: Array }>}
 */
export async function fetchWeatherCatalog(apiKey) {
  const url = `${WEATHER_CATALOG_URL}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather catalog failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Build tile URL for a keyframe (tileset id). Catalog uses zoom 0–3 and 512px tiles.
 * @param {string} tilesetId - Keyframe id from catalog
 * @param {string} apiKey
 * @returns {string} - Template URL for L.tileLayer
 */
export function getWeatherTileUrl(tilesetId, apiKey) {
  return `${TILES_BASE}/${tilesetId}/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey)}`;
}

/**
 * Create a Leaflet grid layer that fetches weather tiles, decodes them with the catalog's
 * decoding (channels, min, max), applies a color ramp, and displays the result.
 */
export function createWeatherTileLayer(tilesetId, apiKey, decoding, variableName, options = {}) {
  return new DecodedWeatherLayer(tilesetId, apiKey, decoding, variableName, options);
}

/**
 * Normalize catalog variables into a simple list with name, variableId, decoding, keyframes.
 */
export function getWeatherVariables(catalog) {
  if (!catalog || !Array.isArray(catalog.variables)) return [];
  return catalog.variables.map((v) => {
    const meta = (v.metadata && v.metadata.weather_variable) || {};
    const keyframes = Array.isArray(v.keyframes) ? v.keyframes : [];
    const decoding = meta.decoding || { channels: 'R', min: 0, max: 255 };
    return {
      name: meta.name || 'Unknown',
      variableId: meta.variable_id || meta.name || '',
      unit: meta.unit || '',
      decoding: { channels: decoding.channels || 'R', min: decoding.min, max: decoding.max },
      keyframes: keyframes.map((k) => ({ id: k.id, timestamp: k.timestamp || '' }))
    };
  });
}

/**
 * Create the weather overlay layer group and optional UI.
 * @param {L.Map} map - Leaflet map instance
 * @param {string} apiKey - MapTiler API key
 * @param {object} [options]
 * @param {string} [options.containerId] - ID of the DOM element for the layer switcher UI; if omitted, no UI is created
 * @param {number} [options.defaultOpacity=0.7]
 * @returns {Promise<{ catalog: object, variables: Array, layerGroup: L.LayerGroup, setVariable: (index: number), setKeyframeIndex: (index: number), setOpacity: (n: number) }>}
 */
export async function initMaptilerWeatherLayers(map, apiKey, options = {}) {
  const catalog = await fetchWeatherCatalog(apiKey);
  const variables = getWeatherVariables(catalog);
  const layerGroup = L.layerGroup();
  const defaultOpacity = options.defaultOpacity != null ? options.defaultOpacity : 0.7;

  let currentVariableIndex = -1;
  let currentKeyframeIndex = 0;
  let currentTileLayer = null;

  function showVariableKeyframe(varIndex, keyframeIndex) {
    if (currentTileLayer) {
      layerGroup.removeLayer(currentTileLayer);
      currentTileLayer = null;
    }
    const v = variables[varIndex];
    if (!v || !v.keyframes.length) return;
    const kfIndex = Math.max(0, Math.min(keyframeIndex, v.keyframes.length - 1));
    const kf = v.keyframes[kfIndex];
    currentVariableIndex = varIndex;
    currentKeyframeIndex = kfIndex;
    currentTileLayer = createWeatherTileLayer(kf.id, apiKey, v.decoding, v.name, { opacity: defaultOpacity });
    layerGroup.addLayer(currentTileLayer);
  }

  function setOpacity(value) {
    const opacity = Math.max(0, Math.min(1, value));
    if (currentTileLayer) currentTileLayer.setOpacity(opacity);
  }

  const api = {
    catalog,
    variables,
    layerGroup,
    setVariable(varIndex) {
      const v = variables[varIndex];
      showVariableKeyframe(varIndex, v && v.keyframes.length ? currentKeyframeIndex : 0);
    },
    setKeyframeIndex(index) {
      if (currentVariableIndex >= 0) showVariableKeyframe(currentVariableIndex, index);
    },
    setOpacity,
    showVariableKeyframe,
    getCurrentVariableIndex: () => currentVariableIndex,
    getCurrentKeyframeIndex: () => currentKeyframeIndex
  };

  // Build UI if container provided
  const containerId = options.containerId;
  const container = containerId ? document.getElementById(containerId) : null;
  if (container && variables.length > 0) {
    container.innerHTML = '';
    container.classList.add('maptiler-weather-switcher');

    const row = document.createElement('div');
    row.className = 'weather-row';
    const label = document.createElement('label');
    label.textContent = 'Weather overlay: ';
    label.setAttribute('for', 'weather-variable-select');
    const select = document.createElement('select');
    select.id = 'weather-variable-select';
    select.innerHTML = '<option value="">Off</option>' +
      variables.map((v, i) => `<option value="${i}">${v.name}${v.unit ? ` (${v.unit})` : ''}</option>`).join('');
    row.appendChild(label);
    row.appendChild(select);
    container.appendChild(row);

    const timeRow = document.createElement('div');
    timeRow.className = 'weather-time-row';
    const timeLabel = document.createElement('label');
    timeLabel.textContent = 'Time: ';
    const timeInput = document.createElement('input');
    timeInput.type = 'range';
    timeInput.min = 0;
    timeInput.max = 99;
    timeInput.value = 0;
    const timeValue = document.createElement('span');
    timeValue.className = 'weather-time-value';
    timeRow.appendChild(timeLabel);
    timeRow.appendChild(timeInput);
    timeRow.appendChild(timeValue);
    container.appendChild(timeRow);

    const opacityRow = document.createElement('div');
    opacityRow.className = 'weather-opacity-row';
    const opacityLabel = document.createElement('label');
    opacityLabel.textContent = 'Opacity: ';
    const opacityInput = document.createElement('input');
    opacityInput.type = 'range';
    opacityInput.min = 0;
    opacityInput.max = 100;
    opacityInput.value = Math.round(defaultOpacity * 100);
    opacityRow.appendChild(opacityLabel);
    opacityRow.appendChild(opacityInput);
    container.appendChild(opacityRow);

    function updateTimeLabel() {
      const v = variables[currentVariableIndex];
      if (v && v.keyframes[currentKeyframeIndex]) {
        const ts = v.keyframes[currentKeyframeIndex].timestamp;
        timeValue.textContent = ts ? new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
      } else {
        timeValue.textContent = '';
      }
    }

    select.addEventListener('change', () => {
      const val = select.value;
      if (val === '') {
        if (map.hasLayer(layerGroup)) map.removeLayer(layerGroup);
        showVariableKeyframe(-1, 0);
        timeRow.style.display = 'none';
        opacityRow.style.display = 'none';
        return;
      }
      const idx = parseInt(val, 10);
      const v = variables[idx];
      if (!v) return;
      if (!map.hasLayer(layerGroup)) map.addLayer(layerGroup);
      timeInput.max = Math.max(0, v.keyframes.length - 1);
      timeInput.value = 0;
      timeRow.style.display = 'flex';
      opacityRow.style.display = 'flex';
      api.setVariable(idx);
      updateTimeLabel();
    });

    timeInput.addEventListener('input', () => {
      const idx = parseInt(select.value, 10);
      if (Number.isNaN(idx)) return;
      const kfIndex = parseInt(timeInput.value, 10);
      api.setKeyframeIndex(kfIndex);
      updateTimeLabel();
    });

    opacityInput.addEventListener('input', () => {
      api.setOpacity(parseInt(opacityInput.value, 10) / 100);
    });

    timeRow.style.display = 'none';
    opacityRow.style.display = 'none';
  }

  return api;
}

export default {
  fetchWeatherCatalog,
  getWeatherTileUrl,
  createWeatherTileLayer,
  getWeatherVariables,
  initMaptilerWeatherLayers
};

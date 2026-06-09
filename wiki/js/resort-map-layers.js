/**
 * Resort map tooltips + legend after PMTiles layers are on the map.
 * Call window.enhanceResortMap({ title, lat, lon, pageId, skiNorthAngle }) after initResortMap().
 */
import { SKI_PMTILES_LAYERS } from './resort-map-init.js';

const NAME_KEYS = ['name', 'resort_name', 'title', 'area_name', 'Name'];
const PISTE_DIFFICULTY_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];

function getProp(obj, keyList) {
  if (!obj) return undefined;
  for (const k of keyList) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function getPisteDifficulty(props) {
  let v = getProp(props, PISTE_DIFFICULTY_KEYS);
  if (v == null && props && typeof props.other_tags === 'string') {
    const m = props.other_tags.match(/"piste:difficulty"=>"([^"]+)"/);
    if (m) v = m[1];
  }
  return v != null ? String(v).toLowerCase().trim() : '';
}

function enhanceResortMap(params) {
  const { title, lat, lon, skiNorthAngle } = params || {};
  const map = window.RESORT_MAP_INSTANCE;
  if (!map || lat == null || lon == null) return;

  const bearing = (skiNorthAngle != null && !Number.isNaN(Number(skiNorthAngle)))
    ? -Number(skiNorthAngle)
    : 0;

  map.flyTo({
    center: [Number(lon), Number(lat)],
    zoom: Math.max(map.getZoom(), 14),
    bearing,
    duration: 900
  });

  let tooltipEl = document.getElementById('resort-map-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'resort-map-tooltip';
    tooltipEl.className = 'resort-map-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function setTooltip(html) {
    tooltipEl.innerHTML = html;
    tooltipEl.style.display = 'block';
  }
  function moveTooltip(x, y) {
    const rect = map.getCanvas().getBoundingClientRect();
    tooltipEl.style.left = (rect.left + x + 12) + 'px';
    tooltipEl.style.top = (rect.top + y + 12) + 'px';
  }
  function hideTooltip() {
    tooltipEl.style.display = 'none';
  }

  map.on('mouseenter', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.lifts, (e) => {
    const p = e.features[0]?.properties || {};
    const name = getProp(p, NAME_KEYS) || p.name || 'Lift';
    setTooltip('<strong>' + String(name) + '</strong>');
    moveTooltip(e.point.x, e.point.y);
  });
  map.on('mouseleave', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = ''; hideTooltip(); });

  map.on('mouseenter', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.pistes, (e) => {
    const p = e.features[0]?.properties || {};
    const name = getProp(p, NAME_KEYS) || p.name || 'Trail';
    const diff = getPisteDifficulty(p);
    setTooltip('<strong>' + String(name) + '</strong>' + (diff ? '<br/><span style="color:#94a3b8">' + diff + '</span>' : ''));
    moveTooltip(e.point.x, e.point.y);
  });
  map.on('mouseleave', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = ''; hideTooltip(); });

  const legendEl = document.getElementById('resort-map-legend');
  if (legendEl) {
    legendEl.style.display = 'block';
    legendEl.innerHTML =
      '<h3>Map Key</h3>' +
      '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--easy"></span> Easy</div>' +
      '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--intermediate"></span> Intermediate</div>' +
      '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--advanced"></span> Advanced</div>' +
      '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--expert"></span> Expert</div>' +
      '<div class="resort-legend-row resort-legend-row-lift"><span class="resort-legend-swatch resort-legend-swatch--lift"></span> Lift</div>' +
      (title ? '<p style="margin:8px 0 0;font-size:12px;color:#64748b">' + String(title) + '</p>' : '');
  }
}

window.enhanceResortMap = enhanceResortMap;

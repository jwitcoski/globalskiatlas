/**
 * Resort 2D map: clay-matching trail colors, hover, tap details, and highlight.
 * Call window.enhanceResortMap({ title, lat, lon, pageId, skiNorthAngle }) after initResortMap().
 */
import { SKI_PMTILES_LAYERS } from './resort-map-init.js';
import { pisteLineColorExpression } from '../../scripts/map-colors.js';
import { buildEntityMetadata } from '../../scripts/clay/entity-metadata.js';
import { createClayEntityPanel } from '../../scripts/clay/entity-panel.js';
import { createClayEntityTooltip } from '../../scripts/clay/entity-tooltip.js';
import { buildViewportStatsIndex } from '../../scripts/ski-feature-stats.js';
import {
  getClayTrailScheme,
  loadClayTrailScheme,
  setClayTrailScheme,
} from '../../scripts/clay/trails.js';

const HIGHLIGHT_SOURCE = 'wiki-ski-highlight';
const HIGHLIGHT_LAYER = 'wiki-ski-highlight-line';

function applyPisteColors(map, scheme) {
  if (!map?.getLayer?.(SKI_PMTILES_LAYERS.pistes)) return;
  try {
    map.setPaintProperty(SKI_PMTILES_LAYERS.pistes, 'line-color', pisteLineColorExpression(scheme));
    map.setPaintProperty(SKI_PMTILES_LAYERS.pistes, 'line-width', [
      'interpolate', ['linear'], ['zoom'],
      11, 2.5,
      14, 4,
      16, 6,
    ]);
  } catch (err) {
    console.warn('[resort-map] piste colors', err);
  }
}

function ensureHighlightLayer(map) {
  if (map.getSource(HIGHLIGHT_SOURCE)) return;
  map.addSource(HIGHLIGHT_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: HIGHLIGHT_LAYER,
    type: 'line',
    source: HIGHLIGHT_SOURCE,
    paint: {
      'line-color': '#ffffff',
      'line-width': 8,
      'line-opacity': 0.9,
      'line-blur': 0.4,
    },
  });
}

function setHighlight(map, feature) {
  const source = map.getSource(HIGHLIGHT_SOURCE);
  if (!source) return;
  source.setData({
    type: 'FeatureCollection',
    features: feature ? [{ type: 'Feature', geometry: feature.geometry, properties: feature.properties || {} }] : [],
  });
}

function featureEntity(kind, feature) {
  return buildEntityMetadata(kind === 'lift' ? 'lift' : 'piste', feature);
}

function syncSchemeButtons(scheme) {
  for (const button of document.querySelectorAll('[data-clay-trail-scheme]')) {
    button.setAttribute('aria-pressed', button.dataset.clayTrailScheme === scheme ? 'true' : 'false');
  }
}

function legendHtml(title, scheme) {
  const midLabel = scheme === 'american' ? 'Intermediate' : 'Intermediate / red';
  const midClass = scheme === 'american' ? 'resort-legend-line--intermediate' : 'resort-legend-line--european-mid';
  return (
    '<h3>Map Key</h3>' +
    '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--easy"></span> Easy</div>' +
    `<div class="resort-legend-row"><span class="resort-legend-line ${midClass}"></span> ${midLabel}</div>` +
    '<div class="resort-legend-row"><span class="resort-legend-line resort-legend-line--advanced"></span> Advanced</div>' +
    '<div class="resort-legend-row resort-legend-row-lift"><span class="resort-legend-swatch resort-legend-swatch--lift"></span> Lift</div>' +
    (title ? `<p class="resort-legend-title">${String(title)}</p>` : '')
  );
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
    duration: 900,
  });

  const wrap = document.querySelector('.resort-map-gl-wrap');
  const scheme = loadClayTrailScheme();
  applyPisteColors(map, scheme);
  syncSchemeButtons(scheme);

  const legendEl = document.getElementById('resort-map-legend');
  if (legendEl) {
    legendEl.style.display = 'block';
    legendEl.innerHTML = legendHtml(title, scheme);
  }

  if (map._gsaWikiInteractive) return;
  map._gsaWikiInteractive = true;

  const tooltipHost = wrap || document.getElementById('resort-map-aside') || document.body;
  tooltipHost.querySelectorAll('.clay-entity-panel, .clay-entity-tooltip').forEach((el) => el.remove());
  const entityPanel = createClayEntityPanel(tooltipHost);
  const entityTooltip = createClayEntityTooltip(tooltipHost);

  const onMapReady = () => {
    ensureHighlightLayer(map);
    applyPisteColors(map, getClayTrailScheme());
  };
  if (map.isStyleLoaded()) onMapReady();
  else map.once('load', onMapReady);
  map.on('styledata', () => {
    if (!map.getSource(HIGHLIGHT_SOURCE)) ensureHighlightLayer(map);
    applyPisteColors(map, getClayTrailScheme());
  });

  const hitLayers = () => [SKI_PMTILES_LAYERS.pistes, SKI_PMTILES_LAYERS.lifts].filter((id) => map.getLayer(id));

  function hitAtPoint(point) {
    const layers = hitLayers();
    if (!layers.length) return null;
    const features = map.queryRenderedFeatures(point, { layers });
    if (!features.length) return null;
    const feature = features[0];
    const kind = feature.layer?.id === SKI_PMTILES_LAYERS.lifts ? 'lift' : 'piste';
    return { feature, kind };
  }

  function clientFromEvent(event) {
    const rect = map.getCanvas().getBoundingClientRect();
    const x = event.originalEvent?.clientX ?? (rect.left + (event.point?.x || 0));
    const y = event.originalEvent?.clientY ?? (rect.top + (event.point?.y || 0));
    return { x, y };
  }

  function showHover(kind, event, feature) {
    const entity = featureEntity(kind, feature);
    map.getCanvas().style.cursor = 'pointer';
    setHighlight(map, feature);
    const { x, y } = clientFromEvent(event);
    entityTooltip.show(entity, x, y);
  }

  function hideHover() {
    map.getCanvas().style.cursor = '';
    entityTooltip.hide();
    if (!map._gsaSelectedFeature) setHighlight(map, null);
    else setHighlight(map, map._gsaSelectedFeature);
  }

  function selectFeature(kind, feature) {
    map._gsaSelectedFeature = feature;
    setHighlight(map, feature);
    entityPanel.show(featureEntity(kind, feature), buildViewportStatsIndex(map));
    entityTooltip.hide();
  }

  map.on('mousemove', (event) => {
    const hit = hitAtPoint(event.point);
    if (!hit) {
      hideHover();
      return;
    }
    showHover(hit.kind, event, hit.feature);
  });
  map.on('mouseleave', hideHover);
  map.on('click', (event) => {
    const hit = hitAtPoint(event.point);
    if (!hit) {
      map._gsaSelectedFeature = null;
      setHighlight(map, null);
      entityPanel.hide();
      return;
    }
    selectFeature(hit.kind, hit.feature);
  });

  entityPanel.element?.addEventListener('click', (event) => {
    if (event.target.closest('[data-clay-entity-close]')) {
      map._gsaSelectedFeature = null;
      setHighlight(map, null);
    }
  });

  function applyScheme(schemeName) {
    const next = setClayTrailScheme(schemeName);
    syncSchemeButtons(next);
    applyPisteColors(map, next);
    if (legendEl) legendEl.innerHTML = legendHtml(title, next);
    document.dispatchEvent(new CustomEvent('gsa-trail-scheme-change', { detail: { scheme: next } }));
  }

  for (const button of document.querySelectorAll('#resort-map-aside [data-clay-trail-scheme]')) {
    if (button._gsaSchemeBound) continue;
    button._gsaSchemeBound = true;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      applyScheme(button.dataset.clayTrailScheme);
    });
  }

  document.addEventListener('gsa-trail-scheme-change', (event) => {
    const next = event.detail?.scheme;
    if (!next) return;
    syncSchemeButtons(next);
    applyPisteColors(map, next);
    if (legendEl) legendEl.innerHTML = legendHtml(title, next);
  });
}

window.enhanceResortMap = enhanceResortMap;

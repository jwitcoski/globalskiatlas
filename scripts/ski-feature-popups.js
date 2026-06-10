/**
 * Hover tooltips and click popups for ski trails and lifts with comparative stats.
 */
import { SKI_PMTILES_LAYERS } from './pmtiles-core.js?v=12';
import {
  aerialwayLabel,
  analyzeFeature,
  diffLabel,
  DIFF_COLORS,
  formatLength,
  formatWidthM,
  getFromOtherTags
} from './ski-feature-utils.js';
import {
  buildViewportStatsIndex,
  compareLift,
  comparePiste,
  ensureSkiFeatureStatsIndex,
  getSkiFeatureStatsIndex,
  isGlobalStatsReady,
  isSkiFeatureStatsLoading
} from './ski-feature-stats.js?v=2';
import { buildComparisonCharts } from './ski-feature-charts.js?v=1';

function difficultyBadgeHtml(diff, escapeHtml) {
  const color = DIFF_COLORS[diff] || '#64748b';
  const label = diffLabel(diff);
  return `<span class="tt-diff" style="background:${color}"></span>${escapeHtml(label)}`;
}

function pickResortIndex(globalIndex, viewportIndex) {
  if (globalIndex && isGlobalStatsReady(globalIndex)) return globalIndex;
  return viewportIndex || globalIndex;
}

function buildComparisonFacts(meta, globalIndex, viewportIndex, escapeHtml) {
  if (meta.lengthKm <= 0) return '';
  const isLift = meta.kind === 'lift';
  const globalReady = isGlobalStatsReady(globalIndex);
  const resortIndex = pickResortIndex(globalIndex, viewportIndex);
  if (!globalReady && !resortIndex) return '';

  const globalCmp = globalReady
    ? (isLift ? compareLift(meta.lengthKm, meta, globalIndex) : comparePiste(meta.lengthKm, meta, globalIndex))
    : null;
  const resortCmpSource = resortIndex
    ? (isLift ? compareLift(meta.lengthKm, meta, resortIndex) : comparePiste(meta.lengthKm, meta, resortIndex))
    : null;

  const parts = [];
  if (globalCmp?.global) parts.push(`Longer than ${globalCmp.global.percentile}% worldwide`);
  if (!isLift && globalCmp?.diff && meta.difficulty) {
    parts.push(`${globalCmp.diff.percentile}th percentile ${diffLabel(meta.difficulty)}`);
  }
  if (isLift && globalCmp?.type && meta.aerialway) {
    parts.push(`${globalCmp.type.percentile}th percentile ${aerialwayLabel(meta.aerialway)}`);
  }
  const resortCmp = globalCmp?.resort || resortCmpSource?.resort;
  if (resortCmp && meta.resort) {
    parts.push(resortCmp.rank === 1 ? 'Longest at resort' : `#${resortCmp.rank} of ${resortCmp.total} at resort`);
  }
  if (parts.length) return `<div class="sf-fact">${escapeHtml(parts.join(' · '))}</div>`;
  if (isSkiFeatureStatsLoading()) {
    return `<div class="sf-fact sf-loading">Worldwide rankings loading…</div>`;
  }
  return '';
}

function buildComparisonPanel(meta, globalIndex, viewportIndex, escapeHtml) {
  const charts = buildComparisonCharts(meta, globalIndex, viewportIndex);
  if (charts.html) {
    const cap = charts.caption
      ? `<div class="sf-chart-caption">${escapeHtml(charts.caption)}</div>`
      : '';
    return `<div class="sf-popup-charts">${charts.html}${cap}</div>`;
  }
  const facts = buildComparisonFacts(meta, globalIndex, viewportIndex, escapeHtml);
  return facts ? `<div class="sf-popup-facts">${facts}</div>` : '';
}

function buildMetaRows(meta, escapeHtml) {
  const rows = [];
  const len = formatLength(meta.lengthKm);
  if (len) rows.push(['Length', len]);
  const w = formatWidthM(meta.widthM);
  if (w) {
    rows.push(['Width', meta.widthFromPolygon ? `${w} (est. from shape)` : w]);
  }
  if (meta.resort) rows.push(['Resort', meta.resort]);
  if (meta.country) rows.push(['Country', meta.country]);
  if (meta.pisteType && meta.pisteType !== 'downhill') rows.push(['Type', meta.pisteType.replace(/_/g, ' ')]);
  if (meta.lit === true) rows.push(['Lighting', 'Night skiing']);
  if (meta.gladed === true) rows.push(['Terrain', 'Gladed']);
  if (meta.groomed) rows.push(['Grooming', meta.groomed.replace(/_/g, ' ')]);
  const oneway = getFromOtherTags(meta.props, 'oneway');
  if (oneway === 'yes') rows.push(['Direction', 'One-way downhill']);

  return rows.map(([k, v]) =>
    `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`
  ).join('');
}

function buildFooter(meta, globalIndex, viewportIndex) {
  const isLift = meta.kind === 'lift';
  const globalCount = isLift
    ? (globalIndex?.lifts?.all?.count ?? 0)
    : (globalIndex?.pistes?.all?.count ?? 0);
  const viewportCount = isLift
    ? (viewportIndex?.lifts?.all?.count ?? 0)
    : (viewportIndex?.pistes?.all?.count ?? 0);
  const noun = isLift ? 'lifts' : 'trails';

  if (globalCount > 0) {
    return `Compared against ${globalCount.toLocaleString()} ${noun} worldwide`;
  }
  if (viewportCount > 0) {
    return `Resort stats from ${viewportCount.toLocaleString()} ${noun} on map · worldwide stats loading…`;
  }
  if (isSkiFeatureStatsLoading()) {
    return 'Loading worldwide comparison stats…';
  }
  return 'Zoom in closer for resort-level comparisons';
}

function buildHoverHtml(meta, globalIndex, viewportIndex, escapeHtml) {
  const title = meta.name || (meta.kind === 'lift' ? aerialwayLabel(meta.aerialway) : 'Unnamed trail');
  const subtitle = meta.kind === 'lift'
    ? aerialwayLabel(meta.aerialway)
    : difficultyBadgeHtml(meta.difficulty, escapeHtml);

  let html = `<div class="tt-name">${escapeHtml(title)}</div>`;
  if (subtitle) html += `<div class="tt-hint">${subtitle}</div>`;

  const len = formatLength(meta.lengthKm);
  if (len) html += `<div class="tt-hint">${escapeHtml(len)}</div>`;

  const w = formatWidthM(meta.widthM);
  if (w) html += `<div class="tt-hint">${escapeHtml(w)} wide</div>`;

  const facts = buildComparisonFacts(meta, globalIndex, viewportIndex, escapeHtml);
  if (facts) {
    html += facts.replace(/class="sf-fact/g, 'class="tt-hint sf-fact');
  }

  html += `<div class="tt-hint sf-click-hint">Click for details</div>`;
  return html;
}

function buildPopupHtml(meta, globalIndex, viewportIndex, escapeHtml) {
  const title = meta.name || (meta.kind === 'lift' ? aerialwayLabel(meta.aerialway) : 'Unnamed trail');
  const badge = meta.kind === 'lift'
    ? `<span class="sf-badge sf-badge-lift">${escapeHtml(aerialwayLabel(meta.aerialway))}</span>`
    : difficultyBadgeHtml(meta.difficulty, escapeHtml);

  const rows = buildMetaRows(meta, escapeHtml);
  const comparison = buildComparisonPanel(meta, globalIndex, viewportIndex, escapeHtml);
  const foot = buildFooter(meta, globalIndex, viewportIndex);

  return (
    `<div class="sf-popup">` +
    `<div class="sf-popup-title">${escapeHtml(title)}</div>` +
    (badge ? `<div class="sf-popup-badge">${badge}</div>` : '') +
    comparison +
    (rows ? `<table class="sf-popup-table">${rows}</table>` : '') +
    `<div class="sf-popup-foot">${foot}</div>` +
    `</div>`
  );
}

/** Try to enrich trail width from resort-detail OSM polygons at click point. */
function enrichWidthFromOsmPolygons(map, meta, point) {
  if (meta.kind !== 'piste' || meta.widthM != null) return meta;
  if (!map.getLayer(SKI_PMTILES_LAYERS.resortOsmFill)) return meta;

  let feats = [];
  try {
    feats = map.queryRenderedFeatures(point, { layers: [SKI_PMTILES_LAYERS.resortOsmFill] });
  } catch (_) { /* layer not ready */ }

  for (const f of feats) {
    const p = f.properties || {};
    const hasPiste = getFromOtherTags(p, 'piste:type') || p['piste:type'] || p.piste_type;
    if (!hasPiste) continue;
    const tagW = parseFloat(String(getFromOtherTags(p, 'piste:width') || p['piste:width'] || '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(tagW) && tagW > 0) {
      return { ...meta, widthM: tagW, widthFromPolygon: false };
    }
    const est = analyzeFeature('piste', f).widthM;
    if (est) return { ...meta, widthM: est, widthFromPolygon: true };
  }
  return meta;
}

/**
 * @param {maptilersdk.Map} map
 * @param {{ escapeHtml: (s: string) => string, tipEl?: HTMLElement, popup?: maptilersdk.Popup }} options
 */
export function initSkiFeaturePopups(map, options = {}) {
  const escapeHtml = options.escapeHtml || ((s) => String(s));
  const tipEl = options.tipEl || document.getElementById('vt-tooltip');
  const popup = options.popup || new maptilersdk.Popup({
    maxWidth: '340px',
    closeButton: true,
    className: 'ski-feature-popup'
  });

  let lastPopupMeta = null;
  let lastPopupLngLat = null;

  function refreshOpenPopup() {
    if (!lastPopupMeta || !lastPopupLngLat || !popup.isOpen()) return;
    const globalIndex = getSkiFeatureStatsIndex();
    const viewportIndex = buildViewportStatsIndex(map);
    popup
      .setLngLat(lastPopupLngLat)
      .setHTML(buildPopupHtml(lastPopupMeta, globalIndex, viewportIndex, escapeHtml));
  }

  ensureSkiFeatureStatsIndex(() => refreshOpenPopup());

  function showTip(point, html) {
    if (!tipEl) return;
    tipEl.innerHTML = html;
    tipEl.style.display = 'block';
    tipEl.style.maxWidth = '280px';
    tipEl.style.whiteSpace = 'normal';
    tipEl.style.left = (point.x + 14) + 'px';
    tipEl.style.top = (point.y - 10) + 'px';
  }

  function hideTip() {
    if (!tipEl) return;
    tipEl.style.display = 'none';
  }

  function handleHover(kind, e) {
    if (!e.features?.length) return;
    const feature = e.features[0];
    let meta = analyzeFeature(kind, feature);
    meta = enrichWidthFromOsmPolygons(map, meta, e.point);
    const globalIndex = getSkiFeatureStatsIndex();
    const viewportIndex = buildViewportStatsIndex(map);
    showTip(e.point, buildHoverHtml(meta, globalIndex, viewportIndex, escapeHtml));
  }

  function handleClick(kind, e) {
    if (!e.features?.length) return;
    const feature = e.features[0];
    let meta = analyzeFeature(kind, feature);
    meta = enrichWidthFromOsmPolygons(map, meta, e.point);
    const globalIndex = getSkiFeatureStatsIndex();
    const viewportIndex = buildViewportStatsIndex(map);
    lastPopupMeta = meta;
    lastPopupLngLat = e.lngLat;
    popup
      .setLngLat(e.lngLat)
      .setHTML(buildPopupHtml(meta, globalIndex, viewportIndex, escapeHtml))
      .addTo(map);
    hideTip();
  }

  map.on('mouseenter', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.lifts, (e) => handleHover('lift', e));
  map.on('mouseleave', SKI_PMTILES_LAYERS.lifts, () => { map.getCanvas().style.cursor = ''; hideTip(); });
  map.on('click', SKI_PMTILES_LAYERS.lifts, (e) => {
    e.preventDefault();
    handleClick('lift', e);
  });

  map.on('mouseenter', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mousemove', SKI_PMTILES_LAYERS.pistes, (e) => handleHover('piste', e));
  map.on('mouseleave', SKI_PMTILES_LAYERS.pistes, () => { map.getCanvas().style.cursor = ''; hideTip(); });
  map.on('click', SKI_PMTILES_LAYERS.pistes, (e) => {
    e.preventDefault();
    handleClick('piste', e);
  });

  popup.on('close', () => {
    lastPopupMeta = null;
    lastPopupLngLat = null;
  });

  return { popup, ensureSkiFeatureStatsIndex };
}

/**
 * Inline SVG length comparison charts for trail/lift popups (no D3).
 */
import { aerialwayLabel, diffLabel } from './ski-feature-utils.js';
import { buildScopeToggleHtml } from './ski-resort-charts.js?v=3';
import { isGlobalStatsReady } from './ski-feature-stats.js?v=4';

const TEAL = '#0d9488';
const GREY = '#94a3b8';
const AVG_LINE = '#64748b';
const ZONE_COLORS = ['#eef6fb', '#dceef8', '#c4e4f4', '#a8d8ef'];

function fmtLen(km) {
  if (!km || km <= 0) return '0';
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

function jitterY(i, h, pad) {
  const t = ((i * 9301 + 49297) % 233280) / 233280;
  return pad + t * (h - pad * 2);
}

function stableJitterY(km, cat, i, h, pad) {
  const seed = ((i * 7919) + (km * 10000 | 0) + (cat?.length || 0) * 131) % 9973;
  const t = seed / 9973;
  return pad + t * (h - pad * 2);
}

const TRAIL_SHAPE = {
  easy: 'circle', novice: 'circle', beginner: 'circle',
  intermediate: 'square', medium: 'square',
  advanced: 'triangle', hard: 'triangle',
  expert: 'diamond', extreme: 'diamond',
  freeride: 'cross'
};

const LIFT_SHAPE = {
  gondola: 'circle', cable_car: 'circle',
  chair_lift: 'square', detachable: 'square',
  drag_lift: 'triangle', 't-bar': 'triangle', j_bar: 'triangle', platter: 'triangle', rope_tow: 'triangle',
  magic_carpet: 'dash', mixed_lift: 'diamond'
};

function categoryShape(cat, isLift) {
  const map = isLift ? LIFT_SHAPE : TRAIL_SHAPE;
  return map[cat] || 'circle';
}

function categoryLabel(cat, isLift) {
  if (isLift) return aerialwayLabel(cat);
  return diffLabel(cat);
}

function shapeMarker(shape, x, y, r, fill, opacity) {
  switch (shape) {
    case 'square':
      return `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" fill="${fill}" opacity="${opacity}"/>`;
    case 'triangle': {
      const h = r * 1.8;
      return `<polygon points="${x.toFixed(1)},${(y - h * 0.6).toFixed(1)} ${(x - r).toFixed(1)},${(y + h * 0.4).toFixed(1)} ${(x + r).toFixed(1)},${(y + h * 0.4).toFixed(1)}" fill="${fill}" opacity="${opacity}"/>`;
    }
    case 'diamond':
      return `<polygon points="${x.toFixed(1)},${(y - r).toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + r).toFixed(1)} ${(x - r).toFixed(1)},${y.toFixed(1)}" fill="${fill}" opacity="${opacity}"/>`;
    case 'cross':
      return `<path d="M ${(x - r).toFixed(1)} ${y.toFixed(1)} H ${(x + r).toFixed(1)} M ${x.toFixed(1)} ${(y - r).toFixed(1)} V ${(y + r).toFixed(1)}" stroke="${fill}" stroke-width="1.3" fill="none" opacity="${opacity}"/>`;
    case 'dash':
      return `<line x1="${(x - r).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + r).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${fill}" stroke-width="2" opacity="${opacity}"/>`;
    default:
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
  }
}

function legendShapeSvg(shape, fill) {
  const cx = 6;
  const cy = 6;
  const r = 3.5;
  return shapeMarker(shape, cx, cy, r, fill, 0.85);
}

function buildCategoryLegend(points, isLift) {
  const counts = new Map();
  for (const p of points) {
    const cat = p.cat || 'unknown';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const entries = [...counts.entries()]
    .filter(([cat]) => cat !== 'unknown' || counts.size === 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (entries.length <= 1) return '';

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return (
    `<div class="sf-chart-legend-row">` +
    entries.map(([cat]) => {
      const shape = categoryShape(cat, isLift);
      const label = categoryLabel(cat, isLift);
      return (
        `<span class="sf-chart-legend-item">` +
        `<svg class="sf-chart-legend-shape" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">${legendShapeSvg(shape, GREY)}</svg>` +
        `${esc(label)}</span>`
      );
    }).join('') +
    `</div>`
  );
}

function quartiles(sorted) {
  if (!sorted.length) return { q1: 0, q2: 0, q3: 0, max: 0 };
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return { q1: at(0.25), q2: at(0.5), q3: at(0.75), max: sorted[sorted.length - 1] };
}

function xScale(km, maxKm, w) {
  if (maxKm <= 0) return 0;
  return Math.min(w, (km / maxKm) * w);
}

function zoneRects(q, maxKm, w, h) {
  const edges = [0, q.q1, q.q2, q.q3, maxKm];
  let html = '';
  for (let i = 0; i < 4; i++) {
    const x0 = xScale(edges[i], maxKm, w);
    const x1 = xScale(edges[i + 1], maxKm, w);
    const rw = Math.max(0, x1 - x0);
    if (rw > 0) {
      html += `<rect x="${x0.toFixed(1)}" y="0" width="${rw.toFixed(1)}" height="${h}" fill="${ZONE_COLORS[i]}" opacity="0.85"/>`;
    }
  }
  return html;
}

function axisTicks(maxKm, w, count = 4) {
  let html = '';
  for (let i = 0; i <= count; i++) {
    const km = (maxKm * i) / count;
    const x = xScale(km, maxKm, w);
    html += `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="4" stroke="#cbd5e1" stroke-width="1"/>`;
    html += `<text x="${x.toFixed(1)}" y="14" text-anchor="middle" fill="#64748b" font-size="9">${fmtLen(km)}</text>`;
  }
  return html;
}

function normalizeChartPoints(options) {
  if (options.points?.length) return options.points.filter((p) => p.km > 0);
  return (options.lengths || []).filter((n) => n > 0).map((km) => ({ km, cat: 'unknown' }));
}

/**
 * Rug plot: length on x-axis, jittered dots; shape = difficulty or lift type.
 */
export function buildLengthChartSvg(options) {
  const {
    points: rawPoints,
    lengths = [],
    highlightKm = 0,
    highlightCat = '',
    title = '',
    subtitle = '',
    highlightLabel = 'This trail',
    isLift = false,
    showCategoryLegend = true,
    width = 280,
    height = 100,
    margin = { top: 4, right: 8, bottom: 22, left: 8 }
  } = options;

  const points = normalizeChartPoints({ points: rawPoints, lengths });
  if (!points.length || highlightKm <= 0) return '';

  const kms = points.map((p) => p.km);
  const sorted = [...kms].sort((a, b) => a - b);
  const q = quartiles(sorted);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const maxKm = Math.max(p95 * 1.08, highlightKm * 1.05, q.max * 1.02);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom - 18;
  const avgKm = kms.reduce((a, b) => a + b, 0) / kms.length;

  let plotSvg = zoneRects(q, maxKm, plotW, plotH);

  points.forEach((pt, i) => {
    if (Math.abs(pt.km - highlightKm) < 0.0005) return;
    const cx = xScale(pt.km, maxKm, plotW);
    const cy = stableJitterY(pt.km, pt.cat, i, plotH, 5);
    const shape = categoryShape(pt.cat, isLift);
    plotSvg += shapeMarker(shape, cx, cy, 2.4, GREY, 0.55);
  });

  const avgX = xScale(avgKm, maxKm, plotW);
  plotSvg += `<line x1="${avgX.toFixed(1)}" y1="0" x2="${avgX.toFixed(1)}" y2="${plotH}" stroke="${AVG_LINE}" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>`;

  const hiX = xScale(highlightKm, maxKm, plotW);
  const hiY = plotH * 0.45;
  plotSvg += `<line x1="${hiX.toFixed(1)}" y1="0" x2="${hiX.toFixed(1)}" y2="${plotH}" stroke="${TEAL}" stroke-width="1.5" opacity="0.35"/>`;
  plotSvg += `<circle cx="${hiX.toFixed(1)}" cy="${hiY.toFixed(1)}" r="5" fill="${TEAL}" stroke="#fff" stroke-width="1.5"/>`;

  const titleEsc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const subEsc = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const hiEsc = highlightLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const legendHtml = showCategoryLegend ? buildCategoryLegend(points, isLift) : '';

  return (
    `<div class="sf-chart-block sr-chart-panel">` +
    `<div class="sf-chart-title">${titleEsc}</div>` +
    (subtitle ? `<div class="sf-chart-sub">${subEsc}</div>` : '') +
    `<svg class="sf-chart-svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${titleEsc}">` +
    `<g transform="translate(${margin.left},${margin.top + 16})">` +
    plotSvg +
    `<g transform="translate(0,${plotH + 4})">${axisTicks(maxKm, plotW)}</g>` +
    `</g>` +
    `<text x="${margin.left}" y="11" fill="#475569" font-size="9" font-weight="600">Length →</text>` +
    `<circle cx="${width - margin.right - 52}" cy="8" r="3" fill="${TEAL}"/>` +
    `<text x="${width - margin.right - 46}" y="11" fill="#64748b" font-size="8">${hiEsc}</text>` +
    `<line x1="${width - margin.right - 88}" y1="8" x2="${width - margin.right - 80}" y2="8" stroke="${AVG_LINE}" stroke-width="1" stroke-dasharray="2,2"/>` +
    `<text x="${width - margin.right - 76}" y="11" fill="#64748b" font-size="8">Avg</text>` +
    `</svg>` +
    legendHtml +
    `</div>`
  );
}

function percentileRank(sorted, value) {
  if (!sorted.length || value <= 0) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return { rank: lo + 1, total: sorted.length, pct: Math.round((lo / sorted.length) * 100) };
}

function kindBucket(index, meta, isLift) {
  return isLift ? index.lifts : index.pistes;
}

function scopeGroup(index, meta, scopeId, isLift) {
  const bucket = kindBucket(index, meta, isLift);
  if (scopeId === 'state') return meta.state ? bucket.byState?.[meta.stateKey] : null;
  if (scopeId === 'country') return meta.countryNorm ? bucket.byCountry?.[meta.countryNorm] : null;
  return bucket.all;
}

function subtypeGroup(index, meta, scopeId, isLift) {
  const bucket = kindBucket(index, meta, isLift);
  if (isLift) {
    const aw = meta.aerialway || 'unknown';
    if (scopeId === 'state' && meta.state) {
      return bucket.byStateType?.[meta.stateKey]?.[aw] || null;
    }
    if (scopeId === 'country' && meta.countryNorm) {
      return bucket.byCountryType?.[meta.countryNorm]?.[aw] || null;
    }
    return bucket.byType?.[aw] || null;
  }
  const diff = meta.difficulty || 'unknown';
  if (scopeId === 'state' && meta.state) {
    return bucket.byStateDifficulty?.[meta.stateKey]?.[diff] || null;
  }
  if (scopeId === 'country' && meta.countryNorm) {
    return bucket.byCountryDifficulty?.[meta.countryNorm]?.[diff] || null;
  }
  return bucket.byDifficulty?.[diff] || null;
}

/** @returns {{ id: string, label: string }[]} */
export function getFeatureComparisonScopes(meta, index) {
  if (!meta || !index || meta.lengthKm <= 0) return [];
  const isLift = meta.kind === 'lift';
  const bucket = kindBucket(index, meta, isLift);
  const scopes = [];

  const stateGroup = meta.state ? bucket.byState?.[meta.stateKey] : null;
  if (meta.state && stateGroup?.count >= 5) {
    scopes.push({ id: 'state', label: meta.state });
  }
  const countryGroup = meta.countryNorm ? bucket.byCountry?.[meta.countryNorm] : null;
  if (meta.countryNorm && countryGroup?.count >= 5) {
    scopes.push({ id: 'country', label: meta.countryNorm });
  }
  if (bucket.all?.count >= 10) {
    scopes.push({ id: 'worldwide', label: 'Worldwide' });
  }
  return scopes;
}

export function getDefaultFeatureScope(meta, index) {
  return getFeatureComparisonScopes(meta, index)[0]?.id || 'worldwide';
}

function scopeLabel(scopeId, meta) {
  if (scopeId === 'state') return meta.state || 'State';
  if (scopeId === 'country') return meta.countryNorm || 'Country';
  return 'Worldwide';
}

function noun(meta, plural = true) {
  const base = meta.kind === 'lift' ? 'lift' : 'trail';
  return plural ? `${base}s` : base;
}

/**
 * Build chart panel(s) for one comparison scope.
 * @param {'state'|'country'|'worldwide'} scopeId
 */
export function buildComparisonCharts(meta, index, scopeId) {
  if (meta.lengthKm <= 0 || !index) return { html: '', caption: '', foot: '', scope: scopeId || 'worldwide' };

  const isLift = meta.kind === 'lift';
  const bucket = kindBucket(index, meta, isLift);
  const scopes = getFeatureComparisonScopes(meta, index);
  const scope = scopeId && scopes.some((s) => s.id === scopeId)
    ? scopeId
    : scopes[0]?.id || 'worldwide';

  const group = scopeGroup(index, meta, scope, isLift);
  if (!group?.sorted?.length) return { html: '', caption: '', foot: '', scope };

  const charts = [];
  const captions = [];
  const label = scopeLabel(scope, meta);
  const hiLabel = isLift ? 'This lift' : 'This trail';

  const allSorted = group.sorted;
  const mainRank = percentileRank(allSorted, meta.lengthKm);
  const mainTitle = scope === 'worldwide'
    ? `All ${noun(meta)} worldwide`
    : `${label}: all ${noun(meta)}`;
  const mainSub = mainRank
    ? scope === 'worldwide'
      ? `Longer than ${mainRank.pct}% of ${allSorted.length.toLocaleString()} ${noun(meta)}`
      : `${mainRank.pct}th percentile · ${allSorted.length.toLocaleString()} ${noun(meta)} in ${label}`
    : '';

  if (mainRank) {
    if (scope === 'worldwide') {
      captions.push(`Longer than ${mainRank.pct}% worldwide`);
    } else if (scope === 'country') {
      captions.push(`#${mainRank.rank} of ${mainRank.total.toLocaleString()} in ${label}`);
    } else {
      captions.push(`#${mainRank.rank} of ${mainRank.total.toLocaleString()} in ${label}`);
    }
  }

  const avgKm = group.avgKm || (allSorted.reduce((a, b) => a + b, 0) / allSorted.length);
  if (avgKm > 0) {
    const ratio = meta.lengthKm / avgKm;
    if (ratio >= 1.45) captions.push(`${ratio.toFixed(1)}× average in ${label}`);
    else if (ratio <= 0.55) captions.push(`${ratio.toFixed(1)}× average in ${label}`);
  }

  charts.push(buildLengthChartSvg({
    points: group.points || allSorted.map((km) => ({ km, cat: 'unknown' })),
    highlightKm: meta.lengthKm,
    highlightCat: isLift ? meta.aerialway : meta.difficulty,
    title: mainTitle,
    subtitle: mainSub,
    highlightLabel: hiLabel,
    isLift,
    showCategoryLegend: true
  }));

  const subtype = subtypeGroup(index, meta, scope, isLift);
  const subtypeSorted = subtype?.sorted;
  let subtypeTitle = '';
  let subtypeSub = '';

  if (isLift && meta.aerialway && subtypeSorted?.length >= 3) {
    const awLabel = aerialwayLabel(meta.aerialway);
    subtypeTitle = scope === 'worldwide'
      ? `${awLabel} lifts worldwide`
      : `${awLabel} · ${label}`;
    const sp = percentileRank(subtypeSorted, meta.lengthKm);
    if (sp) {
      subtypeSub = `${sp.pct}th percentile for type`;
      captions.push(`${sp.pct}th percentile ${awLabel.toLowerCase()}`);
    }
  } else if (!isLift && meta.difficulty && subtypeSorted?.length >= 3) {
    const diffName = diffLabel(meta.difficulty);
    subtypeTitle = scope === 'worldwide'
      ? `${diffName} runs worldwide`
      : `${diffName} · ${label}`;
    const sp = percentileRank(subtypeSorted, meta.lengthKm);
    if (sp) {
      subtypeSub = `${sp.pct}th percentile for difficulty`;
      captions.push(`${sp.pct}th percentile ${diffName.toLowerCase()}`);
    }
  }

  if (subtypeSorted?.length >= 3 && subtypeSorted !== allSorted) {
    const subtypePoints = subtype.points || subtypeSorted.map((km) => ({
      km,
      cat: isLift ? meta.aerialway : meta.difficulty
    }));
    charts.push(buildLengthChartSvg({
      points: subtypePoints,
      highlightKm: meta.lengthKm,
      highlightCat: isLift ? meta.aerialway : meta.difficulty,
      title: subtypeTitle,
      subtitle: subtypeSub,
      highlightLabel: hiLabel,
      isLift,
      showCategoryLegend: false
    }));
  }

  const peerCount = allSorted.length;
  const foot = scope === 'worldwide'
    ? `Compared against ${peerCount.toLocaleString()} ${noun(meta)} worldwide`
    : `Compared against ${peerCount.toLocaleString()} ${noun(meta)} in ${label}`;

  return {
    html: charts.length ? `<div class="sf-charts sr-charts-row">${charts.slice(0, 2).join('')}</div>` : '',
    caption: [...new Set(captions)].slice(0, 4).join(' · '),
    foot,
    scope
  };
}

export { buildScopeToggleHtml };

export function buildFeatureChartsPanel(meta, index, scopeId, escapeHtmlFn) {
  if (!isGlobalStatsReady(index)) return { panel: '', caption: '', foot: '', scope: scopeId, scopes: [] };

  const scopes = getFeatureComparisonScopes(meta, index);
  const defaultScope = scopeId || getDefaultFeatureScope(meta, index);
  const charts = buildComparisonCharts(meta, index, defaultScope);
  if (!charts.html) return { panel: '', caption: '', foot: '', scope: defaultScope, scopes };

  const scopeToggle = buildScopeToggleHtml(scopes, charts.scope || defaultScope, escapeHtmlFn);
  const cap = charts.caption
    ? `<div class="sf-chart-caption">${escapeHtmlFn(charts.caption)}</div>`
    : '';

  return {
    panel: `<div class="sr-charts-wrap">${scopeToggle}<div class="sf-charts-panel">${charts.html}</div></div>${cap}`,
    caption: charts.caption,
    foot: charts.foot,
    scope: charts.scope || defaultScope,
    scopes
  };
}

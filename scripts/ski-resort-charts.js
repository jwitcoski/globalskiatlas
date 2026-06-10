/**
 * Big inline SVG charts for ski resort popups (trails vs acreage scatter, trail ranks).
 */
import {
  TRAILS_MEGA_GE,
  TRAILS_MEDIUM_LT,
  TRAILS_SMALL_LT
} from './resort-categories.js';

const TEAL = '#0d9488';
const GREY = '#94a3b8';
const AVG_COLOR = '#64748b';

/** Atlas tier bands on trail count (x-axis). */
const TRAIL_ZONES = [
  { max: TRAILS_SMALL_LT, color: '#eef6fb', label: 'Small hill' },
  { max: TRAILS_MEDIUM_LT, color: '#dceef8', label: 'Medium' },
  { max: TRAILS_MEGA_GE, color: '#c4e4f4', label: 'Large' },
  { max: Infinity, color: '#a8d8ef', label: 'Mega' }
];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function scale(val, max, range) {
  if (max <= 0) return 0;
  return Math.min(range, (val / max) * range);
}

function jitter(i, h, pad = 8) {
  const t = ((i * 7919 + 104729) % 999983) / 999983;
  return pad + t * (h - pad * 2);
}

function fmtN(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function fmtAcres(n) {
  if (n >= 1000) return `${Math.round(n).toLocaleString()}`;
  return String(Math.round(n));
}

function percentileFromSorted(sorted, value) {
  if (!sorted?.length || value <= 0) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return { rank: lo + 1, total: sorted.length, pct: Math.round((lo / sorted.length) * 100) };
}

function scatterPoints(group) {
  return (group?.resorts || [])
    .filter((r) => r.trails > 0 && r.acres > 0)
    .map((r) => ({ trails: r.trails, acres: r.acres, name: r.name, key: r.key }));
}

/**
 * Trails vs skiable acres scatter — Vermont-facts style, go big.
 */
export function buildTrailsVsAcresScatter(options) {
  const {
    points = [],
    highlightKey = '',
    highlightName = '',
    title = '',
    subtitle = '',
    width = 300,
    height = 175,
    margin = { top: 22, right: 10, bottom: 42, left: 38 }
  } = options;

  const valid = points.filter((p) => p.trails > 0 && p.acres > 0);
  if (valid.length < 2) return '';

  const hi = valid.find((p) => p.key === highlightKey) || valid.find((p) => p.name === highlightName);
  if (!hi) return '';

  const trailsSorted = [...valid.map((p) => p.trails)].sort((a, b) => a - b);
  const acresSorted = [...valid.map((p) => p.acres)].sort((a, b) => a - b);
  const maxTrails = Math.max(
    trailsSorted[Math.min(trailsSorted.length - 1, Math.floor(trailsSorted.length * 0.95))] * 1.06,
    hi.trails * 1.08,
    10
  );
  const maxAcres = Math.max(
    acresSorted[Math.min(acresSorted.length - 1, Math.floor(acresSorted.length * 0.95))] * 1.06,
    hi.acres * 1.08,
    100
  );

  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  let zones = '';
  const zoneEdges = [0, TRAILS_SMALL_LT, TRAILS_MEDIUM_LT, TRAILS_MEGA_GE, maxTrails];
  for (let i = 0; i < TRAIL_ZONES.length; i++) {
    const x0 = scale(zoneEdges[i], maxTrails, plotW);
    const x1 = scale(Math.min(zoneEdges[i + 1], maxTrails), maxTrails, plotW);
    if (x1 > x0) {
      zones += `<rect x="${x0.toFixed(1)}" y="0" width="${(x1 - x0).toFixed(1)}" height="${plotH}" fill="${TRAIL_ZONES[i].color}" opacity="0.9"/>`;
    }
  }

  let dots = '';
  valid.forEach((p) => {
    if (p.key === highlightKey) return;
    const cx = scale(p.trails, maxTrails, plotW);
    const cy = plotH - scale(p.acres, maxAcres, plotH);
    dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${GREY}" opacity="0.55"/>`;
  });

  const hiX = scale(hi.trails, maxTrails, plotW);
  const hiY = plotH - scale(hi.acres, maxAcres, plotH);
  const hiDot = `<circle cx="${hiX.toFixed(1)}" cy="${hiY.toFixed(1)}" r="7" fill="${TEAL}" stroke="#fff" stroke-width="2"/>`;
  const label = hi.name.length > 18 ? hi.name.slice(0, 16) + '…' : hi.name;
  const nearRight = hiX > plotW * 0.62;
  const nearTop = hiY < plotH * 0.18;
  const lx = nearRight ? hiX - 8 : hiX + 10;
  const ly = nearTop ? hiY + 14 : hiY - 6;
  const anchor = nearRight ? 'end' : 'start';
  const hiLabel = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#0f172a" font-size="9" font-weight="700">${esc(label)}</text>`;

  let xTicks = '';
  for (let i = 0; i <= 4; i++) {
    const v = (maxTrails * i) / 4;
    const x = scale(v, maxTrails, plotW);
    xTicks += `<line x1="${x.toFixed(1)}" y1="${plotH}" x2="${x.toFixed(1)}" y2="${plotH + 4}" stroke="#cbd5e1"/>`;
    xTicks += `<text x="${x.toFixed(1)}" y="${plotH + 14}" text-anchor="middle" fill="#64748b" font-size="8">${fmtN(v)}</text>`;
  }

  let yTicks = '';
  for (let i = 0; i <= 4; i++) {
    const v = (maxAcres * i) / 4;
    const y = plotH - scale(v, maxAcres, plotH);
    yTicks += `<line x1="-4" y1="${y.toFixed(1)}" x2="0" y2="${y.toFixed(1)}" stroke="#cbd5e1"/>`;
    yTicks += `<text x="-6" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="9">${fmtAcres(v)}</text>`;
  }

  const svgH = margin.top + plotH + margin.bottom;
  const xAxisY = margin.top + plotH + 28;
  const legendHtml = TRAIL_ZONES.map((z) =>
    `<span class="sf-chart-legend-item"><span class="sf-chart-legend-swatch" style="background:${z.color}"></span>${esc(z.label)}</span>`
  ).join('');

  return (
    `<div class="sf-chart-block sr-chart-panel">` +
    `<div class="sf-chart-title">${esc(title)}</div>` +
    (subtitle ? `<div class="sf-chart-sub">${esc(subtitle)}</div>` : '') +
    `<svg class="sf-chart-svg" viewBox="0 0 ${width} ${svgH}" width="100%" role="img">` +
    `<g transform="translate(${margin.left},${margin.top})">` +
    zones + dots + hiDot + hiLabel +
    `<line x1="0" y1="${plotH}" x2="${plotW}" y2="${plotH}" stroke="#94a3b8" stroke-width="1"/>` +
    `<line x1="0" y1="0" x2="0" y2="${plotH}" stroke="#94a3b8" stroke-width="1"/>` +
    xTicks + yTicks +
    `</g>` +
    `<text x="${margin.left + plotW / 2}" y="${xAxisY}" text-anchor="middle" fill="#475569" font-size="9" font-weight="600">Number of trails</text>` +
    `<text transform="translate(12,${margin.top + plotH / 2}) rotate(-90)" text-anchor="middle" fill="#475569" font-size="9" font-weight="600">Skiable acres</text>` +
    `</svg>` +
    `<div class="sf-chart-legend-row">${legendHtml}</div>` +
    `</div>`
  );
}

/** Rug plot: trail count vs peers. */
export function buildTrailsRankChart(options) {
  const {
    trailCounts = [],
    highlightTrails = 0,
    title = '',
    subtitle = '',
    width = 280,
    height = 115,
    margin = { top: 20, right: 6, bottom: 24, left: 6 }
  } = options;

  const valid = trailCounts.filter((n) => n > 0);
  if (!valid.length || highlightTrails <= 0) return '';

  const sorted = [...valid].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const maxT = Math.max(p95 * 1.08, highlightTrails * 1.05, sorted[sorted.length - 1]);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;

  let plot = '';
  valid.forEach((t, i) => {
    if (t === highlightTrails) return;
    const cx = scale(t, maxT, plotW);
    const cy = jitter(i, plotH);
    plot += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="${GREY}" opacity="0.5"/>`;
  });

  const avgX = scale(avg, maxT, plotW);
  plot += `<line x1="${avgX.toFixed(1)}" y1="0" x2="${avgX.toFixed(1)}" y2="${plotH}" stroke="${AVG_COLOR}" stroke-dasharray="3,3" opacity="0.65"/>`;
  const hiX = scale(highlightTrails, maxT, plotW);
  plot += `<circle cx="${hiX.toFixed(1)}" cy="${plotH * 0.45}" r="6" fill="${TEAL}" stroke="#fff" stroke-width="2"/>`;

  let ticks = '';
  for (let i = 0; i <= 4; i++) {
    const v = (maxT * i) / 4;
    const x = scale(v, maxT, plotW);
    ticks += `<text x="${x.toFixed(1)}" y="${plotH + 14}" text-anchor="middle" fill="#64748b" font-size="9">${fmtN(v)}</text>`;
  }

  return (
    `<div class="sf-chart-block sr-chart-panel">` +
    `<div class="sf-chart-title">${esc(title)}</div>` +
    (subtitle ? `<div class="sf-chart-sub">${esc(subtitle)}</div>` : '') +
    `<svg class="sf-chart-svg" viewBox="0 0 ${width} ${height}" width="100%">` +
    `<g transform="translate(${margin.left},${margin.top})">${plot}${ticks}</g>` +
    `<text x="${margin.left}" y="11" fill="#475569" font-size="9" font-weight="600">Trails →</text>` +
    `<circle cx="${width - 52}" cy="9" r="3" fill="${TEAL}"/><text x="${width - 46}" y="12" fill="#64748b" font-size="8">This resort</text>` +
    `</svg></div>`
  );
}

/** @returns {{ id: string, label: string }[]} */
export function getResortComparisonScopes(record, index) {
  if (!record || !index) return [];
  const scopes = [];
  const stateGroup = index.byState[record.stateKey];
  const countryGroup = index.byCountry[record.countryNorm];

  if (record.state && stateGroup?.trails?.sorted?.length >= 3) {
    scopes.push({ id: 'state', label: record.state });
  }
  if (record.countryNorm && countryGroup?.trails?.sorted?.length >= 5) {
    scopes.push({ id: 'country', label: record.countryNorm });
  }
  if (index.trails.sorted.length >= 10) {
    scopes.push({ id: 'worldwide', label: 'Worldwide' });
  }
  return scopes;
}

export function getDefaultResortScope(record, index) {
  return getResortComparisonScopes(record, index)[0]?.id || 'worldwide';
}

function getScopeGroup(record, index, scopeId) {
  if (scopeId === 'state') return index.byState[record.stateKey];
  if (scopeId === 'country') return index.byCountry[record.countryNorm];
  return {
    resorts: index.all,
    trails: index.trails,
    lifts: index.lifts,
    acres: index.acres
  };
}

function scopeRankLabel(scopeId, record) {
  if (scopeId === 'state') return record.state || 'State';
  if (scopeId === 'country') return record.countryNorm || 'Country';
  return 'Worldwide';
}

/**
 * Build resort popup charts for one comparison scope.
 * @param {'state'|'country'|'worldwide'} scopeId
 */
export function buildResortComparisonCharts(record, index, scopeId) {
  if (!record || !index) return { html: '', caption: '', foot: '' };

  const scopes = getResortComparisonScopes(record, index);
  const scope = scopeId && scopes.some((s) => s.id === scopeId)
    ? scopeId
    : scopes[0]?.id || 'worldwide';

  const group = getScopeGroup(record, index, scope);
  if (!group) return { html: '', caption: '', foot: '' };

  const charts = [];
  const captions = [];
  const scopeLabel = scopeRankLabel(scope, record);

  const pts = scatterPoints(group);
  if (pts.length >= 2 && record.acres > 0) {
    const scatterTitle = scope === 'worldwide'
      ? 'Worldwide: trails vs acreage'
      : `${scopeLabel}: trails vs acreage`;
    const scatterSub = scope === 'worldwide'
      ? `${pts.length.toLocaleString()} resorts globally`
      : scope === 'country'
        ? `${pts.length} resorts in ${scopeLabel}`
        : `${pts.length} resorts in ${scopeLabel}`;
    const scatter = buildTrailsVsAcresScatter({
      points: pts,
      highlightKey: record.key,
      highlightName: record.name,
      title: scatterTitle,
      subtitle: scatterSub
    });
    if (scatter) charts.push(scatter);
  }

  const trailSorted = group.trails?.sorted || [];
  if (trailSorted.length >= 2 && record.trails > 0) {
    const tr = percentileFromSorted(trailSorted, record.trails);
    const rankTitle = scope === 'worldwide'
      ? 'Trail count · Worldwide'
      : `Trail count · ${scopeLabel}`;
    let rankSub = '';
    if (tr) {
      if (scope === 'worldwide') {
        rankSub = `Longer than ${tr.pct}% of all resorts`;
        captions.push(`#${tr.rank} of ${tr.total.toLocaleString()} worldwide`);
      } else if (scope === 'country') {
        rankSub = `${tr.pct}th percentile nationally`;
        captions.push(`#${tr.rank} of ${tr.total} in ${scopeLabel}`);
      } else {
        rankSub = `${tr.pct}th percentile in state`;
        captions.push(`#${tr.rank} of ${tr.total} in ${scopeLabel}`);
      }
    }
    const rank = buildTrailsRankChart({
      trailCounts: trailSorted,
      highlightTrails: record.trails,
      title: rankTitle,
      subtitle: rankSub
    });
    if (rank) charts.push(rank);
  }

  if (record.lifts > 0 && group.lifts?.sorted?.length >= 5) {
    const lr = percentileFromSorted(group.lifts.sorted, record.lifts);
    if (lr && lr.pct >= 70) {
      captions.push(`${record.lifts} lifts — top ${100 - lr.pct}% in ${scopeLabel}`);
    }
  }

  if (record.acres > 0 && group.acres?.sorted?.length >= 5) {
    const avgAcres = group.acres.sorted.reduce((a, b) => a + b, 0) / group.acres.sorted.length;
    if (avgAcres > 0) {
      const ratio = record.acres / avgAcres;
      if (ratio >= 1.4) captions.push(`${ratio.toFixed(1)}× average acreage in ${scopeLabel}`);
    }
  }

  if (record.category === 'mega_resort' && scope === 'worldwide') {
    captions.unshift('Mega resort — 100+ trails');
  }

  const peerCount = scope === 'worldwide'
    ? index.count
    : group.trails?.count || group.resorts?.length || 0;

  const foot = scope === 'worldwide'
    ? `Compared against ${index.count.toLocaleString()} downhill resorts worldwide`
    : `Compared against ${peerCount.toLocaleString()} resorts in ${scopeLabel}`;

  return {
    html: charts.length ? `<div class="sf-charts sr-charts-row">${charts.slice(0, 2).join('')}</div>` : '',
    caption: [...new Set(captions)].slice(0, 4).join(' · '),
    foot,
    scope
  };
}

export function buildScopeToggleHtml(scopes, activeScope, escapeHtmlFn) {
  if (!scopes || scopes.length <= 1) return '';
  return (
    `<div class="sr-scope-bar" role="tablist" aria-label="Comparison scope">` +
    scopes.map((s) =>
      `<button type="button" role="tab" class="sr-scope-btn${s.id === activeScope ? ' active' : ''}" ` +
      `data-sr-scope="${esc(s.id)}" aria-selected="${s.id === activeScope}">${escapeHtmlFn(s.label)}</button>`
    ).join('') +
    `</div>`
  );
}

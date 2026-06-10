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

/**
 * Trails vs skiable acres scatter — Vermont-facts style, go big.
 * @param {{ trails: number, acres: number, name: string, key: string }[]} points
 */
export function buildTrailsVsAcresScatter(options) {
  const {
    points = [],
    highlightKey = '',
    highlightName = '',
    title = '',
    subtitle = '',
    width = 300,
    height = 165,
    margin = { top: 24, right: 10, bottom: 32, left: 38 }
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
  valid.forEach((p, i) => {
    if (p.key === highlightKey) return;
    const cx = scale(p.trails, maxTrails, plotW);
    const cy = plotH - scale(p.acres, maxAcres, plotH);
    dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${GREY}" opacity="0.55"/>`;
  });

  const hiX = scale(hi.trails, maxTrails, plotW);
  const hiY = plotH - scale(hi.acres, maxAcres, plotH);
  const hiDot = `<circle cx="${hiX.toFixed(1)}" cy="${hiY.toFixed(1)}" r="7" fill="${TEAL}" stroke="#fff" stroke-width="2"/>`;
  const label = hi.name.length > 22 ? hi.name.slice(0, 20) + '…' : hi.name;
  const lx = Math.min(hiX + 10, plotW - 4);
  const ly = hiY - 6;
  const hiLabel = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" fill="#0f172a" font-size="10" font-weight="700">${esc(label)}</text>`;

  let xTicks = '';
  const xSteps = 4;
  for (let i = 0; i <= xSteps; i++) {
    const v = (maxTrails * i) / xSteps;
    const x = scale(v, maxTrails, plotW);
    xTicks += `<line x1="${x.toFixed(1)}" y1="${plotH}" x2="${x.toFixed(1)}" y2="${plotH + 4}" stroke="#cbd5e1"/>`;
    xTicks += `<text x="${x.toFixed(1)}" y="${plotH + 16}" text-anchor="middle" fill="#64748b" font-size="9">${fmtN(v)}</text>`;
  }

  let yTicks = '';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const v = (maxAcres * i) / ySteps;
    const y = plotH - scale(v, maxAcres, plotH);
    yTicks += `<line x1="-4" y1="${y.toFixed(1)}" x2="0" y2="${y.toFixed(1)}" stroke="#cbd5e1"/>`;
    yTicks += `<text x="-6" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="9">${fmtAcres(v)}</text>`;
  }

  const legendY = height - 6;
  let legend = '';
  TRAIL_ZONES.forEach((z, i) => {
    const lx = margin.left + i * 52;
    legend += `<rect x="${lx}" y="${legendY}" width="7" height="7" fill="${z.color}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    legend += `<text x="${lx + 10}" y="${legendY + 6}" fill="#64748b" font-size="7">${esc(z.label)}</text>`;
  });

  return (
    `<div class="sf-chart-block sr-chart-panel">` +
    `<div class="sf-chart-title">${esc(title)}</div>` +
    (subtitle ? `<div class="sf-chart-sub">${esc(subtitle)}</div>` : '') +
    `<svg class="sf-chart-svg" viewBox="0 0 ${width} ${height + 8}" width="100%" role="img">` +
    `<g transform="translate(${margin.left},${margin.top})">` +
    zones + dots + hiDot + hiLabel +
    `<line x1="0" y1="${plotH}" x2="${plotW}" y2="${plotH}" stroke="#94a3b8" stroke-width="1"/>` +
    `<line x1="0" y1="0" x2="0" y2="${plotH}" stroke="#94a3b8" stroke-width="1"/>` +
    xTicks + yTicks +
    `</g>` +
    `<text x="${margin.left + plotW / 2}" y="${height - 2}" text-anchor="middle" fill="#475569" font-size="10" font-weight="600">Number of trails</text>` +
    `<text transform="translate(12,${margin.top + plotH / 2}) rotate(-90)" text-anchor="middle" fill="#475569" font-size="10" font-weight="600">Skiable acres</text>` +
    legend +
    `</svg></div>`
  );
}

/** Rug plot: trail count vs peers (state/country/global). */
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

/**
 * Build resort popup charts from stats index.
 */
export function buildResortComparisonCharts(record, index) {
  if (!record || !index) return { html: '', caption: '' };

  const charts = [];
  const captions = [];

  const stateGroup = index.byState[record.stateKey];
  const countryGroup = index.byCountry[record.countryNorm];

  const scatterPoints = (group) =>
    (group?.resorts || [])
      .filter((r) => r.trails > 0 && r.acres > 0)
      .map((r) => ({ trails: r.trails, acres: r.acres, name: r.name, key: r.key }));

  if (stateGroup && record.state) {
    const pts = scatterPoints(stateGroup);
    if (pts.length >= 3 && record.acres > 0) {
      const chart = buildTrailsVsAcresScatter({
        points: pts,
        highlightKey: record.key,
        highlightName: record.name,
        title: `${record.state}: trails vs acreage`,
        subtitle: `${pts.length} resorts in ${record.state}`
      });
      if (chart) charts.push(chart);
    }
  }

  if (!charts.length && countryGroup && record.countryNorm) {
    const pts = scatterPoints(countryGroup);
    if (pts.length >= 5 && record.acres > 0) {
      const chart = buildTrailsVsAcresScatter({
        points: pts,
        highlightKey: record.key,
        highlightName: record.name,
        title: `${record.countryNorm}: trails vs acreage`,
        subtitle: `${pts.length} resorts nationwide`
      });
      if (chart) charts.push(chart);
    }
  }

  if (stateGroup?.trails?.sorted?.length >= 3) {
    const st = percentileFromSorted(stateGroup.trails.sorted, record.trails);
    if (st) captions.push(`#${st.rank} of ${st.total} in ${record.state} by trails`);
    charts.push(buildTrailsRankChart({
      trailCounts: stateGroup.trails.sorted,
      highlightTrails: record.trails,
      title: `Trail count · ${record.state || record.countryNorm}`,
      subtitle: st ? `${st.pct}th percentile in state` : ''
    }));
  } else if (countryGroup?.trails?.sorted?.length >= 5) {
    const ct = percentileFromSorted(countryGroup.trails.sorted, record.trails);
    if (ct) captions.push(`#${ct.rank} of ${ct.total} in ${record.countryNorm}`);
    charts.push(buildTrailsRankChart({
      trailCounts: countryGroup.trails.sorted,
      highlightTrails: record.trails,
      title: `Trail count · ${record.countryNorm}`,
      subtitle: ct ? `${ct.pct}th percentile nationally` : ''
    }));
  }

  if (index.trails.sorted.length >= 10 && charts.length < 2) {
    const gt = percentileFromSorted(index.trails.sorted, record.trails);
    if (gt) captions.push(`More trails than ${gt.pct}% of resorts worldwide`);
    charts.push(buildTrailsRankChart({
      trailCounts: index.trails.sorted,
      highlightTrails: record.trails,
      title: 'All resorts worldwide',
      subtitle: gt ? `Top ${100 - gt.pct}% by trail count` : ''
    }));
  }

  if (record.lifts > 0 && index.lifts.sorted.length >= 10) {
    const gl = percentileFromSorted(index.lifts.sorted, record.lifts);
    if (gl && gl.pct >= 75) captions.push(`${record.lifts} lifts — top ${100 - gl.pct}% globally`);
  }

  if (record.acres > 0 && index.acres.avg > 0) {
    const ratio = record.acres / index.acres.avg;
    if (ratio >= 1.5) captions.push(`${ratio.toFixed(1)}× average skiable acreage`);
  }

  if (record.category === 'mega_resort') {
    captions.unshift('Mega resort — 100+ trails');
  }

  return {
    html: charts.length ? `<div class="sf-charts sr-charts-row">${charts.slice(0, 2).join('')}</div>` : '',
    caption: [...new Set(captions)].slice(0, 4).join(' · ')
  };
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

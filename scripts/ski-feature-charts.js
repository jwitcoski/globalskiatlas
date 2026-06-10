/**
 * Inline SVG length comparison charts for trail/lift popups (no D3).
 */

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

function quartiles(sorted) {
  if (!sorted.length) return { q1: 0, q2: 0, q3: 0, max: 0 };
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return { q1: at(0.25), q2: at(0.5), q3: at(0.75), max: sorted[sorted.length - 1] };
}

function xScale(km, maxKm, w) {
  if (maxKm <= 0) return 0;
  return Math.min(w, (km / maxKm) * w);
}

function histogramBins(lengths, binCount, maxKm) {
  const bins = Array(binCount).fill(0);
  if (maxKm <= 0) return bins;
  const step = maxKm / binCount;
  for (const l of lengths) {
    if (l <= 0) continue;
    const i = Math.min(binCount - 1, Math.floor(l / step));
    bins[i]++;
  }
  return bins;
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

/**
 * Rug plot (≤80 points) or histogram (>80) with highlighted trail.
 */
export function buildLengthChartSvg(options) {
  const {
    lengths = [],
    highlightKm = 0,
    title = '',
    subtitle = '',
    width = 280,
    height = 100,
    margin = { top: 4, right: 8, bottom: 22, left: 8 }
  } = options;

  const valid = lengths.filter((n) => n > 0);
  if (!valid.length || highlightKm <= 0) return '';

  const sorted = [...valid].sort((a, b) => a - b);
  const q = quartiles(sorted);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const maxKm = Math.max(p95 * 1.08, highlightKm * 1.05, q.max * 1.02);
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom - 18;
  const avgKm = valid.reduce((a, b) => a + b, 0) / valid.length;

  const useHistogram = valid.length > 80;
  let plotSvg = zoneRects(q, maxKm, plotW, plotH);

  if (useHistogram) {
    const bins = histogramBins(valid, 14, maxKm);
    const maxCount = Math.max(...bins, 1);
    const barW = plotW / bins.length;
    bins.forEach((count, i) => {
      const bh = (count / maxCount) * (plotH * 0.72);
      const bx = i * barW;
      const by = plotH - bh;
      plotSvg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(barW - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="${GREY}" opacity="0.45" rx="1"/>`;
    });
  } else {
    valid.forEach((km, i) => {
      const cx = xScale(km, maxKm, plotW);
      const cy = jitterY(i, plotH, 6);
      const isHi = Math.abs(km - highlightKm) < 0.0005;
      if (isHi) return;
      plotSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="${GREY}" opacity="0.55"/>`;
    });
  }

  const avgX = xScale(avgKm, maxKm, plotW);
  plotSvg += `<line x1="${avgX.toFixed(1)}" y1="0" x2="${avgX.toFixed(1)}" y2="${plotH}" stroke="${AVG_LINE}" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>`;

  const hiX = xScale(highlightKm, maxKm, plotW);
  const hiY = useHistogram ? plotH * 0.35 : plotH * 0.5;
  plotSvg += `<line x1="${hiX.toFixed(1)}" y1="0" x2="${hiX.toFixed(1)}" y2="${plotH}" stroke="${TEAL}" stroke-width="1.5" opacity="0.35"/>`;
  plotSvg += `<circle cx="${hiX.toFixed(1)}" cy="${hiY.toFixed(1)}" r="5" fill="${TEAL}" stroke="#fff" stroke-width="1.5"/>`;

  const titleEsc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const subEsc = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;');

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
    `<text x="${width - margin.right - 46}" y="11" fill="#64748b" font-size="8">This trail</text>` +
    `<line x1="${width - margin.right - 88}" y1="8" x2="${width - margin.right - 80}" y2="8" stroke="${AVG_LINE}" stroke-width="1" stroke-dasharray="2,2"/>` +
    `<text x="${width - margin.right - 76}" y="11" fill="#64748b" font-size="8">Avg</text>` +
    `</svg>` +
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

/**
 * Build chart panel(s) for popup from stats indexes.
 */
export function buildComparisonCharts(meta, globalIndex, viewportIndex) {
  if (meta.lengthKm <= 0) return { html: '', caption: '' };

  const isLift = meta.kind === 'lift';
  const globalReady = globalIndex && (
    isLift ? (globalIndex.lifts?.all?.count > 0) : (globalIndex.pistes?.all?.count > 0)
  );
  const resortIndex = globalReady ? globalIndex : (viewportIndex || globalIndex);
  if (!globalReady && !resortIndex) return { html: '', caption: '' };

  const charts = [];
  const captions = [];

  const resortName = meta.resort || '';
  const resortLengths = isLift
    ? (resortIndex?.lifts?.byResort?.[resortName]?.sorted ?? [])
    : (resortIndex?.pistes?.byResort?.[resortName]?.sorted ?? []);

  if (resortLengths.length >= 2 && resortName) {
    const resortLabel = resortName.length > 32 ? resortName.slice(0, 30) + '…' : resortName;
    const rp = percentileRank(resortLengths, meta.lengthKm);
    if (rp) captions.push(`#${rp.rank} of ${rp.total} at resort`);
    charts.push(buildLengthChartSvg({
      lengths: resortLengths,
      highlightKm: meta.lengthKm,
      title: resortLabel,
      subtitle: rp ? `${rp.pct}th percentile at resort` : ''
    }));
  }

  if (globalReady) {
    const globalAll = isLift
      ? globalIndex.lifts.all.sorted
      : globalIndex.pistes.all.sorted;
    const diff = meta.difficulty || 'unknown';
    const diffLengths = !isLift && meta.difficulty
      ? (globalIndex.pistes.byDifficulty[diff]?.sorted ?? globalAll)
      : null;
    const liftType = meta.aerialway || 'unknown';
    const typeLengths = isLift && meta.aerialway
      ? (globalIndex.lifts.byType[liftType]?.sorted ?? globalAll)
      : null;

    const scopeLengths = diffLengths || typeLengths || globalAll;
    const scopeTitle = isLift
      ? (meta.aerialway ? `${meta.aerialway.replace(/_/g, ' ')} lifts worldwide` : 'All lifts worldwide')
      : (meta.difficulty ? `${diff.charAt(0).toUpperCase() + diff.slice(1)} runs worldwide` : 'All trails worldwide');

    const gp = percentileRank(globalAll, meta.lengthKm);
    const sp = percentileRank(scopeLengths, meta.lengthKm);
    if (gp) captions.push(`Longer than ${gp.pct}% worldwide`);
    if (sp && scopeLengths !== globalAll) captions.push(`${sp.pct}th percentile for ${isLift ? 'type' : 'difficulty'}`);

    const avgKm = globalAll.reduce((a, b) => a + b, 0) / globalAll.length;
    if (avgKm > 0) {
      const ratio = meta.lengthKm / avgKm;
      if (ratio >= 1.45) captions.push(`${ratio.toFixed(1)}× global average`);
      else if (ratio <= 0.55) captions.push(`${ratio.toFixed(1)}× global average`);
    }

    charts.push(buildLengthChartSvg({
      lengths: scopeLengths,
      highlightKm: meta.lengthKm,
      title: scopeTitle,
      subtitle: gp ? `Longer than ${gp.pct}% of all ${isLift ? 'lifts' : 'trails'}` : ''
    }));
  }

  if (!charts.length) return { html: '', caption: '' };

  return {
    html: `<div class="sf-charts sr-charts-row">${charts.join('')}</div>`,
    caption: captions.slice(0, 3).join(' · ')
  };
}

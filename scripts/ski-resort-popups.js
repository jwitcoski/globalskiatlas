/**
 * Rich resort popups with fun facts and comparison charts.
 */
import { slug, escapeHtml, getProp, formatSkiableTerrain, ENGLISH_NAME_KEYS, NAME_KEYS, ID_KEYS, COUNTRY_KEYS, STATE_KEYS, resortDisplayName, SKIABLE_TERRAIN_ACRES_KEYS, SKIABLE_TERRAIN_HA_KEYS } from './utils.js';
import {
  buildResortStatsIndex,
  categoryBadgeHtml,
  compareResort,
  findResortInIndex,
  parseResortRecord
} from './ski-resort-stats.js';
import { buildResortComparisonCharts } from './ski-resort-charts.js';

function wikiDisplayName(p) {
  if (!p) return '';
  const en = (p.englishName != null && p.englishName !== '') ? String(p.englishName).trim() : '';
  const ti = (p.title != null && p.title !== '') ? String(p.title).trim() : '';
  if (en && ti && en !== ti) return en + ' (' + ti + ')';
  return en || ti || '';
}

function buildActionButtons(properties, latlng, displayStr, options, wikiPage, escapeHtmlFn) {
  const name = getProp(properties, NAME_KEYS);
  const id = getProp(properties, ID_KEYS);
  const state = getProp(properties, STATE_KEYS);
  const country = getProp(properties, COUNTRY_KEYS);
  const lat = latlng?.lat ?? null;
  const lon = latlng?.lng ?? null;

  let pageParam = '';
  if (wikiPage?.pageId) {
    pageParam = wikiPage.pageId;
  } else {
    const englishName = getProp(properties, ENGLISH_NAME_KEYS);
    const nameForSlug = (englishName != null && englishName !== '') ? String(englishName).trim() : (name != null ? String(name).trim() : '');
    const nameSlug = slug(nameForSlug);
    const stateSlug = state != null && String(state).trim() !== '' ? slug(String(state).trim()) : '';
    const countrySlug = country != null && String(country).trim() !== '' ? slug(String(country).trim()) : '';
    pageParam = nameSlug ? (stateSlug ? nameSlug + '-' + stateSlug : countrySlug ? nameSlug + '-' + countrySlug : nameSlug) : '';
  }

  const popupUrl = pageParam
    ? new URL('wiki/resort.html', location.href).href + '?page=' + encodeURIComponent(pageParam)
    : new URL('wiki/browse.html', location.href).href;
  const stored = JSON.stringify({ name: displayStr || name || null, id: id != null ? String(id) : null, lat, lon });
  const storedAttr = stored.replace(/"/g, '&quot;');

  let extraButtons = '';
  if (options.includeRoadTripButton) {
    const rn = escapeHtmlFn(String(displayStr || name || 'Resort'));
    const rc = country != null && String(country).trim() ? escapeHtmlFn(String(country).trim()) : '';
    extraButtons = `<button class="rtp-add-btn" data-resort-name="${rn}" data-resort-lat="${lat ?? 0}" data-resort-lon="${lon ?? 0}" data-resort-country="${rc}"><i class="bi bi-plus-circle"></i> Road Trip</button>`;
  }

  return (
    `<div class="sr-popup-actions">` +
    `<a href="#" data-resort-url="${escapeHtmlFn(popupUrl)}" data-resort-stored="${storedAttr}" class="resort-details-link sr-details-btn">View details <i class="bi bi-arrow-up-right"></i></a>` +
    extraButtons +
    `</div>`
  );
}

function buildStatsStrip(record, cmp, escapeHtmlFn) {
  const chips = [];
  if (record.trails > 0) chips.push(['Trails', record.trails.toLocaleString()]);
  if (record.lifts > 0) chips.push(['Lifts', record.lifts.toLocaleString()]);
  if (record.acres > 0) chips.push(['Terrain', `${Math.round(record.acres).toLocaleString()} ac`]);
  if (cmp?.trails?.state && record.state) {
    chips.push([record.state, `#${cmp.trails.state.rank} of ${cmp.trails.state.total}`]);
  } else if (cmp?.trails?.global) {
    chips.push(['World rank', `#${cmp.trails.global.rank} of ${cmp.trails.global.total.toLocaleString()}`]);
  }
  if (record.countryNorm) chips.push(['Country', record.countryNorm]);

  if (!chips.length) return '';
  return (
    `<div class="sr-stat-strip">` +
    chips.map(([k, v]) =>
      `<span class="sr-stat-chip"><span class="sr-stat-k">${escapeHtmlFn(k)}</span>${escapeHtmlFn(String(v))}</span>`
    ).join('') +
    `</div>`
  );
}

/**
 * @param {object} properties - resort catalog properties
 * @param {{ lat, lng }} latlng
 * @param {{ includeRoadTripButton?: boolean, wikiPage?: object, statsIndex?: object, escapeHtml?: function }} options
 */
export function buildResortPopupHtml(properties, latlng, options = {}) {
  const escapeHtmlFn = options.escapeHtml || escapeHtml;
  if (!properties || !Object.keys(properties).length) return '<em>No data</em>';

  const wikiPage = options.wikiPage || null;
  const statsIndex = options.statsIndex || null;
  const displayStr = wikiPage ? wikiDisplayName(wikiPage) : (resortDisplayName(properties) || getProp(properties, NAME_KEYS) || '');
  const displayName = displayStr ? escapeHtmlFn(String(displayStr).trim()) : 'Resort';

  const geometry = latlng ? { type: 'Point', coordinates: [latlng.lng, latlng.lat] } : null;
  const record = statsIndex
    ? (findResortInIndex(statsIndex, properties) || parseResortRecord(properties, geometry, displayStr))
    : parseResortRecord(properties, geometry, displayStr);

  const cmp = statsIndex ? compareResort(record, statsIndex) : null;
  const charts = statsIndex ? buildResortComparisonCharts(record, statsIndex) : { html: '', caption: '' };

  const badge = categoryBadgeHtml(record.category, escapeHtmlFn);
  const terrainStr = formatSkiableTerrain(
    getProp(properties, SKIABLE_TERRAIN_ACRES_KEYS),
    getProp(properties, SKIABLE_TERRAIN_HA_KEYS)
  );

  let headline = '';
  if (charts.caption) {
    headline = `<div class="sr-headline">${escapeHtmlFn(charts.caption)}</div>`;
  } else if (cmp?.trails?.global) {
    headline = `<div class="sr-headline">More trails than ${cmp.trails.global.pct}% of resorts worldwide</div>`;
  } else if (terrainStr) {
    headline = `<div class="sr-headline">${escapeHtmlFn(terrainStr)}</div>`;
  }

  const foot = statsIndex
    ? `Compared against ${statsIndex.count.toLocaleString()} downhill resorts`
    : '';

  return (
    `<div class="sf-popup sr-popup sr-popup-wide">` +
    `<div class="sr-popup-header">` +
    `<div class="sr-title-row">` +
    `<div class="sf-popup-title">${displayName}</div>` +
    `<div class="sf-popup-badge">${badge}</div>` +
    `</div>` +
    (headline ? headline : '') +
    `</div>` +
    `<div class="sr-popup-body">` +
    charts.html +
    buildStatsStrip(record, cmp, escapeHtmlFn) +
    `</div>` +
    `<div class="sr-popup-footer">` +
    buildActionButtons(properties, latlng, displayStr, options, wikiPage, escapeHtmlFn) +
    (foot ? `<div class="sf-popup-foot">${foot}</div>` : '') +
    `</div>` +
    `</div>`
  );
}

/** Compact hover tooltip for resort markers. */
export function buildResortHoverHtml(properties, displayName, statsIndex, escapeHtmlFn, options = {}) {
  const record = statsIndex ? findResortInIndex(statsIndex, properties) : null;
  const name = escapeHtmlFn(displayName || 'Resort');
  let html = `<div class="tt-name">${name}</div>`;

  const facts = [];
  if (record?.trails > 0) facts.push(`${record.trails} trails`);
  if (record?.lifts > 0) facts.push(`${record.lifts} lifts`);
  if (record?.acres > 0) facts.push(`${Math.round(record.acres).toLocaleString()} ac`);

  if (facts.length) html += `<div class="tt-hint">${escapeHtmlFn(facts.join(' · '))}</div>`;

  if (record && statsIndex && !options.circleLayer) {
    const cmp = compareResort(record, statsIndex);
    if (cmp?.trails?.state && record.state) {
      html += `<div class="tt-hint sf-fact">#${cmp.trails.state.rank} of ${cmp.trails.state.total} in ${escapeHtmlFn(record.state)}</div>`;
    } else if (cmp?.trails?.global) {
      html += `<div class="tt-hint sf-fact">Top ${100 - cmp.trails.global.pct}% worldwide by trails</div>`;
    }
  }

  if (options.circleLayer) {
    html += `<div class="tt-hint" style="margin-top:3px;color:#7dd3fc">🔍 Click to zoom in</div>`;
  } else {
    html += `<div class="tt-hint sf-click-hint">Click for stats & charts</div>`;
  }
  return html;
}

export { buildResortStatsIndex };

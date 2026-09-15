/**
 * Join Storm Skiing partner roster onto atlas winter_sports_id.
 *
 * High confidence (auto-accept): override, alias, unique name+state, unique
 * name+country, unique variant key in country, unique token-containment in country.
 * Token-overlap guesses are review-only (ambiguous/unmatched TSV).
 *
 * Usage:
 *   node scripts/join-pass-affiliations.mjs [--limit 100]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  contentTokens,
  fold,
  jaccard,
  nameKeys,
  normalizeCountry,
  parsePassFamilies,
  parseStormRegion,
  extraTokensAreWeak,
  tokensContained
} from './pass-join/normalize.mjs';
import { mergeOverrides } from './sync-pass-overrides.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data/passes/raw/2026-27/all-partners.csv');
const ALIAS_PATH = path.join(ROOT, 'data/passes/aliases.json');
const OVERRIDE_PATH = path.join(ROOT, 'data/passes/overrides.json');
const REPORT_DIR = path.join(ROOT, 'data/passes/reports');
const OUT_JSON = path.join(ROOT, 'data/pass-affiliations.json');
const PARQUET_URL =
  'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const SEASON = '2026-27';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function stormPartners(rows, limit) {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const a = String(rows[i][0] || '').replace(/\s+/g, ' ').trim();
    const b = String(rows[i][1] || '').replace(/\s+/g, ' ').trim();
    if (a === 'Province' && b.startsWith('Ski Area')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error('Could not find Province/Ski Area header');

  const out = [];
  const seen = new Set();
  let lastRegion = '';
  for (let i = headerIdx + 1; i < rows.length && out.length < limit; i++) {
    const region = String(rows[i][0] || '').replace(/\s+/g, ' ').trim();
    const name = String(rows[i][1] || '').replace(/\s+/g, ' ').trim();
    const pass = String(rows[i][6] || '').replace(/\s+/g, ' ').trim();
    if (!name || name === 'Ski Area' || name === 'Province') continue;
    if (/^total /i.test(name)) continue;
    if (region) lastRegion = region;
    const geo = parseStormRegion(region || lastRegion);
    const dedupe = fold(name) + '|' + geo.country + '|' + geo.state;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({
      region: region || lastRegion,
      name,
      pass_raw: pass,
      passes: parsePassFamilies(pass),
      country: geo.country,
      state: geo.state,
      row: i + 1
    });
  }
  return out;
}

async function loadAtlas() {
  const { parquetRead } = await import('hyparquet');
  const cache = path.join(os.tmpdir(), 'gsa-ski_areas_analyzed.parquet');
  if (!fs.existsSync(cache) || fs.statSync(cache).size < 1000) {
    console.error('Downloading parquet…');
    const res = await fetch(PARQUET_URL);
    if (!res.ok) throw new Error('parquet fetch ' + res.status);
    fs.writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
  }
  const buffer = fs.readFileSync(cache);
  const asyncBuffer = {
    byteLength: buffer.byteLength,
    slice: (start, end) =>
      Promise.resolve(
        buffer.buffer.slice(
          buffer.byteOffset + start,
          buffer.byteOffset + (end !== undefined ? end : buffer.byteLength)
        )
      )
  };
  let rows = [];
  await parquetRead({
    file: asyncBuffer,
    rowFormat: 'object',
    onComplete: (data) => {
      rows = data;
    }
  });
  return rows;
}

function uniqueByWs(hits) {
  const seen = new Set();
  const out = [];
  for (const h of hits) {
    const id = String(h.ws || h.display);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(h);
  }
  return out;
}

function atlasIndexes(rows) {
  const byKeyCountry = new Map();
  const byKeyCountryState = new Map();
  const byCountry = new Map();
  const byWs = new Map();

  for (const r of rows) {
    const country = normalizeCountry(r.country);
    const state = fold(r.state || '').replace(/[^a-z0-9]+/g, ' ').trim();
    const ws = String(r.winter_sports_id || '');
    const display = String(r.english_name || r.name || '').trim();
    const names = [r.name, r.english_name].filter(Boolean);
    const tokens = contentTokens(names.join(' '));
    const rec = {
      display,
      country,
      state,
      ws,
      tokens,
      names: names.map(String),
      osmName: String(r.name || display)
    };
    if (ws && !byWs.has(ws)) byWs.set(ws, rec);
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country).push(rec);
    for (const n of names) {
      for (const key of nameKeys(n)) {
        const ck = key + '|' + country;
        if (!byKeyCountry.has(ck)) byKeyCountry.set(ck, []);
        byKeyCountry.get(ck).push(rec);
        if (state) {
          const csk = key + '|' + country + '|' + state;
          if (!byKeyCountryState.has(csk)) byKeyCountryState.set(csk, []);
          byKeyCountryState.get(csk).push(rec);
        }
      }
    }
  }
  return { byKeyCountry, byKeyCountryState, byCountry, byWs };
}

function lookupKeys(idx, storm) {
  const keys = nameKeys(storm.name);
  const hitsState = [];
  const hitsCountry = [];
  for (const key of keys) {
    if (storm.country && storm.state) {
      hitsState.push(...(idx.byKeyCountryState.get(key + '|' + storm.country + '|' + storm.state) || []));
    }
    if (storm.country) {
      hitsCountry.push(...(idx.byKeyCountry.get(key + '|' + storm.country) || []));
    }
  }
  return {
    state: uniqueByWs(hitsState),
    country: uniqueByWs(hitsCountry)
  };
}

function containmentHits(storm, pool) {
  const inner = contentTokens(storm.name);
  if (inner.length < 1) return [];
  return uniqueByWs(
    pool.filter((a) => {
      const outer = a.tokens;
      if (tokensContained(inner, outer)) {
        if (inner.length >= 2) return true;
        return extraTokensAreWeak(inner, outer) || outer.length === inner.length;
      }
      if (tokensContained(outer, inner)) {
        if (outer.length >= 2) return extraTokensAreWeak(outer, inner) || inner.length === outer.length;
        return extraTokensAreWeak(outer, inner);
      }
      return false;
    })
  );
}

function overlapGuesses(storm, pool, n = 5) {
  const inner = contentTokens(storm.name);
  const scored = pool
    .map((a) => ({ a, score: jaccard(inner, a.tokens) }))
    .filter((x) => x.score >= 0.34)
    .sort((x, y) => y.score - x.score);
  const uniq = [];
  const seen = new Set();
  for (const x of scored) {
    if (seen.has(x.a.ws)) continue;
    seen.add(x.a.ws);
    uniq.push(x);
    if (uniq.length >= n) break;
  }
  return uniq;
}

function loadJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(raw) ? raw : raw.aliases || raw.overrides || [];
}

function matchOne(storm, idx, aliases, overrides) {
  const ovr = overrides.find(
    (o) =>
      fold(o.storm_name) === fold(storm.name) &&
      (!o.country || normalizeCountry(o.country) === storm.country)
  );
  if (ovr?.skip) {
    return { status: 'skipped', confidence: 'none', hits: [], guesses: [] };
  }
  if (ovr?.winter_sports_id && idx.byWs.has(String(ovr.winter_sports_id))) {
    return {
      status: 'override',
      confidence: 'high',
      hits: [idx.byWs.get(String(ovr.winter_sports_id))],
      also_ids: ovr.also_ids || []
    };
  }

  const al = aliases.find(
    (o) =>
      fold(o.storm_name) === fold(storm.name) &&
      (!o.country || normalizeCountry(o.country) === storm.country)
  );
  if (al?.winter_sports_id && idx.byWs.has(String(al.winter_sports_id))) {
    return {
      status: 'alias',
      confidence: 'high',
      hits: [idx.byWs.get(String(al.winter_sports_id))],
      also_ids: al.also_ids || []
    };
  }

  const { state, country } = lookupKeys(idx, storm);
  if (state.length === 1) {
    return { status: 'exact_state', confidence: 'high', hits: state };
  }
  if (state.length > 1) {
    return { status: 'ambiguous_state', confidence: 'review', hits: state };
  }
  if (!storm.state) {
    if (country.length === 1) {
      return { status: 'exact_country', confidence: 'high', hits: country };
    }
    if (country.length > 1) {
      return { status: 'ambiguous_country', confidence: 'review', hits: country };
    }
  }

  const pool = storm.state
    ? (idx.byCountry.get(storm.country) || []).filter((a) => a.state === storm.state)
    : idx.byCountry.get(storm.country) || [];
  const contained = containmentHits(storm, pool);
  if (contained.length === 1) {
    return { status: 'containment', confidence: 'high', hits: contained };
  }
  if (contained.length > 1) {
    return { status: 'ambiguous_containment', confidence: 'review', hits: contained };
  }

  if (storm.state && country.length === 1) {
    return { status: 'country_vs_state', confidence: 'review', hits: country };
  }
  if (country.length > 1) {
    return { status: 'ambiguous_country', confidence: 'review', hits: country };
  }

  const guesses = overlapGuesses(storm, pool.length ? pool : [...idx.byWs.values()]);
  if (guesses.length === 1 && guesses[0].score >= 0.6) {
    return {
      status: 'overlap_unique',
      confidence: 'review',
      hits: [guesses[0].a],
      guesses
    };
  }
  return {
    status: 'unmatched',
    confidence: 'none',
    hits: [],
    guesses
  };
}

function toTsv(rows, columns) {
  const esc = (v) => String(v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return [columns.join('\t'), ...rows.map((r) => columns.map((c) => esc(r[c])).join('\t'))].join('\n') + '\n';
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8');
const storm = stormPartners(parseCsv(csvText), LIMIT);
console.error(`Storm unique partners: ${storm.length}`);

const atlas = await loadAtlas();
console.error(`Atlas rows: ${atlas.length}`);
const idx = atlasIndexes(atlas);
const aliases = loadJsonArray(ALIAS_PATH);
const overrides = mergeOverrides();

const results = storm.map((s) => ({ storm: s, match: matchOne(s, idx, aliases, overrides) }));

const high = results.filter((r) => r.match.confidence === 'high');
const review = results.filter((r) => r.match.confidence === 'review');
const unmatched = results.filter((r) => r.match.confidence === 'none');

const byStatus = {};
for (const r of results) {
  byStatus[r.match.status] = (byStatus[r.match.status] || 0) + 1;
}

const passCounts = { epic: { n: 0, high: 0 }, ikon: { n: 0, high: 0 }, indy: { n: 0, high: 0 }, mountain_collective: { n: 0, high: 0 } };
for (const r of results) {
  for (const p of r.storm.passes) {
    if (!passCounts[p]) continue;
    passCounts[p].n += 1;
    if (r.match.confidence === 'high') passCounts[p].high += 1;
  }
}

console.log(
  JSON.stringify(
    {
      season: SEASON,
      storm_unique: storm.length,
      high_confidence: high.length,
      review: review.length,
      unmatched: unmatched.length,
      match_rate_high: Number((high.length / storm.length).toFixed(3)),
      by_status: byStatus,
      by_pass: passCounts
    },
    null,
    2
  )
);

const affiliations = {};
for (const r of high) {
  const hit = r.match.hits[0];
  const ws = String(hit.ws);
  if (!affiliations[ws]) {
    affiliations[ws] = {
      winter_sports_id: ws,
      atlas_name: hit.display,
      storm_names: [],
      passes: [],
      season: SEASON,
      confidence: r.match.status,
      review_confirmed: r.match.status === 'override'
    };
  }
  if (!affiliations[ws].storm_names.includes(r.storm.name)) {
    affiliations[ws].storm_names.push(r.storm.name);
  }
  for (const p of r.storm.passes) {
    if (!affiliations[ws].passes.includes(p)) affiliations[ws].passes.push(p);
  }
  if (r.match.status === 'override') affiliations[ws].review_confirmed = true;
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  season: SEASON,
  generated_at: new Date().toISOString(),
  source: {
    name: 'The Storm Skiing Journal',
    toolkit: 'https://www.stormskiing.com/p/a-big-dumb-toolkit-for-2026-27-ski',
    workbook: 'https://docs.google.com/spreadsheets/d/1G2-l2DVg7-QwroOi7EqRDrJYJ4ICYLcJbLx-nARJdrA'
  },
  by_id: affiliations
}, null, 2));

const guessCol = (r) =>
  (r.match.guesses || r.match.hits || [])
    .slice(0, 5)
    .map((g) => {
      const a = g.a || g;
      const sc = g.score != null ? g.score.toFixed(2) : '';
      return `${a.display} [${a.country}/${a.state} ${a.ws}]${sc ? ' ' + sc : ''}`;
    })
    .join(' | ');

fs.writeFileSync(
  path.join(REPORT_DIR, 'matched.tsv'),
  toTsv(
    high.map((r) => ({
      storm_name: r.storm.name,
      region: r.storm.region,
      passes: r.storm.passes.join(','),
      status: r.match.status,
      atlas_name: r.match.hits[0].display,
      winter_sports_id: r.match.hits[0].ws
    })),
    ['storm_name', 'region', 'passes', 'status', 'atlas_name', 'winter_sports_id']
  )
);
fs.writeFileSync(
  path.join(REPORT_DIR, 'unmatched.tsv'),
  toTsv(
    unmatched.map((r) => ({
      storm_name: r.storm.name,
      region: r.storm.region,
      passes: r.storm.passes.join(','),
      guesses: guessCol(r)
    })),
    ['storm_name', 'region', 'passes', 'guesses']
  )
);
fs.writeFileSync(
  path.join(REPORT_DIR, 'ambiguous.tsv'),
  toTsv(
    review.map((r) => ({
      storm_name: r.storm.name,
      region: r.storm.region,
      passes: r.storm.passes.join(','),
      status: r.match.status,
      guesses: guessCol(r)
    })),
    ['storm_name', 'region', 'passes', 'status', 'guesses']
  )
);

function wikiSlug(str) {
  if (str == null || str === '') return 'unknown';
  return (
    String(str)
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'unknown'
  );
}

function suggestedPageId(hit) {
  if (!hit) return '';
  const nameSlug = wikiSlug(hit.osmName || hit.display);
  const stateSlug = hit.state ? wikiSlug(hit.state) : '';
  const countrySlug = hit.country ? wikiSlug(hit.country) : '';
  return stateSlug ? nameSlug + '-' + stateSlug : countrySlug ? nameSlug + '-' + countrySlug : nameSlug;
}

const queue = results.map((r) => {
  const hit = r.match.hits && r.match.hits[0];
  return {
    storm_name: r.storm.name,
    region: r.storm.region,
    country: r.storm.country,
    state: r.storm.state,
    passes: r.storm.passes,
    pass_raw: r.storm.pass_raw,
    status: r.match.status,
    confidence: r.match.confidence,
    suggested: hit
      ? {
          atlas_name: hit.display,
          winter_sports_id: String(hit.ws || ''),
          page_id: suggestedPageId(hit)
        }
      : null,
    guesses: (r.match.guesses || [])
      .slice(0, 5)
      .map((g) => {
        const a = g.a || g;
        return {
          atlas_name: a.display,
          winter_sports_id: String(a.ws || ''),
          page_id: suggestedPageId(a),
          score: g.score
        };
      })
  };
});
fs.writeFileSync(path.join(REPORT_DIR, 'review-queue.json'), JSON.stringify({ season: SEASON, items: queue }, null, 2));

console.error(`Wrote ${OUT_JSON}`);
console.error(`Reports in ${REPORT_DIR}`);

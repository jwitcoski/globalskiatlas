/**
 * Sample join: first N Storm partner rows (leftmost table in all-partners.csv)
 * against ski_areas_analyzed.parquet names.
 *
 * Usage: node scripts/join-pass-sample.mjs [limit=100]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data/passes/raw/2026-27/all-partners.csv');
const PARQUET_URL =
  'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const LIMIT = Number(process.argv[2] || 100);

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

function normalizeName(s) {
  if (s == null) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(ski\s+resort|snow\s+resort|mountain\s+resort|ski\s+area|resort)\b/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countryHint(region) {
  const r = String(region || '').toLowerCase();
  if (r.includes('u.s') || r.startsWith('us ') || r === 'us') return 'united states';
  if (r.includes('canada')) return 'canada';
  if (r.includes('japan')) return 'japan';
  if (r.includes('australia')) return 'australia';
  if (r.includes('chile')) return 'chile';
  if (r.includes('china')) return 'china';
  if (r.includes('new zealand')) return 'new zealand';
  if (r.includes('andorr')) return 'andorra';
  if (r.includes('austria')) return 'austria';
  if (r.includes('france')) return 'france';
  if (r.includes('italy')) return 'italy';
  if (r.includes('switzerland')) return 'switzerland';
  if (r.includes('germany')) return 'germany';
  if (r.includes('finland')) return 'finland';
  if (r.includes('norway')) return 'norway';
  if (r.includes('sweden')) return 'sweden';
  if (r.includes('spain')) return 'spain';
  if (r.includes('scotland')) return 'united kingdom';
  if (r.includes('slovenia')) return 'slovenia';
  if (r.includes('turkey')) return 'turkey';
  if (r.includes('czech')) return 'czechia';
  return '';
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
  let lastRegion = '';
  for (let i = headerIdx + 1; i < rows.length && out.length < limit; i++) {
    const region = String(rows[i][0] || '').replace(/\s+/g, ' ').trim();
    const name = String(rows[i][1] || '').replace(/\s+/g, ' ').trim();
    const pass = String(rows[i][6] || '').replace(/\s+/g, ' ').trim();
    if (!name || name === 'Ski Area' || name === 'Province') continue;
    if (/^total /i.test(name)) continue;
    if (region) lastRegion = region;
    out.push({
      region: region || lastRegion,
      name,
      pass,
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

function atlasIndexes(rows) {
  const byName = new Map();
  const byNameCountry = new Map();
  for (const r of rows) {
    const names = [r.name, r.english_name, r.Name, r.englishName].filter(Boolean);
    const country = normalizeName(r.country || r.Country || '');
    const ws = r.winter_sports_id || r.winterSportsId || '';
    const display = String(r.english_name || r.name || '').trim();
    for (const n of names) {
      const key = normalizeName(n);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push({ display, country, ws, rawName: String(n) });
      const ck = key + '|' + country;
      if (!byNameCountry.has(ck)) byNameCountry.set(ck, []);
      byNameCountry.get(ck).push({ display, country, ws, rawName: String(n) });
    }
  }
  return { byName, byNameCountry };
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

function matchOne(storm, idx) {
  const key = normalizeName(storm.name);
  const country = countryHint(storm.region);
  if (country) {
    const geo = uniqueByWs(idx.byNameCountry.get(key + '|' + country) || []);
    if (geo.length === 1) return { status: 'exact_geo', hits: geo };
    if (geo.length > 1) return { status: 'ambiguous_geo', hits: geo };
  }
  const all = uniqueByWs(idx.byName.get(key) || []);
  if (all.length === 1) return { status: 'exact_name', hits: all };
  if (all.length > 1) return { status: 'ambiguous_name', hits: all };
  return { status: 'unmatched', hits: [] };
}

const csvText = fs.readFileSync(CSV_PATH, 'utf8');
const storm = stormPartners(parseCsv(csvText), LIMIT);
console.error(`Storm rows: ${storm.length} from ${path.relative(ROOT, CSV_PATH)}`);

const atlas = await loadAtlas();
console.error(`Atlas rows: ${atlas.length}`);
const idx = atlasIndexes(atlas);

const buckets = {
  exact_geo: [],
  exact_name: [],
  ambiguous_geo: [],
  ambiguous_name: [],
  unmatched: []
};

for (const s of storm) {
  const m = matchOne(s, idx);
  buckets[m.status].push({ storm: s, match: m });
}

const uniqueHits = buckets.exact_geo.length + buckets.exact_name.length;
console.log(
  JSON.stringify(
    {
      limit: LIMIT,
      storm_rows: storm.length,
      exact_geo: buckets.exact_geo.length,
      exact_name: buckets.exact_name.length,
      unique_matches: uniqueHits,
      match_rate: Number((uniqueHits / storm.length).toFixed(3)),
      ambiguous_geo: buckets.ambiguous_geo.length,
      ambiguous_name: buckets.ambiguous_name.length,
      unmatched: buckets.unmatched.length
    },
    null,
    2
  )
);

console.log('\n--- unmatched ---');
for (const x of buckets.unmatched) {
  console.log(`${x.storm.region} | ${x.storm.name} | ${x.storm.pass}`);
}
console.log('\n--- ambiguous ---');
for (const x of [...buckets.ambiguous_geo, ...buckets.ambiguous_name]) {
  const names = x.match.hits
    .slice(0, 5)
    .map((h) => `${h.display} [${h.country} ${h.ws}]`)
    .join('; ');
  console.log(`${x.storm.region} | ${x.storm.name} -> ${x.match.status}: ${names}`);
}

/**
 * One-off analysis: count resorts per size category and estimate book pages.
 * Uses the same rule as the plan (section 2): trails + skiable_terrain_acres (or ha to acres).
 *
 * Usage: node scripts/wiki-analyze-parquet-categories.js [parquet-url-or-path]
 * Default URL: ski_areas_analyzed.parquet from S3 (same as ingest).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const defaultParquetUrl = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';

const RESORT_TYPE_KEYS = ['resort_type', 'Resort Type'];
const NOT_DOWNHILL = 'not a downhill ski resort';

function getProp(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return undefined;
}

function isNotDownhill(row) {
  const v = getProp(row, RESORT_TYPE_KEYS);
  return v != null && String(v).toLowerCase().trim() === NOT_DOWNHILL.toLowerCase();
}

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function resortSizeCategory(row) {
  // Excluded from "downhill" count: no lift or slope in OSM (index.html shows "462 areas excluded")
  if (isNotDownhill(row)) return 'unknown';
  const trails = num(row.downhill_trails);
  const lifts = num(row.total_lifts);
  let acres = num(row.skiable_terrain_acres);
  if (acres == null && row.skiable_terrain_ha != null) {
    const ha = num(row.skiable_terrain_ha);
    if (ha != null) acres = ha * 2.471; // ha to acres
  }
  const hasTrails = trails != null && trails >= 0;
  const hasLifts = lifts != null && lifts >= 0;
  // Unknown if missing trails OR lifts (no matter acres)
  if (!hasTrails || !hasLifts) return 'unknown';
  const hasAcres = acres != null && acres >= 0;
  const t = trails;
  const a = hasAcres ? acres : 0;
  // Mega = OR (catch large resorts with no trails marked)
  if (t >= 200 || a >= 10000) return 'mega_resort';
  if (t >= 100 || a >= 5000) return 'multiple_mountains';
  if (t >= 50 || a >= 1000) return 'ski_mountain';
  return 'small_hill';
}

async function downloadParquet(url) {
  const tmpPath = path.join(os.tmpdir(), 'ywiki-analyze-' + Date.now() + '.parquet');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function readParquetFile(filePath) {
  const { parquetRead } = await import('hyparquet');
  const buffer = fs.readFileSync(filePath);
  const asyncBuffer = {
    byteLength: buffer.byteLength,
    slice: (start, end) => Promise.resolve(buffer.buffer.slice(
      buffer.byteOffset + start,
      buffer.byteOffset + (end !== undefined ? end : buffer.byteLength)
    )),
  };
  let rows = [];
  await parquetRead({
    file: asyncBuffer,
    rowFormat: 'object',
    onComplete: (data) => { rows = data; },
  });
  return rows;
}

// Page allocation: 1/4, 1/2, 1, 2 pages per category; unknown = 0 (no book page)
const PAGES = { small_hill: 0.25, ski_mountain: 0.5, multiple_mountains: 1, mega_resort: 2, unknown: 0 };

async function main() {
  const input = process.argv[2] || defaultParquetUrl;
  let filePath = input;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    console.log('Downloading parquet from', input);
    filePath = await downloadParquet(input);
  } else if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  console.log('Reading parquet:', filePath);
  const rows = await readParquetFile(filePath);
  console.log('Total rows:', rows.length);

  const counts = { small_hill: 0, ski_mountain: 0, multiple_mountains: 0, mega_resort: 0, unknown: 0 };
  for (const row of rows) {
    const cat = resortSizeCategory(row);
    if (counts[cat] != null) counts[cat]++;
    else counts[cat] = 1;
  }

  let totalPages = 0;
  console.log('\nResorts per category:');
  console.log('----------------------');
  for (const [cat, n] of Object.entries(counts)) {
    const pages = n * PAGES[cat];
    totalPages += pages;
    console.log('  ' + cat + ': ' + n + ' resorts  ->  ' + pages.toFixed(2) + ' pages');
  }
  console.log('----------------------');
  console.log('  Total resort pages (estimate): ' + totalPages.toFixed(1));
  console.log('\nPage allocation: small_hill=1/4, ski_mountain=1/2, multiple=1, mega=2, unknown=0 (no book page)');

  if (input.startsWith('http') && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

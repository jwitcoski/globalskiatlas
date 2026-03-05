/**
 * One-time (or rerunnable) ingestion: read ski_areas_analyzed.parquet and populate DynamoDB WikiPages.
 * Revisions and comments are not created from parquet.
 *
 * Usage:
 *   node scripts/wiki-ingest-parquet.js [parquet-url-or-path]
 * Default URL: https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet
 *
 * Env: AWS_REGION, DYNAMODB_TABLE_PREFIX (default ywiki). Loads .env from project root if present.
 * Requires AWS credentials.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const defaultParquetUrl = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined/ski_areas_analyzed.parquet';
const prefix = process.env.DYNAMODB_TABLE_PREFIX || 'ywiki';
const tableName = `${prefix}-WikiPages`;
const region = process.env.AWS_REGION || 'us-east-1';
const BATCH_SIZE = 25;

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

function slug(str) {
  if (str == null || str === '') return 'unknown';
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

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

function resortSizeCategory(row) {
  if (isNotDownhill(row)) return 'unknown';
  const trails = num(row.downhill_trails);
  const lifts = num(row.total_lifts);
  let acres = num(row.skiable_terrain_acres);
  if (acres == null && row.skiable_terrain_ha != null) {
    const ha = num(row.skiable_terrain_ha);
    if (ha != null) acres = ha * 2.471;
  }
  const hasTrails = trails != null && trails >= 0;
  const hasLifts = lifts != null && lifts >= 0;
  if (!hasTrails || !hasLifts) return 'unknown';
  const hasAcres = acres != null && acres >= 0;
  const t = trails;
  const a = hasAcres ? acres : 0;
  if (t >= 200 || a >= 10000) return 'mega_resort';
  if (t >= 100 || a >= 5000) return 'multiple_mountains';
  if (t >= 50 || a >= 1000) return 'ski_mountain';
  return 'small_hill';
}

/** Returns Americas | Europe | Asia/Africa/Oceania | Other (plan section 3). */
function countryToBook(c) {
  if (!c || typeof c !== 'string') return 'Other';
  const s = c.toLowerCase().trim();
  if (/^(united states|usa|u\.?s\.?a\.?|canada|mexico|guatemala|belize|honduras|el salvador|nicaragua|costa rica|panama)$/i.test(s)) return 'Americas';
  if (/^(argentina|bolivia|brazil|chile|colombia|ecuador|peru|venezuela|uruguay|paraguay)$/i.test(s)) return 'Americas';
  if (/^(japan|china|south korea|north korea|taiwan|mongolia)$/i.test(s)) return 'Asia/Africa/Oceania';
  if (/^(australia|new zealand)$/i.test(s)) return 'Asia/Africa/Oceania';
  if (/^(india|nepal|pakistan|kazakhstan|uzbekistan|kyrgyzstan|tajikistan)$/i.test(s)) return 'Asia/Africa/Oceania';
  if (/^(south africa|lesotho|morocco|algeria|egypt)$/i.test(s)) return 'Asia/Africa/Oceania';
  if (/^(russia|georgia|armenia|azerbaijan)$/i.test(s)) return 'Europe';
  if (/(austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|iceland|ireland|italy|latvia|liechtenstein|lithuania|luxembourg|malta|netherlands|norway|poland|portugal|romania|slovakia|slovenia|spain|sweden|switzerland|turkey|ukraine|united kingdom|uk|andorra|monaco|serbia|bosnia|montenegro|albania|macedonia|belarus|moldova)/i.test(s)) return 'Europe';
  return 'Asia/Africa/Oceania';
}

function str(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function buildContent(row) {
  const nameKeys = ['name', 'Name', 'resort_name', 'title'];
  const name = str(getProp(row, nameKeys));
  const lines = name ? ['# ' + name, ''] : [];
  lines.push('*Add a description for this resort.*');
  return lines.join('\n').trim() || '# ' + (name || 'Resort');
}

function rowToItem(row) {
  const nameKeys = ['name', 'Name', 'resort_name', 'title'];
  const stateKeys = ['state', 'State', 'addr:state', 'province', 'addr:province', 'state_province', 'region'];
  const countryKeys = ['country', 'Country', 'addr:country', 'country_name'];
  const name = str(getProp(row, nameKeys));
  const nameSlug = slug(name);
  const stateSlug = str(getProp(row, stateKeys)) ? slug(getProp(row, stateKeys)) : '';
  const countrySlug = str(getProp(row, countryKeys)) ? slug(getProp(row, countryKeys)) : '';
  const pageId = stateSlug ? nameSlug + '-' + stateSlug : (countrySlug ? nameSlug + '-' + countrySlug : nameSlug) || 'unknown';
  const now = new Date().toISOString();
  const sizeCat = resortSizeCategory(row);
  const country = str(getProp(row, countryKeys));
  const book = countryToBook(country);
  const stateStr = str(getProp(row, stateKeys));
  const categorization = {
    country,
    state: stateStr,
    region: str(row.region),
    size: sizeCat,
    book,
  };
  const elevationHighKeys = ['elevation_high_m', 'high_elevation_m', 'summit_elevation_m', 'elevation_summit_m', 'highElevationM'];
  const elevationLowKeys = ['elevation_low_m', 'low_elevation_m', 'base_elevation_m', 'elevation_base_m', 'lowElevationM'];
  const highElevationM = num(getProp(row, elevationHighKeys));
  const lowElevationM = num(getProp(row, elevationLowKeys));
  const item = {
    pageId,
    title: name || pageId,
    content: buildContent(row),
    winterSportsId: str(row.winter_sports_id),
    winterSportsType: str(row.winter_sports_type),
    country,
    state: stateStr,
    region: str(row.region),
    categorization,
    resortSizeCategory: sizeCat,
    book,
    centroidLat: num(row.centroid_lat),
    centroidLon: num(row.centroid_lon),
    totalAreaHa: num(row.total_area_ha),
    totalAreaAcres: num(row.total_area_acres),
    skiableTerrainHa: num(row.skiable_terrain_ha),
    skiableTerrainAcres: num(row.skiable_terrain_acres),
    totalLifts: str(row.total_lifts),
    longestLiftMi: num(row.longest_lift_mi),
    downhillTrails: str(row.downhill_trails),
    longestTrailMi: num(row.longest_trail_mi),
    avgTrailMi: num(row.avg_trail_mi),
    trailsNovice: str(row.trails_novice),
    trailsEasy: str(row.trails_easy),
    trailsIntermediate: str(row.trails_intermediate),
    trailsAdvanced: str(row.trails_advanced),
    trailsExpert: str(row.trails_expert),
    trailsFreeride: str(row.trails_freeride),
    trailsExtreme: str(row.trails_extreme),
    gladedTerrain: str(row.gladed_terrain),
    snowPark: str(row.snow_park),
    sleddingTubing: str(row.sledding_tubing),
    liftTypes: str(row.lift_types),
    resortType: str(row.resort_type),
    ...(highElevationM != null && { highElevationM }),
    ...(lowElevationM != null && { lowElevationM }),
    pageType: 'resort',
    createdAt: now,
    updatedAt: now,
    status: 'published',
  };
  return item;
}

function buildCountryItem(country) {
  const now = new Date().toISOString();
  const pageId = 'country-' + slug(country);
  const book = countryToBook(country);
  return {
    pageId,
    title: country,
    content: '*Add an overview of ski areas in ' + (country || 'this country') + '.*',
    pageType: 'country',
    country,
    categorization: { country, book },
    book,
    createdAt: now,
    updatedAt: now,
    status: 'published',
  };
}

function buildStateItem(state, country) {
  const now = new Date().toISOString();
  const pageId = 'state-' + slug(state) + '-' + slug(country);
  const book = countryToBook(country);
  return {
    pageId,
    title: state,
    content: '*Add an overview of ski areas in ' + (state || 'this region') + ', ' + (country || '') + '.*',
    pageType: 'state',
    state,
    country,
    categorization: { state, country, book },
    book,
    createdAt: now,
    updatedAt: now,
    status: 'published',
  };
}

async function downloadParquet(url) {
  const tmpPath = path.join(os.tmpdir(), 'ywiki-ingest-' + Date.now() + '.parquet');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

async function readParquetFile(filePath) {
  const { parquetRead, parquetSchema } = await import('hyparquet');
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

async function writeBatch(items) {
  if (items.length === 0) return;
  const req = {
    RequestItems: {
      [tableName]: items.map((item) => ({
        PutRequest: { Item: item },
      })),
    },
  };
  await docClient.send(new BatchWriteCommand(req));
}

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
  console.log('Rows:', rows.length);

  const allItems = rows.map(rowToItem);
  const countries = new Set();
  const stateCountryPairs = new Set();
  for (const row of rows) {
    const c = str(row.country);
    if (c) countries.add(c);
    const s = str(row.state);
    if (s && c) stateCountryPairs.add(s + '\n' + c);
  }
  const regionItems = [];
  for (const c of countries) regionItems.push(buildCountryItem(c));
  for (const pair of stateCountryPairs) {
    const [s, c] = pair.split('\n');
    regionItems.push(buildStateItem(s, c));
  }
  const seen = new Map();
  for (const item of allItems) seen.set(item.pageId, item);
  for (const item of regionItems) seen.set(item.pageId, item);
  const items = Array.from(seen.values());
  console.log('Unique pages:', items.length, '(resorts +', regionItems.length, 'country/state)');

  const resortItems = items.filter((it) => it.pageType === 'resort');
  const firstN = 5;
  console.log('\nFirst', firstN, 'resort pageIds (pageId | title | state | country):');
  resortItems.slice(0, firstN).forEach((it, i) => {
    console.log('  ', i + 1, '|', it.pageId, '|', it.title || '(no title)', '|', it.state || '(no state)', '|', it.country || '(no country)');
  });
  console.log('');

  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await writeBatch(batch);
    written += batch.length;
    if (written % 250 === 0 || written === items.length) {
      console.log('Written', written, '/', items.length);
    }
  }

  if (input.startsWith('http') && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
  console.log('Done. Table:', tableName);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

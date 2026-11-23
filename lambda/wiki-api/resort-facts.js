/**
 * Harvested resort facts from atlas-ResortFacts.
 * Missing attributes stay unknown. Boolean false and "no" are the only nos.
 * Display strings are not converted here.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const AMENITIES = ['snowtubing', 'ski_rentals', 'ski_instructors', 'night_skiing', 'terrain_park', 'nordic', 'childcare', 'snowmaking', 'glacier'];
const CANONICAL_PASSES = ['Epic', 'Ikon', 'Indy', 'Mountain Collective', 'Power Pass', 'Nord Pass'];
const PRICE_BANDS = ['$', '$$', '$$$', '$$$$'];
const TIERS = ['small', 'medium', 'large'];
const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'CHF', 'AUD', 'NZD', 'JPY', 'SEK', 'NOK', 'KRW'];
const PROFILE = ['website', 'passes', 'owner', 'operator_group', 'operator_status', 'year_started', 'village_type', 'visit_type', 'famous_for', 'on_hill_lodge'];
const PRICE = ['lift_ticket_raw', 'lift_ticket_amount', 'lift_ticket_currency', 'lift_ticket_usd', 'price_band', 'weekend_ticket_raw', 'night_ticket_raw', 'season_pass_raw'];
const ACCESS = ['drive', 'parking', 'season_open', 'season_close', 'sectors', 'terrain'];
const IDENTITY = ['winterSportsId', 'pageId', 'name', 'country', 'state', 'tier', 'updatedAt'];
const PUBLIC_FIELDS = IDENTITY.concat(PROFILE, PRICE, AMENITIES, ACCESS);
const EDITABLE = ['pageId', 'name', 'country', 'state', 'tier'].concat(PROFILE, PRICE, AMENITIES, ACCESS);
const SOURCE_SUFFIXES = ['Source', 'SourceKind', 'SourceUrl', 'Evidence', 'ValueShown'];
const MAX_MATCHES = 2000;
const MAX_PAGES = 40;

const CANONICAL_PASS_KEYS = new Set(CANONICAL_PASSES.map((p) => p.toLowerCase()));

let defaultDoc;

function tableName() {
  // The harvested table is atlas-ResortFacts even when local wiki pages use another prefix.
  return process.env.RESORT_FACTS_TABLE || 'atlas-ResortFacts';
}

function docClient() {
  if (!defaultDoc) {
    const region = process.env.AWS_REGION || 'us-east-1';
    defaultDoc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }
  return defaultDoc;
}

function asList(value) {
  if (value instanceof Set) return Array.from(value);
  if (Array.isArray(value)) return value;
  return [];
}

function present(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (value instanceof Set && value.size === 0) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function isAmenityTrue(value) {
  return value === true || value === 'yes';
}

function isAmenityFalse(value) {
  return value === false || value === 'no';
}

function amenityTri(value) {
  if (isAmenityTrue(value)) return true;
  if (isAmenityFalse(value)) return false;
  return null;
}

function officialWebsite(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (_) {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (/(^|\.)wikipedia\.org$/.test(host)) return '';
  if (host === 'tripadvisor.com' || /(^|\.)tripadvisor\./.test(host)) return '';
  if (host === 'booking.com' || /(^|\.)booking\.com$/.test(host)) return '';
  return url.trim();
}

function passList(value) {
  return asList(value).map((p) => String(p).trim()).filter(Boolean);
}

function classifyPasses(value) {
  const list = passList(value);
  if (!list.length) return 'unknown';
  const hasIkon = list.some((p) => p.toLowerCase() === 'ikon');
  const hasLocal = list.some((p) => !CANONICAL_PASS_KEYS.has(p.toLowerCase()));
  if (hasIkon && hasLocal) return 'both';
  if (hasIkon) return 'ikon';
  if (hasLocal) return 'local';
  return 'other';
}

function projectFact(item) {
  if (!item || typeof item !== 'object') return null;
  const out = {};
  PUBLIC_FIELDS.forEach((field) => {
    if (field === 'website') {
      const site = officialWebsite(item.website);
      if (site) out.website = site;
    } else if (field === 'passes') {
      const list = passList(item.passes);
      if (list.length) out.passes = list;
    } else if (present(item[field])) {
      out[field] = item[field] instanceof Set ? Array.from(item[field]) : item[field];
    }
    SOURCE_SUFFIXES.forEach((suffix) => {
      const key = field + suffix;
      if (present(item[key])) out[key] = item[key];
    });
    if (item[field + 'Locked'] === true) out[field + 'Locked'] = true;
  });
  return out;
}

function priceStrip(row) {
  const item = row || {};
  return {
    price_band: present(item.price_band) ? item.price_band : null,
    lift_ticket_raw: present(item.lift_ticket_raw) ? item.lift_ticket_raw : null,
    sourceUrl: present(item.lift_ticket_rawSourceUrl) ? item.lift_ticket_rawSourceUrl : (present(item.lift_ticketSourceUrl) ? item.lift_ticketSourceUrl : null),
    evidence: present(item.lift_ticket_rawEvidence) ? item.lift_ticket_rawEvidence : (present(item.lift_ticketEvidence) ? item.lift_ticketEvidence : null),
  };
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeStats(items) {
  const rows = Array.isArray(items) ? items : [];
  const passShare = { ikonOnly: 0, localOnly: 0, both: 0, otherPass: 0, unknownPasses: 0, denominator: 0, ikonOnlyShare: null, localOnlyShare: null, bothShare: null };
  const usdByCountry = {};
  const night = { true: 0, false: 0, unknown: 0, known: 0, pct: null };
  const insufficientDataByState = {};

  rows.forEach((item) => {
    const bucket = classifyPasses(item && item.passes);
    if (bucket === 'ikon') passShare.ikonOnly += 1;
    else if (bucket === 'local') passShare.localOnly += 1;
    else if (bucket === 'both') passShare.both += 1;
    else if (bucket === 'other') passShare.otherPass += 1;
    else passShare.unknownPasses += 1;

    const usd = item && item.lift_ticket_usd;
    if (typeof usd === 'number' && Number.isFinite(usd)) {
      const country = item.country ? String(item.country) : '';
      if (!usdByCountry[country]) usdByCountry[country] = [];
      usdByCountry[country].push(usd);
    }

    const tri = amenityTri(item && item.night_skiing);
    if (tri === true) night.true += 1;
    else if (tri === false) night.false += 1;
    else night.unknown += 1;

    if (item && item.copy_status === 'insufficient_data') {
      const state = item.state ? String(item.state) : '';
      insufficientDataByState[state] = (insufficientDataByState[state] || 0) + 1;
    }
  });

  passShare.denominator = passShare.ikonOnly + passShare.localOnly + passShare.both;
  if (passShare.denominator > 0) {
    passShare.ikonOnlyShare = passShare.ikonOnly / passShare.denominator;
    passShare.localOnlyShare = passShare.localOnly / passShare.denominator;
    passShare.bothShare = passShare.both / passShare.denominator;
  }
  night.known = night.true + night.false;
  if (night.known > 0) night.pct = night.true / night.known;

  const medianLiftTicketUsdByCountry = {};
  Object.keys(usdByCountry).forEach((country) => {
    medianLiftTicketUsdByCountry[country] = median(usdByCountry[country]);
  });

  return {
    count: rows.length,
    passShare,
    medianLiftTicketUsdByCountry,
    nightSkiing: night,
    insufficientDataByState,
  };
}

function oneParam(q, key) {
  if (!q) return '';
  let value = q[key];
  if (Array.isArray(value)) value = value[0];
  if (value == null) return '';
  return String(value).trim();
}

function parseFactsQuery(q) {
  const country = oneParam(q, 'country');
  const state = oneParam(q, 'state');
  const pass = oneParam(q, 'pass');
  const amenity = oneParam(q, 'amenity');
  const priceBand = oneParam(q, 'price_band');
  const tier = oneParam(q, 'tier');
  const pageId = oneParam(q, 'pageId');
  const winterSportsId = oneParam(q, 'winterSportsId');
  const tooLong = [country, state, pass, pageId, winterSportsId].some((v) => v.length > 200);
  if (tooLong) return { error: 'A filter is too long' };
  if (amenity && AMENITIES.indexOf(amenity) === -1) return { error: 'amenity must name a harvested boolean field' };
  if (priceBand && PRICE_BANDS.indexOf(priceBand) === -1) return { error: 'price_band must be $, $$, $$$, or $$$$' };
  if (tier && TIERS.indexOf(tier) === -1) return { error: 'tier must be small, medium, or large' };
  const query = {};
  if (country) query.country = country;
  if (state) query.state = state;
  if (pass) query.pass = pass;
  if (amenity) query.amenity = amenity;
  if (priceBand) query.price_band = priceBand;
  if (tier) query.tier = tier;
  if (pageId) query.pageId = pageId;
  if (winterSportsId) query.winterSportsId = winterSportsId;
  return { query };
}

function matchFact(item, query) {
  if (!item) return false;
  if (query.winterSportsId && String(item.winterSportsId || '') !== query.winterSportsId) return false;
  if (query.pageId && item.pageId !== query.pageId) return false;
  if (query.country && item.country !== query.country) return false;
  if (query.state && item.state !== query.state) return false;
  if (query.tier && item.tier !== query.tier) return false;
  if (query.price_band && item.price_band !== query.price_band) return false;
  if (query.pass && passList(item.passes).indexOf(query.pass) === -1) return false;
  if (query.amenity && !isAmenityTrue(item[query.amenity])) return false;
  return true;
}

function planRead(query) {
  if (query.winterSportsId) return { op: 'get' };
  if (query.pageId) return { op: 'query', index: 'pageId-index', keyName: 'pageId', keyValue: query.pageId };
  if (query.state) return { op: 'query', index: 'state-index', keyName: 'state', keyValue: query.state };
  if (query.country) return { op: 'query', index: 'country-index', keyName: 'country', keyValue: query.country };
  return { op: 'scan' };
}

function buildFilter(query, skipKey) {
  const names = {};
  const values = {};
  const parts = [];
  let i = 0;
  function eq(attr, value) {
    const n = '#a' + i;
    const v = ':a' + i;
    i += 1;
    names[n] = attr;
    values[v] = value;
    parts.push(n + ' = ' + v);
  }
  if (query.country && skipKey !== 'country') eq('country', query.country);
  if (query.state && skipKey !== 'state') eq('state', query.state);
  if (query.pageId && skipKey !== 'pageId') eq('pageId', query.pageId);
  if (query.tier) eq('tier', query.tier);
  if (query.price_band) eq('price_band', query.price_band);
  if (query.pass) {
    const n = '#a' + i;
    const v = ':a' + i;
    i += 1;
    names[n] = 'passes';
    values[v] = query.pass;
    parts.push('contains(' + n + ', ' + v + ')');
  }
  if (query.amenity) {
    const n = '#a' + i;
    const t = ':t' + i;
    const y = ':y' + i;
    i += 1;
    names[n] = query.amenity;
    values[t] = true;
    values[y] = 'yes';
    parts.push('(' + n + ' = ' + t + ' OR ' + n + ' = ' + y + ')');
  }
  if (!parts.length) return {};
  return {
    FilterExpression: parts.join(' AND '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

function httpUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) return '';
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return value.trim();
  } catch (_) {
    return '';
  }
}

function normalizeEdit(field, value) {
  if (EDITABLE.indexOf(field) === -1) return { error: 'That field cannot be edited here' };
  if (value === null) return { value: null };
  if (AMENITIES.indexOf(field) !== -1) {
    if (value === true || value === false) return { value };
    return { error: 'Amenity value must be true, false, or null' };
  }
  if (field === 'passes') {
    const raw = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : null);
    if (!raw) return { error: 'passes must be a list of names' };
    const cleaned = [];
    raw.forEach((part) => {
      const name = String(part || '').trim();
      if (name && cleaned.indexOf(name) === -1) cleaned.push(name);
    });
    if (!cleaned.length) return { value: null };
    if (cleaned.length > 20 || cleaned.some((name) => name.length > 80)) return { error: 'A pass name is too long' };
    return { value: cleaned };
  }
  if (field === 'tier') {
    if (TIERS.indexOf(value) === -1) return { error: 'tier must be small, medium, or large' };
    return { value };
  }
  if (field === 'price_band') {
    if (PRICE_BANDS.indexOf(value) === -1) return { error: 'price_band must be $, $$, $$$, or $$$$' };
    return { value };
  }
  if (field === 'lift_ticket_currency') {
    const code = String(value || '').trim().toUpperCase();
    if (CURRENCIES.indexOf(code) === -1) return { error: 'currency is not a supported code' };
    return { value: code };
  }
  if (field === 'year_started' || field === 'lift_ticket_amount' || field === 'lift_ticket_usd') {
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(num)) return { error: field + ' must be a number' };
    if (field === 'year_started' && (num < 1800 || num > 2100)) return { error: 'year_started is out of range' };
    if (field !== 'year_started' && num < 0) return { error: field + ' must be zero or more' };
    return { value: num };
  }
  if (field === 'website') {
    const site = officialWebsite(String(value || ''));
    if (!site) return { error: 'website must be an official http(s) host' };
    return { value: site };
  }
  if (typeof value !== 'string') return { error: 'value must be text' };
  const text = value.trim();
  if (!text) return { value: null };
  if (text.length > 2000) return { error: 'value is too long' };
  return { value: text };
}

function buildLockUpdate(winterSportsId, field, storedValue, extras) {
  const names = {
    '#locked': field + 'Locked',
    '#src': field + 'Source',
    '#kind': field + 'SourceKind',
    '#at': field + 'UpdatedAt',
    '#rowAt': 'updatedAt',
    '#f': field,
  };
  const values = {
    ':locked': true,
    ':src': 'user',
    ':kind': 'user',
    ':at': extras.now,
    ':rowAt': extras.now,
  };
  const set = ['#locked = :locked', '#src = :src', '#kind = :kind', '#at = :at', '#rowAt = :rowAt'];
  const remove = [];
  if (storedValue === null) remove.push('#f');
  else {
    values[':v'] = field === 'passes' ? new Set(storedValue) : storedValue;
    set.push('#f = :v');
  }
  if (extras.sourceUrl) {
    names['#url'] = field + 'SourceUrl';
    values[':url'] = extras.sourceUrl;
    set.push('#url = :url');
  }
  if (extras.evidence) {
    names['#ev'] = field + 'Evidence';
    values[':ev'] = extras.evidence;
    set.push('#ev = :ev');
  }
  return {
    TableName: extras.table,
    Key: { winterSportsId: String(winterSportsId) },
    ConditionExpression: 'attribute_exists(winterSportsId)',
    UpdateExpression: 'SET ' + set.join(', ') + (remove.length ? ' REMOVE ' + remove.join(', ') : ''),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

function factsRoute(pathParts) {
  const parts = Array.isArray(pathParts) ? pathParts.slice() : [];
  if (parts[0] === 'wiki' && parts[1] === 'resorts') parts.shift();
  if (parts[0] !== 'resorts' || parts[1] !== 'facts') return null;
  return { rest: parts.slice(2) };
}

async function readFacts(doc, query) {
  const table = tableName();
  const plan = planRead(query);
  const items = [];
  let truncated = false;
  if (plan.op === 'get') {
    const res = await doc.send(new GetCommand({ TableName: table, Key: { winterSportsId: query.winterSportsId } }));
    if (res.Item && matchFact(res.Item, query)) items.push(res.Item);
    return { items, truncated, plan };
  }
  const filter = buildFilter(query, plan.keyName || '');
  let start;
  let pages = 0;
  do {
    const input = Object.assign({ TableName: table }, filter);
    if (start) input.ExclusiveStartKey = start;
    let res;
    if (plan.op === 'query') {
      input.IndexName = plan.index;
      input.KeyConditionExpression = '#k = :k';
      input.ExpressionAttributeNames = Object.assign({ '#k': plan.keyName }, filter.ExpressionAttributeNames || {});
      input.ExpressionAttributeValues = Object.assign({ ':k': plan.keyValue }, filter.ExpressionAttributeValues || {});
      res = await doc.send(new QueryCommand(input));
    } else {
      res = await doc.send(new ScanCommand(input));
    }
    (res.Items || []).forEach((item) => {
      if (items.length < MAX_MATCHES && matchFact(item, query)) items.push(item);
    });
    start = res.LastEvaluatedKey;
    pages += 1;
    if (items.length >= MAX_MATCHES && start) truncated = true;
    if (pages >= MAX_PAGES && start) truncated = true;
    if (truncated) start = undefined;
  } while (start);
  return { items, truncated, plan };
}

async function handleResortFactsRequest(ctx) {
  const route = factsRoute(ctx && ctx.pathParts);
  if (!route) return null;
  const method = String((ctx && ctx.method) || 'GET').toUpperCase();
  const doc = (ctx && ctx.docClient) || docClient();

  try {
    if (route.rest.length === 1 && route.rest[0] !== 'stats' && method === 'POST') {
      const token = ctx && ctx.token;
      const principal = token && ctx.validateToken ? await ctx.validateToken(token) : null;
      if (!principal) return { status: 401, body: { error: 'Unauthorized', message: 'Valid Cognito token required' } };
      const winterSportsId = decodeURIComponent(route.rest[0]);
      const body = (ctx && ctx.body) || {};
      const field = String(body.field || '').trim();
      const edited = normalizeEdit(field, body.value === undefined ? null : body.value);
      if (edited.error) return { status: 400, body: { error: 'Bad Request', message: edited.error } };
      let sourceUrl = '';
      if (body.sourceUrl) {
        sourceUrl = httpUrl(body.sourceUrl);
        if (!sourceUrl) return { status: 400, body: { error: 'Bad Request', message: 'sourceUrl must be http(s)' } };
      }
      const evidence = typeof body.evidence === 'string' ? body.evidence.trim().slice(0, 2000) : '';
      const update = buildLockUpdate(winterSportsId, field, edited.value, {
        now: new Date().toISOString(),
        table: tableName(),
        sourceUrl,
        evidence,
      });
      try {
        await doc.send(new UpdateCommand(update));
      } catch (err) {
        if (err && err.name === 'ConditionalCheckFailedException') {
          return { status: 404, body: { error: 'Not Found', message: 'No harvested row for that winterSportsId' } };
        }
        throw err;
      }
      const fresh = await doc.send(new GetCommand({ TableName: tableName(), Key: { winterSportsId: String(winterSportsId) } }));
      return { status: 200, body: { resort: projectFact(fresh.Item) } };
    }

    if (method !== 'GET') return { status: 405, body: { error: 'Method Not Allowed' } };
    const parsed = parseFactsQuery((ctx && ctx.query) || {});
    if (parsed.error) return { status: 400, body: { error: 'Bad Request', message: parsed.error } };
    const read = await readFacts(doc, parsed.query);
    const stats = computeStats(read.items);
    stats.truncated = read.truncated;
    if (route.rest.length === 1 && route.rest[0] === 'stats') {
      return { status: 200, body: { query: parsed.query, stats } };
    }
    if (route.rest.length !== 0) return { status: 404, body: { error: 'Not Found' } };
    return {
      status: 200,
      body: {
        query: parsed.query,
        count: read.items.length,
        truncated: read.truncated,
        resorts: read.items.map(projectFact),
        stats,
      },
    };
  } catch (err) {
    console.error('Resort facts error', err);
    return { status: 500, body: { error: 'Internal Server Error' } };
  }
}

module.exports = {
  AMENITIES,
  CANONICAL_PASSES,
  PRICE_BANDS,
  TIERS,
  handleResortFactsRequest,
  parseFactsQuery,
  projectFact,
  priceStrip,
  computeStats,
  matchFact,
  planRead,
  buildFilter,
  normalizeEdit,
  buildLockUpdate,
  officialWebsite,
  classifyPasses,
};

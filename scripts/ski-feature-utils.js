/**
 * Parse and measure ski trail / lift features from PMTiles vector tiles.
 */

export const TRAIL_NAME_KEYS = ['name', 'Name', 'piste:name'];
export const LIFT_NAME_KEYS = ['name', 'Name'];
export const RESORT_KEYS = ['Ski Area', 'ski_area', 'resort_name', 'area_name', 'resort', 'ski_area_name', 'skiarea_name'];
export const RESORT_ENGLISH_KEYS = ['resort_english_name', 'ski_area_english_name', 'english_name', 'englishName'];
export const COUNTRY_KEYS = ['Country', 'country', 'country_name', 'addr:country'];
export const STATE_KEYS = ['state', 'State', 'addr:state', 'province', 'addr:province', 'state_province', 'region'];
export const DIFF_KEYS = ['piste:difficulty', 'piste_difficulty', 'difficulty'];
export const PISTE_TYPE_KEYS = ['piste:type', 'piste_type'];
export const AERIALWAY_KEYS = ['aerialway', 'Aerialway'];

export const DIFF_COLORS = {
  easy: '#2f9a2f',
  novice: '#2f9a2f',
  beginner: '#2f9a2f',
  intermediate: '#1f78b4',
  medium: '#1f78b4',
  advanced: '#232323',
  hard: '#232323',
  expert: '#ff0000',
  freeride: '#ff7f00',
  extreme: '#232323'
};

export const LIFT_TYPE_LABELS = {
  gondola: 'Gondola',
  cable_car: 'Cable car',
  chair_lift: 'Chairlift',
  detachable: 'Detachable chair',
  mixed_lift: 'Mixed lift',
  drag_lift: 'Drag lift',
  't-bar': 'T-bar',
  j_bar: 'J-bar',
  platter: 'Platter',
  rope_tow: 'Rope tow',
  magic_carpet: 'Magic carpet'
};

export function getProp(obj, keys) {
  if (!obj) return undefined;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

export function getFromOtherTags(props, tagKey) {
  if (!props || typeof props.other_tags !== 'string') return null;
  const esc = tagKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = props.other_tags.match(new RegExp('"' + esc + '"=>"([^"]+)"'));
  return m ? m[1] : null;
}

export function getTrailName(props) {
  const v = getProp(props, TRAIL_NAME_KEYS);
  return v && String(v).trim() ? String(v).trim() : null;
}

export function getLiftName(props) {
  const v = getProp(props, LIFT_NAME_KEYS);
  return v && String(v).trim() ? String(v).trim() : null;
}

export function getResortName(props) {
  const local = getProp(props, RESORT_KEYS);
  const localStr = (local != null && String(local).trim() !== '')
    ? String(local).trim()
    : (getFromOtherTags(props, 'resort_name') || getFromOtherTags(props, 'area_name') || '');
  const en = getProp(props, RESORT_ENGLISH_KEYS);
  const enStr = (en != null && en !== '') ? String(en).trim() : '';
  if (enStr && localStr && enStr !== localStr) return enStr + ' (' + localStr + ')';
  return enStr || localStr || '';
}

export function getCountry(props) {
  const v = getProp(props, COUNTRY_KEYS);
  if (v && String(v).trim()) return String(v).trim();
  return getFromOtherTags(props, 'country') || '';
}

export function normCountry(c) {
  if (!c) return '';
  const s = String(c).trim();
  if (/^united states/i.test(s)) return 'USA';
  return s;
}

export function getState(props) {
  const v = getProp(props, STATE_KEYS);
  if (v && String(v).trim()) return String(v).trim();
  return getFromOtherTags(props, 'addr:state') || getFromOtherTags(props, 'state') || '';
}

export function stateRegionKey(country, state) {
  const c = normCountry(country);
  const st = state ? String(state).trim() : '';
  return st ? `${c}|${st}` : c;
}

export function getDifficulty(props) {
  let v = getProp(props, DIFF_KEYS);
  if (!v) v = getFromOtherTags(props, 'piste:difficulty');
  return v ? String(v).toLowerCase().trim() : '';
}

export function getPisteType(props) {
  let v = getProp(props, PISTE_TYPE_KEYS);
  if (!v) v = getFromOtherTags(props, 'piste:type');
  return v ? String(v).toLowerCase().trim() : '';
}

export function getAerialway(props) {
  let v = getProp(props, AERIALWAY_KEYS);
  if (!v) v = getFromOtherTags(props, 'aerialway');
  return v ? String(v).toLowerCase().trim() : '';
}

export function getPisteWidthM(props) {
  let v = getProp(props, ['piste:width', 'piste_width', 'width']);
  if (v == null) v = getFromOtherTags(props, 'piste:width');
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getTagYesNo(props, keys, otherTagKey) {
  let v = getProp(props, keys);
  if (v == null && otherTagKey) v = getFromOtherTags(props, otherTagKey);
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase();
  if (s === 'yes' || s === 'true' || s === '1') return true;
  if (s === 'no' || s === 'false' || s === '0') return false;
  return s;
}

export function diffLabel(d) {
  if (!d) return 'Unknown';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export function aerialwayLabel(type) {
  return LIFT_TYPE_LABELS[type] || (type ? type.replace(/_/g, ' ') : 'Lift');
}

export function haversineKm(c1, c2) {
  const R = 6371;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLon = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function lineLengthKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

export function geometryLengthKm(geom) {
  if (!geom?.coordinates) return 0;
  if (geom.type === 'LineString') return lineLengthKm(geom.coordinates);
  if (geom.type === 'MultiLineString') {
    return geom.coordinates.reduce((s, seg) => s + lineLengthKm(seg), 0);
  }
  if (geom.type === 'Polygon') {
    return lineLengthKm(geom.coordinates[0] || []);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.reduce((s, poly) => s + lineLengthKm(poly[0] || []), 0);
  }
  return 0;
}

/** Rough width (m) from polygon ring area ÷ perimeter — ski run cross-section estimate. */
export function polygonWidthEstimateM(geom) {
  if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return null;
  const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0]?.[0];
  if (!ring || ring.length < 4) return null;
  let perimeter = 0;
  for (let i = 1; i < ring.length; i++) perimeter += haversineKm(ring[i - 1], ring[i]) * 1000;
  if (perimeter < 1) return null;
  // Shoelace area in km² approx (small polygons)
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  area = Math.abs(area) / 2;
  const lat = ring[0][1];
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(lat * Math.PI / 180);
  const areaKm2 = area * kmPerDegLat * kmPerDegLon;
  const areaM2 = areaKm2 * 1e6;
  return areaM2 / perimeter;
}

export function formatLength(km) {
  if (!km || km <= 0) return null;
  if (km >= 1) return `${km.toFixed(2)} km (${(km * 0.621371).toFixed(2)} mi)`;
  const m = km * 1000;
  return `${m.toFixed(0)} m (${(m * 3.28084).toFixed(0)} ft)`;
}

export function formatWidthM(m) {
  if (m == null || m <= 0) return null;
  if (m >= 1) return `${m.toFixed(0)} m (${(m * 3.28084).toFixed(0)} ft)`;
  return `${(m * 100).toFixed(0)} cm`;
}

export function featureStableKey(kind, props) {
  const id = getProp(props, ['osm_id', 'id', '@id', 'osm_way_id', 'ref']);
  if (id != null && id !== '') return `${kind}:${id}`;
  const name = kind === 'lift' ? getLiftName(props) : getTrailName(props);
  const resort = getResortName(props);
  return `${kind}:${resort.toLowerCase()}:${(name || '').toLowerCase()}`;
}

export function analyzeFeature(kind, feature) {
  const props = feature?.properties || {};
  const geom = feature?.geometry;
  const lengthKm = geometryLengthKm(geom);
  const widthTag = kind === 'piste' ? getPisteWidthM(props) : null;
  const widthPoly = kind === 'piste' && !widthTag ? polygonWidthEstimateM(geom) : null;
  const widthM = widthTag ?? widthPoly;
  return {
    kind,
    props,
    geom,
    key: featureStableKey(kind, props),
    name: kind === 'lift' ? getLiftName(props) : getTrailName(props),
    resort: getResortName(props),
    country: getCountry(props),
    countryNorm: normCountry(getCountry(props)),
    state: getState(props),
    stateKey: stateRegionKey(getCountry(props), getState(props)),
    difficulty: getDifficulty(props),
    pisteType: getPisteType(props),
    aerialway: getAerialway(props),
    lengthKm,
    widthM,
    widthFromPolygon: widthPoly != null && widthTag == null,
    lit: getTagYesNo(props, ['lit'], 'lit'),
    gladed: getTagYesNo(props, ['gladed', 'gladed_terrain'], 'gladed'),
    groomed: getFromOtherTags(props, 'piste:grooming') || getProp(props, ['piste:grooming'])
  };
}

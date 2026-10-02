/**
 * Decode piste tiles into slim fact rows. Runs in a module worker so the
 * main thread can keep painting while MVT decode uses other cores.
 */

let mvtLibs;

async function getMvtLibs() {
  if (!mvtLibs) {
    const [{ VectorTile }, pbfMod] = await Promise.all([
      import('https://esm.sh/@mapbox/vector-tile@2.0.4'),
      import('https://esm.sh/pbf@3.2.1')
    ]);
    mvtLibs = { VectorTile, Pbf: pbfMod.default };
  }
  return mvtLibs;
}

function project(px, py, extent, z, tileX, tileY) {
  const size = extent * 2 ** z;
  const y2 = 180 - ((py + extent * tileY) * 360) / size;
  return [
    ((px + extent * tileX) * 360) / size - 180,
    (Math.atan(Math.exp((y2 * Math.PI) / 180)) * 360) / Math.PI - 90
  ];
}

function haversine(c1, c2) {
  const R = 6371;
  const dLat = (c2[1] - c1[1]) * Math.PI / 180;
  const dLon = (c2[0] - c1[0]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tag(props, key) {
  if (!props || typeof props.other_tags !== 'string') return null;
  const m = props.other_tags.match(new RegExp('"' + key + '"=>"([^"]+)"'));
  return m ? m[1] : null;
}

function prop(props, keys) {
  for (const k of keys) {
    if (props && Object.prototype.hasOwnProperty.call(props, k) && props[k] != null && props[k] !== '') return props[k];
  }
  return undefined;
}

/** Same identity as featureDedupeKey in pmtiles-core.js */
export function pisteFeatureKey(properties, geometry) {
  const p = properties || {};
  const id = p.osm_id ?? p.id ?? p['@id'] ?? p.osm_way_id ?? p.ref;
  if (id != null && id !== '') return String(id);
  const name = p.name ?? p['piste:name'] ?? '';
  const resort = p['Ski Area'] ?? p.ski_area ?? p.resort_name ?? '';
  const coord = geometry?.coordinates?.[0];
  const pt = Array.isArray(coord?.[0]) ? coord[0] : coord;
  const sig = pt ? `${Number(pt[0]).toFixed(4)},${Number(pt[1]).toFixed(4)}` : '';
  return `${String(name).toLowerCase()}|${String(resort).toLowerCase()}|${sig}`;
}

function summarize(props, length, maxLat, minLat, z, x, y, first, polygon) {
  const nameRaw = prop(props, ['name', 'Name', 'trail_name', 'piste_name']);
  const name = nameRaw && String(nameRaw).trim() ? String(nameRaw).trim() : null;
  const localRaw = prop(props, ['Ski Area', 'ski_area', 'resort_name', 'area_name', 'resort', 'ski_area_name', 'skiarea_name']);
  const local = (localRaw != null && String(localRaw).trim() !== '')
    ? String(localRaw).trim()
    : (tag(props, 'resort_name') || tag(props, 'area_name') || '');
  const enRaw = prop(props, ['resort_english_name', 'ski_area_english_name', 'english_name', 'englishName']);
  const en = enRaw != null && String(enRaw).trim() !== '' ? String(enRaw).trim() : '';
  let resort = '—';
  if (en && local && en !== local) resort = en + ' (' + local + ')';
  else resort = en || local || '—';
  const countryRaw = prop(props, ['Country', 'country', 'country_name', 'addr:country']);
  const country = (countryRaw && String(countryRaw).trim()) ? String(countryRaw).trim() : (tag(props, 'country') || '—');
  const stateRaw = prop(props, ['State', 'state', 'addr:state', 'addr:province']);
  const state = (stateRaw && String(stateRaw).trim()) ? String(stateRaw).trim() : (tag(props, 'state') || tag(props, 'addr:state') || '—');
  let diff = prop(props, ['piste:difficulty', 'piste_difficulty', 'difficulty']);
  if (!diff) diff = tag(props, 'piste:difficulty');
  diff = diff ? String(diff).toLowerCase().trim() : '';
  let pisteType = prop(props, ['piste:type', 'piste_type']);
  if (!pisteType) pisteType = tag(props, 'piste:type');
  pisteType = pisteType ? String(pisteType).toLowerCase().trim() : '';
  if (pisteType !== '' && pisteType !== 'downhill' && pisteType !== 'freeride') return null;
  // Untyped polygons in this layer are areas, not runs. Untyped lines still count.
  if (polygon && pisteType === '') return null;
  const key = pisteFeatureKey(props, { coordinates: [first] });
  return { key, name, resort, country, state, rawDiff: diff, pisteType, length, maxLat, minLat, lat: first[1], lng: first[0], z, x, y };
}

export function decodePisteTile(buf, z, x, y, VectorTile, Pbf) {
    const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    const tile = new VectorTile(new Pbf(bytes));
  const layer = tile.layers.pistes;
  if (!layer) return [];
  const extent = layer.extent || 4096;
  const rows = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    if (feature.type !== 2 && feature.type !== 3) continue;
    const polygon = feature.type === 3;
    const rings = feature.loadGeometry();
    const parts = polygon ? rings.slice(0, 1) : rings;
    let length = 0;
    let maxLat = -Infinity;
    let minLat = Infinity;
    let first = null;
    for (const ring of parts) {
      let prev = null;
      for (const pt of ring) {
        const ll = project(pt.x, pt.y, extent, z, x, y);
        if (!first) first = ll;
        if (prev) length += haversine(prev, ll);
        if (ll[1] > maxLat) maxLat = ll[1];
        if (ll[1] < minLat) minLat = ll[1];
        prev = ll;
      }
    }
    // ponytail: polygon pistes are areas; half the outer ring stands in for run length. Upgrade path: a centerline.
    if (polygon) length /= 2;
    if (length <= 0.01 || !first) continue;
    const row = summarize(feature.properties, length, maxLat, minLat, z, x, y, first, polygon);
    if (row) rows.push(row);
  }
  return rows;
}

const EXCLUDED_LIFTS = new Set(['zip_line', 'goods']);

function summarizeLift(props, length, maxLat, minLat, z, x, y, first) {
  let aerialway = prop(props, ['aerialway', 'Aerialway', 'lift_type', 'type']);
  if (!aerialway) aerialway = tag(props, 'aerialway');
  aerialway = aerialway ? String(aerialway).toLowerCase().trim() : '';
  if (EXCLUDED_LIFTS.has(aerialway)) return null;
  const nameRaw = prop(props, ['name', 'Name', 'lift_name']);
  const name = nameRaw && String(nameRaw).trim() ? String(nameRaw).trim() : null;
  const localRaw = prop(props, ['Ski Area', 'ski_area', 'resort_name', 'area_name', 'resort', 'ski_area_name', 'skiarea_name']);
  const local = (localRaw != null && String(localRaw).trim() !== '')
    ? String(localRaw).trim()
    : (tag(props, 'resort_name') || tag(props, 'area_name') || '');
  const enRaw = prop(props, ['resort_english_name', 'ski_area_english_name', 'english_name', 'englishName']);
  const en = enRaw != null && String(enRaw).trim() !== '' ? String(enRaw).trim() : '';
  const resort = en && local && en !== local ? en + ' (' + local + ')' : (en || local || '—');
  const countryRaw = prop(props, ['Country', 'country', 'country_name', 'addr:country']);
  const country = (countryRaw && String(countryRaw).trim()) ? String(countryRaw).trim() : (tag(props, 'country') || '—');
  const stateRaw = prop(props, ['State', 'state', 'addr:state', 'addr:province']);
  const state = (stateRaw && String(stateRaw).trim()) ? String(stateRaw).trim() : (tag(props, 'state') || '—');
  const key = pisteFeatureKey(props, { coordinates: [first] });
  return { key, name, resort, country, state, aerialway, length, maxLat, minLat, lat: first[1], lng: first[0], z, x, y };
}

export function decodeLiftTile(buf, z, x, y, VectorTile, Pbf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  const tile = new VectorTile(new Pbf(bytes));
  const layer = tile.layers.lifts;
  if (!layer) return [];
  const extent = layer.extent || 4096;
  const rows = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    if (feature.type !== 2) continue;
    const rings = feature.loadGeometry();
    let length = 0, maxLat = -Infinity, minLat = Infinity, first = null;
    for (const ring of rings) {
      let prev = null;
      for (const pt of ring) {
        const ll = project(pt.x, pt.y, extent, z, x, y);
        if (!first) first = ll;
        if (prev) length += haversine(prev, ll);
        if (ll[1] > maxLat) maxLat = ll[1];
        if (ll[1] < minLat) minLat = ll[1];
        prev = ll;
      }
    }
    if (length <= 0.005 || !first) continue;
    const row = summarizeLift(feature.properties, length, maxLat, minLat, z, x, y, first);
    if (row) rows.push(row);
  }
  return rows;
}

if (typeof DedicatedWorkerGlobalScope !== 'undefined' && self instanceof DedicatedWorkerGlobalScope) {
  self.onmessage = async (event) => {
    const { id, z, x, y, buffer, layer } = event.data;
    try {
      const { VectorTile, Pbf } = await getMvtLibs();
      const rows = layer === 'lifts'
        ? decodeLiftTile(buffer, z, x, y, VectorTile, Pbf)
        : decodePisteTile(buffer, z, x, y, VectorTile, Pbf);
      self.postMessage({ id, rows });
    } catch (err) {
      self.postMessage({ id, error: String(err && err.message || err) });
    }
  };
}

/**
 * Merge pass-review confirms/skips into data/passes/overrides.json.
 * Confirm rows win by winter_sports_id; skips block auto-match.
 *
 * Usage: node scripts/sync-pass-overrides.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fold, normalizeCountry, parseStormRegion } from './pass-join/normalize.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OVERRIDE_PATH = path.join(ROOT, 'data/passes/overrides.json');
const CONFIRMED_JSONL = path.join(ROOT, 'data/passes/confirmed.jsonl');
const OSM_MISSING_PATH = path.join(ROOT, 'data/passes/osm-missing.json');

function loadOverrides() {
  if (!fs.existsSync(OVERRIDE_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
  return Array.isArray(raw) ? raw : [];
}

function loadConfirmed() {
  if (!fs.existsSync(CONFIRMED_JSONL)) return [];
  return fs.readFileSync(CONFIRMED_JSONL, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function keyOf(o) {
  return fold(o.storm_name) + '|' + normalizeCountry(o.country || o.region || '');
}

export function mergeOverrides() {
  const byKey = new Map();
  for (const o of loadOverrides()) {
    byKey.set(keyOf(o), o);
  }
  for (const row of loadConfirmed()) {
    const geo = parseStormRegion(row.region || '');
    const country = geo.country || normalizeCountry(row.country || '');
    const osmMissing = row.action === 'osm_missing';
    const base = {
      storm_name: row.storm_name,
      country,
      region: row.region || '',
      atlas_name: row.atlas_name || '',
      winter_sports_id: row.winter_sports_id ? String(row.winter_sports_id) : '',
      passes: row.passes || String(row.pass || '').split(',').filter(Boolean),
      notes: osmMissing ? 'review osm missing' : row.action === 'skip' ? 'review skip' : 'review confirm',
      skip: row.action === 'skip' || osmMissing,
      osm_missing: osmMissing
    };
    byKey.set(keyOf(base), base);
  }
  const list = [...byKey.values()].sort((a, b) =>
    String(a.storm_name).localeCompare(String(b.storm_name))
  );
  fs.mkdirSync(path.dirname(OVERRIDE_PATH), { recursive: true });
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(list, null, 2) + '\n');
  const osmMissing = list.filter((o) => o.osm_missing && !o.winter_sports_id);
  fs.writeFileSync(
    OSM_MISSING_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        note: 'Storm partners with no wiki/OSM ski-area yet. Map in OSM, run the ski-area pipeline, then wiki-ingest-parquet and join-pass-affiliations.',
        items: osmMissing
      },
      null,
      2
    ) + '\n'
  );
  return list;
}

if (process.argv[1] && path.normalize(process.argv[1]).endsWith('sync-pass-overrides.mjs')) {
  const list = mergeOverrides();
  const confirms = list.filter((o) => !o.skip && o.winter_sports_id).length;
  const skips = list.filter((o) => o.skip && !o.osm_missing).length;
  const osmMissing = list.filter((o) => o.osm_missing).length;
  console.log(JSON.stringify({ overrides: list.length, confirms, skips, osm_missing: osmMissing }, null, 2));
}

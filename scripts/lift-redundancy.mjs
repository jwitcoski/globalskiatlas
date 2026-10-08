#!/usr/bin/env node
/**
 * N-1 lift redundancy: for every ski area, close one lift at a time and measure how much
 * of the lappable piste network (ski down, ride back up, repeat) is lost.
 *
 * Usage:
 *   node scripts/lift-redundancy.mjs [lifts.parquet] [pistes.parquet]   (defaults: S3 combined files)
 *   node scripts/lift-redundancy.mjs --self-test
 *
 * Writes <tmp>/gsa-lift-redundancy.json and prints ranked tables.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parquetReadObjects, asyncBufferFromFile } from 'hyparquet';

const S3 = 'https://globalskiatlas-backend-k8s-output.s3.us-east-1.amazonaws.com/combined';
const LIFT_TYPES = new Set(['chair_lift', 'gondola', 'cable_car', 'mixed_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope_tow', 'magic_carpet', 'funicular']);
const TWO_WAY = new Set(['gondola', 'cable_car', 'funicular']);
const JUNCTION_M = 30;
const STATION_M = 100;
const CELL = 100;

const tag = (r, k) => r[k] || (r.other_tags || '').match(new RegExp(`"${k}"=>"([^"]+)"`))?.[1];
const lineParts = (g) => (!g ? [] : g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []);

/** lifts: [{name, type, coords:[[lon,lat],...]}] drawn bottom→top; pistes: [{name, coords}] drawn downhill. */
export function analyzeArea(lifts, pistes) {
  const all = [...lifts.flatMap((l) => l.coords), ...pistes.flatMap((p) => p.coords)];
  const lat0 = all.reduce((s, c) => s + c[1], 0) / all.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110540;
  const xy = (c) => [c[0] * kx, c[1] * ky];

  // segKm[v] = length of the piste segment v -> v+1 (0 at a way's last vertex).
  const vx = [], vy = [], vPiste = [], next = [], segKm = [];
  const pisteKm = pistes.map(() => 0);
  pistes.forEach((p, pi) => {
    p.coords.forEach((c, i) => {
      const [x, y] = xy(c);
      if (i) {
        const d = Math.hypot(x - vx[vx.length - 1], y - vy[vy.length - 1]) / 1000;
        segKm[vx.length - 1] = d;
        pisteKm[pi] += d;
      }
      vx.push(x); vy.push(y); vPiste.push(pi); segKm.push(0);
      next.push(i < p.coords.length - 1 ? [vx.length] : []);
    });
  });

  const grid = new Map();
  const key = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  for (let i = 0; i < vx.length; i++) {
    const k = key(vx[i], vy[i]);
    (grid.get(k) || grid.set(k, []).get(k)).push(i);
  }
  const near = (x, y, r) => {
    const out = [], cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), n = Math.ceil(r / CELL);
    for (let a = cx - n; a <= cx + n; a++) for (let b = cy - n; b <= cy + n; b++)
      for (const i of grid.get(`${a},${b}`) || []) if (Math.hypot(vx[i] - x, vy[i] - y) <= r) out.push(i);
    return out;
  };
  for (let i = 0; i < vx.length; i++)
    for (const j of near(vx[i], vy[i], JUNCTION_M)) if (vPiste[j] !== vPiste[i]) next[i].push(j);

  // OSM draws lifts bottom→top, but some are drawn backwards. Pistes should start near a top and end near a bottom;
  // flip a lift when its piste starts/ends clearly disagree with the drawn direction.
  // ponytail: no elevation data, so this is a vote of nearby piste directions; a DEM lookup would settle it.
  const wayStart = new Uint8Array(vx.length), wayEnd = new Uint8Array(vx.length);
  for (let i = 0; i < vx.length; i++) {
    if (i === 0 || vPiste[i - 1] !== vPiste[i]) wayStart[i] = 1;
    if (!next[i].length || vPiste[next[i][0]] !== vPiste[i] || next[i][0] !== i + 1) wayEnd[i] = 1;
  }
  const flow = (c) => near(...xy(c), STATION_M).reduce((s, v) => s + wayStart[v] - wayEnd[v], 0);
  let flipped = 0;
  lifts = lifts.map((l) => {
    const score = flow(l.coords[l.coords.length - 1]) - flow(l.coords[0]);
    if (score > -2) return l;
    flipped++;
    return { ...l, coords: [...l.coords].reverse() };
  });

  // Stations: 2 per lift. Station s = 2*li (bottom) / 2*li+1 (top).
  const st = lifts.flatMap((l) => [xy(l.coords[0]), xy(l.coords[l.coords.length - 1])]);
  const stationsAtVertex = new Map();
  st.forEach(([x, y], s) => near(x, y, STATION_M).forEach((v) => (stationsAtVertex.get(v) || stationsAtVertex.set(v, []).get(v)).push(s)));
  const prev = vx.map(() => []);
  next.forEach((ns, i) => ns.forEach((j) => prev[j].push(i)));

  const bfs = (seeds, adj) => {
    const seen = new Uint8Array(vx.length), q = [...seeds];
    q.forEach((v) => (seen[v] = 1));
    for (let h = 0; h < q.length; h++) for (const j of adj[q[h]]) if (!seen[j]) { seen[j] = 1; q.push(j); }
    return q;
  };
  // fwd[s]: vertices skiable from station s. rev[s]: vertices from which s is skiable.
  const fwd = [], rev = [], skiTo = [];
  st.forEach(([x, y], s) => {
    const seeds = near(x, y, STATION_M);
    const down = bfs(seeds, next), up = bfs(seeds, prev);
    fwd.push(Uint32Array.from(down));
    rev.push(Uint32Array.from(up));
    const to = new Set(down.flatMap((v) => stationsAtVertex.get(v) || []));
    st.forEach(([x2, y2], s2) => Math.hypot(x2 - x, y2 - y) <= STATION_M && to.add(s2));
    to.delete(s);
    skiTo.push([...to]);
  });

  const solve = (closed) => {
    const adj = skiTo.map((a) => [...a]);
    lifts.forEach((l, li) => {
      if (li === closed) return;
      adj[2 * li].push(2 * li + 1);
      if (TWO_WAY.has(l.type)) adj[2 * li + 1].push(2 * li);
    });
    const comp = scc(adj);
    const liftsIn = new Map();
    lifts.forEach((_, li) => li !== closed && comp[2 * li] === comp[2 * li + 1] && liftsIn.set(comp[2 * li], (liftsIn.get(comp[2 * li]) || 0) + 1));
    let core = -1, best = 0;
    for (const [c, n] of liftsIn) if (n > best) { best = n; core = c; }
    const coreLifts = new Set(lifts.map((_, li) => li).filter((li) => li !== closed && comp[2 * li] === core && comp[2 * li + 1] === core));
    // Segment v -> v+1 is lappable on loop c if its start is skiable from c and its end skis back into c.
    const byComp = new Map();
    st.forEach((_, s) => liftsIn.has(comp[s]) && (byComp.get(comp[s]) || byComp.set(comp[s], []).get(comp[s])).push(s));
    const back = new Int32Array(vx.length).fill(-1);
    const lappable = new Uint8Array(vx.length), main = new Uint8Array(vx.length);
    for (const [c, ss] of byComp) {
      for (const s of ss) for (const v of rev[s]) back[v] = c;
      for (const s of ss) for (const v of fwd[s]) if (segKm[v] && back[v + 1] === c) { lappable[v] = 1; if (c === core) main[v] = 1; }
    }
    return { coreLifts, lappable, main };
  };

  const base = solve(-1);
  const km = (mask) => mask.reduce((s, on, v) => (on ? s + segKm[v] : s), 0);
  const lappableKm = km(base.lappable), coreKm = km(base.main);
  const name = (li) => lifts[li].name || `(unnamed ${lifts[li].type})`;
  const closures = [...base.coreLifts].map((li) => {
    const r = solve(li);
    const lost = base.lappable.map((on, v) => (on && !r.lappable[v] ? 1 : 0));
    const split = base.main.map((on, v) => (on && r.lappable[v] && !r.main[v] ? 1 : 0));
    const lostByPiste = pistes.map(() => 0);
    lost.forEach((on, v) => on && (lostByPiste[vPiste[v]] += segKm[v]));
    return {
      lift: name(li),
      type: lifts[li].type,
      lostKm: km(lost),
      lostShare: lappableKm ? km(lost) / lappableKm : 0,
      splitShare: coreKm ? km(split) / coreKm : 0,
      strandedLifts: [...base.coreLifts].filter((x) => x !== li && !r.coreLifts.has(x)).map(name),
      lostPistes: [...new Set(pistes.map((p, pi) => (lostByPiste[pi] >= pisteKm[pi] / 2 ? p.name : null)).filter(Boolean))].slice(0, 12),
    };
  }).sort((a, b) => b.lostShare - a.lostShare);

  const totalKm = pisteKm.reduce((a, b) => a + b, 0);
  return {
    lifts: lifts.length,
    flipped,
    coreLifts: base.coreLifts.size,
    pisteKm: totalKm,
    lappableKm,
    coreKm,
    coverage: totalKm ? lappableKm / totalKm : 0,
    worstShare: closures[0]?.lostShare ?? 1,
    meanShare: closures.length ? closures.reduce((s, c) => s + c.lostShare, 0) / closures.length : 1,
    worstSplit: Math.max(0, ...closures.map((c) => c.splitShare)),
    criticalLifts: closures.filter((c) => c.lostShare >= 0.05).length,
    closures,
  };
}

/** Iterative Tarjan. Returns component id per node. */
function scc(adj) {
  const n = adj.length, idx = new Int32Array(n).fill(-1), low = new Int32Array(n), on = new Uint8Array(n), comp = new Int32Array(n).fill(-1);
  const stack = [];
  let i = 0, c = 0;
  for (let r = 0; r < n; r++) {
    if (idx[r] >= 0) continue;
    const work = [[r, 0]];
    idx[r] = low[r] = i++; stack.push(r); on[r] = 1;
    while (work.length) {
      const top = work[work.length - 1], [v, k] = top;
      if (k < adj[v].length) {
        top[1]++;
        const w = adj[v][k];
        if (idx[w] < 0) { idx[w] = low[w] = i++; stack.push(w); on[w] = 1; work.push([w, 0]); }
        else if (on[w]) low[v] = Math.min(low[v], idx[w]);
      } else {
        work.pop();
        if (work.length) { const u = work[work.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
        if (low[v] === idx[v]) { let w; do { w = stack.pop(); on[w] = 0; comp[w] = c; } while (w !== v); c++; }
      }
    }
  }
  return comp;
}

function selfTest() {
  // Twin chairs A/B share a summit and base; chair C's top is only reachable by riding C.
  const d = 0.005;
  const lifts = [
    { name: 'A', type: 'chair_lift', coords: [[0, 0], [0, d]] },
    { name: 'B', type: 'chair_lift', coords: [[0.0005, 0], [0.0005, d]] },
    { name: 'C', type: 'chair_lift', coords: [[0.02, 0.0002], [0.02, d]] },
  ];
  const pistes = [
    { name: 'Main', coords: [[0.0002, d], [0.0002, 0]] },
    { name: 'Traverse', coords: [[0.0005, d], [0.02, 0.0004]] },
    { name: 'Far run', coords: [[0.02, d], [0.02, 0.0002]] },
    { name: 'Return', coords: [[0.02, 0.0002], [0.0005, 0]] },
  ];
  const r = analyzeArea(lifts, pistes);
  assert.equal(r.coreLifts, 3);
  assert.equal(r.coverage, 1);
  const byLift = Object.fromEntries(r.closures.map((c) => [c.lift, c]));
  assert.equal(byLift.A.lostShare, 0, 'A has a twin');
  assert.equal(byLift.B.lostShare, 0, 'B has a twin');
  assert.ok(byLift.C.lostShare > 0 && byLift.C.lostPistes.includes('Far run'), 'closing C strands Far run');
  console.log('self-test ok');
}

async function loadParquet(src, name, columns) {
  let file = src;
  if (!file) {
    file = path.join(os.tmpdir(), `gsa-${name}.parquet`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(await (await fetch(`${S3}/${name}.parquet`)).arrayBuffer()));
  }
  return parquetReadObjects({ file: await asyncBufferFromFile(file), columns });
}

async function main([liftsPath, pistesPath]) {
  const [liftRows, pisteRows] = await Promise.all([
    loadParquet(liftsPath, 'lifts', ['osm_id', 'osm_way_id', 'name', 'aerialway', 'other_tags', 'Ski Area', 'Country', 'State', 'geometry']),
    loadParquet(pistesPath, 'pistes', ['osm_id', 'osm_way_id', 'name', 'piste:type', 'other_tags', 'Ski Area', 'Country', 'State', 'geometry']),
  ]);
  const areas = new Map();
  const area = (r) => {
    const k = `${r['Ski Area']}|${r.Country}`;
    const a = areas.get(k) || areas.set(k, { name: r['Ski Area'], country: r.Country, lifts: new Map(), pistes: new Map() }).get(k);
    a.state ||= r.State;
    return a;
  };
  for (const r of pisteRows) {
    if (!r['Ski Area'] || !['downhill', 'connection'].includes(tag(r, 'piste:type'))) continue;
    // ponytail: MultiLineString parts are chained as one way; fine for the few multi-part pistes, wrong if parts point opposite ways.
    const coords = lineParts(r.geometry).flat();
    if (coords.length >= 2) area(r).pistes.set(r.osm_id || r.osm_way_id, { name: r.name, coords });
  }
  // Some lifts (e.g. Whistler's Peak 2 Peak) have no Ski Area; adopt them when both ends sit on one area's pistes.
  const cellKey = (c) => `${Math.floor(c[0] * 1000)},${Math.floor(c[1] * 1000)}`;
  const pisteCells = new Map();
  for (const a of areas.values()) for (const p of a.pistes.values()) for (const c of p.coords) {
    const k = cellKey(c);
    (pisteCells.get(k) || pisteCells.set(k, new Set()).get(k)).add(a);
  }
  const areasNear = ([lon, lat]) => {
    const out = new Set();
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) pisteCells.get(cellKey([lon + dx / 1000, lat + dy / 1000]))?.forEach((a) => out.add(a));
    return out;
  };
  let adopted = 0;
  for (const r of liftRows) {
    const type = tag(r, 'aerialway');
    const coords = lineParts(r.geometry).flat();
    if (!LIFT_TYPES.has(type) || coords.length < 2) continue;
    const id = r.osm_id || r.osm_way_id;
    if (r['Ski Area']) { area(r).lifts.set(id, { name: r.name, type, coords }); continue; }
    const top = areasNear(coords[coords.length - 1]);
    const hit = [...areasNear(coords[0])].filter((a) => top.has(a));
    if (hit.length === 1) { hit[0].lifts.set(id, { name: r.name, type, coords }); adopted++; }
  }
  console.log(`adopted ${adopted} lifts with no Ski Area`);

  const results = [];
  for (const a of areas.values()) {
    if (a.name === 'Unknown' || a.lifts.size < 3 || !a.pistes.size) continue;
    const r = analyzeArea([...a.lifts.values()], [...a.pistes.values()]);
    const allCoords = [...a.lifts.values()].flatMap((l) => l.coords);
    const center = [0, 1].map((i) => +(allCoords.reduce((s, c) => s + c[i], 0) / allCoords.length).toFixed(4));
    results.push({ name: a.name, country: a.country, state: a.state || null, center, ...r });
  }
  const out = path.join(os.tmpdir(), 'gsa-lift-redundancy.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  // Compact copy for the blog scatter: areas whose map is connected enough to score.
  const r1 = (x) => Math.round(x * 1000) / 10;
  const blogData = results.filter((r) => r.coverage >= 0.6 && r.closures.length).map((r) => ({
    name: r.name, country: r.country, state: r.state, lifts: r.coreLifts, km: Math.round(r.lappableKm),
    worst: r1(r.worstShare), split: r1(r.worstSplit), lift: r.closures[0].lift,
  }));
  const blogOut = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'blog', 'data', 'lift-redundancy.json');
  fs.mkdirSync(path.dirname(blogOut), { recursive: true });
  fs.writeFileSync(blogOut, JSON.stringify(blogData));

  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const ranked = results.filter((r) => r.coreLifts >= 10 && r.coverage >= 0.6);
  const row = (r) => `| ${r.name} | ${r.country} | ${r.coreLifts} | ${r.lappableKm.toFixed(0)} | ${pct(r.worstShare)} | ${r.closures[0]?.lift ?? ''} | ${pct(r.meanShare)} | ${r.criticalLifts} | ${pct(r.worstSplit)} | ${r.flipped} |`;
  const head = '| Ski area | Country | Lifts in loop | Lappable km | Worst single closure | Worst lift | Mean closure | Lifts ≥5% | Worst split | Flipped |\n|---|---|---|---|---|---|---|---|---|---|';
  console.log(`areas analyzed: ${results.length}, ranked (≥10 loop lifts, ≥60% coverage): ${ranked.length}\n`);
  console.log('MOST REDUNDANT\n' + head + '\n' + [...ranked].sort((a, b) => a.worstShare - b.worstShare || a.meanShare - b.meanShare).slice(0, 20).map(row).join('\n'));
  console.log('\nMOST FRAGILE\n' + head + '\n' + [...ranked].sort((a, b) => b.worstShare - a.worstShare).slice(0, 20).map(row).join('\n'));
  console.log(`\nwrote ${out}`);
}

if (process.argv[2] === '--self-test') selfTest();
else main(process.argv.slice(2));

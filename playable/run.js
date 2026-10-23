/** Timed descent: start gate, finish disk, pause. */

function keepBetter(prev, route) {
  const drop = route.vertical_drop_m || 0;
  if (!prev) return true;
  if (drop > (prev.vertical_drop_m || 0)) return true;
  if (drop === (prev.vertical_drop_m || 0) && String(route.id).includes(":way:")) return true;
  return false;
}

function hasFinish(route) {
  const end = route?.end_local || {};
  return end.east_m != null && end.north_m != null;
}

function collectCourses(routes) {
  const byKey = new Map();
  for (const r of routes) {
    const key = r.name || r.id;
    if (keepBetter(byKey.get(key), r)) byKey.set(key, r);
  }
  return [...byKey.values()].sort((a, b) => (b.vertical_drop_m || 0) - (a.vertical_drop_m || 0));
}

export function listCourses(graph) {
  const routes = graph?.routes || [];
  const approved = collectCourses(
    routes.filter((r) => r.status === "approved" && (r.vertical_drop_m || 0) >= 40 && hasFinish(r)),
  );
  if (approved.length) return approved;
  // ponytail: published graphs can flag the only real descent review_needed (DEM uphill noise)
  // or approve only sub-40 m fragments. Ski those instead of failing the mountain.
  // Upgrade path: loosen uphill_fraction in the route builder.
  const fallback = collectCourses(
    routes.filter(
      (r) =>
        r.status !== "rejected" &&
        hasFinish(r) &&
        ((r.vertical_drop_m || 0) >= 40 || r.status === "approved"),
    ),
  );
  if (fallback.length) return fallback;
  return collectCourses(routes.filter((r) => r.status !== "rejected" && hasFinish(r)));
}

export function pickCourse(graph) {
  return listCourses(graph)[0] || null;
}

export function courseLabel(route) {
  const n = String(route?.name || "").trim();
  if (n && !n.toLowerCase().startsWith("route:")) return n;
  const id = String(route?.id || "piste");
  const parts = id.split(":");
  return `Piste ${parts[parts.length - 1] || id}`;
}

export function featuredCourses(graph) {
  const all = listCourses(graph);
  const picked = [];
  for (const want of ["Boomer", "Cannonball"]) {
    const hit = all.find((r) => r.name === want);
    if (hit) picked.push(hit);
  }
  for (const r of all) {
    if (!picked.includes(r)) picked.push(r);
  }
  const extra = new Map();
  for (const r of graph.routes || []) {
    if (!r.name) continue;
    const prev = extra.get(r.name) || {};
    extra.set(r.name, {
      difficulty: r.piste_difficulty || prev.difficulty,
      type: r.piste_type || prev.type,
    });
  }
  for (const r of picked) {
    const hit = extra.get(r.name);
    if (!r.piste_difficulty) r.piste_difficulty = hit?.difficulty || "";
    if (!r.piste_type) r.piste_type = hit?.type || "";
    r.displayName = courseLabel(r);
    if (!String(r.name || "").trim() || String(r.name).toLowerCase().startsWith("route:")) {
      r.name = r.displayName;
    }
  }
  return picked;
}

function tagDifficulty(tags) {
  if (!tags) return "";
  const direct = tags["piste:difficulty"] || tags.difficulty;
  if (direct) return String(direct).toLowerCase().trim();
  const ot = String(tags.other_tags || "");
  const m = /piste:difficulty"=>"([^"]+)/.exec(ot);
  return m ? m[1].toLowerCase().trim() : "";
}

function tagPisteType(tags, props) {
  const fromProp = props?.piste_type;
  if (fromProp) return String(fromProp).toLowerCase().trim();
  if (!tags) return "";
  const direct = tags["piste:type"] || tags.piste_type;
  if (direct) return String(direct).toLowerCase().trim();
  const ot = String(tags.other_tags || "");
  const m = /piste:type"=>"([^"]+)/.exec(ot);
  return m ? m[1].toLowerCase().trim() : "";
}

function isPark(t) {
  return t === "snow_park" || t === "terrain_park" || t === "snowpark";
}

const DIFF_RANK = {
  novice: 1,
  easy: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
  freeride: 6,
  extreme: 7,
};

export function attachPisteDifficulty(courses, pisteFC) {
  const byName = new Map();
  for (const f of pisteFC?.features || []) {
    const tags = f.properties?.tags || {};
    const name = f.properties?.name || tags.name;
    if (!name) continue;
    const d = tagDifficulty(tags);
    const t = tagPisteType(tags, f.properties);
    const prev = byName.get(name) || { difficulty: "", type: "" };
    const nextD =
      d && (!prev.difficulty || (DIFF_RANK[d] || 0) >= (DIFF_RANK[prev.difficulty] || 0))
        ? d
        : prev.difficulty;
    byName.set(name, {
      difficulty: nextD,
      type: isPark(t) || isPark(prev.type) ? "snow_park" : t || prev.type,
    });
  }
  for (const c of courses || []) {
    const hit = byName.get(c.name);
    c.piste_difficulty = c.piste_difficulty || hit?.difficulty || "";
    c.piste_type = c.piste_type || hit?.type || "";
  }
  return courses;
}

export function formatDifficulty(raw) {
  const d = String(raw || "").toLowerCase().trim();
  if (!d) return "Unrated";
  return d.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function courseFinish(route) {
  const end = route.end_local || {};
  const start = route.start_local || {};
  return {
    x: end.east_m,
    z: -end.north_m,
    y: route.end_elevation_m,
    name: route.name || route.id,
    drop: route.vertical_drop_m,
    length: route.length_m,
    id: route.id,
    startEast: start.east_m,
    startNorth: start.north_m,
    startElev: route.start_elevation_m,
  };
}

function timeKey(name) {
  return `montage_best_s:${name || "course"}`;
}

export function xzDist(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function createRun(finish, radiusM = 28) {
  const name = finish.name || "course";
  return {
    phase: "ready",
    time: 0,
    leftGate: false,
    finish,
    radiusM,
    best: Number(localStorage.getItem(timeKey(name)) || "") || null,
    score: 0,
    onPiste: true,
    offTimer: 0,
    pistePts: [],
    pisteWidth: 22,
    pisteDist: 0,
    bestScore: Number(localStorage.getItem(`montage_best_score:${name}`) || "") || null,
    clocked: false,
    startAlong: 4,
  };
}

export function tickRun(run, pos, spawnXZ, dt, moving, along = 0) {
  if (run.phase === "paused" || run.phase === "finished" || run.phase === "dnf") return run;
  if (run.phase === "ready") {
    if (moving && xzDist(pos.x, pos.z, spawnXZ.x, spawnXZ.z) > 4) {
      run.phase = "running";
      run.leftGate = false;
    }
    return run;
  }
  if (!run.clocked) {
    if (along >= (run.startAlong || 8)) {
      run.clocked = true;
      run.leftGate = true;
    }
    return run;
  }
  run.time += dt;
  if (xzDist(pos.x, pos.z, run.finish.x, run.finish.z) <= run.radiusM) {
    run.phase = "finished";
    if (run.best == null || run.time < run.best) {
      run.best = run.time;
      localStorage.setItem(timeKey(run.finish.name), String(run.best));
    }
  }
  return run;
}

function assertListCourses() {
  const finish = { east_m: 1, north_m: 2 };
  const names = (routes) => listCourses({ routes }).map((r) => r.name).join(",");
  const tavascan = names([
    { id: "b", name: "Bosc", status: "review_needed", vertical_drop_m: 143.41, end_local: finish },
    { id: "t", name: "Tubo Negre", status: "approved", vertical_drop_m: 32.14, end_local: finish },
    { id: "d", name: "Debutants", status: "review_needed", vertical_drop_m: 6.55, end_local: finish },
    { id: "m", name: "Mascarida", status: "approved", vertical_drop_m: 38.59, end_local: finish },
    { id: "j", name: "Junk", status: "rejected", vertical_drop_m: 400, end_local: finish },
  ]);
  if (tavascan !== "Bosc,Mascarida,Tubo Negre") throw new Error("tavascan " + tavascan);
  const strict = names([
    { id: "a", name: "Boomer", status: "approved", vertical_drop_m: 200, end_local: finish },
    { id: "c", name: "Tiny", status: "approved", vertical_drop_m: 10, end_local: finish },
    { id: "e", name: "Held", status: "review_needed", vertical_drop_m: 300, end_local: finish },
  ]);
  if (strict !== "Boomer") throw new Error("strict " + strict);
  const onlyShort = names([
    { id: "s", name: "Bunny", status: "review_needed", vertical_drop_m: 8, end_local: finish },
  ]);
  if (onlyShort !== "Bunny") throw new Error("short " + onlyShort);
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("run.js")) {
  assertListCourses();
  console.log("listCourses ok");
}

// Instantiates bonvo's rider (skier / snowboarder) with the real minified builders
// and dumps every visible mesh to JSON for scripts/bonvo/to_blend.py.
// Usage: node scripts/bonvo/export-rider.mjs <dir from extract-all-js> <out dir>
import fs from "fs";
import { load } from "./harness.mjs";

const [root, out] = process.argv.slice(2);
const { req } = load([root]);
const Rider = req(20374).Hv;
fs.mkdirSync(out, { recursive: true });

// General -> specific, so the most specific rig group wins when naming a mesh.
const RIG = ["pelvis", "torso", "head", "hatG", "packG", "thighL", "thighR", "shinL", "shinR", "upperL", "upperR", "foreL", "foreR", "footL", "footR", "board", "skiL", "skiR", "poleL", "poleR"];

function dump(r) {
  r.root.updateMatrixWorld(true);
  const owner = new Map();
  for (const k of RIG) r[k].traverse((o) => owner.set(o, k));
  const count = {};
  const meshes = [];
  r.root.traverse((o) => {
    const pos = o.geometry?.getAttribute?.("position");
    if (!pos) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const g = o.geometry;
    const base = o.name || owner.get(o) || "body";
    const name = `${base}_${(count[base] = (count[base] || 0) + 1)}`;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    meshes.push({
      name,
      matrix: o.matrixWorld.toArray(),
      color: mat?.color ? mat.color.toArray() : null,
      position: Array.from(pos.array),
      uv: g.getAttribute("uv") ? Array.from(g.getAttribute("uv").array) : null,
      index: g.getIndex() ? Array.from(g.getIndex().array) : null,
    });
  });
  return meshes;
}

for (const mode of ["ski", "snowboard"]) {
  const meshes = dump(new Rider(mode));
  fs.writeFileSync(`${out}/rider-${mode}.json`, JSON.stringify({ name: `rider-${mode}`, meshes }));
  console.log(mode, meshes.length, "meshes,", meshes.reduce((n, m) => n + m.position.length / 3, 0), "verts");
}

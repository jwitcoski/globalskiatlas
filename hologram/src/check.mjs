/**
 * Hologram must mount the clay viewer, not a second terrain pipeline.
 * Run: npm run check
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = path.dirname(fileURLToPath(import.meta.url));
const main = fs.readFileSync(path.join(src, "main.js"), "utf8");
const hero = fs.readFileSync(path.join(src, "../../scripts/hero-montage-map.js"), "utf8");

assert.match(main, /initHeroMontageMap/);
assert.match(main, /background:\s*0x000000/);
assert.doesNotMatch(main, /createHologramViewer|loadClayTerrain/);
assert.match(hero, /options\.background/);
for (const name of ["viewer.js", "load-clay.js", "geometry.js", "procedural-island.js"]) {
  assert.equal(fs.existsSync(path.join(src, name)), false, name);
}

console.log("hologram check ok");

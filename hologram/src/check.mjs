/**
 * Smallest runnable check for hologram helpers.
 * Run: npm run check
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cameraFitDistance, mirrorCssScaleX, terrainVertexColor } from "./geometry.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(root, "..");

assert.equal(mirrorCssScaleX(true), "scaleX(-1)");
assert.equal(mirrorCssScaleX(false), "none");

const wide = cameraFitDistance(50, 28, 1.6);
const tall = cameraFitDistance(50, 28, 0.5);
assert.ok(tall > wide, "portrait view needs more distance");
const peak = terrainVertexColor(1, 0, 1, 0);
const valley = terrainVertexColor(0, 0, 1, 0);
const cliff = terrainVertexColor(1, 1, 0, 0);
assert.ok(peak[0] > valley[0], "peaks are lighter than valleys");
assert.ok(peak[0] > cliff[0], "faces away from the light are darker");

for (const rel of [
  "../hologram.html",
  "server.js",
  "resorts.json",
  "src/main.js",
  "src/viewer.js",
  "src/load-clay.js",
]) {
  assert.ok(fs.existsSync(path.join(project, rel)), `missing ${rel}`);
}

const resorts = JSON.parse(fs.readFileSync(path.join(project, "resorts.json"), "utf8"));
assert.ok(Array.isArray(resorts.resorts) && resorts.resorts.length > 0);

const clayRoot = path.resolve(project, "../clay_scenes");
if (fs.existsSync(clayRoot)) {
  const sample = resorts.resorts[0].id;
  const glb = path.join(clayRoot, sample, "terrain", "terrain-mesh.glb");
  assert.ok(fs.existsSync(glb), `expected local mesh for ${sample}`);
}

console.log("hologram check ok");

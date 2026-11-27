/**
 * Asserts mobile /mainmap stays on PMTiles (no eager full GeoJSON catalog).
 * Run: node scripts/tests/mobile-mainmap-light-check.js
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const src = readFileSync(join(root, "scripts/ski-resort-map-ml.js"), "utf8");

assert.match(src, /export function isMobileMapLight/);
assert.match(src, /includeAnalyzedPoints:\s*mobileMapLight/);
assert.doesNotMatch(
  src,
  /^fetchSkiAreaCatalog\(\)\.catch/m,
  "module-level catalog prefetch must stay removed on mobile light path",
);
assert.match(src, /catalogEager/);
assert.match(src, /ensureCatalogForSearch/);

// Mirror of isMobileMapLight — fails if the exported body drifts without updating this check.
function isMobileMapLight(mql) {
  try {
    return Boolean(mql?.("(max-width: 1024px), (pointer: coarse)")?.matches);
  } catch {
    return false;
  }
}
assert.equal(isMobileMapLight(() => ({ matches: true })), true);
assert.equal(isMobileMapLight(() => ({ matches: false })), false);
assert.equal(isMobileMapLight(), false);

const logoWebp = readFileSync(join(root, "assets/logo.webp"));
assert.ok(logoWebp.length < 30 * 1024, `logo.webp must be under 30KB, got ${logoWebp.length}`);

const deploy = readFileSync(join(root, ".github/workflows/deploy-to-s3.yml"), "utf8");
assert.match(deploy, /Content-Encoding|content-encoding/);
assert.match(deploy, /Pre-compress JSON and GeoJSON/);

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
assert.match(indexHtml, /hero-poster\.webp/);
assert.match(indexHtml, /IntersectionObserver/);
assert.match(indexHtml, /initHeroMontageMap/);
assert.doesNotMatch(indexHtml, /script type="module" src="scripts\/hero-montage-map/);

console.log("mobile-mainmap-light-check: ok");

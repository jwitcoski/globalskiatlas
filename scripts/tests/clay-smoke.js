import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const port = 3010;
const baseUrl = `http://localhost:${port}`;
const artifactDir = "test-artifacts/clay";
mkdirSync(artifactDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/index.html`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(500);
  }
  throw new Error("Local server did not start");
}

async function clickEntity(page, expectedType) {
  const canvas = page.locator(".hero-montage-stage canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Clay canvas has no layout box");
  const panel = page.locator(".clay-entity-panel");

  for (let y = 0.25; y <= 0.78; y += 0.06) {
    for (let x = 0.18; x <= 0.84; x += 0.06) {
      await canvas.click({ position: { x: box.width * x, y: box.height * y } });
      if (!(await panel.isVisible().catch(() => false))) continue;
      const text = await panel.innerText();
      if (text.includes(expectedType)) {
        await page.waitForFunction(
          ({ selector, type }) => {
            const value = document.querySelector(selector)?.innerText || "";
            return value.includes(type) && /Worldwide|Country|State \/ province|At this resort/.test(value);
          },
          { selector: ".clay-entity-panel", type: expectedType },
          { timeout: 15000 },
        ).catch(() => {});
        return {
          text: await panel.innerText(),
          osmId: await panel.getAttribute("data-entity-osm-id"),
        };
      }
      await panel.locator("[data-clay-entity-close]").click().catch(() => {});
    }
  }
  throw new Error(`Could not select a ${expectedType.toLowerCase()} entity`);
}

const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});
const browser = await chromium.launch({ headless: true });
try {
  await waitForServer();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const source = message.location()?.url || "";
    if (/Failed to load resource: the server responded with a status of 403/i.test(message.text())) return;
    if (source.startsWith(baseUrl)) errors.push(message.text());
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".hero-montage-stage canvas").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${artifactDir}/clay-loaded.png`, fullPage: false });

  const trail = await clickEntity(page, "TRAIL");
  if (!/^\d+$/.test(trail.osmId || "")) throw new Error("Trail selection has no internal OSM ID");
  if (!/Average slope\s+\d+% \(\d+°\)/.test(trail.text)) {
    throw new Error(`Trail selection has no terrain slope metrics: ${trail.text}`);
  }
  if (!/Worldwide|Country|State \/ province|At this resort/.test(trail.text)) {
    console.warn(`Trail ranking scopes unavailable: ${trail.text}`);
  }
  await page.screenshot({ path: `${artifactDir}/trail-selected.png`, fullPage: false });

  await page.locator("[data-clay-entity-close]").click();
  const lift = await clickEntity(page, "LIFT");
  if (!/^\d+$/.test(lift.osmId || "")) throw new Error("Lift selection has no internal OSM ID");
  if (!/Worldwide|Country|State \/ province|At this resort/.test(lift.text)) {
    console.warn(`Lift ranking scopes unavailable: ${lift.text}`);
  }
  await page.screenshot({ path: `${artifactDir}/lift-selected.png`, fullPage: false });

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log("Clay smoke test passed");
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}

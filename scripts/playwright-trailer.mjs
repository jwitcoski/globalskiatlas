import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:3017/playable/?trailer=1&shot=1";

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--autoplay-policy=no-user-gesture-required", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (msg) => console.log("console", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("pageerror", err.message));
await page.setDefaultTimeout(240000);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
console.log("opened", page.url());
await page.waitForFunction(
  () => {
    const t = window.__trailer;
    if (!t) return false;
    return t.status === "done" || t.status === "downloaded" || t.status === "error";
  },
  null,
  { timeout: 240000 },
);
const status = await page.evaluate(() => window.__trailer);
console.log("trailer", JSON.stringify(status));
await page.waitForTimeout(800);
await browser.close();
if (status?.status === "error") process.exit(1);

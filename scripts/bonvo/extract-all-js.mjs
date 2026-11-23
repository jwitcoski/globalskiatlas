// Saves every JS response body from the capture into <out dir> (skips ones already present by name).
// Usage: node scripts/bonvo/extract-all-js.mjs <bonvo-evidence.json> <out dir>
import fs from "fs";

const [file, out] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
fs.mkdirSync(out, { recursive: true });
for (const rec of j.records) {
  const events = rec.normalized_result.events.items;
  const urls = new Map(events.filter((e) => e.kind === "response").map((e) => [e.transaction_id, e.url?.url || ""]));
  for (const e of events) {
    if (e.kind !== "network-content" || e.phase !== "response" || e.body?.encoding !== "base64") continue;
    const url = urls.get(e.transaction_id) || "";
    if (!/\/_next\/static\/chunks\/.*\.js/.test(url)) continue;
    const name = decodeURIComponent(url.split("/").pop().split("?")[0]).replace(/[<>:"/\\|?*]/g, "_");
    fs.writeFileSync(`${out}/${name}`, Buffer.from(e.body.content, "base64"));
  }
}
console.log(fs.readdirSync(out).length, "files");

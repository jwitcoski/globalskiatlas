// Saves the *_lifts.geojson response from the capture. Usage: node extract-lifts.mjs <bonvo-evidence.json> <out.geojson>
import fs from "fs";

const [file, out] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(file, "utf8"));
for (const rec of j.records) {
  const ev = rec.normalized_result.events.items;
  const urls = new Map(ev.filter((e) => e.kind === "response").map((e) => [e.transaction_id, e.url?.url || ""]));
  for (const e of ev) {
    if (e.kind === "network-content" && e.body?.encoding === "base64" && /_lifts\.geojson/.test(urls.get(e.transaction_id) || "")) {
      fs.writeFileSync(out, Buffer.from(e.body.content, "base64"));
      console.log("wrote", out);
      process.exit(0);
    }
  }
}
console.error("no lifts.geojson in capture");
process.exit(1);

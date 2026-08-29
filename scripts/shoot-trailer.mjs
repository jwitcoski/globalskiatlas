/** Static server + WebM capture sink for playable/?trailer=1 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "playable");
const PORT = Number(process.env.TRAILER_PORT || 3017);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
};

function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  if (req.method === "POST" && url.pathname === "/__trailer_capture") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      const dest = path.join(outDir, "trailer.webm");
      fs.writeFileSync(dest, buf);
      const status = path.join(outDir, "trailer-status.json");
      fs.writeFileSync(status, JSON.stringify({ path: dest, bytes: buf.length, t: Date.now() }));
      send(res, 200, JSON.stringify({ ok: true, path: dest, bytes: buf.length }), "application/json");
      console.log(`saved ${dest} (${buf.length} bytes)`);
    });
    return;
  }
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) {
    send(res, 403, "forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, 404, "not found");
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`trailer server http://127.0.0.1:${PORT}/playable/?trailer=1`);
});

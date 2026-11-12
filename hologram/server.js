/**
 * Tiny static host for the Pepper's Ghost sandbox.
 * Serves this folder, and mounts sibling ../clay_scenes when present.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CLAY_ROOT = path.resolve(__dirname, "../clay_scenes");
const PORT = Number(process.env.PORT) || 3040;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const full = path.normalize(path.join(root, decoded));
  if (!full.startsWith(root)) return null;
  return full;
}

function tryFile(filePath) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";

  let file = null;
  if (pathname.startsWith("/clay_scenes/")) {
    file = tryFile(safeJoin(CLAY_ROOT, pathname.slice("/clay_scenes".length)));
  } else {
    file = tryFile(safeJoin(ROOT, pathname));
  }

  if (!file) {
    send(res, 404, "Not found");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  fs.createReadStream(file)
    .on("error", () => send(res, 500, "Read error"))
    .pipe(
      ((() => {
        res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
        return res;
      })()),
    );
});

server.listen(PORT, () => {
  const clayOk = fs.existsSync(CLAY_ROOT);
  console.log(`Pepper's Ghost clay → http://localhost:${PORT}`);
  console.log(`clay_scenes mount: ${clayOk ? CLAY_ROOT : "missing (procedural fallback only)"}`);
});

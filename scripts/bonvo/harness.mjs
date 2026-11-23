// Loads bonvo.ski's webpack chunks (from the reverse-engineering capture) under node,
// so the real minified geometry builders can run.
import fs from "fs";
import path from "path";

export function load(dirs) {
  const g = globalThis;
  g.self = g;
  g.window = g;
  // Texture painting only matters visually; a no-op 2D context lets the builders run.
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "getImageData" || k === "createImageData" ? (_x, _y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }) : k === "measureText" ? () => ({ width: 0 }) : () => ctx), set: (t, k, v) => ((t[k] = v), true) });
  const el = () => new Proxy(function () {}, { get: (_, k) => (k === "style" ? {} : k === "getContext" ? () => ctx : el()), apply: () => el() });
  g.document = { createElement: el, createElementNS: el, documentElement: el(), body: el(), addEventListener() {}, getElementById: () => null };
  g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  g.Path2D = class { constructor() { return new Proxy(this, { get: (t, k) => (k in t ? t[k] : () => {}) }); } };
  g.requestAnimationFrame = () => 0;
  g.devicePixelRatio = 1;
  g.innerWidth = 1280;
  g.innerHeight = 720;
  g.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  g.webpackChunk_N_E = [];

  const mods = {};
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".js"))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      if (!src.includes("(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push(")) continue; // worker bundles
      g.webpackChunk_N_E.push = (chunk) => Object.assign(mods, chunk[1]);
      new Function(src).call(g);
    }
  }

  const cache = {};
  const req = (id) => {
    if (cache[id]) return cache[id].exports;
    const m = (cache[id] = { exports: {} });
    if (!mods[id]) {
      m.exports = new Proxy({}, { get: (_, k) => (k === "__esModule" ? true : () => {}) });
      return m.exports;
    }
    mods[id](m, m.exports, req);
    return m.exports;
  };
  req.d = (e, defs) => { for (const k in defs) if (!Object.hasOwn(e, k)) Object.defineProperty(e, k, { enumerable: true, get: defs[k] }); };
  req.r = (e) => Object.defineProperty(e, "__esModule", { value: true });
  req.n = (m) => { const f = m && m.__esModule ? () => m.default : () => m; req.d(f, { a: f }); return f; };
  req.o = (o, k) => Object.hasOwn(o, k);
  req.g = g;
  req.t = (v) => v;
  return { req, mods };
}


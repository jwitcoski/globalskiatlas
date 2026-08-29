/** F3 overlay + coarse-pointer pads. Intents only — physics still reads the key set. */

export function capDpr() {
  const coarse = matchMedia("(pointer: coarse)").matches;
  return Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
}

export function bindPads(keys) {
  const root = document.getElementById("pads");
  if (!root) return;
  const map = {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    tuck: ["KeyW", "ArrowUp"],
    brake: ["KeyS", "ArrowDown"],
  };
  const held = new Map();
  function setCodes(codes, on) {
    for (const c of codes) {
      if (on) keys.add(c);
      else keys.delete(c);
    }
  }
  function release(id) {
    const rec = held.get(id);
    if (!rec) return;
    setCodes(rec.codes, false);
    rec.el.classList.remove("down");
    held.delete(id);
  }
  root.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("[data-pad]");
    if (!btn) return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    const codes = map[btn.dataset.pad];
    if (!codes) return;
    held.set(e.pointerId, { codes, el: btn });
    setCodes(codes, true);
    btn.classList.add("down");
  });
  const up = (e) => release(e.pointerId);
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
  root.addEventListener("lostpointercapture", up);
}

export function attachDebug(renderer, getSnap) {
  const el = document.getElementById("dbg");
  if (!el) return { tick() {} };
  let on = new URLSearchParams(location.search).has("debug");
  let acc = 0;
  el.hidden = !on;
  addEventListener("keydown", (e) => {
    if (e.code !== "F3") return;
    e.preventDefault();
    on = !on;
    el.hidden = !on;
  });
  function tick(dt) {
    if (!on) return;
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    const info = renderer.info;
    const canvas = renderer.domElement;
    const s = getSnap();
    el.textContent = [
      `fps ${s.fps}  dt ${(s.dt * 1000).toFixed(1)}ms`,
      `draw ${info.render.calls}  tri ${info.render.triangles}`,
      `buf ${canvas.width}×${canvas.height}  css ${canvas.clientWidth}×${canvas.clientHeight}  dpr ${renderer.getPixelRatio().toFixed(2)}`,
      `phase ${s.phase}  spd ${s.speed.toFixed(1)} m/s  hdg ${s.heading.toFixed(2)}`,
      `piste ${s.onPiste ? "on" : "off"}  y ${s.y.toFixed(1)}  score ${Math.round(s.score)}`,
      `phys custom-dem  1/60  fall-line×grade`,
    ].join("\n");
  }
  return { tick };
}

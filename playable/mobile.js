/** Landscape-first playable. Analog stick + pads; lock requested on Ski. */

import { setAnalogSteer, setAnalogVert, clearAnalog } from "./input.js?v=mob1";

const DEAD = 0.12;

export function bindMobileChrome(keys) {
  const overlay = document.getElementById("rotate-lock");
  const coarse = () => matchMedia("(pointer: coarse)").matches;
  const compact = () => coarse() || innerWidth < 720 || innerHeight < 520;
  function apply() {
    const portrait = innerHeight > innerWidth + 40;
    const lock = coarse() && portrait;
    document.body.classList.toggle("must-landscape", lock);
    document.body.classList.toggle("compact-ui", compact());
    if (overlay) overlay.hidden = !lock;
    if (lock) {
      keys.clear();
      clearAnalog();
    }
  }
  apply();
  addEventListener("resize", apply);
  addEventListener("orientationchange", apply);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });
  function requestLandscape() {
    try {
      if (coarse() && screen.orientation?.lock) screen.orientation.lock("landscape").catch(() => {});
    } catch {
      /* browser refused */
    }
    apply();
  }
  return { blocked: () => document.body.classList.contains("must-landscape"), refresh: apply, requestLandscape };
}

export function bindPads(keys) {
  const root = document.getElementById("pads");
  if (!root) return;
  const map = {
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
    if (rec.stick) {
      clearAnalog();
      rec.el.classList.remove("down");
      const knob = rec.el.querySelector(".stick-knob");
      if (knob) knob.style.transform = "";
    } else {
      setCodes(rec.codes, false);
      rec.el.classList.remove("down");
    }
    held.delete(id);
  }
  function stickFromEvent(well, e) {
    const r = well.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const radius = Math.max(8, Math.min(r.width, r.height) * 0.5);
    let nx = (e.clientX - cx) / radius;
    let ny = (e.clientY - cy) / radius;
    const mag = Math.hypot(nx, ny);
    if (mag > 1) {
      nx /= mag;
      ny /= mag;
    }
    const ax = Math.abs(nx) < DEAD ? 0 : nx;
    const ay = Math.abs(ny) < DEAD ? 0 : -ny;
    setAnalogSteer(-ax);
    setAnalogVert(ay);
    const knob = well.querySelector(".stick-knob");
    if (knob) {
      const px = ax * radius * 0.42;
      const py = -ay * radius * 0.42;
      knob.style.transform = `translate(${px}px, ${py}px)`;
    }
  }
  root.addEventListener("pointerdown", (e) => {
    const stick = e.target.closest("[data-stick]");
    const btn = e.target.closest("[data-pad]");
    if (stick) {
      e.preventDefault();
      try {
        stick.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic / already captured */
      }
      held.set(e.pointerId, { stick: true, el: stick });
      stick.classList.add("down");
      stickFromEvent(stick, e);
      return;
    }
    if (!btn) return;
    e.preventDefault();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already captured */
    }
    const codes = map[btn.dataset.pad];
    if (!codes) return;
    held.set(e.pointerId, { codes, el: btn });
    setCodes(codes, true);
    btn.classList.add("down");
  });
  root.addEventListener("pointermove", (e) => {
    const rec = held.get(e.pointerId);
    if (!rec?.stick) return;
    stickFromEvent(rec.el, e);
  });
  const up = (e) => release(e.pointerId);
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
  root.addEventListener("lostpointercapture", up);
  addEventListener("blur", () => {
    for (const id of [...held.keys()]) release(id);
    clearAnalog();
  });
}

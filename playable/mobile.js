/** Landscape-first playable. Pads emit the same key codes as WASD. */

export function bindMobileChrome(keys) {
  const overlay = document.getElementById("rotate-lock");
  const coarse = () => matchMedia("(pointer: coarse)").matches;
  function apply() {
    const portrait = innerHeight > innerWidth + 40;
    const lock = coarse() && portrait;
    document.body.classList.toggle("must-landscape", lock);
    if (overlay) overlay.hidden = !lock;
    if (lock) keys.clear();
    try {
      if (coarse() && screen.orientation?.lock) screen.orientation.lock("landscape").catch(() => {});
    } catch {
      /* browser refused */
    }
  }
  apply();
  addEventListener("resize", apply);
  addEventListener("orientationchange", apply);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });
  return { blocked: () => document.body.classList.contains("must-landscape"), refresh: apply };
}

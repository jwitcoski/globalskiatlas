/** Device-aware rendering quality for clay scenes. */

export function getClayQuality() {
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
  const narrow = globalThis.matchMedia?.("(max-width: 700px)").matches || false;
  const coarse = globalThis.matchMedia?.("(pointer: coarse)").matches || false;
  if (reducedMotion || narrow || coarse) {
    return { tier: "mobile", dpr: 1, shadows: false, powerPreference: "low-power" };
  }
  return { tier: "balanced", dpr: 1.35, shadows: true, powerPreference: "high-performance" };
}

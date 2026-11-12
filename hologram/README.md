# Pepper's Ghost Clay (sandbox)

Standalone phone viewer for Global Ski Atlas **clay** resort meshes, tuned for a **glass bowl** Pepper’s Ghost setup.

This is intentionally separate from the main site. If the illusion works well, port the viewer mode into the production clay pages.

## Physical setup

1. Phone face-up, brightness max, room lights low.
2. Cut a clear plastic/acrylic sheet to fit inside a glass bowl at **~45°**.
3. Place the bowl over the phone so the sheet slants away from you.
4. Open this app fullscreen, hide the UI, look in from the side.

The bowl is the dome. The **45° sheet** is the reflector. Without the sheet you mostly just see the phone.

## Run

From this folder:

```bash
npm start
```

Open `http://localhost:3040` on your phone (same Wi‑Fi), or use a tunnel/ngrok if needed.

The server mounts sibling `../clay_scenes` at `/clay_scenes`. If those meshes are missing, pick **Procedural island (offline)**.

```bash
npm run check
```

## Controls

- **Mirror for reflection** — horizontal flip so left/right read correctly in the bowl
- **Auto-spin** — slow yaw (respects `prefers-reduced-motion`)
- **Keep screen on** — Wake Lock API
- **Hide UI** — black stage only for projecting

Deep link: `/?resort=montage_mountain_pa`

## Scope (v0)

- Terrain GLB only (no trails/lifts yet)
- Single-view bowl mode (not a 4-sided pyramid)
- Local sandbox; not wired into homepage/wiki

## Later port to main site

Reuse:

- black clear color + hidden chrome
- CSS `scaleX(-1)` mirror toggle
- wake lock + fullscreen helpers

against `scripts/hero-montage-map.js` / clay runtime.

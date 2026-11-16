# Pepper's Ghost Clay (sandbox)

Standalone phone viewer for Global Ski Atlas **clay** resort meshes, tuned for a **glass bowl** Pepper’s Ghost setup.

Unlisted production page: `https://globalskiatlas.com/hologram.html`. Nothing on the site links to it.

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

Open `http://localhost:3040/hologram.html` on your phone (same Wi‑Fi), or use a tunnel/ngrok if needed.

The server mounts sibling `../clay_scenes` at `/clay_scenes`. If those meshes are missing, pick **Procedural island (offline)**.

```bash
npm run check
```

## Controls

- **Mirror for reflection** — horizontal flip so left/right read correctly in the bowl
- **Auto-spin** — slow yaw (respects `prefers-reduced-motion`)
- **Keep screen on** — Wake Lock API
- **Hide UI** — black stage only for projecting

Deep link: `/hologram.html?resort=montage_mountain_pa`

## Scope

The stage is `initHeroMontageMap` with a black background. Trails, trees, lifts, and buildings come from that viewer.

- Single-view bowl mode (not a 4-sided pyramid)
- Unlisted page; nothing else on the site links here

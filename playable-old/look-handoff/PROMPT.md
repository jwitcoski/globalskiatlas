# Prompt: Bonvo-like look on Global Ski Atlas assets

You are implementing a look pass on the playable at `playable/`. Read this file, then `ASSETS.md` in this folder. Use the listed GLBs and the code that already mounts them. Do not download, copy, or paste competitor shader source, mesh builders, or tile bytes.

## Goal

Snow, the rider, and nearby scenery should read the way a bright ski game reads: sunlit snow stays warm white, shaded snow stays blue-white, the jacket stays a solid color in shadow, and trees and lifts sit in the same light. Do this on the meshes we already have.

## Do not

- Do not add libraries, UI frameworks, or a new renderer.
- Do not replace `skier.glb`, `snowboarder.glb`, or `snowy-pine-pack.glb` with generated primitives.
- Do not displace snow vertices. Skis and the ski wake sit on the DEM. A raise buries them. `ground.js` already says this.
- Do not change the heightfield format, OSM loading, or `loadMountain()` order.
- Do not add a quality-tier system in this pass. One look, tuned for the current desktop camera.
- Do not copy a fresnel formula from a minified third-party chunk. Write a short rim of your own.

## What the reference ride actually was

Observed from a headed capture of a live Three.js r172 ride. Useful as a target, not as source.

- Snow material: a roughness break-up, a rim in the snow color, and a world-space grain that dies with distance. Subsurface-style glow is a quality step they turn off on weak phones. Weather flakes are a separate particle system.
- Rider: flat outfit colors, a little self-light so the suit does not go black in shade, gear darker than the jacket, contact shadow is a blob. Their body mesh was generated in the page. Ours is a GLB. Keep ours.
- Trees, fences, lift towers: not recovered as meshes. Distance names exist (cones, tufts, bushes, village, snowcat, lifts). No geometry for them was in the loaded scripts. Use our pine pack, clay fences, and lift GLBs.
- Elevation mesh builder: not in the capture. Leave the heightfield and terrain GLB alone.

## Build order

Screenshot the same slope after each step before starting the next. Chase camera, corduroy surface, one named run.

### 1. Light (`playable/look.js`)

`addSkyAndLights` already has a warm sun, cool hemi, cool fill, ACES, bloom, and a 26 m shadow map. Adjust those until a shaded slope is blue-white and a sunlit slope is warm, before writing shader code.

Reuse `addContactBlob`. Park it under the player skis each frame if it is not already. Do not add a second shadow system.

`makeFallingSnow` / `updateFallingSnow` already exist. Expose them as a light storm and a heavy storm on top of the ground material. Flakes are not a change to `snowTerrainMaterial`.

### 2. Snow (`playable/ground.js`, `snowTerrainMaterial`)

Keep corduroy, ice, powder, lane seams, melt fringe, and sparkle. Add two reads inside the existing `onBeforeCompile`:

- A fresnel rim tinted toward the snow color, stronger at a grazing angle, zero on dirt.
- A fine world-space grain on the albedo. Fade it out by the distance where the ribs already fade (about 18–50 m, see `gNear`).

Leave the vertex shader. Roughness stays high except where ice glaze already lowers it.

### 3. Rider (`playable/skier-model.js`, `playable/snowboarder-model.js`)

`tuneMaterial` multiplies albedo by 3 because the atlas goes black. Replace that hack with a suit that holds its color: metalness stays 0, roughness stays high, and the jacket dye in `dyeJacket` remains the only recolor.

Add a small rim on the jacket only, same idea as the snow rim, in the jacket color. Pants, helmet, skis, and the board stay on the atlas and stay darker than the jacket.

NPCs in `npc-skiers.js` use the same mount path. One material change covers them. Do not spawn more skiers.

### 4. Trees and lifts (`playable/osm-world.js`, `playable/lift-graphics.js`)

Pine material is Lambert plus a hit-bend shader. Lifts and fences are Lambert clay colors from `PALETTE`.

Brighten those albedos so they survive the same sun as the snow, and add the same rim to the pine material and the lift steel material. Cast shadows only for instances near the camera. The pine pack already sets `castShadow` on one band. Keep that idea. Do not raise `MAX_TREES`.

## Done when

- Shaded snow is blue-white, not gray. Sunlit snow is warm.
- Corduroy, ice, and powder still read as different surfaces up close.
- Skis are not buried in the snow mesh.
- The jacket is a readable color in shade. Skis and poles are darker than the jacket.
- A contact blob sits under the rider.
- Falling snow can be off, light, or heavy without editing the ground shader.
- Pines and lift towers are not a dull gray next to the slope.
- No new dependency. No new mesh file. No change to heightfield loading.

## Check

Non-trivial shader branches need one runnable check. Extend the self-check already at the bottom of `ground.js` if you add a numeric fade or mix. A one-line assert on the fade distances is enough. Do not add a test framework.

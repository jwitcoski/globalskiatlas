# Assets for the look pass

Use these. Do not copy competitor files into this folder. The ride capture contained no tree mesh, fence mesh, lift mesh, or terrain mesh we can ship. Those builders never loaded. Notes on what the capture did show are in `PROMPT.md`.

## Models already in the repo

| Use | File | Mounted by |
| --- | --- | --- |
| Skier | `playable/assets/models/skier/skier.glb` | `playable/skier-model.js` `loadSkierModel` / `mountSkierModel` |
| Snowboarder | `playable/assets/models/snowboarder/snowboarder.glb` | `playable/snowboarder-model.js` |
| Pines | `playable/assets/models/trees/snowy-pine-pack.glb` | `playable/osm-world.js` `loadPinePack` |
| Spare pine pack | `playable/assets/models/snowy-pine-pack.glb` | Not the runtime path. Prefer the `trees/` pack. |
| Chair | `playable/assets/models/lift/chair.glb` | `playable/lift-graphics.js` |
| Tower | `playable/assets/models/lift/tower.glb` | `playable/lift-graphics.js` |
| Cabins | `playable/assets/models/lift/cabins.glb` | `playable/lift-graphics.js` |
| Gate | `playable/assets/models/gate/gate.glb` | start/finish banners in `playable/look.js` are generated; gate GLB is separate |
| Yeti | `playable/assets/models/yeti/yeti.glb` | `playable/yeti.js` |
| Resort shell | `playable/assets/models/ski-resort4.glb` | Do not retint this for the look pass |

`playable/assets/models/**/evidence/` is review renders. Do not load those at runtime.

## Code the look already lives in

- `playable/look.js` — sun, hemi, fill, ACES, bloom, `addContactBlob`, `makeFallingSnow`, `updateFallingSnow`, spray.
- `playable/ground.js` — `snowTerrainMaterial`. Corduroy, ice, powder, grain, sparkle, melt fringe. No vertex displacement.
- `playable/snow.js` — where snow is, and ice / corduroy / powder as a ski surface. Not the shader.
- `playable/skier-model.js` — `tuneMaterial`, `dyeJacket`.
- `playable/snowboarder-model.js` — same tune and dye.
- `playable/npc-skiers.js` — suit colors `SUITS`, ski colors `SKIS`. Full meshes, small count.
- `playable/osm-world.js` — instanced pines (`MAX_TREES` 8000), fences, lift placement.
- `playable/lift-graphics.js` — chair, tower, cable, terminals. Lambert, `PALETTE` from `scripts/clay/config.js`.

## Colors already chosen

NPC suits: `#2a6fdb`, `#1f8a4c`, `#7b3fa0`, `#e07a14`, `#c45a18`, `#d8342e`, `#f2c02e`.

NPC skis: `#f2c02e`, `#3a8fd4`, `#d8342e`, `#1f8a4c`.

Snow albedo in `snowTerrainMaterial` starts at `#fbfaf6`. Shadow tint is `#c0d3ea`.

## Not in this folder, on purpose

Competitor script bodies from the ride capture. They are minified page source, not models, and the tree / fence / terrain mesh builders were not among them. Rebuild the look from the files above.

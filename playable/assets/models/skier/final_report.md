# Skier final report

Blender 5.2.2 LTS (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`).

## Deliverables

- Source: `playable/assets/models/skier/create_skier.py`
- Scene: `playable/assets/models/skier/skier.blend`
- Runtime: `playable/assets/models/skier/skier.glb`
- Maps: `textures/skier_albedo.png`, `skier_roughness.png`, `skier_metallic.png`, `skier_normal.png` (2048, packed in the blend)

## Measured result

- Authored mesh: 2,495 quads, 4,990 triangles, one material `SkierPBR`
- Height 1.798 m, ski bases at z=0, tips toward -Y (min Y -1.02)
- UV overlap fraction 0.000 at a 256px coverage check
- Fresh GLB import: object `Skier` at the origin, same bounds, rotation 0, material `SkierPBR` with albedo, packed metallic-roughness, and normal. glTF stores triangles, so the imported polygon count is 4,990 triangles.
- The GLB node has no extra rotation. Blender's exporter writes glTF Y-up, and reimport restores Blender Z-up with the face still toward -Y.

## Reference comparison

Front, side, and three-quarter renders were opened against `playable/assets/concepts/skier-tpose.png`. The clothing split, T-pose, poles, and parallel skis match. The reference overlay (`evidence/reference-compare/comparison.png`) shows the same pose. The photo's ski tips sit lower because of perspective; the fit was not used to stretch the mesh. Arms are a little wider than the photo's slightly dropped arms.

## Form notes

- Jacket has a chest, waist, and collar. Charcoal yoke covers the shoulders and upper chest. Pants have a sewn crotch.
- Goggles are a wrapped black frame with a blue lens, not the photo's large reflective shield.
- Gloves are mitts closed on the grips, not separate fingers.
- Boots are ski boots with a forward cuff and three buckles. Bindings are dark and sit on the skis.
- Clothing shells are open at hems and cuffs, so the mesh is not watertight. That is intentional.

## Evidence

- Multiview: `evidence/final/` (EEVEE, 768, light studio)
- Beauty: `evidence/beauty/` (Cycles CPU, 1024, 32 samples, OIDN preview). OptiX was unavailable because the NVIDIA driver is too old.
- The Rust quality runtime was not built, so triangle, ground, and import checks used the Blender inspector instead.

## Stages

contract and references, graybox, primary and secondary forms, structural refinement, materials, polish, and export validation. No rig: the request is a static T-pose.

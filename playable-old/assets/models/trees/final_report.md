# Snowy pine pack

Blender 5.2.2 LTS (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`). Source is `create_snowy_pines.py`. It rebuilds `snowy-pines.blend` and `snowy-pine-pack.glb`.

## What shipped

Three meshes in one GLB, each 11 m tall, origin at the trunk base, lowest vertices on the trunk ring. No roots, ground, pot, or snowdrift in the GLB. A render-only shadow catcher stays in the blend and is not exported.

| Mesh | Triangles | Trunk radius at the snow | Crown width |
| --- | --- | --- | --- |
| pine_spire | 744 | 0.294 m | about 4.8 m |
| pine_broad | 696 | 0.315 m | about 9.2 m |
| pine_young | 492 | 0.217 m | about 3.4–4.6 m |

All three are under the 900-triangle ceiling. Trunk diameters sit inside 0.4–0.8 m. One shared `pine_albedo` PNG (4096, straight alpha, sRGB). Islands are packed into separate rectangles. Alpha is only 0 or 1, and transparent texels keep neighboring color so the game's 0.38 cutoff does not fringe black. Needles are a mid green (`#3E8F3A` and two neighbors). Snow is near white. Bark is a readable brown. No armature, shape keys, skin, or extra maps.

glTF is Y-up. Fresh import in a new Blender process restored Z-up height 0–11 m, the same triangle counts, one image, and no animation. `evidence/glb-metrics.json` records that. Hard gate passed. Open edges are the alpha cards.

## Looks

White-background reviews (Cycles, Standard view, CPU because OptiX failed on the installed driver):

- Spire front: `evidence/white-a/camera-01_frame-000001.png`
- Spire side: `evidence/white-side/camera-01_frame-000001.png`
- Spire three-quarter: `evidence/tip-04/camera-01_frame-000001.png`
- Broad front: `evidence/white-a/camera-04_frame-000001.png`
- Broad side: `evidence/white-side/camera-02_frame-000001.png`
- Broad three-quarter: `evidence/tip-04/camera-02_frame-000001.png`
- Young front: `evidence/white-young/camera-01_frame-000001.png`
- Young side: `evidence/white-side/camera-03_frame-000001.png`
- Young three-quarter: `evidence/tip-04/camera-03_frame-000001.png`

The crown continues the same whorls up to a narrow tip. The old leader, four cards shot straight up on a bare stick, is gone.

The spire is a narrow layered spruce. The broad tree is a wide drooping skirt with much more white on the boughs. The young tree is full height with the trunk visible between separated whorls. Green and snow both stay obvious on white. None of them is a solid green cone on a cylinder.

The pack contact sheet is `evidence/glb-views/contact_sheet.png`. The three meshes are spaced apart in the file so that sheet is a lineup, not a close-up. The studio floor in that sheet is the evidence renderer, not exported geometry.

## Limits

Needle cards are hard-edged tufts, not a photo of needles. The broad snow caps are opaque blobs sitting on those tufts. The young tree is uneven in plan, about 3.4 m one way and 4.6 m the other, so yaw changes its width. That matches an open crown. Yaw at runtime still has crossed cards, so a side-on branch does not vanish.

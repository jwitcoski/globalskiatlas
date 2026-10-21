# Yeti

Blender 5.2.2 LTS (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, hash d13f752e3b9c).

The procedural spheres are gone. `makeYeti` still returns one Group. It loads `yeti.glb` into that group, leaves the chase speeds and the 3.4 m catch alone, and does not cast a shadow.

## What shipped

- Bind pose is a bipedal chase stride, face along Blender -Y so the glTF faces +Z.
- Fresh import: height 3.40 m, width 1.81 m, depth 1.97 m, sole at Z = 0, 11,472 triangles, one material (`YetiFur`) with `yeti_albedo`.
- Origin on the ground between the feet. Upper arms are `UpperArm_L` and `UpperArm_R`.
- Fur is authored sRGB around 0.72, written straight into the PNG. Three.js decodes that file as sRGB, so an earlier linear buffer was turning the coat black on the slope. Face, hands, and feet are in the same albedo. Under the game lights the coat stays a warm off-white, darker than wonderland snow `0xfbfaf6`.

## What did not ship

A bone clip. Aiming the limbs at the opposite stride stretched the skin into ribbons, and a smaller local swing turned the fingers into spikes. The blend and the GLB have no action. While chasing, `tickYeti` still swings the named upper arms.

Digits are joined shells, not a fused volume, so the mesh is not one watertight component. That is why the hands stay readable and also why a real cycle tore them.

## Evidence

White studio, EEVEE, 1024: `evidence/beauty/front.png`, `side.png`, `three-quarter.png`, `run.png` (the chase pose), `snow.png`.
Fresh GLB multiview: `evidence/final/contact_sheet.png`.
Metrics: `evidence/glb-metrics.json`.

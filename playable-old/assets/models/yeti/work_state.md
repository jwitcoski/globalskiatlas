# Yeti work state

- Stage: export validation done. Clip omitted on purpose.
- Blender 5.2.2. Source `create_yeti.py`. Deliverables `yeti.blend`, `yeti.glb`, `textures/yeti_albedo.png`.
- Fresh import: 3.40 m tall, 1.81 m wide, sole at 0, 11472 triangles, one albedo, no action.
- Face is Blender -Y / glTF +Z. UpperArm_L and UpperArm_R are the swing bones.
- Known limit: digits are unfused shells. A stride clip tore them, so the bind pose is the chase.
- Game: `playable/yeti.js` loads the GLB into the existing group. Speeds and catch distance unchanged.

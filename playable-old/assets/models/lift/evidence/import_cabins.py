"""Fresh-process check of cabins.glb. Not part of the asset source."""
import bpy
from pathlib import Path

GLB = Path(r"c:\Users\jwitc\Documents\GitHub\GlobalSkiAtlas_2\playable\assets\models\lift\cabins.glb")
OUT = Path(r"c:\Users\jwitc\Documents\GitHub\GlobalSkiAtlas_2\playable\assets\models\lift\evidence\cabins-spread.blend")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB))
print("objects:")
for obj in bpy.data.objects:
    if obj.type != "MESH":
        print(" ", obj.name, obj.type, "loc", tuple(round(c, 4) for c in obj.location))
        continue
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    obj.data.calc_loop_triangles()
    tris = len(obj.data.loop_triangles)
    mats = [m.name for m in obj.data.materials]
    print(
        f" {obj.name} tris={tris} loc={tuple(round(c, 4) for c in obj.location)} "
        f"x=({min(xs):.3f},{max(xs):.3f}) y=({min(ys):.3f},{max(ys):.3f}) "
        f"z=({min(zs):.3f},{max(zs):.3f}) mats={mats}"
    )
print("actions", [a.name for a in bpy.data.actions])
print("images", [(i.name, i.colorspace_settings.name) for i in bpy.data.images])
for mat in bpy.data.materials:
    if not mat.node_tree:
        continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        print(mat.name, "metallic", bsdf.inputs["Metallic"].default_value, "rough", bsdf.inputs["Roughness"].default_value)
# Side-by-side copy for the multiview sheet. The GLB itself keeps both at the grip.
car = bpy.data.objects.get("CableCar")
if car:
    car.location.x = 6.2
bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
print("spread", OUT)

"""Build a .blend from a JSON mesh dump written by export-rider.mjs.

blender -b --python scripts/bonvo/to_blend.py -- <in.json> <out.blend>

three.js is Y-up, Blender is Z-up: vertices are baked through matrixWorld, then rotated +90deg about X.
"""
import json
import sys

import bpy
from mathutils import Matrix, Vector
src, dst = sys.argv[sys.argv.index("--") + 1 :][:2]
data = json.load(open(src))

bpy.ops.wm.read_factory_settings(use_empty=True)
coll = bpy.context.scene.collection
y_up_to_z_up = Matrix.Rotation(1.5707963267948966, 4, "X")

for m in data["meshes"]:
    mx = m["matrix"]  # three stores column-major
    world = y_up_to_z_up @ Matrix([mx[i : i + 4] for i in range(0, 16, 4)]).transposed()
    p = m["position"]
    verts = [world @ Vector(p[i : i + 3]) for i in range(0, len(p), 3)]
    idx = m["index"] or list(range(len(verts)))
    flip = world.determinant() < 0  # mirrored parts would otherwise end up inside-out
    tris = [tuple(idx[i : i + 3][::-1] if flip else idx[i : i + 3]) for i in range(0, len(idx), 3)]
    mesh = bpy.data.meshes.new(m["name"])
    mesh.from_pydata(verts, [], tris)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    if m["uv"]:
        uv = mesh.uv_layers.new(name="UVMap")
        for loop in mesh.loops:
            u, v = m["uv"][2 * loop.vertex_index : 2 * loop.vertex_index + 2]
            uv.data[loop.index].uv = (u, v)
    obj = bpy.data.objects.new(m["name"], mesh)
    coll.objects.link(obj)
    mat = bpy.data.materials.new(m["name"])
    if m["color"]:
        mat.diffuse_color = (*m["color"][:3], 1.0)
    mesh.materials.append(mat)

bpy.ops.wm.save_as_mainfile(filepath=dst)
print("saved", dst, len(data["meshes"]), "objects")

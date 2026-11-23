"""Build a lift .blend from bonvo's lifts.geojson using bonvo's own placement rules.

blender -b --python scripts/bonvo/lifts_to_blend.py -- <lifts.geojson> <out.blend>

From bonvo's chunk 6578: the line is a centripetal Catmull-Rom spline through the OSM points;
towers go every 70 m along it, dropping the last one if it would sit < 35 m from the end;
carpets get no towers. The tower/chair/cabin shapes are placeholders (bonvo's lift meshes are
not in the capture). Units are metres, Z-up, origin at the first lift's first point.
"""
import json
import math
import sys

import bmesh
import bpy
from mathutils import Vector

src, dst = sys.argv[sys.argv.index("--") + 1 :][:2]
features = json.load(open(src))["features"]

TOWER_EVERY, TOWER_MIN_END = 70.0, 35.0
CABLE_H = {"chair_lift": 6.0, "gondola": 7.0}  # ponytail: guessed cable height above ground, real one is per-tower data
CHAIR_EVERY = 24.0


def to_local(coords, o):
    k = 111320.0
    lat0 = math.radians(o[1])
    return [Vector(((x - o[0]) * k * math.cos(lat0), (y - o[1]) * k, z - o[2])) for x, y, z in coords]


def catmull_centripetal(pts, step=2.0):
    if len(pts) < 3:
        return list(pts)
    ext = [pts[0] * 2 - pts[1], *pts, pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1 : i + 3]
        d = lambda a, b: max((a - b).length, 1e-6) ** 0.5
        t1 = d(p1, p0)  # t0 = 0
        t2 = t1 + d(p2, p1)
        t3 = t2 + d(p3, p2)
        n = max(2, int((p2 - p1).length / step))
        for j in range(n):
            t = t1 + (t2 - t1) * j / n
            a1 = p0 * ((t1 - t) / t1) + p1 * (t / t1)
            a2 = p1 * ((t2 - t) / (t2 - t1)) + p2 * ((t - t1) / (t2 - t1))
            a3 = p2 * ((t3 - t) / (t3 - t2)) + p3 * ((t - t2) / (t3 - t2))
            b1 = a1 * ((t2 - t) / t2) + a2 * (t / t2)
            b2 = a2 * ((t3 - t) / (t3 - t1)) + a3 * ((t - t1) / (t3 - t1))
            out.append(b1 * ((t2 - t) / (t2 - t1)) + b2 * ((t - t1) / (t2 - t1)))
    out.append(pts[-1])
    return out


def along(poly, dist):
    acc = 0.0
    for a, b in zip(poly, poly[1:]):
        seg = (b - a).length
        if acc + seg >= dist:
            return a.lerp(b, (dist - acc) / (seg or 1)), (b - a).normalized()
        acc += seg
    return poly[-1], (poly[-1] - poly[-2]).normalized()


def length(poly):
    return sum((b - a).length for a, b in zip(poly, poly[1:]))


def box(name, size, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return bm


def mesh_obj(name, bms, color):
    bm = bmesh.new()
    for part in bms:
        tmp = bpy.data.meshes.new("t")
        part.to_mesh(tmp)
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        part.free()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    me.materials.append(mat)
    return bpy.data.objects.new(name, me)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene.collection
templates = bpy.data.collections.new("templates")
scene.children.link(templates)
templates.hide_viewport = True
templates.hide_render = True

steel, red = (0.6, 0.62, 0.65), (0.75, 0.1, 0.1)
# Unit-height tower; instances scale Z to the cable height.
TOWER = mesh_obj("tower", [box("p", (0.5, 0.5, 1.0), (0, 0, 0.5)), box("a", (4.0, 0.3, 0.3), (0, 0, 0.96))], steel)
CHAIR = mesh_obj("chair", [box("h", (0.05, 0.05, 1.2), (0, 0, -0.6)), box("s", (2.4, 0.5, 0.08), (0, 0, -1.2)), box("b", (2.4, 0.08, 0.6), (0, -0.25, -0.9))], red)
CABIN = mesh_obj("cabin", [box("h", (0.1, 0.1, 1.0), (0, 0, -0.5)), box("c", (1.6, 1.8, 1.5), (0, 0, -1.75))], red)
for o in (TOWER, CHAIR, CABIN):
    templates.objects.link(o)

origin = features[0]["geometry"]["coordinates"][0]
for f in features:
    p = f["properties"]
    name = p.get("name") or "lift"
    coll = bpy.data.collections.new(name)
    scene.children.link(coll)
    carpet = p["liftType"] == "magic_carpet"
    ground = catmull_centripetal(to_local(f["geometry"]["coordinates"], origin))
    h = 0.3 if carpet else CABLE_H.get(p["liftType"], 6.0)
    cable = [v + Vector((0, 0, h)) for v in ground]

    cu = bpy.data.curves.new(name + "_cable", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.6 if carpet else 0.03
    sp = cu.splines.new("POLY")
    sp.points.add(len(cable) - 1)
    for pt, v in zip(sp.points, cable):
        pt.co = (*v, 1.0)
    coll.objects.link(bpy.data.objects.new(name + "_cable", cu))

    total = length(ground)
    if not carpet:
        n = int(total // TOWER_EVERY)
        for i in range(1, n + 1):
            d = TOWER_EVERY * i
            if total - d < TOWER_MIN_END:
                break
            pos, fwd = along(ground, d)
            t = bpy.data.objects.new(f"{name}_tower_{i}", TOWER.data)
            t.location = pos
            t.scale = (1, 1, h)
            t.rotation_euler.z = math.atan2(fwd.y, fwd.x) + math.pi / 2
            coll.objects.link(t)
        proto = CABIN if p["liftType"] == "gondola" else CHAIR
        for i in range(int(total // CHAIR_EVERY)):
            pos, fwd = along(cable, CHAIR_EVERY * (i + 0.5))
            c = bpy.data.objects.new(f"{name}_carrier_{i}", proto.data)
            c.location = pos
            c.rotation_euler.z = math.atan2(fwd.y, fwd.x) + math.pi / 2
            coll.objects.link(c)
    print(name, p["liftType"], round(total), "m")

bpy.ops.wm.save_as_mainfile(filepath=dst)
print("saved", dst)

"""Game-ready abominable snowman. Durable source for playable/assets/models/yeti/.

Blender Z up. The character faces -Y so glTF Y-up export faces +Z.
Origin is on the ground between the feet. The planted sole is the lowest vertex.
Run: blender --background --factory-startup --python create_yeti.py -- --stage gray|full
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils import noise as blnoise

ROOT = Path(__file__).resolve().parent
TEX_DIR = ROOT / "textures"
BLEND_PATH = ROOT / "yeti.blend"
GLB_PATH = ROOT / "yeti.glb"

HEIGHT_TARGET = 3.40
WIDTH_LIMIT = 2.00
TRI_BODY = 10000
TRI_CEILING = 12000
TEX = 2048
VOXEL = 0.048

# Authored sRGB. The PNG writer stores these floats as bytes, and Three.js
# decodes that file as sRGB. Wonderland snow is about 0.98, so the coat stays under it.
FUR = (0.58, 0.54, 0.48)
FUR_DEEP = (0.32, 0.28, 0.24)
FUR_TIP = (0.74, 0.70, 0.64)
FACE = (0.11, 0.08, 0.07)
BROW = (0.11, 0.09, 0.08)
EYE = (0.03, 0.025, 0.02)
HAND = (0.26, 0.19, 0.15)
NAIL = (0.42, 0.36, 0.30)
NOSE = (0.34, 0.20, 0.15)


def srgb_to_linear(rgb):
    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in rgb)


LIN = {name: srgb_to_linear(rgb) for name, rgb in {
    "fur": FUR, "deep": FUR_DEEP, "tip": FUR_TIP, "face": FACE, "brow": BROW,
    "eye": EYE, "hand": HAND, "nail": NAIL, "nose": NOSE,
}.items()}


def stage_arg():
    argv = sys.argv
    if "--" not in argv:
        return "full"
    args = argv[argv.index("--") + 1:]
    if "--stage" in args:
        return args[args.index("--stage") + 1]
    return "full"


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 16
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.view_settings.view_transform = "AgX"
    return scene


def V(x, y, z):
    return Vector((float(x), float(y), float(z)))


def raw_joints():
    """Unshifted pose. Face is -Y. Character left is +X. Left foot is planted."""
    j = {
        "root": V(0, 0, 0.12),
        "hips": V(0, 0.04, 1.16),
        "spine": V(0, -0.08, 1.52),
        "chest": V(0, -0.22, 1.82),
        "neck": V(0, -0.28, 2.18),
        "head": V(0, -0.40, 2.58),
        "crown": V(0, -0.22, 3.18),
        "muzzle": V(0, -0.78, 2.42),
        "brow": V(0, -0.58, 2.72),
        "hip_l": V(0.20, 0.00, 1.10),
        "knee_l": V(0.22, -0.32, 0.56),
        "ankle_l": V(0.20, -0.46, 0.12),
        "heel_l": V(0.20, -0.26, 0.06),
        "toe_l": V(0.20, -0.58, 0.055),
        "hip_r": V(-0.20, 0.06, 1.10),
        "knee_r": V(-0.22, 0.30, 0.66),
        "ankle_r": V(-0.18, 0.46, 0.24),
        "heel_r": V(-0.16, 0.34, 0.18),
        "toe_r": V(-0.14, 0.62, 0.14),
        "sho_l": V(0.52, -0.12, 2.02),
        "elb_l": V(0.62, 0.22, 1.22),
        "wri_l": V(0.34, 0.38, 0.62),
        "sho_r": V(-0.52, -0.16, 2.02),
        "elb_r": V(-0.58, -0.52, 1.28),
        "wri_r": V(-0.18, -0.88, 0.72),
        "eye_l": V(0.11, -0.70, 2.62),
        "eye_r": V(-0.11, -0.70, 2.62),
    }
    sole = (j["toe_l"] + j["heel_l"]) * 0.5
    swing = (j["toe_r"] + j["heel_r"]) * 0.5
    mid = (sole + swing) * 0.5
    shift = V(mid.x, mid.y, 0)
    return {k: v - shift for k, v in j.items()}


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_mod(obj, name):
    activate(obj)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.modifier_apply(modifier=name)


def tri_count(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def add_ball(bm, co, radius, subdiv=2):
    bmesh.ops.create_icosphere(
        bm, subdivisions=subdiv, radius=radius, matrix=Matrix.Translation(co),
    )


def add_ellipsoid(bm, co, size, subdiv=2):
    sx, sy, sz = size
    mat = Matrix.Diagonal(Vector((sx, sy, sz))).to_4x4()
    mat.translation = Vector(co)
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0, matrix=mat)


def add_chain(bm, a, b, r0, r1):
    a = Vector(a)
    b = Vector(b)
    length = (b - a).length
    step = max((r0 + r1) * 0.42, 0.05)
    n = max(2, int(math.ceil(length / step)) + 1)
    for i in range(n):
        t = i / (n - 1)
        add_ball(bm, a.lerp(b, t), r0 * (1.0 - t) + r1 * t, subdiv=1)


def build_volume(j):
    """Overlapping closed shells. Voxel remesh fuses them; metaball stiffness did not."""
    bm = bmesh.new()
    # Barrel torso. No pecs, no waist. That was the human in a sheep coat.
    add_ellipsoid(bm, j["hips"], (0.40, 0.32, 0.30))
    add_ellipsoid(bm, j["spine"], (0.50, 0.38, 0.36))
    add_ellipsoid(bm, j["spine"] + V(0, -0.16, -0.06), (0.38, 0.26, 0.30))
    add_ellipsoid(bm, j["chest"], (0.56, 0.44, 0.46))
    add_ellipsoid(bm, (j["sho_l"] + j["sho_r"]) * 0.5 + V(0, -0.04, 0.06), (0.70, 0.36, 0.24))
    add_ellipsoid(bm, j["neck"], (0.28, 0.26, 0.22))
    add_ellipsoid(bm, (j["neck"] + j["head"]) * 0.5 + V(0, -0.06, -0.04), (0.32, 0.30, 0.28))

    # Big skull, brow shelf, short muzzle, beard that hangs onto the chest.
    add_ellipsoid(bm, j["head"] + V(0, 0.04, 0.06), (0.44, 0.36, 0.40))
    add_ellipsoid(bm, j["head"] + V(0, 0.02, 0.26), (0.32, 0.28, 0.20))
    # Brow sits in front of the skull. Inside the head it vanished in the remesh.
    add_ellipsoid(bm, j["head"] + V(0, -0.34, 0.12), (0.36, 0.11, 0.08))
    add_ellipsoid(bm, j["head"] + V(0, -0.36, -0.04), (0.15, 0.11, 0.09))
    add_ellipsoid(bm, j["head"] + V(0, -0.42, -0.05), (0.055, 0.06, 0.04))
    add_ellipsoid(bm, j["head"] + V(0, -0.18, -0.48), (0.30, 0.22, 0.30))
    add_ellipsoid(bm, j["head"] + V(0, -0.22, -0.72), (0.22, 0.18, 0.24))

    chains = (
        ("hip_l", "knee_l", 0.24, 0.16),
        ("knee_l", "ankle_l", 0.16, 0.12),
        ("hip_r", "knee_r", 0.23, 0.15),
        ("knee_r", "ankle_r", 0.15, 0.12),
        ("sho_l", "elb_l", 0.22, 0.16),
        ("elb_l", "wri_l", 0.16, 0.13),
        ("sho_r", "elb_r", 0.22, 0.16),
        ("elb_r", "wri_r", 0.16, 0.13),
    )
    for a, b, r0, r1 in chains:
        add_chain(bm, j[a], j[b], r0, r1)
    for name, radius in (
        ("knee_l", 0.17), ("knee_r", 0.16), ("elb_l", 0.15), ("elb_r", 0.15),
        ("sho_l", 0.24), ("sho_r", 0.24), ("ankle_l", 0.13), ("ankle_r", 0.12),
    ):
        add_ball(bm, j[name], radius, subdiv=2)
    add_ellipsoid(bm, j["wri_l"], (0.20, 0.16, 0.14))
    add_ellipsoid(bm, j["wri_r"], (0.20, 0.17, 0.14))
    add_ellipsoid(bm, (j["heel_l"] + j["toe_l"]) * 0.5, (0.17, 0.22, 0.08))
    add_ellipsoid(bm, j["heel_l"] + V(0, 0.04, 0.0), (0.16, 0.13, 0.09))
    add_ellipsoid(bm, (j["heel_r"] + j["toe_r"]) * 0.5 + V(0, 0, 0.02), (0.15, 0.18, 0.075))
    obj = mesh_from_bmesh("Yeti", bm)
    return obj


def mesh_from_bmesh(name, bm):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_digit(bm, base, direction, side, normal, length, radius, segs=5, sides=8):
    direction = direction.normalized()
    side = side.normalized()
    normal = normal.normalized()
    rings = []
    for s in range(segs + 1):
        t = s / segs
        center = Vector(base) + direction * (length * t)
        r = radius * (1.0 - 0.42 * t)
        ring = []
        for i in range(sides):
            a = (i / sides) * math.tau
            p = center + (side * math.cos(a) + normal * math.sin(a)) * r
            ring.append(bm.verts.new(p))
        rings.append(ring)
    for s in range(segs):
        for i in range(sides):
            k = (i + 1) % sides
            bm.faces.new((rings[s][i], rings[s][k], rings[s + 1][k], rings[s + 1][i]))
    tip = bm.verts.new(Vector(base) + direction * (length + radius * 0.35))
    last = rings[-1]
    first = rings[0]
    hub = bm.verts.new(Vector(base) - direction * (radius * 0.15))
    for i in range(sides):
        k = (i + 1) % sides
        bm.faces.new((last[k], tip, last[i]))
        bm.faces.new((first[i], hub, first[k]))


def hand_digits(bm, palm, finger_dir, palm_up):
    finger_dir = finger_dir.normalized()
    palm_up = palm_up.normalized()
    side = finger_dir.cross(palm_up).normalized()
    palm_up = side.cross(finger_dir).normalized()
    for i, t in enumerate((-1.5, -0.5, 0.5, 1.5)):
        length = 0.32 if i in (1, 2) else 0.27
        base = Vector(palm) + side * (0.098 * t) - finger_dir * 0.08
        add_digit(bm, base, finger_dir, side, palm_up, length, 0.042)
    thumb_dir = (side * 0.85 + finger_dir * 0.45 - palm_up * 0.15).normalized()
    thumb_base = Vector(palm) + side * 0.13 - finger_dir * 0.02
    add_digit(bm, thumb_base, thumb_dir, finger_dir, palm_up, 0.16, 0.032, segs=4)


def foot_toes(bm, ankle, toe, up=None):
    direction = (Vector(toe) - Vector(ankle))
    if direction.length < 1e-4:
        return
    direction.normalize()
    up = Vector((0, 0, 1)) if up is None else up.normalized()
    side = direction.cross(up).normalized()
    up = side.cross(direction).normalized()
    # Four toes plus a shorter hallux, planted on the sole height of `toe`.
    for i, t in enumerate((-1.15, -0.35, 0.45, 1.25)):
        length = 0.11 if i else 0.13
        base = Vector(toe) + side * (0.055 * t) - direction * 0.04 + V(0, 0, 0.01)
        add_digit(bm, base, direction, side, up, length, 0.030, segs=3, sides=6)


def limb_dir(j, a, b, fallback):
    d = Vector(j[b]) - Vector(j[a])
    if d.length < 1e-4:
        return Vector(fallback).normalized()
    return d.normalized()


def build_extremities(j):
    bm = bmesh.new()
    back_dir = limb_dir(j, "elb_l", "wri_l", (0.0, 1.0, -0.3))
    reach_dir = limb_dir(j, "elb_r", "wri_r", (0.0, -1.0, -0.25))
    hand_digits(bm, j["wri_l"], back_dir, V(0.2, 0.1, 0.9))
    hand_digits(bm, j["wri_r"], reach_dir, V(-0.15, 0.05, 0.95))
    foot_toes(bm, j["ankle_l"], j["toe_l"])
    foot_toes(bm, j["ankle_r"], j["toe_r"])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    hands = mesh_from_bmesh("Digits", bm)

    eyes = bmesh.new()
    for name in ("eye_l", "eye_r"):
        out = bmesh.ops.create_icosphere(eyes, subdivisions=2, radius=0.055)
        verts = out["verts"]
        for v in verts:
            v.co += j[name] + V(0, -0.06, -0.01)
    bmesh.ops.recalc_face_normals(eyes, faces=eyes.faces)
    eyes_obj = mesh_from_bmesh("Eyes", eyes)
    return hands, eyes_obj


def force_outward(obj):
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    center = Vector((0.0, 0.0, 1.5))
    acc = 0.0
    for face in bm.faces:
        acc += (face.calc_center_median() - center).dot(face.normal)
    if acc < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        print("flipped inward normals")
    bm.to_mesh(mesh)
    bm.free()


def boolean_union(body, other):
    before = tri_count(body)
    backup = body.data.copy()
    activate(body)
    mod = body.modifiers.new("Union", "BOOLEAN")
    mod.operation = "UNION"
    mod.object = other
    solvers = [i.identifier for i in mod.bl_rna.properties["solver"].enum_items]
    for name in ("EXACT", "MANIFOLD", "FLOAT"):
        if name in solvers:
            mod.solver = name
            break
    print("boolean solver", mod.solver)
    try:
        apply_mod(body, "Union")
        after = tri_count(body)
        print(f"boolean tris {before} -> {after}")
        if after < before * 0.75:
            raise RuntimeError(f"boolean collapsed {before} -> {after}")
    except RuntimeError as exc:
        print("boolean fallback", exc)
        body.modifiers.clear()
        body.data = backup
        join_into(body, (other,))
        return body
    bpy.data.meshes.remove(backup)
    bpy.data.objects.remove(other, do_unlink=True)
    return body


def join_into(body, parts):
    activate(body)
    for part in parts:
        part.select_set(True)
    bpy.ops.object.join()
    return body


def remesh_body(obj):
    activate(obj)
    mod = obj.modifiers.new("Remesh", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = VOXEL
    mod.adaptivity = 0.0
    mod.use_smooth_shade = True
    apply_mod(obj, "Remesh")
    mod = obj.modifiers.new("Smooth", "SMOOTH")
    mod.iterations = 2
    mod.factor = 0.16
    apply_mod(obj, "Smooth")
    return obj


def decimate_to(obj, target):
    count = tri_count(obj)
    print(f"body tris {count}")
    if count <= target:
        return count
    activate(obj)
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = max(0.05, min(1.0, target / count))
    mod.use_collapse_triangulate = True
    apply_mod(obj, "Decimate")
    count = tri_count(obj)
    print(f"body tris after decimate {count}")
    return count


def consistent(obj):
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0008)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.update()


def push_sockets(obj, j):
    mesh = obj.data
    for v in mesh.vertices:
        co = v.co
        for name in ("eye_l", "eye_r"):
            d = (co - j[name]).length
            if d < 0.10:
                # Forward is -Y, so a socket recedes toward +Y and slightly under the brow.
                t = 1.0 - d / 0.10
                co.y += 0.07 * t
                co.z -= 0.02 * t


def fur_displace(obj, j):
    mesh = obj.data
    palms = (j["wri_l"], j["wri_r"])
    eyes = (j["eye_l"], j["eye_r"])
    muzzle = j["muzzle"]
    for v in mesh.vertices:
        co = v.co
        nrm = v.normal.normalized()
        if co.z < 0.09 and nrm.z < 0.25:
            continue
        d_face = (co - muzzle).length
        d_hand = min((co - p).length for p in palms)
        d_eye = min((co - e).length for e in eyes)
        if d_eye < 0.10 or d_face < 0.32 or d_hand < 0.36 or co.z < 0.22:
            amp = 0.004
        else:
            amp = 0.055
        if co.z > 1.7 and abs(co.x) > 0.40:
            amp += 0.02
        if 1.6 < co.z < 2.3 and co.y < j["chest"].y:
            amp += 0.025
        # Keep the inner thigh gap from growing shut.
        if abs(co.x) < 0.18 and 0.55 < co.z < 1.25 and nrm.x * co.x < 0:
            amp *= 0.3
        clump = 0.62 + 0.38 * (0.5 + 0.5 * blnoise.noise(co * 1.7))
        fine = 0.9 + 0.1 * blnoise.noise(co * 4.2 + Vector((2.0, 1.0, 0.5)))
        hang = Vector((0.0, 0.08, -0.55))
        if co.z > 2.45:
            hang = Vector((0.0, 0.25, -0.35))
        direction = (nrm + hang).normalized()
        offset = direction * amp * clump * fine
        co += offset
        if co.z < 0.0:
            co.z = 0.0


def scale_to_height(obj, joints, target):
    hi = max(v.co.z for v in obj.data.vertices)
    lo = min(v.co.z for v in obj.data.vertices)
    height = hi - lo
    if height < 0.2:
        return joints
    scale = target / height
    if abs(scale - 1.0) < 0.015:
        return joints
    for v in obj.data.vertices:
        v.co *= scale
    obj.data.update()
    print(f"scaled {scale:.3f}")
    return {key: value * scale for key, value in joints.items()}


def snap_ground(obj):
    mesh = obj.data
    min_z = min(v.co.z for v in mesh.vertices)
    if abs(min_z) < 1e-6:
        return 0.0
    for v in mesh.vertices:
        v.co.z -= min_z
    mesh.update()
    return min_z


def bounds(obj):
    xs, ys, zs = [], [], []
    for v in obj.data.vertices:
        xs.append(v.co.x)
        ys.append(v.co.y)
        zs.append(v.co.z)
    return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))


def unwrap(obj):
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def paint_textures(obj, j):
    mesh = obj.data
    uv_layer = mesh.uv_layers.active.data
    TEX_DIR.mkdir(parents=True, exist_ok=True)
    albedo = np.zeros((TEX, TEX, 4), dtype=np.float32)
    for poly in mesh.polygons:
        loops = poly.loop_indices
        uv = [uv_layer[i].uv for i in loops]
        world = [mesh.vertices[poly.vertices[k]].co for k in range(len(loops))]
        normals = [mesh.vertices[poly.vertices[k]].normal for k in range(len(loops))]
        if len(uv) < 3:
            continue
        for i in range(1, len(uv) - 1):
            raster_tri(
                albedo,
                [uv[0], uv[i], uv[i + 1]],
                [world[0], world[i], world[i + 1]],
                [normals[0], normals[i], normals[i + 1]],
                j,
            )
    dilate(albedo, 8)
    return save_image("yeti_albedo.png", albedo)


def raster_tri(albedo, uv, pos, normals, j):
    px = np.array([[u * (TEX - 1), v * (TEX - 1)] for u, v in uv], dtype=np.float64)
    min_x = max(int(math.floor(px[:, 0].min())) - 1, 0)
    max_x = min(int(math.ceil(px[:, 0].max())) + 1, TEX - 1)
    min_y = max(int(math.floor(px[:, 1].min())) - 1, 0)
    max_y = min(int(math.ceil(px[:, 1].max())) + 1, TEX - 1)
    if max_x < min_x or max_y < min_y:
        return
    xs = np.arange(min_x, max_x + 1) + 0.5
    ys = np.arange(min_y, max_y + 1) + 0.5
    grid_x, grid_y = np.meshgrid(xs, ys)
    v0, v1, v2 = px
    den = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1])
    if abs(den) < 1e-8:
        return
    w0 = ((v1[1] - v2[1]) * (grid_x - v2[0]) + (v2[0] - v1[0]) * (grid_y - v2[1])) / den
    w1 = ((v2[1] - v0[1]) * (grid_x - v2[0]) + (v0[0] - v2[0]) * (grid_y - v2[1])) / den
    w2 = 1.0 - w0 - w1
    mask = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
    if not np.any(mask):
        return
    p0, p1, p2 = (np.array(p, dtype=np.float64) for p in pos)
    n0, n1, n2 = (np.array(p, dtype=np.float64) for p in normals)
    wx = w0 * p0[0] + w1 * p1[0] + w2 * p2[0]
    wy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1]
    wz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
    nz = w0 * n0[2] + w1 * n1[2] + w2 * n2[2]
    color = fur_color(wx, wy, wz, nz, j)
    yy, xx = np.nonzero(mask)
    albedo[yy + min_y, xx + min_x, 0:3] = color[yy, xx]
    albedo[yy + min_y, xx + min_x, 3] = 1.0


def fur_color(x, y, z, nz, j):
    fur = np.array(FUR, dtype=np.float32)
    deep = np.array(FUR_DEEP, dtype=np.float32)
    tip = np.array(FUR_TIP, dtype=np.float32)
    n1 = np.sin(x * 8.5 + z * 6.2) * np.sin(y * 7.4 + z * 4.1 + 0.6)
    n2 = np.sin(x * 15.0 + y * 11.0 + 1.3) * np.sin(z * 9.5 + x * 3.0)
    clump = np.clip(0.55 + 0.35 * n1 + 0.18 * n2, 0.0, 1.0)
    color = deep * (1.0 - clump)[..., None] + fur * clump[..., None]
    tip_mix = np.clip((z - 2.75) / 0.4, 0.0, 1.0) * (clump > 0.72)
    color = color * (1.0 - tip_mix)[..., None] + tip * tip_mix[..., None]

    muzzle = j["muzzle"]
    brow_p = j["brow"]
    # Oval muzzle. A box here painted a visor across the whole face.
    cy = (brow_p.y + muzzle.y) * 0.5
    cz = (brow_p.z + muzzle.z) * 0.5
    face = (x / 0.17) ** 2 + ((y - cy) / 0.13) ** 2 + ((z - cz) / 0.15) ** 2 < 1.0
    color[face] = np.array(FACE, dtype=np.float32)
    brow = (
        (np.abs(x - brow_p.x) < 0.28)
        & (np.abs(z - brow_p.z) < 0.08)
        & (y < brow_p.y + 0.02)
        & (y > brow_p.y - 0.09)
    )
    color[brow] = np.array(BROW, dtype=np.float32)
    nose = (np.abs(x - muzzle.x) < 0.05) & (np.abs(z - muzzle.z) < 0.05) & (y < muzzle.y + 0.02)
    color[nose] = np.array(NOSE, dtype=np.float32)
    mouth = (np.abs(x) < 0.09) & (np.abs(z - (muzzle.z - 0.07)) < 0.022) & (y < muzzle.y + 0.06)
    color[mouth] = np.array((0.04, 0.03, 0.025), dtype=np.float32)

    eye = np.zeros(x.shape, dtype=bool)
    for name in ("eye_l", "eye_r"):
        e = j[name] + V(0, -0.06, -0.01)
        eye |= (x - e.x) ** 2 + (y - e.y) ** 2 + (z - e.z) ** 2 < 0.012
    color[eye] = np.array(EYE, dtype=np.float32)

    hand = np.zeros(x.shape, dtype=bool)
    for name in ("wri_l", "wri_r"):
        p = j[name]
        hand |= (x - p.x) ** 2 / 0.08 + (y - p.y) ** 2 / 0.16 + (z - p.z) ** 2 / 0.10 < 1.0
    foot = (z < 0.42) & (np.abs(x) < 0.6)
    skin = hand | foot
    color[skin] = np.array(HAND, dtype=np.float32)
    color[eye] = np.array(EYE, dtype=np.float32)
    return np.clip(color, 0.0, 1.0)


def dilate(img, times):
    alpha = img[..., 3]
    for _ in range(times):
        empty = alpha < 0.5
        if not np.any(empty):
            break
        acc = np.zeros_like(img)
        weight = np.zeros(img.shape[:2], dtype=np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            shifted = np.roll(np.roll(img, dy, 0), dx, 1)
            sa = np.roll(np.roll(alpha, dy, 0), dx, 1)
            hit = (sa > 0.5) & empty
            acc[hit] += shifted[hit]
            weight[hit] += 1.0
        painted = weight > 0
        img[painted] = acc[painted] / weight[painted, None]
        alpha = img[..., 3]


def save_image(name, array):
    path = TEX_DIR / name
    img = bpy.data.images.new(name, TEX, TEX, alpha=True, float_buffer=True)
    img.colorspace_settings.name = "sRGB"
    flat = np.ascontiguousarray(array, dtype=np.float32).reshape(-1)
    img.pixels.foreach_set(flat)
    img.filepath_raw = str(path)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def build_material(image):
    mat = bpy.data.materials.new("YetiFur")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.location = (-480, 200)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.9
    bsdf.inputs["Metallic"].default_value = 0.0
    mat.use_backface_culling = False
    return mat


def clay_material():
    mat = bpy.data.materials.new("YetiClay")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (0.62, 0.62, 0.60, 1)
    bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_bone(arm, name, head, tail, parent=None):
    bone = arm.edit_bones.new(name)
    bone.head = Vector(head)
    bone.tail = Vector(tail)
    if (Vector(tail) - Vector(head)).length < 0.04:
        bone.tail = Vector(head) + Vector((0, 0, 0.08))
    bone.align_roll(Vector((0, 0, 1)))
    if parent is not None:
        bone.parent = parent
        bone.use_connect = False
    return bone


def build_armature(j):
    arm = bpy.data.armatures.new("YetiArm")
    arm_obj = bpy.data.objects.new("YetiRig", arm)
    bpy.context.scene.collection.objects.link(arm_obj)
    activate(arm_obj)
    bpy.ops.object.mode_set(mode="EDIT")
    root = add_bone(arm, "Root", (0, 0, 0), j["root"])
    hips = add_bone(arm, "Hips", j["hips"], j["spine"], root)
    spine = add_bone(arm, "Spine", j["spine"], j["chest"], hips)
    chest = add_bone(arm, "Chest", j["chest"], j["neck"], spine)
    neck = add_bone(arm, "Neck", j["neck"], j["head"], chest)
    add_bone(arm, "Head", j["head"], j["crown"], neck)
    for side, sho, elb, wri, finger in (
        ("L", "sho_l", "elb_l", "wri_l", V(0.08, 0.22, -0.16)),
        ("R", "sho_r", "elb_r", "wri_r", V(-0.06, -0.28, -0.14)),
    ):
        upper = add_bone(arm, f"UpperArm_{side}", j[sho], j[elb], chest)
        fore = add_bone(arm, f"ForeArm_{side}", j[elb], j[wri], upper)
        add_bone(arm, f"Hand_{side}", j[wri], j[wri] + finger, fore)
    for side, hip, knee, ankle, toe in (
        ("L", "hip_l", "knee_l", "ankle_l", "toe_l"),
        ("R", "hip_r", "knee_r", "ankle_r", "toe_r"),
    ):
        thigh = add_bone(arm, f"Thigh_{side}", j[hip], j[knee], hips)
        shin = add_bone(arm, f"Shin_{side}", j[knee], j[ankle], thigh)
        add_bone(arm, f"Foot_{side}", j[ankle], j[toe], shin)
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj


def pin_digits(mesh, j):
    """Only the shells past the wrist and ankle. A wide radius tore the shin."""
    pins = (
        ("Hand_L", j["elb_l"], j["wri_l"], 0.40, 0.14),
        ("Hand_R", j["elb_r"], j["wri_r"], 0.40, 0.14),
        ("Foot_L", j["ankle_l"], j["toe_l"], 0.32, 0.16),
        ("Foot_R", j["ankle_r"], j["toe_r"], 0.32, 0.16),
    )
    for name, start, end, reach, radius in pins:
        group = mesh.vertex_groups.get(name)
        if group is None:
            print("missing group", name)
            continue
        origin = Vector(end)
        direction = Vector(end) - Vector(start)
        if direction.length < 1e-4:
            continue
        direction.normalize()
        ids = []
        for v in mesh.data.vertices:
            rel = v.co - origin
            along = rel.dot(direction)
            if along < 0.02 or along > reach:
                continue
            if (rel - direction * along).length > radius:
                continue
            ids.append(v.index)
        if not ids:
            continue
        for other in mesh.vertex_groups:
            if other.name == name:
                continue
            for index in ids:
                try:
                    other.remove([index])
                except RuntimeError:
                    pass
        group.add(ids, 1.0, "REPLACE")
        print("pinned", name, len(ids))


def skin(mesh, arm_obj):
    activate(mesh)
    mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    activate(mesh)
    bpy.ops.object.mode_set(mode="WEIGHT_PAINT")
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.mode_set(mode="OBJECT")


def bind_action(arm_obj, name):
    arm_obj.animation_data_create()
    action = bpy.data.actions.new(name)
    ad = arm_obj.animation_data
    ad.action = action
    if hasattr(action, "slots"):
        try:
            slot = action.slots.new("OBJECT", arm_obj.name)
        except TypeError:
            slot = action.slots.new(id_type="OBJECT", name=arm_obj.name)
        if hasattr(ad, "action_slot"):
            ad.action_slot = slot
    return action


def aim_bone(pb, head, target):
    direction = Vector(target) - Vector(head)
    if direction.length < 1e-5:
        return
    y = direction.normalized()
    up = Vector((1, 0, 0))
    x = y.cross(up)
    if x.length < 1e-4:
        x = y.cross(Vector((0, 0, 1)))
    x.normalize()
    z = x.cross(y).normalized()
    x = y.cross(z).normalized()
    pb.matrix = Matrix((
        (x.x, y.x, z.x, head.x),
        (x.y, y.y, z.y, head.y),
        (x.z, y.z, z.z, head.z),
        (0.0, 0.0, 0.0, 1.0),
    ))


def pose_chain(arm_obj, names, targets):
    head = None
    for name, target in zip(names, targets):
        pb = arm_obj.pose.bones[name]
        if head is None:
            head = pb.bone.head_local.copy()
        aim_bone(pb, head, target)
        bpy.context.view_layer.update()
        head = pb.tail.copy()


def mirror_x(p):
    return Vector((-p.x, p.y, p.z))


def clear_pose(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
        pb.rotation_quaternion = (1, 0, 0, 0)


def key_pose(arm_obj, frame):
    # frame_set before the pose would be fine; calling it after wipes the pose.
    for pb in arm_obj.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)


def animate(arm_obj, j):
    action = bind_action(arm_obj, "YetiRun")
    activate(arm_obj)
    bpy.ops.object.mode_set(mode="POSE")
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = "QUATERNION"

    def bend(name, angle):
        pb = arm_obj.pose.bones[name]
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (angle, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
        pb.rotation_mode = "QUATERNION"

    def contact(frame, swing):
        # Local X only. Aiming bones at the mirrored stride scaled the skin into a ribbon.
        bpy.context.scene.frame_set(frame)
        clear_pose(arm_obj)
        bend("Thigh_L", swing)
        bend("Thigh_R", -swing)
        bend("Shin_L", max(-swing, 0.0) * 0.85)
        bend("Shin_R", max(swing, 0.0) * 0.85)
        bend("UpperArm_L", -swing * 0.9)
        bend("UpperArm_R", swing * 0.9)
        bend("ForeArm_L", 0.25)
        bend("ForeArm_R", 0.25)
        key_pose(arm_obj, frame)

    contact(1, 0.0)
    contact(8, 0.65)
    contact(16, 0.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 16
    try:
        action.frame_range = (1, 16)
    except (AttributeError, TypeError):
        pass
    bpy.context.scene.frame_set(8)
    bpy.context.view_layer.update()
    quat = arm_obj.pose.bones["Thigh_L"].rotation_quaternion
    print("thigh L frame 8", tuple(round(c, 3) for c in quat))
    print("action curves", count_curves(action))
    return action


def count_curves(action):
    total = 0
    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in getattr(layer, "strips", []):
                bags = getattr(strip, "channelbags", None)
                if bags is None:
                    continue
                for bag in bags:
                    total += len(getattr(bag, "fcurves", []))
    if hasattr(action, "fcurves"):
        total += len(action.fcurves)
    return total


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, location, target, lens=50):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36.0
    cam = bpy.data.objects.new(name, data)
    cam.location = Vector(location)
    bpy.context.scene.collection.objects.link(cam)
    look_at(cam, target)
    return cam


def add_studio(white=True):
    world = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    if white:
        bg.inputs["Color"].default_value = (1, 1, 1, 1)
        bg.inputs["Strength"].default_value = 1.15
    else:
        bg.inputs["Color"].default_value = (0.55, 0.56, 0.58, 1)
        bg.inputs["Strength"].default_value = 0.45

    def area(name, location, target, size, power, color=(1, 1, 1)):
        light = bpy.data.lights.new(name, "AREA")
        light.shape = "RECTANGLE"
        light.size = size
        light.size_y = size * 0.62
        light.energy = power
        light.color = color
        obj = bpy.data.objects.new(name, light)
        obj.location = Vector(location)
        bpy.context.scene.collection.objects.link(obj)
        look_at(obj, target)
        return obj

    # Powers scaled for a ~3.4 m figure. Key from the front-left of the face (-Y).
    area("Key", (1.6, -3.4, 3.3), (0, 0, 1.7), 2.4, 160, (1.0, 0.98, 0.95))
    area("Fill", (-2.4, -2.2, 2.2), (0, 0, 1.5), 2.2, 55, (0.82, 0.88, 1.0))
    area("Rim", (0.2, 3.2, 3.0), (0, 0, 1.8), 1.8, 90, (0.95, 0.97, 1.0))

    snow = bpy.data.meshes.new("SnowCheck")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6.0)
    bm.to_mesh(snow)
    bm.free()
    plane = bpy.data.objects.new("SnowCheck", snow)
    plane.location = (0, 0, -0.012)
    plane.hide_render = True
    bpy.context.scene.collection.objects.link(plane)
    mat = bpy.data.materials.new("SnowCard")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    # Wonderland snow 0xfbfaf6, linear.
    bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.984, 0.980, 0.965)), 1)
    bsdf.inputs["Roughness"].default_value = 0.92
    plane.data.materials.append(mat)

    target = (0, 0, 1.65)
    add_camera("Cam_Front", (0.0, -5.6, 1.7), target, 48)
    add_camera("Cam_Side", (5.6, 0.15, 1.65), target, 48)
    add_camera("Cam_ThreeQuarter", (3.3, -4.0, 2.05), target, 46)
    add_camera("Cam_Run", (3.3, -4.0, 2.05), target, 46)
    add_camera("Cam_Snow", (2.6, -3.6, 1.35), (0, 0, 1.2), 42)
    return plane


def report(obj, j):
    lo_x, hi_x, lo_y, hi_y, lo_z, hi_z = bounds(obj)
    width = hi_x - lo_x
    height = hi_z - lo_z
    depth = hi_y - lo_y
    tris = tri_count(obj)
    # The muzzle should be the forward-most head point.
    head_front = min(
        (v.co.y for v in obj.data.vertices if v.co.z > 2.4 and abs(v.co.x) < 0.25),
        default=0,
    )
    print(
        f"BOUNDS x {lo_x:.3f}..{hi_x:.3f} y {lo_y:.3f}..{hi_y:.3f} z {lo_z:.3f}..{hi_z:.3f}"
    )
    print(f"SIZE height {height:.3f} width {width:.3f} depth {depth:.3f} tris {tris}")
    print(f"HEAD_FRONT_Y {head_front:.3f} muzzle {j['muzzle'].y:.3f}")
    problems = []
    if height < 3.15 or height > 3.65:
        problems.append(f"height {height:.3f}")
    if width > WIDTH_LIMIT + 0.05:
        problems.append(f"width {width:.3f}")
    if lo_z < -0.002 or lo_z > 0.02:
        problems.append(f"min z {lo_z:.4f}")
    if tris > TRI_CEILING:
        problems.append(f"tris {tris}")
    if head_front > j["chest"].y:
        problems.append("head is not in front of the chest")
    if problems:
        print("CHECK_FAIL " + "; ".join(problems))
    else:
        print("CHECK_OK")
    return problems


def render_stills():
    scene = bpy.context.scene
    engines = [i.identifier for i in scene.render.bl_rna.properties["engine"].enum_items]
    for name in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "CYCLES"):
        if name in engines:
            scene.render.engine = name
            break
    print("beauty engine", scene.render.engine)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.film_transparent = False
    out = ROOT / "evidence" / "beauty"
    out.mkdir(parents=True, exist_ok=True)
    shots = (
        ("front", "Cam_Front", 1, False),
        ("side", "Cam_Side", 1, False),
        ("three-quarter", "Cam_ThreeQuarter", 1, False),
        ("run", "Cam_Run", 1, False),
        ("snow", "Cam_Snow", 1, True),
    )
    plane = bpy.data.objects.get("SnowCheck")
    for name, cam, frame, snow in shots:
        scene.frame_set(frame)
        scene.camera = bpy.data.objects[cam]
        if plane:
            plane.hide_render = not snow
        scene.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)
    if plane:
        plane.hide_render = True


def export_glb(mesh, arm_obj):
    addon_utils = __import__("addon_utils")
    addon_utils.enable("io_scene_gltf2")
    op = bpy.ops.export_scene.gltf.get_rna_type()
    valid = {p.identifier for p in op.properties}
    kwargs = dict(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=True,
        export_frame_range=True,
        export_animation_mode="ACTIVE_ACTIONS",
        export_rest_position_armature=False,
    )
    kwargs = {k: v for k, v in kwargs.items() if k in valid}
    print("gltf export keys", sorted(kwargs))
    mesh.name = "Yeti"
    mesh.data.name = "Yeti"
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.export_scene.gltf(**kwargs)


def shift_joints(j, dz):
    if abs(dz) < 1e-8:
        return j
    return {k: v - V(0, 0, dz) for k, v in j.items()}


def landmarks_from_mesh(mesh, arm):
    """Scale the authored face offsets off the Head bone. A fur spike is not the muzzle."""
    head_bone = arm.data.bones["Head"]
    head = arm.matrix_world @ head_bone.head_local
    crown = arm.matrix_world @ head_bone.tail_local
    raw_head = V(0, -0.48, 2.66)
    raw_crown = V(0, -0.36, 3.22)
    scale = (crown - head).length / (raw_crown - raw_head).length

    def place(raw):
        return head + (raw - raw_head) * scale

    def bone_head(name):
        bone = arm.data.bones[name]
        return arm.matrix_world @ bone.head_local

    return {
        "muzzle": place(V(0, -0.84, 2.52)),
        "brow": place(V(0, -0.72, 2.80)),
        "eye_l": place(V(0.12, -0.76, 2.68)),
        "eye_r": place(V(-0.12, -0.76, 2.68)),
        "wri_l": bone_head("Hand_L"),
        "wri_r": bone_head("Hand_R"),
    }


def repaint_existing():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))
    scene = bpy.context.scene
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Yeti"))
    arm = bpy.data.objects["YetiRig"]
    if arm.animation_data:
        arm.animation_data_clear()
    j = landmarks_from_mesh(mesh, arm)
    print("LANDMARKS", {k: tuple(round(c, 3) for c in v) for k, v in j.items()})
    image = paint_textures(mesh, j)
    assign_material(mesh, build_material(image))
    export_glb(mesh, arm)
    render_stills()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("REPAINTED", BLEND_PATH)


def main():
    stage = stage_arg()
    print("STAGE", stage)
    if stage == "repaint":
        repaint_existing()
        return
    reset_scene()
    j = raw_joints()
    body = build_volume(j)
    remesh_body(body)
    decimate_to(body, TRI_BODY)
    consistent(body)
    force_outward(body)
    push_sockets(body, j)
    hands, eyes = build_extremities(j)
    digits = join_into(hands, (eyes,))
    boolean_union(body, digits)
    consistent(body)
    if stage != "gray":
        fur_displace(body, j)
        consistent(body)
    dz = snap_ground(body)
    j = shift_joints(j, dz)
    j = scale_to_height(body, j, HEIGHT_TARGET)
    dz = snap_ground(body)
    j = shift_joints(j, dz)
    problems = report(body, j)
    if stage == "gray":
        assign_material(body, clay_material())
    else:
        unwrap(body)
        image = paint_textures(body, j)
        assign_material(body, build_material(image))
        arm = build_armature(j)
        skin(body, arm)
        pin_digits(body, j)
        # A keyed stride tore the hands and a shin. The bind pose is already the chase.
        # UpperArm_L / UpperArm_R stay named so tickYeti can swing them.
        export_glb(body, arm)
    add_studio(white=stage != "gray")
    if stage != "gray":
        render_stills()
    bpy.context.scene.camera = bpy.data.objects["Cam_ThreeQuarter"]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("SAVED", BLEND_PATH)
    if problems and stage != "gray":
        print("WARNINGS", problems)


if __name__ == "__main__":
    main()

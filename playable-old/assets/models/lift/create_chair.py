"""Fixed-grip quad chair. Durable source for playable/assets/models/lift/.

Blender Z-up. Riders face -Y, which glTF Y-up export turns into +Z.
Origin is the cable grip. The hanger points down (-Z).
Run: blender --background --factory-startup --python create_chair.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
BLEND_PATH = ROOT / "chair.blend"
GLB_PATH = ROOT / "chair.glb"
ALBEDO_PATH = ROOT / "chair_albedo.png"
SHOT_DIR = ROOT / "evidence" / "beauty"

# Game frame. Seat surface matches CHAIR_SEAT_Y + 0.05 in lift-graphics.js.
SEAT_TOP = -2.55
FRAME_X = 1.05
TUBE_R = 0.046
HANGER_R = 0.058
BAR_R = 0.032
FOOT_R = 0.034
STEEL = (107 / 255, 119 / 255, 133 / 255)
SEAT = (22 / 255, 23 / 255, 26 / 255)
TEX = 512


def srgb_to_linear(rgb):
    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in rgb)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 1
    # Standard keeps the painted gray honest. AgX was crushing it toward black.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def write_albedo():
    """One painted albedo. Steel lives in the lower half, vinyl in the upper half."""
    h = w = TEX
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / (w - 1)
    v = yy / (h - 1)
    # This Blender saves the pixel buffer without an extra sRGB encode, so the
    # buffer is stored as sRGB. Three.js then treats the PNG as sRGB.
    steel = np.array(STEEL, dtype=np.float32)
    vinyl = np.array(SEAT, dtype=np.float32)
    # Stable value noise so the paint is not a flat fill.
    n = (
        np.sin(xx * 0.37) * np.cos(yy * 0.23)
        + 0.45 * np.sin(xx * 1.7 + yy * 0.8)
        + 0.2 * np.sin((xx + yy) * 0.11)
    )
    steel_mask = v < 0.5
    paint = steel * (0.94 + 0.08 * n)[:, :, None]
    # Soft vertical streaks, like brushed paint, kept near the specified gray.
    paint *= (0.97 + 0.03 * np.sin(xx * 0.55))[:, :, None]
    # Bolt field on the right of the steel band, for plates.
    bolt = (u > 0.52) & steel_mask
    bu = (u - 0.52) / 0.48
    bv = v / 0.5
    cell_u = (bu * 4) % 1
    cell_v = (bv * 4) % 1
    rad = np.sqrt((cell_u - 0.5) ** 2 + (cell_v - 0.5) ** 2)
    head = bolt & (rad < 0.28)
    ring = bolt & (rad >= 0.18) & (rad < 0.28)
    paint[head] *= 0.72
    paint[ring] *= 0.55
    paint[head & (rad < 0.08)] *= 1.35
    rgb[steel_mask] = np.clip(paint[steel_mask], 0, 1)
    vinyl_paint = vinyl * (0.92 + 0.1 * n)[:, :, None]
    # Two stitch lines across the vinyl band.
    for sv in (0.66, 0.84):
        band = np.abs(v - sv) < 0.012
        vinyl_paint[band] *= 1.55
        dash = band & ((xx // 10) % 2 == 0)
        vinyl_paint[dash] *= 0.75
    seam = np.abs(u - 0.5) < 0.008
    vinyl_paint[seam & ~steel_mask] *= 0.7
    rgb[~steel_mask] = np.clip(vinyl_paint[~steel_mask], 0, 1)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = rgb
    # Row 0 is v=0 (steel). bpy image pixels start at the bottom, which is UV v=0.
    img = bpy.data.images.new("chair_albedo", w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(ALBEDO_PATH)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def make_material(image):
    mat = bpy.data.materials.new("chair_albedo")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.62
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    out.location = (400, 0)
    bsdf.location = (120, 0)
    tex.location = (-180, 0)
    return mat


def dedupe(pts, eps=1e-5):
    out = [pts[0]]
    for p in pts[1:]:
        if (p - out[-1]).length > eps:
            out.append(p)
    return out


def fillet_corner(p0, p1, p2, radius, segs):
    v1 = p1 - p0
    v2 = p2 - p1
    if v1.length < 1e-6 or v2.length < 1e-6:
        return [p1.copy()]
    v1n = v1.normalized()
    v2n = v2.normalized()
    theta = v1n.angle(v2n)
    if theta < 0.08 or theta > math.radians(170):
        return [p1.copy()]
    setback = radius * math.tan(theta * 0.5)
    setback = min(setback, v1.length * 0.45, v2.length * 0.45)
    if setback < 1e-4:
        return [p1.copy()]
    a = p1 - v1n * setback
    b = p1 + v2n * setback
    axis = v1n.cross(v2n)
    if axis.length < 1e-8:
        return [a, b]
    axis.normalize()
    n_in = axis.cross(v1n).normalized()
    center = a + n_in * radius
    va = a - center
    vb = b - center
    if va.length < 1e-6 or vb.length < 1e-6:
        return [a, b]
    ang = va.angle(vb)
    pts = []
    for s in range(segs + 1):
        pts.append(center + Matrix.Rotation(ang * (s / segs), 4, axis) @ va)
    return pts


def fillet_open(pts, radius, segs):
    pts = [Vector(p) for p in pts]
    if len(pts) < 3:
        return pts
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        out.extend(fillet_corner(pts[i - 1], pts[i], pts[i + 1], radius, segs))
    out.append(pts[-1])
    return dedupe(out)


def cubic(p0, p1, p2, p3, n):
    p0, p1, p2, p3 = Vector(p0), Vector(p1), Vector(p2), Vector(p3)
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * u) * p0 + (3 * u * u * t) * p1 + (3 * u * t * t) * p2 + (t * t * t) * p3)
    return out


def fillet_closed(pts, radius, segs):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    out = []
    for i in range(n):
        out.extend(fillet_corner(pts[(i - 1) % n], pts[i], pts[(i + 1) % n], radius, segs))
    return dedupe(out)


def _frame(tangent, normal):
    normal = (normal - tangent * normal.dot(tangent))
    if normal.length < 1e-8:
        helper = Vector((1, 0, 0)) if abs(tangent.z) > 0.9 else Vector((0, 0, 1))
        normal = tangent.cross(helper)
    normal.normalize()
    binormal = tangent.cross(normal).normalized()
    return normal, binormal


def add_tube(bm, uv, pts, radius, sides, kind, loop=False):
    pts = dedupe([Vector(p) for p in pts])
    if loop and len(pts) > 3 and (pts[0] - pts[-1]).length < 1e-4:
        pts = pts[:-1]
    if len(pts) < 2:
        return []
    tangents = []
    for i, p in enumerate(pts):
        nxt = pts[(i + 1) % len(pts)] if loop else pts[min(i + 1, len(pts) - 1)]
        prv = pts[(i - 1) % len(pts)] if loop else pts[max(i - 1, 0)]
        t = nxt - prv
        tangents.append(t.normalized() if t.length > 1e-8 else Vector((0, 0, -1)))
    normal = Vector((1, 0, 0)) if abs(tangents[0].z) > 0.85 else Vector((0, 0, 1))
    normals = []
    prev_t = tangents[0]
    for t in tangents:
        axis = prev_t.cross(t)
        if axis.length > 1e-8:
            axis.normalize()
            normal = Matrix.Rotation(prev_t.angle(t), 4, axis) @ normal
        normal, _binormal = _frame(t, normal)
        normals.append(normal)
        prev_t = t
    if loop and len(normals) > 2:
        # Spread the closure twist so the loop does not pinch at the seam.
        twist = math.atan2(normals[-1].cross(normals[0]).dot(tangents[0]), normals[-1].dot(normals[0]))
        fixed = []
        for i, (t, n) in enumerate(zip(tangents, normals)):
            fixed.append(Matrix.Rotation(twist * i / len(normals), 4, t) @ n)
        normals = fixed
    rings = []
    for p, t, normal in zip(pts, tangents, normals):
        normal, binormal = _frame(t, normal)
        ring = []
        for s in range(sides):
            a = (s / sides) * math.tau
            vert = bm.verts.new(p + (normal * math.cos(a) + binormal * math.sin(a)) * radius)
            vert.tag = True
            ring.append(vert)
        rings.append(ring)
    faces = []
    span = len(rings) if loop else len(rings) - 1
    for i in range(span):
        a = rings[i]
        b = rings[(i + 1) % len(rings)]
        for s in range(sides):
            sn = (s + 1) % sides
            f = bm.faces.new((a[s], b[s], b[sn], a[sn]))
            f.normal_update()
            center = sum((vt.co for vt in a), Vector()) / len(a)
            if f.normal.dot(a[s].co - center) < 0:
                f.normal_flip()
            faces.append(f)
            _uv_tube(uv, f, i, span, s, sides, kind)
    if not loop:
        faces.append(_cap(bm, uv, rings[0], True, kind))
        faces.append(_cap(bm, uv, rings[-1], False, kind))
    return [f for f in faces if f is not None]


def _region(kind, su, sv):
    su = min(max(su, 0.0), 1.0)
    sv = min(max(sv, 0.0), 1.0)
    if kind == "vinyl":
        return 0.02 + 0.96 * su, 0.52 + 0.46 * sv
    if kind == "plate":
        return 0.54 + 0.44 * su, 0.04 + 0.42 * sv
    return 0.02 + 0.46 * su, 0.04 + 0.42 * sv


def _uv_tube(uv, face, i, span, s, sides, kind):
    for li, loop in enumerate(face.loops):
        along = (i + (1 if li in (1, 2) else 0)) / max(span, 1)
        around = (s + (1 if li in (2, 3) else 0)) / sides
        loop[uv].uv = _region(kind, along, around)


def _cap(bm, uv, ring, flip, kind):
    if len(ring) < 3:
        return None
    try:
        face = bm.faces.new(tuple(reversed(ring) if flip else ring))
    except ValueError:
        return None
    for loop in face.loops:
        loop[uv].uv = _region(kind, 0.5, 0.5)
    return face


def _uv_planar(uv, faces, kind, axis="xy"):
    coords = [loop.vert.co for f in faces for loop in f.loops]
    if not coords:
        return
    xs = [c.x for c in coords]
    ys = [c.y for c in coords]
    zs = [c.z for c in coords]
    span = {
        "x": max(xs) - min(xs) or 1,
        "y": max(ys) - min(ys) or 1,
        "z": max(zs) - min(zs) or 1,
    }
    origin = {"x": min(xs), "y": min(ys), "z": min(zs)}
    for f in faces:
        for loop in f.loops:
            c = loop.vert.co
            if axis == "xz":
                su, sv = (c.x - origin["x"]) / span["x"], (c.z - origin["z"]) / span["z"]
            elif axis == "yz":
                su, sv = (c.y - origin["y"]) / span["y"], (c.z - origin["z"]) / span["z"]
            else:
                su, sv = (c.x - origin["x"]) / span["x"], (c.y - origin["y"]) / span["y"]
            loop[uv].uv = _region(kind, su, sv)


def take_new(bm, layer):
    fresh = [f for f in bm.faces if f[layer] == 0]
    for f in fresh:
        f[layer] = 1
    return fresh


def add_box(bm, layer, uv, dims, location, rotation, bevel, kind, uv_axis="xz"):
    before = set(bm.faces)
    for v in bm.verts:
        v.tag = True
    bmesh.ops.create_cube(bm, size=1.0)
    fresh_verts = [v for v in bm.verts if not v.tag]
    for v in fresh_verts:
        v.co.x *= dims[0]
        v.co.y *= dims[1]
        v.co.z *= dims[2]
    if rotation is not None or location is not None:
        mat = Matrix.Translation(location or Vector()) @ (rotation or Matrix.Identity(4))
        bmesh.ops.transform(bm, verts=fresh_verts, matrix=mat)
    edges = list({e for v in fresh_verts for e in v.link_edges})
    if bevel > 0 and edges:
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect="EDGES", profile=0.5)
    faces = [f for f in bm.faces if f not in before]
    for f in faces:
        f[layer] = 1
    _uv_planar(uv, faces, kind, uv_axis)
    return faces


def add_bolt(bm, uv, center, radius, depth, direction):
    res = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=6,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    verts = res["verts"]
    z = direction.normalized()
    up = Vector((0, 0, 1))
    if abs(z.dot(up)) > 0.9:
        up = Vector((1, 0, 0))
    x = z.cross(up).normalized()
    y = z.cross(x).normalized()
    rot = Matrix((x, y, z)).transposed().to_4x4()
    bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(center) @ rot)
    faces = []
    # Faces are whatever is still untagged via vert link. Collect from verts.
    seen = set()
    for v in verts:
        for f in v.link_faces:
            if f not in seen:
                seen.add(f)
                faces.append(f)
    for f in faces:
        for loop in f.loops:
            loop[uv].uv = _region("plate", 0.5, 0.5)
    return faces


def mark_sharp(bm):
    for e in bm.edges:
        if len(e.link_faces) == 2:
            # 8- and 10-side tubes meet at 36-45 degrees. Those stay smooth; box corners do not.
            e.smooth = e.calc_face_angle(0.0) < math.radians(62)
        else:
            e.smooth = True


def build_mesh():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    layer = bm.faces.layers.int.new("part")

    # Outer frame: footrest at the front (-Y), top crossbar behind the backs.
    frame = fillet_closed(
        [
            (0.0, 0.20, -1.78),
            (-FRAME_X, 0.20, -1.78),
            (-FRAME_X, -0.08, -2.48),
            (-FRAME_X, -0.62, -3.04),
            (FRAME_X, -0.62, -3.04),
            (FRAME_X, -0.08, -2.48),
            (FRAME_X, 0.20, -1.78),
        ],
        radius=0.15,
        segs=5,
    )
    add_tube(bm, uv, frame, TUBE_R, 10, "steel", loop=True)

    # One aft bow. A Catmull chain was adding extra waves.
    hanger = cubic(
        (0.0, 0.00, -0.12),
        (0.0, 0.05, -0.55),
        (0.0, 0.42, -1.15),
        (0.0, 0.13, -1.68),
        22,
    )
    add_tube(bm, uv, hanger, HANGER_R, 10, "steel", loop=False)

    # Restraint: bar across the front, arms back to the side posts.
    for sign in (-1, 1):
        arm = fillet_open(
            [
                (sign * 0.98, -0.02, -2.32),
                (sign * 0.90, -0.28, -2.30),
                (sign * 0.78, -0.46, -2.28),
            ],
            radius=0.08,
            segs=2,
        )
        add_tube(bm, uv, arm, BAR_R * 0.9, 6, "steel", loop=False)
    bar = [(-0.78, -0.46, -2.28), (0.78, -0.46, -2.28)]
    add_tube(bm, uv, bar, BAR_R, 8, "steel", loop=False)
    for sign, x0, x1 in ((-1, -0.62, -0.28), (1, 0.28, 0.62)):
        sleeve = [(x0, -0.46, -2.28), (x1, -0.46, -2.28)]
        add_tube(bm, uv, sleeve, 0.055, 8, "vinyl", loop=False)

    # Rails the cushions sit on, tied into the side posts.
    add_tube(bm, uv, [(-0.98, 0.12, -2.62), (0.98, 0.12, -2.62)], 0.028, 6, "steel")
    add_tube(bm, uv, [(-0.98, -0.40, -2.70), (0.98, -0.40, -2.70)], 0.028, 6, "steel")
    for sign in (-1, 1):
        add_tube(
            bm,
            uv,
            [(sign * 0.96, 0.12, -2.62), (sign * 0.96, -0.40, -2.70)],
            0.026,
            6,
            "steel",
        )

    # Grip head around the cable. Cheeks face the side; the pin sticks out across the cable.
    for sign in (-1, 1):
        add_box(
            bm, layer, uv,
            (0.016, 0.16, 0.30),
            (sign * 0.062, 0.0, 0.04),
            None,
            0.003,
            "steel",
            "yz",
        )
    add_tube(bm, uv, [(-0.24, 0.0, 0.07), (0.12, 0.0, 0.07)], 0.024, 8, "steel")
    add_box(
        bm, layer, uv,
        (0.10, 0.09, 0.07),
        (0.0, 0.0, -0.10),
        None,
        0.006,
        "plate",
        "xz",
    )

    # Mounting plate and wings on the crossbar.
    plate_rot = Matrix.Identity(4)
    add_box(
        bm, layer, uv,
        (0.32, 0.045, 0.26),
        (0.0, 0.12, -1.70),
        plate_rot,
        0.008,
        "steel",
        "xz",
    )
    for sign in (-1, 1):
        add_box(
            bm, layer, uv,
            (0.16, 0.03, 0.08),
            (sign * 0.26, 0.16, -1.78),
            None,
            0.004,
            "steel",
            "xz",
        )
    for x in (-0.08, 0.0, 0.08):
        for z in (-1.78, -1.62):
            add_bolt(bm, uv, Vector((x, 0.086, z)), 0.016, 0.02, Vector((0, -1, 0)))

    # Four places: two seat cushions, two backs.
    for sign, cx in ((-1, -0.50), (1, 0.50)):
        add_box(
            bm, layer, uv,
            (0.92, 0.46, 0.09),
            (cx, -0.16, SEAT_TOP - 0.045),
            None,
            0.012,
            "vinyl",
            "xy",
        )
        tilt = Matrix.Rotation(math.radians(-14), 4, "X")
        add_box(
            bm, layer, uv,
            (0.90, 0.07, 0.46),
            (cx, 0.06, -2.30),
            tilt,
            0.01,
            "vinyl",
            "xz",
        )

    mark_sharp(bm)
    mesh = bpy.data.meshes.new("Chair")
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate(clean_customdata=False)
    return mesh


def shade(obj):
    mesh = obj.data
    for poly in mesh.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(62))
    except Exception as exc:
        print("shade_auto_smooth skipped", exc)
        mod = obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
        mod.keep_sharp = True


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, location, target, lens):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_start = 0.05
    cam.clip_end = 80
    obj = bpy.data.objects.new(name, cam)
    obj.location = Vector(location)
    bpy.context.scene.collection.objects.link(obj)
    look_at(obj, target)
    return obj


def add_light(name, kind, location, energy, size, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, kind)
    light.energy = energy
    light.color = color
    if hasattr(light, "size"):
        light.size = size
    obj = bpy.data.objects.new(name, light)
    obj.location = Vector(location)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def staging(chair):
    look = (0.0, -0.12, -1.4)
    add_camera("Cam_Front", (0.0, -7.6, -1.05), look, 48)
    add_camera("Cam_Side", (7.8, -0.15, -1.05), look, 48)
    add_camera("Cam_ThreeQuarter", (4.4, -6.0, -0.35), look, 44)
    add_camera("Cam_Hang", (3.6, -6.4, 0.15), (0.0, -0.05, -1.25), 40)
    add_camera(
        "Cam_Concept",
        (1.55, -6.6, -0.55),
        (0.0, 0.0, -1.45),
        64,
    )

    add_light("Key", "AREA", (2.4, -3.2, 1.6), 180, 2.4)
    add_light("Fill", "AREA", (-2.8, -2.2, -0.4), 60, 3.0, (0.85, 0.9, 1.0))
    add_light("Rim", "AREA", (-1.2, 2.4, 0.8), 90, 1.6)
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            look_at(obj, look)

    world = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is None:
        bg = world.node_tree.nodes.new("ShaderNodeBackground")
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0

    # Render-only. Not selected for the GLB.
    stage = bpy.data.collections.new("Staging")
    bpy.context.scene.collection.children.link(stage)
    snow_mat = bpy.data.materials.new("snow")
    snow_mat.use_nodes = True
    snow_bsdf = next(n for n in snow_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    snow_bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.90, 0.93, 0.95)), 1)
    snow_bsdf.inputs["Roughness"].default_value = 0.92
    snow_bsdf.inputs["Metallic"].default_value = 0.0
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -6.2))
    snow = bpy.context.active_object
    snow.name = "Snow"
    snow.data.materials.append(snow_mat)
    cable_mat = bpy.data.materials.new("cable")
    cable_mat.use_nodes = True
    cable_bsdf = next(n for n in cable_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    cable_bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.22, 0.24, 0.27)), 1)
    cable_bsdf.inputs["Metallic"].default_value = 0.0
    cable_bsdf.inputs["Roughness"].default_value = 0.55
    bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=2.4, location=(0, 0, 0), vertices=12)
    cable = bpy.context.active_object
    cable.name = "Cable"
    cable.rotation_euler = (math.radians(90), 0, 0)
    cable.data.materials.append(cable_mat)
    for obj in (snow, cable):
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        stage.objects.link(obj)

    grip = bpy.data.objects.new("Grip", None)
    grip.empty_display_type = "PLAIN_AXES"
    grip.empty_display_size = 0.15
    bpy.context.scene.collection.objects.link(grip)
    seat = bpy.data.objects.new("Seat", None)
    seat.empty_display_type = "SPHERE"
    seat.empty_display_size = 0.08
    # three.js seat (x=-0.484, y=-2.55, z=0.02) -> Blender (x, -z, y)
    seat.location = (-0.484, -0.02, -2.55)
    bpy.context.scene.collection.objects.link(seat)
    return stage


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def assert_chair(obj):
    mesh = obj.data
    tris = triangle_count(mesh)
    xs = [v.co.x for v in mesh.vertices]
    ys = [v.co.y for v in mesh.vertices]
    zs = [v.co.z for v in mesh.vertices]
    width = max(xs) - min(xs)
    seat_band = [v.co.z for v in mesh.vertices if abs(v.co.z - SEAT_TOP) < 0.08]
    mat = mesh.materials[0]
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    metallic = bsdf.inputs["Metallic"].default_value
    tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE")
    problems = []
    if tris > 2500 or tris < 600:
        problems.append(f"triangles {tris}")
    if not (2.05 <= width <= 2.40):
        problems.append(f"width {width:.3f}")
    if min(zs) > -2.9 or max(zs) < 0.05:
        problems.append(f"z {min(zs):.3f} {max(zs):.3f}")
    if not seat_band:
        problems.append("seat surface missing")
    if metallic > 0.001:
        problems.append(f"metallic {metallic}")
    if tex.image is None:
        problems.append("missing albedo")
    if any(not math.isfinite(c) for v in mesh.vertices for c in v.co):
        problems.append("non-finite")
    areas = [p.area for p in mesh.polygons]
    if areas and min(areas) <= 0:
        problems.append("zero area face")
    print(
        f"chair tris={tris} width={width:.3f} "
        f"x=({min(xs):.2f},{max(xs):.2f}) y=({min(ys):.2f},{max(ys):.2f}) "
        f"z=({min(zs):.2f},{max(zs):.2f})"
    )
    if problems:
        raise RuntimeError("; ".join(problems))
    return tris


def pick_engine(scene):
    engines = {i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if name in engines:
            try:
                scene.render.engine = name
                return name
            except TypeError:
                continue
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    return "CYCLES"


def render_shots(stage):
    scene = bpy.context.scene
    engine = pick_engine(scene)
    print("beauty engine", engine)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 1280
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    world = scene.world
    bg = world.node_tree.nodes.get("Background")
    shots = (
        ("front", "Cam_Front", False),
        ("side", "Cam_Side", False),
        ("three-quarter", "Cam_ThreeQuarter", False),
        ("hang-snow", "Cam_Hang", True),
    )
    for name, cam, snow in shots:
        scene.camera = bpy.data.objects[cam]
        bg.inputs[0].default_value = (0.78, 0.84, 0.88, 1) if snow else (1, 1, 1, 1)
        bg.inputs[1].default_value = 0.85 if snow else 1.0
        for obj in stage.objects:
            obj.hide_render = not snow
        scene.render.filepath = str(SHOT_DIR / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)
    for obj in stage.objects:
        obj.hide_render = True
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0


def export_glb(obj):
    addon_utils = __import__("addon_utils")
    addon_utils.enable("io_scene_gltf2")
    for other in bpy.data.objects:
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )


def main():
    reset_scene()
    image = write_albedo()
    mat = make_material(image)
    mesh = build_mesh()
    mesh.materials.append(mat)
    chair = bpy.data.objects.new("Chair", mesh)
    bpy.context.scene.collection.objects.link(chair)
    for poly in mesh.polygons:
        poly.use_smooth = True
    shade(chair)
    stage = staging(chair)
    tris = assert_chair(chair)
    bpy.context.scene.camera = bpy.data.objects["Cam_ThreeQuarter"]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(chair)
    render_shots(stage)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("wrote", BLEND_PATH, GLB_PATH, "tris", tris)


if __name__ == "__main__":
    main()

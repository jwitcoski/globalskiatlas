"""Three snowy pines, one shared albedo, one GLB.

Blender Z-up, 1 unit = 1 m. glTF export is Y-up. Each mesh origin is the
center of the trunk base. The game recenters XZ, drops min Y to 0, and
scales every mesh by 11 / tallest, so all three are built to 11 m.
"""

import json
import math
import os
import struct
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
ATLAS = 4096
HEIGHT = 11.0
SEED = 20261020

# Desired sRGB colors. Image.pixels is scene-linear.
GREEN = (0.243, 0.561, 0.227)       # #3E8F3A
GREEN_DARK = (0.176, 0.478, 0.165)  # #2D7A2A
GREEN_LIGHT = (0.322, 0.639, 0.290) # #52A34A
SNOW = (0.969, 0.980, 0.973)        # #F7FAF8
SNOW_SHADE = (0.780, 0.835, 0.855)  # #C7D5DA crevice, still light
BARK = (0.651, 0.416, 0.243)        # #A66A3E
BARK_DARK = (0.420, 0.247, 0.145)   # #6B3F25

VARIANTS = [
    dict(
        name="pine_spire",
        x=0.0,
        r_base=0.30,
        r_top=0.045,
        trunk_h=9.3,
        whorls=14,
        arms=8,
        z_start=1.05,
        z_end=10.65,
        canopy=2.05,
        power=1.05,
        droop=0.34,
        hang=1.25,
        shelf=0.20,
        snow=0.34,
        snow_top=0.12,
        gap=0.02,
        jit=0.08,
        open_pair=False,
        inner=False,
        caps=1,
        seed=11,
    ),
    dict(
        name="pine_broad",
        x=48.0,
        r_base=0.32,
        r_top=0.05,
        trunk_h=8.4,
        whorls=10,
        arms=8,
        z_start=0.62,
        z_end=10.55,
        canopy=3.65,
        power=0.58,
        droop=0.55,
        hang=1.85,
        shelf=0.34,
        snow=0.46,
        snow_top=0.18,
        gap=0.02,
        jit=0.06,
        open_pair=False,
        inner=True,
        caps=2,
        seed=23,
    ),
    dict(
        name="pine_young",
        x=96.0,
        r_base=0.22,
        r_top=0.035,
        trunk_h=9.4,
        whorls=11,
        arms=6,
        z_start=1.35,
        z_end=10.6,
        canopy=1.9,
        power=0.95,
        droop=0.28,
        hang=1.15,
        shelf=0.16,
        snow=0.18,
        snow_top=0.08,
        gap=0.06,
        jit=0.12,
        open_pair=True,
        inner=False,
        caps=1,
        seed=37,
    ),
]


def srgb_to_linear(rgb):
    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4

    return tuple(f(c) for c in rgb)


LIN = {k: srgb_to_linear(v) for k, v in {
    "green": GREEN,
    "green_dark": GREEN_DARK,
    "green_light": GREEN_LIGHT,
    "snow": SNOW,
    "snow_shade": SNOW_SHADE,
    "bark": BARK,
    "bark_dark": BARK_DARK,
}.items()}


class Packer:
    def __init__(self, size, pad=3):
        self.size = size
        self.pad = pad
        self.x = pad
        self.y = pad
        self.row_h = 0
        self.rects = []

    def alloc(self, w, h):
        pad = self.pad
        if self.x + w + pad > self.size:
            self.x = pad
            self.y += self.row_h + pad
            self.row_h = 0
        if self.y + h + pad > self.size:
            raise RuntimeError(f"atlas full at {len(self.rects)} rects, need {w}x{h}")
        rect = (self.x, self.y, w, h)
        self.x += w + pad
        self.row_h = max(self.row_h, h)
        self.rects.append(rect)
        return rect

    def uv(self, rect, inset=2.0):
        x, y, w, h = rect
        s = self.size
        return (
            (x + inset) / s,
            (y + inset) / s,
            (x + w - inset) / s,
            (y + h - inset) / s,
        )


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)


def new_uv_layer(bm):
    return bm.loops.layers.uv.new("UVMap")


def add_quad(bm, uv, corners, uv_corners, expect="any"):
    vs = [bm.verts.new(c) for c in corners]
    try:
        face = bm.faces.new(vs)
    except ValueError:
        for v in vs:
            bm.verts.remove(v)
        return None
    face.normal_update()
    if expect == "up" and face.normal.z < 0:
        face.normal_flip()
    elif expect == "radial":
        radial = Vector((corners[0].x + corners[1].x, corners[0].y + corners[1].y, 0))
        if face.normal.dot(radial) < 0:
            face.normal_flip()
    uvs = {vs[i]: uv_corners[i] for i in range(4)}
    for loop in face.loops:
        loop[uv].uv = uvs[loop.vert]
    face.smooth = expect == "smooth"
    return face


def quad_area(corners):
    a, b, c, d = corners
    return ((b - a).cross(c - a)).length * 0.5 + ((a - c).cross(d - c)).length * 0.5


def paint_needle(buf, rect, seed, snow_frac, gap):
    """Hard-edged tufts. Gaps stay fully transparent so the card is not a solid flag."""
    x, y, w, h = rect
    xs = (np.arange(w) + 0.5) / w
    ys = (np.arange(h) + 0.5) / h
    X, Y = np.meshgrid(xs, ys)
    phase = (seed % 19) * 0.41
    covered = np.zeros_like(X, dtype=bool)
    snow = np.zeros_like(X, dtype=bool)
    clumps = 4
    step = 0.74 / max(clumps - 1, 1)
    rx = 0.075 - gap * 0.04
    for i in range(clumps):
        cx = 0.14 + step * i
        cy = 0.46 + 0.05 * math.sin(i * 2.1 + phase)
        ry = 0.34 - gap * 0.08
        clump = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1.0
        # Second smaller tuft beside it, so the edge is a cluster rather than one oval.
        cx2 = cx + rx * 0.7
        clump |= ((X - cx2) / (rx * 0.62)) ** 2 + ((Y - (cy - 0.08)) / (ry * 0.72)) ** 2 <= 1.0
        covered |= clump
        snow_ry = 0.10 + snow_frac * 0.16
        snow |= clump & (((X - cx) / (rx * 0.95)) ** 2 + ((Y - (cy + ry * 0.55)) / snow_ry) ** 2 <= 1.0)
    twig = (Y > 0.74) & (Y < 0.84) & (X > 0.08) & (X < 0.93)
    twig &= np.abs(Y - (0.79 + 0.02 * np.sin(X * 22 + phase))) < 0.035
    covered |= twig
    snow |= twig & (Y > 0.78)
    is_snow = covered & snow
    is_needle = covered & ~is_snow
    band = np.sin(X * 9 + phase)
    rgb = np.empty((h, w, 3), np.float32)
    rgb[:] = LIN["green"]
    rgb[band > 0.2] = LIN["green_light"]
    rgb[band < -0.2] = LIN["green_dark"]
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = LIN["green"]
    out[..., :3] = np.where(is_needle[..., None], rgb, out[..., :3])
    out[..., :3] = np.where(is_snow[..., None], LIN["snow"], out[..., :3])
    out[..., 3] = np.where(is_snow | is_needle, 1.0, 0.0)
    buf[y:y + h, x:x + w] = out


def paint_snow(buf, rect, seed):
    x, y, w, h = rect
    xs = (np.arange(w) + 0.5) / w
    ys = (np.arange(h) + 0.5) / h
    X, Y = np.meshgrid(xs, ys)
    phase = (seed % 11) * 0.7
    blob = ((X - 0.50) / 0.46) ** 2 + ((Y - 0.46) / 0.40) ** 2 <= 1.0
    blob |= ((X - 0.28) / 0.24) ** 2 + ((Y - 0.60) / 0.26) ** 2 <= 1.0
    blob |= ((X - 0.74) / 0.22) ** 2 + ((Y - 0.58 + 0.04 * math.sin(phase)) / 0.24) ** 2 <= 1.0
    shade = np.array(LIN["snow_shade"], np.float32)
    snow = np.array(LIN["snow"], np.float32)
    rgb = np.broadcast_to(snow, (h, w, 3)).copy()
    rgb[Y < 0.34] = snow * 0.82 + shade * 0.18
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = rgb
    out[..., 3] = np.where(blob, 1.0, 0.0)
    # Transparent texels keep snow RGB so the 0.38 cutoff cannot fringe gray.
    buf[y:y + h, x:x + w] = out


def paint_bark(buf, rect, seed):
    x, y, w, h = rect
    xs = (np.arange(w) + 0.5) / w
    ys = (np.arange(h) + 0.5) / h
    X, Y = np.meshgrid(xs, ys)
    grain = 0.5 + 0.5 * np.sin(X * 46 + seed)
    cracks = np.abs(np.sin(Y * 90 + X * 5)) > 0.94
    dark = np.clip(grain * 0.65 + cracks * 0.8, 0, 1)
    bark = np.array(LIN["bark"], np.float32)
    bark_d = np.array(LIN["bark_dark"], np.float32)
    rgb = bark * (1 - 0.35 * dark[..., None]) + bark_d * (0.35 * dark[..., None])
    out = np.ones((h, w, 4), np.float32)
    out[..., :3] = rgb
    buf[y:y + h, x:x + w] = out


def assign_cylinder_uv(face, uv, rect_uv):
    u0, v0, u1, v1 = rect_uv
    us = []
    vs = []
    for loop in face.loops:
        co = loop.vert.co
        us.append((math.atan2(co.y, co.x) + math.pi) / (2 * math.pi))
        vs.append(co.z / HEIGHT)
    if max(us) - min(us) > 0.5:
        us = [u - 1 if u > 0.5 else u for u in us]
    umin, umax = min(us), max(us)
    span = max(umax - umin, 1e-6)
    for loop, u, v in zip(face.loops, us, vs):
        # Keep the seam face inside the bark island instead of wrapping off it.
        uu = (u - umin) / span
        loop[uv].uv = (u0 + uu * (u1 - u0), v0 + max(0.0, min(1.0, v)) * (v1 - v0))


def build_trunk(bm, uv, spec, packer, jobs):
    sides = 12
    segs = 6
    rings = []
    for i in range(segs + 1):
        z = spec["trunk_h"] * i / segs
        t = z / spec["trunk_h"]
        r = spec["r_base"] + (spec["r_top"] - spec["r_base"]) * t
        r *= 1 + 0.02 * math.sin(i * 1.9 + spec["seed"])
        ring = []
        for s in range(sides):
            a = 2 * math.pi * s / sides
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    rect = packer.alloc(96, 512)
    jobs.append(("bark", rect, spec["seed"]))
    rect_uv = packer.uv(rect, inset=2)
    for i in range(segs):
        for s in range(sides):
            s2 = (s + 1) % sides
            vs = [rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]]
            face = bm.faces.new(vs)
            face.smooth = True
            assign_cylinder_uv(face, uv, rect_uv)


def uhash(n):
    """Stable 0..1. ponytail: one hash, not a noise field; enough for branch wobble."""
    x = (int(n) * 747796405 + 2891336453) & 0xFFFFFFFF
    x ^= x >> 16
    x = (x * 2246822519) & 0xFFFFFFFF
    x ^= x >> 13
    return (x & 0xFFFFFFFF) / 4294967295.0


def limb_corners(base, tip, direction, hang):
    return [
        base + direction * (hang * 0.05),
        tip + direction * (hang * 0.02),
        tip - direction * hang,
        base - direction * (hang * 0.58),
    ]


def above_ground(corners, zmin=0.12):
    lifted = []
    for c in corners:
        z = HEIGHT if c.z > HEIGHT else c.z
        lifted.append(Vector((c.x, c.y, zmin if z < zmin else z)))
    return lifted


def add_painted_quad(bm, uv, packer, jobs, corners, kind, seed, snow_frac=0.0, gap=0.0, expect="any"):
    corners = above_ground(corners)
    if quad_area(corners) < 1e-3:
        return
    if kind == "needle":
        rect = packer.alloc(96, 128)
        jobs.append(("needle", rect, seed, snow_frac, gap))
    else:
        rect = packer.alloc(80, 64)
        jobs.append(("snow", rect, seed))
    u0, v0, u1, v1 = packer.uv(rect)
    add_quad(bm, uv, corners, [(u0, v1), (u1, v1), (u1, v0), (u0, v0)], expect=expect)


def build_limb(bm, uv, packer, jobs, spec, origin, angle, length, droop, snow_frac, seed, upward=False, cap=True, hang_scale=1.0):
    dx, dy = math.cos(angle), math.sin(angle)
    radial = Vector((dx, dy, 0.0))
    side = Vector((-dy, dx, 0.0))
    up = Vector((0.0, 0.0, 1.0))
    base = Vector(origin)
    tip = base + radial * length + Vector((0.0, 0.0, -droop))
    if upward:
        tip.z = HEIGHT
    hang = spec["hang"] * hang_scale * (0.62 + 0.38 * min(1.0, length / max(spec["canopy"], 0.01)))
    needle_tip = tip + radial * (length * 0.06)
    d1 = up
    d2 = (up * math.cos(1.05) + side * math.sin(1.05)).normalized()
    for n, direction in enumerate((d1, d2)):
        add_painted_quad(
            bm, uv, packer, jobs,
            limb_corners(base, needle_tip, direction, hang),
            "needle", seed + n, snow_frac, spec["gap"],
        )
    if not cap:
        return
    width = max(0.16, length * spec["shelf"])
    cap_base = base + radial * (length * 0.48) + Vector((0.0, 0.0, -droop * 0.3))
    cap_tip = tip + up * 0.05
    add_painted_quad(
        bm, uv, packer, jobs,
        [
            cap_base + side * width * 0.48,
            cap_tip + side * width * 0.62,
            cap_tip - side * width * 0.62,
            cap_base - side * width * 0.48,
        ],
        "snow", seed + 5, expect="up",
    )


def build_variant(spec, packer, jobs):
    bm = bmesh.new()
    uv = new_uv_layer(bm)
    build_trunk(bm, uv, spec, packer, jobs)
    whorls = spec["whorls"]
    arms = spec["arms"]
    for i in range(whorls):
        t = i / max(whorls - 1, 1)
        z = spec["z_start"] + (spec["z_end"] - spec["z_start"]) * t
        # Keep lower limbs long. Power < 1 holds the broad skirt out.
        length = spec["canopy"] * max(0.12, (1 - t) ** spec["power"])
        if spec["name"] == "pine_broad" and t < 0.4:
            length *= 1.12
        phase = i * (math.pi / arms) + 0.2
        for j in range(arms):
            n = spec["seed"] * 1000 + i * 64 + j
            # Each arm is a little off on its own. Opposite arms no longer match.
            jit = 1 + (uhash(n) - 0.5) * (0.16 + spec["jit"])
            if spec["open_pair"] and j % 2 == 0:
                jit *= 0.92
            ang = phase + j * (2 * math.pi / arms) + (uhash(n + 19) - 0.5) * 0.22
            z_arm = z + (uhash(n + 41) - 0.5) * 0.22
            snow = min(0.62, spec["snow"] + spec["snow_top"] * t)
            snow *= 0.9 + uhash(n + 53) * 0.2
            origin = (spec["r_base"] * 0.72 * math.cos(ang), spec["r_base"] * 0.72 * math.sin(ang), z_arm)
            limb_len = max(0.28, length * jit)
            build_limb(
                bm, uv, packer, jobs, spec, origin, ang,
                limb_len,
                droop=spec["droop"] * limb_len * (0.86 + uhash(n + 7) * 0.28),
                snow_frac=snow,
                seed=spec["seed"] * 100 + i * 17 + j,
            )
            if spec["inner"] and t < 0.72:
                build_limb(
                    bm, uv, packer, jobs, spec, origin, ang + 0.06 + uhash(n + 29) * 0.22,
                    limb_len * 0.5,
                    droop=spec["droop"] * limb_len * 0.35,
                    snow_frac=min(0.62, snow + 0.08),
                    seed=spec["seed"] * 300 + i * 19 + j,
                    cap=False,
                )
    zmax = max((v.co.z for v in bm.verts), default=HEIGHT)
    if zmax > 1e-4 and abs(zmax - HEIGHT) > 1e-3:
        lift = HEIGHT / zmax
        for v in bm.verts:
            v.co.z *= lift
    for v in bm.verts:
        if v.co.z > HEIGHT:
            v.co.z = HEIGHT
    bm.faces.ensure_lookup_table()
    dead = []
    for face in bm.faces:
        vs = [loop.vert.co for loop in face.loops]
        areas = []
        for i in range(1, len(vs) - 1):
            areas.append(((vs[i] - vs[0]).cross(vs[i + 1] - vs[0])).length * 0.5)
        if not areas or min(areas) < 1e-5:
            dead.append(face)
    for face in dead:
        bm.faces.remove(face)
    mesh = bpy.data.meshes.new(spec["name"])
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(spec["name"], mesh)
    obj.location.x = spec["x"]
    bpy.context.scene.collection.objects.link(obj)
    return obj


def make_material(image):
    mat = bpy.data.materials.new("pine_albedo")
    mat.use_nodes = True
    mat.blend_method = "CLIP"
    mat.alpha_threshold = 0.38
    mat.use_backface_culling = False
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Linear"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.9
    spec = bsdf.inputs.get("Specular IOR Level")
    if spec is not None:
        spec.default_value = 0.12
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    return mat


def write_image(packer, jobs):
    buf = np.zeros((ATLAS, ATLAS, 4), np.float32)
    # Padding RGB is mid green so a Repeat wrap or a filter tap does not pull black.
    buf[..., :3] = LIN["green"]
    buf[..., 3] = 0.0
    for job in jobs:
        kind = job[0]
        rect = job[1]
        if kind == "needle":
            paint_needle(buf, rect, job[2], job[3], job[4])
        elif kind == "snow":
            paint_snow(buf, rect, job[2])
        elif kind == "bark":
            paint_bark(buf, rect, job[2])
        else:
            raise RuntimeError(kind)
    alpha = buf[..., 3]
    partial = np.logical_and(alpha > 0.02, alpha < 0.98).sum()
    if partial:
        raise RuntimeError(f"soft alpha texels: {partial}")
    image = bpy.data.images.new("pine_albedo", ATLAS, ATLAS, alpha=True, float_buffer=True)
    image.colorspace_settings.name = "sRGB"
    image.alpha_mode = "STRAIGHT"
    image.pixels.foreach_set(buf.reshape(-1))
    image.filepath_raw = os.path.join(OUT, "pine_albedo.png")
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_scene():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1600
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.use_compositing = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0

    world = bpy.data.worlds.new("SnowWhite")
    scene.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 0.55

    tree = bpy.data.node_groups.new("WhiteOver", "CompositorNodeTree")
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    out = tree.nodes.new("NodeGroupOutput")
    rl = tree.nodes.new("CompositorNodeRLayers")
    rgb = tree.nodes.new("CompositorNodeRGB")
    rgb.outputs[0].default_value = (1, 1, 1, 1)
    over = tree.nodes.new("CompositorNodeAlphaOver")
    over.inputs["Factor"].default_value = 1.0
    tree.links.new(rgb.outputs[0], over.inputs["Background"])
    tree.links.new(rl.outputs["Image"], over.inputs["Foreground"])
    tree.links.new(over.outputs["Image"], out.inputs["Image"])
    scene.compositing_node_group = tree

    sun_data = bpy.data.lights.new("key", "SUN")
    sun_data.energy = 2.4
    sun_data.angle = math.radians(12)
    sun = bpy.data.objects.new("key", sun_data)
    sun.rotation_euler = (math.radians(52), math.radians(8), math.radians(-38))
    scene.collection.objects.link(sun)

    fill_data = bpy.data.lights.new("fill", "AREA")
    fill_data.energy = 180
    fill_data.shape = "RECTANGLE"
    fill_data.size = 18
    fill_data.size_y = 10
    fill = bpy.data.objects.new("fill", fill_data)
    fill.location = (-8, 10, 9)
    look_at(fill, (18, 0, 5))
    scene.collection.objects.link(fill)

    ground = bpy.data.meshes.new("render_ground")
    gbm = bmesh.new()
    bmesh.ops.create_grid(gbm, x_segments=1, y_segments=1, size=80)
    gbm.to_mesh(ground)
    gbm.free()
    gobj = bpy.data.objects.new("render_ground", ground)
    gobj.location.z = -0.03
    gobj.is_shadow_catcher = True
    scene.collection.objects.link(gobj)

    for spec in VARIANTS:
        target = (spec["x"], 0.0, 5.0)
        for view, loc in (
            ("front", (spec["x"], -26.0, 5.2)),
            ("side", (spec["x"] - 26.0, 0.0, 5.2)),
            ("threequarter", (spec["x"] + 18.5, -18.5, 6.2)),
        ):
            cam_data = bpy.data.cameras.new(f"{spec['name']}_{view}")
            cam_data.lens = 50
            cam_data.clip_end = 200
            cam = bpy.data.objects.new(f"{spec['name']}_{view}", cam_data)
            cam.location = loc
            look_at(cam, target)
            scene.collection.objects.link(cam)
    scene.camera = bpy.data.objects["pine_broad_threequarter"]


def mesh_stats(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    verts = np.array([v.co for v in mesh.vertices])
    z = verts[:, 2]
    base = verts[z <= 0.001]
    radii = np.linalg.norm(base[:, :2], axis=1) if len(base) else np.array([0.0])
    uv = mesh.uv_layers.active
    areas = [tri.area for tri in mesh.loop_triangles]
    return {
        "name": obj.name,
        "triangles": len(mesh.loop_triangles),
        "quads_and_tris": len(mesh.polygons),
        "min_z": float(z.min()),
        "max_z": float(z.max()),
        "base_radius_min": float(radii.min()),
        "base_radius_max": float(radii.max()),
        "min_tri_area": float(min(areas) if areas else 0),
        "has_uv": uv is not None,
        "materials": [s.name for s in mesh.materials],
    }


def assert_asset(objects):
    stats = [mesh_stats(o) for o in objects]
    for s in stats:
        if s["triangles"] <= 0 or s["triangles"] > 900:
            raise RuntimeError(f"triangle budget {s}")
        if s["min_z"] < -1e-5:
            raise RuntimeError(f"below ground {s}")
        if abs(s["max_z"] - HEIGHT) > 0.05:
            raise RuntimeError(f"height {s}")
        if s["base_radius_max"] < 0.18 or s["base_radius_max"] > 0.42:
            raise RuntimeError(f"trunk radius {s}")
        if s["min_tri_area"] < 1e-8:
            raise RuntimeError(f"degenerate {s}")
        if s["materials"] != ["pine_albedo"]:
            raise RuntimeError(f"material {s}")
    return stats


def export_glb(objects):
    path = os.path.join(OUT, "snowy-pine-pack.glb")
    for obj in bpy.data.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
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
        export_skins=False,
        export_morph=False,
        export_extras=False,
        export_vertex_color="NONE",
        export_draco_mesh_compression_enable=False,
        export_image_format="AUTO",
    )
    return path


def check_glb(path):
    data = open(path, "rb").read()
    if data[:4] != b"glTF":
        raise RuntimeError("not a glb")
    length = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + length])
    if doc.get("skins") or doc.get("animations"):
        raise RuntimeError("glb has skin or animation")
    meshes = doc.get("meshes", [])
    if len(meshes) != 3:
        raise RuntimeError(f"mesh count {len(meshes)}")
    images = doc.get("images", [])
    if len(images) != 1:
        raise RuntimeError(f"image count {len(images)} {images}")
    mime = images[0].get("mimeType")
    if mime != "image/png":
        raise RuntimeError(f"mime {mime}")
    mats = doc.get("materials", [])
    if len(mats) != 1:
        raise RuntimeError(f"materials {mats}")
    pbr = mats[0].get("pbrMetallicRoughness", {})
    if "baseColorTexture" not in pbr:
        raise RuntimeError("missing baseColorTexture")
    # POSITION accessor ranges: Y should carry the 11 m height after Y-up export.
    spans = []
    for mesh in meshes:
        prim = mesh["primitives"][0]
        acc = doc["accessors"][prim["attributes"]["POSITION"]]
        mn, mx = acc["min"], acc["max"]
        spans.append({"mesh": mesh.get("name"), "min": mn, "max": mx, "mode": prim.get("mode", 4)})
        height = mx[1] - mn[1]
        if height < 10.5 or height > 11.2:
            raise RuntimeError(f"y-up height {mesh.get('name')} {mn} {mx}")
        if mn[1] < -0.02:
            raise RuntimeError(f"y-up below origin {mesh.get('name')} {mn}")
    return {"meshes": [m.get("name") for m in meshes], "spans": spans, "alphaMode": mats[0].get("alphaMode"), "doubleSided": mats[0].get("doubleSided")}


def main():
    clear_scene()
    packer = Packer(ATLAS)
    jobs = []
    objects = [build_variant(spec, packer, jobs) for spec in VARIANTS]
    image = write_image(packer, jobs)
    mat = make_material(image)
    for obj in objects:
        obj.data.materials.append(mat)
    stats = assert_asset(objects)
    setup_scene()
    blend = os.path.join(OUT, "snowy-pines.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    glb = export_glb(objects)
    glb_info = check_glb(glb)
    report = {"stats": stats, "atlas_rects": len(packer.rects), "glb": glb_info}
    print(json.dumps(report, indent=2))
    # Re-save so the packed image and selection state stay with the cameras.
    bpy.ops.wm.save_as_mainfile(filepath=blend)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)

"""Gondola and cable-car cabins. Durable source for playable/assets/models/lift/.

Blender Z-up. Travel faces -Y, which glTF Y-up export turns into +Z.
Origin of each object is the cable grip. The hanger runs down (-Z) to the roof.
Run: blender --background --factory-startup --python create_cabins.py

Game sizes (body, hanger extra): gondola 2.2 x 1.8 x 1.8, cable car 3.2 x 2.2 x 2.2.
Painted metal 0x6b7785 and a darker window band share one albedo. Metalness 0.
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
BLEND_PATH = ROOT / "cabins.blend"
GLB_PATH = ROOT / "cabins.glb"
ALBEDO_PATH = ROOT / "cabins_albedo.png"
SHOT_DIR = ROOT / "evidence" / "cabins"
TEX = 1024

STEEL = (107 / 255, 119 / 255, 133 / 255)
GLASS = (24 / 255, 36 / 255, 48 / 255)
GLASS_SHEEN = (62 / 255, 82 / 255, 102 / 255)
SKIRT = (78 / 255, 86 / 255, 96 / 255)

METAL, GLASS_ID, SKIRT_ID, PLATE = 0, 1, 2, 3
REGIONS = {
    METAL: (0.04, 0.06, 0.46, 0.44),
    SKIRT_ID: (0.54, 0.06, 0.96, 0.44),
    GLASS_ID: (0.04, 0.56, 0.46, 0.94),
    PLATE: (0.54, 0.56, 0.96, 0.94),
}


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
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2


def write_albedo():
    """One painted albedo. Metal, skirt, glass, and plate bolts live in four blocks."""
    h = w = TEX
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / (w - 1)
    v = yy / (h - 1)
    # Slow blotches only. A diagonal sine was reading as moiré on the cabin.
    n = np.sin(xx / 220.0) * np.cos(yy / 260.0)
    steel = np.array(STEEL, dtype=np.float32)
    glass = np.array(GLASS, dtype=np.float32)
    sheen = np.array(GLASS_SHEEN, dtype=np.float32)
    skirt = np.array(SKIRT, dtype=np.float32)
    metal = (u < 0.5) & (v < 0.5)
    skirt_m = (u >= 0.5) & (v < 0.5)
    glass_m = (u < 0.5) & (v >= 0.5)
    plate = (u >= 0.5) & (v >= 0.5)
    paint = steel * (0.98 + 0.025 * n)[:, :, None]
    rgb[metal] = np.clip(paint[metal], 0, 1)
    skirt_paint = skirt * (0.98 + 0.02 * n)[:, :, None]
    rgb[skirt_m] = np.clip(skirt_paint[skirt_m], 0, 1)
    band = np.exp(-((v - 0.74) / 0.07) ** 2)
    glass_paint = glass * (0.97 + 0.03 * n)[:, :, None]
    glass_paint += (sheen - glass) * band[:, :, None]
    rgb[glass_m] = np.clip(glass_paint[glass_m], 0, 1)
    plate_paint = steel * (0.96 + 0.02 * n)[:, :, None]
    bu = (u - 0.62) / 0.08
    bv = (v - 0.68) / 0.08
    bolt = (np.abs(bu - np.round(bu)) < 0.18) & (np.abs(bv - np.round(bv)) < 0.18)
    bolt &= (u > 0.56) & (u < 0.94) & (v > 0.58) & (v < 0.92)
    plate_paint[bolt] *= 0.62
    rgb[plate] = np.clip(plate_paint[plate], 0, 1)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = rgb
    img = bpy.data.images.new("cabins_albedo", w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(ALBEDO_PATH)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def make_material(image):
    mat = bpy.data.materials.new("cabins_albedo")
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
    bsdf.inputs["Roughness"].default_value = 0.58
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def new_face(bm, verts, uv_layer, part_layer, region):
    try:
        face = bm.faces.new(verts)
    except ValueError:
        return None
    face[part_layer] = region
    u0, v0, u1, v1 = REGIONS[region]
    for loop in face.loops:
        co = loop.vert.co
        uu = min(1.0, max(0.0, (co.x + 2.4) / 4.8))
        vv = min(1.0, max(0.0, (co.z + 3.3) / 3.6))
        loop[uv_layer].uv = (u0 + uu * (u1 - u0), v0 + vv * (v1 - v0))
    return face


def rounded_rect(hw, hd, radius, corner_segs, side_segs):
    r = min(radius, hw * 0.46, hd * 0.46)
    if r < 1e-4:
        return [(-hw, -hd), (hw, -hd), (hw, hd), (-hw, hd)]

    def arc(cx, cy, a0, a1):
        return [
            (
                cx + r * math.cos(a0 + (a1 - a0) * i / corner_segs),
                cy + r * math.sin(a0 + (a1 - a0) * i / corner_segs),
            )
            for i in range(corner_segs)
        ]

    def line(p0, p1):
        p0 = Vector(p0)
        p1 = Vector(p1)
        return [tuple(p0.lerp(p1, i / side_segs)) for i in range(side_segs)]

    pts = []
    pts += arc(-hw + r, -hd + r, math.pi, 1.5 * math.pi)
    pts += line((-hw + r, -hd), (hw - r, -hd))
    pts += arc(hw - r, -hd + r, 1.5 * math.pi, 2 * math.pi)
    pts += line((hw, -hd + r), (hw, hd - r))
    pts += arc(hw - r, hd - r, 0.0, 0.5 * math.pi)
    pts += line((hw - r, hd), (-hw + r, hd))
    pts += arc(-hw + r, hd - r, 0.5 * math.pi, math.pi)
    pts += line((-hw, hd - r), (-hw, -hd + r))
    return pts


def add_tube(bm, uv, part, path, radius, sides, region, loop=False):
    path = [Vector(p) for p in path]
    if len(path) < 2:
        return
    rings = []
    count = len(path)
    for i, p in enumerate(path):
        if loop:
            t = path[(i + 1) % count] - path[(i - 1) % count]
        elif i == 0:
            t = path[1] - p
        elif i == count - 1:
            t = p - path[i - 1]
        else:
            t = path[i + 1] - path[i - 1]
        if t.length < 1e-8:
            t = Vector((0, 0, 1))
        t.normalize()
        helper = Vector((0, 0, 1)) if abs(t.z) < 0.85 else Vector((1, 0, 0))
        n = t.cross(helper).normalized()
        b = t.cross(n).normalized()
        ring = []
        for s in range(sides):
            ang = 2 * math.pi * s / sides
            ring.append(bm.verts.new(p + (n * math.cos(ang) + b * math.sin(ang)) * radius))
        rings.append(ring)
    steps = count if loop else count - 1
    for i in range(steps):
        nxt = (i + 1) % count
        for s in range(sides):
            s2 = (s + 1) % sides
            new_face(
                bm,
                [rings[i][s], rings[i][s2], rings[nxt][s2], rings[nxt][s]],
                uv,
                part,
                region,
            )
    if loop:
        return
    for end, ring, flip in ((path[0], rings[0], True), (path[-1], rings[-1], False)):
        cap = bm.verts.new(end)
        for s in range(sides):
            s2 = (s + 1) % sides
            verts = [cap, ring[s2], ring[s]] if flip else [cap, ring[s], ring[s2]]
            new_face(bm, verts, uv, part, region)


def add_box(bm, uv, part, size, center, region):
    hx, hy, hz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    c = Vector(center)
    signs = (
        (-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
        (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1),
    )
    verts = [bm.verts.new(c + Vector((sx * hx, sy * hy, sz * hz))) for sx, sy, sz in signs]
    quads = (
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    )
    for q in quads:
        new_face(bm, [verts[i] for i in q], uv, part, region)


def add_shell(bm, uv, part, spec):
    """Walls only. Fracs run from the floor to the eave. The dome is separate."""
    hw = spec["width"] * 0.5
    hd = spec["depth"] * 0.5
    floor = spec["roof_z"] - spec["height"]
    wall_top = spec["roof_z"] - spec["roof_rise"]
    fracs = spec["fracs"]
    rings = []
    for frac in fracs:
        s = 0.94 + 0.06 * (frac / spec["skirt"]) if frac < spec["skirt"] else 1.0
        z = floor + frac * (wall_top - floor)
        ring = []
        for x, y in rounded_rect(hw * s, hd * s, spec["corner"] * max(0.4, s), 5, 3):
            ring.append(bm.verts.new((x, y, z)))
        rings.append(ring)
    n = len(rings[0])
    for r in range(len(rings) - 1):
        mid = (fracs[r] + fracs[r + 1]) * 0.5
        if spec["win"][0] < mid < spec["win"][1]:
            region = GLASS_ID
        elif mid < spec["skirt"]:
            region = SKIRT_ID
        else:
            region = METAL
        for i in range(n):
            j = (i + 1) % n
            new_face(
                bm,
                [rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]],
                uv,
                part,
                region,
            )
    fc = bm.verts.new((0.0, 0.0, floor))
    for i in range(n):
        j = (i + 1) % n
        new_face(bm, [fc, rings[0][j], rings[0][i]], uv, part, SKIRT_ID)
    return hw, hd, wall_top


def add_dome(bm, uv, part, hw, hd, corner, wall_top, rise, nu=16, nv=12):
    """Closed roof. Boundary vertices differ in height so the silhouette is an arch."""

    def xy_of(u, v, lip):
        x = u * hw * lip
        y = v * hd * lip
        r = min(corner, hw * 0.46, hd * 0.46) * lip
        if abs(x) > hw * lip - r and abs(y) > hd * lip - r:
            cx = math.copysign(hw * lip - r, x)
            cy = math.copysign(hd * lip - r, y)
            dx, dy = x - cx, y - cy
            dist = math.hypot(dx, dy) or 1.0
            if dist > r:
                x = cx + dx / dist * r
                y = cy + dy / dist * r
        return x, y

    def z_of(x, y):
        nx = min(1.0, abs(x) / hw)
        ny = min(1.0, abs(y) / hd)
        rad = min(1.0, (nx ** 4 + ny ** 4) ** 0.25)
        return wall_top + rise * math.cos(rad * math.pi * 0.5)

    grid = []
    for j in range(nv + 1):
        row = []
        v = -1.0 + 2.0 * j / nv
        for i in range(nu + 1):
            u = -1.0 + 2.0 * i / nu
            edge = i in (0, nu) or j in (0, nv)
            x, y = xy_of(u, v, 1.012 if edge else 1.0)
            z = wall_top - 0.035 if edge else z_of(x, y)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(nv):
        for i in range(nu):
            new_face(
                bm,
                [grid[j][i], grid[j + 1][i], grid[j + 1][i + 1], grid[j][i + 1]],
                uv,
                part,
                METAL,
            )
def orient_outward(bm):
    """Each part faces out of its own volume. The slope's Lambert shader culls the back."""
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    seen = set()
    for seed in list(bm.faces):
        if seed in seen:
            continue
        stack = [seed]
        comp = []
        while stack:
            face = stack.pop()
            if face in seen:
                continue
            seen.add(face)
            comp.append(face)
            for edge in face.edges:
                for other in edge.link_faces:
                    if other not in seen:
                        stack.append(other)
        center = Vector((0.0, 0.0, 0.0))
        for face in comp:
            center += face.calc_center_median()
        center /= len(comp)
        score = 0.0
        for face in comp:
            score += face.normal.dot(face.calc_center_median() - center)
        if score < 0:
            bmesh.ops.reverse_faces(bm, faces=comp)


def add_rail(bm, uv, part, hw, hd, corner, z, radius, outset):
    pts = rounded_rect(hw + outset, hd + outset, corner + outset * 0.25, 3, 2)
    path = [Vector((x, y, z)) for x, y in pts]
    add_tube(bm, uv, part, path, radius, 6, METAL, loop=True)


def add_mullion(bm, uv, part, center, size):
    add_box(bm, uv, part, size, center, METAL)


def add_grip(bm, uv, part, gap, cheek, pin_r):
    for sign in (-1, 1):
        add_box(bm, uv, part, (0.02, 0.16, cheek), (sign * gap, 0.0, 0.03), PLATE)
    add_tube(
        bm, uv, part,
        [Vector((-gap - 0.04, 0.0, 0.03)), Vector((gap + 0.04, 0.0, 0.03))],
        pin_r, 8, PLATE, loop=False,
    )
    add_box(bm, uv, part, (gap * 1.4, 0.10, 0.06), (0.0, 0.0, -0.02), PLATE)


def add_bolts(bm, uv, part, points, radius=0.012):
    for p in points:
        add_tube(
            bm, uv, part,
            [Vector(p), Vector(p) + Vector((0, -0.012, 0))],
            radius, 6, PLATE, loop=False,
        )


def build_gondola(bm, uv, part):
    spec = {
        "width": 2.20,
        "depth": 1.80,
        "height": 1.80,
        "roof_z": -0.48,
        "roof_rise": 0.40,
        "corner": 0.30,
        "skirt": 0.12,
        "win": (0.46, 0.82),
        "fracs": [0, 0.05, 0.12, 0.24, 0.40, 0.52, 0.64, 0.76, 0.88, 1],
    }
    hw, hd, wall_top = add_shell(bm, uv, part, spec)
    add_dome(bm, uv, part, hw, hd, spec["corner"], wall_top, spec["roof_rise"])
    floor = spec["roof_z"] - spec["height"]
    z0 = floor + spec["win"][0] * spec["height"]
    z1 = floor + spec["win"][1] * spec["height"]
    mid = (z0 + z1) * 0.5
    tall = z1 - z0
    add_rail(bm, uv, part, hw, hd, spec["corner"], z0, 0.02, 0.012)
    add_rail(bm, uv, part, hw, hd, spec["corner"], z1, 0.02, 0.012)
    add_mullion(bm, uv, part, (0.0, -hd - 0.012, mid), (0.045, 0.028, tall))
    add_mullion(bm, uv, part, (0.0, hd + 0.012, mid), (0.045, 0.028, tall))
    add_mullion(bm, uv, part, (-hw - 0.012, 0.0, mid), (0.028, 0.07, tall))
    add_mullion(bm, uv, part, (hw + 0.012, 0.0, mid), (0.028, 0.07, tall))
    add_rail(bm, uv, part, hw * 0.92, hd * 0.92, spec["corner"], floor + 0.08, 0.028, 0.0)
    add_grip(bm, uv, part, 0.10, 0.20, 0.022)
    add_tube(
        bm, uv, part,
        [Vector((0, 0, -0.06)), Vector((0, 0, spec["roof_z"] + 0.02))],
        0.048, 8, METAL, loop=False,
    )
    add_tube(
        bm, uv, part,
        [Vector((0, 0, spec["roof_z"] + 0.01)), Vector((0, 0, spec["roof_z"] - 0.10))],
        0.07, 8, METAL, loop=False,
    )
    add_box(bm, uv, part, (0.28, 0.20, 0.045), (0.0, 0.0, spec["roof_z"] - 0.02), PLATE)
    add_bolts(bm, uv, part, [(-0.08, -0.10, spec["roof_z"]), (0.08, -0.10, spec["roof_z"])])


def build_cable_car(bm, uv, part):
    spec = {
        "width": 3.20,
        "depth": 2.20,
        "height": 2.20,
        "roof_z": -0.90,
        "roof_rise": 0.14,
        "corner": 0.14,
        "skirt": 0.14,
        "win": (0.18, 0.84),
        "fracs": [0, 0.05, 0.12, 0.20, 0.34, 0.48, 0.62, 0.76, 0.90, 1],
    }
    hw, hd, wall_top = add_shell(bm, uv, part, spec)
    add_dome(bm, uv, part, hw, hd, spec["corner"], wall_top, spec["roof_rise"], nu=14, nv=10)
    floor = spec["roof_z"] - spec["height"]
    z0 = floor + spec["win"][0] * spec["height"]
    z1 = floor + spec["win"][1] * spec["height"]
    mid = (z0 + z1) * 0.5
    tall = z1 - z0
    add_rail(bm, uv, part, hw, hd, spec["corner"], z0, 0.028, 0.016)
    add_rail(bm, uv, part, hw, hd, spec["corner"], z1, 0.028, 0.016)
    for x in (-0.46, 0.46):
        add_mullion(bm, uv, part, (x, -hd - 0.014, mid), (0.05, 0.032, tall))
        add_mullion(bm, uv, part, (x, hd + 0.014, mid), (0.05, 0.032, tall))
    for y in (-0.36, 0.36):
        add_mullion(bm, uv, part, (-hw - 0.014, y, mid), (0.032, 0.05, tall))
        add_mullion(bm, uv, part, (hw + 0.014, y, mid), (0.032, 0.05, tall))
    add_rail(bm, uv, part, hw * 0.96, hd * 0.96, spec["corner"], floor + 0.07, 0.04, 0.0)
    add_rail(bm, uv, part, hw * 0.90, hd * 0.86, spec["corner"], wall_top + 0.045, 0.02, 0.0)
    add_grip(bm, uv, part, 0.12, 0.22, 0.024)
    add_box(bm, uv, part, (0.42, 0.26, 0.20), (0.0, 0.0, -0.16), PLATE)
    for sign in (-1, 1):
        add_tube(
            bm, uv, part,
            [
                Vector((sign * 0.10, 0.0, -0.22)),
                Vector((sign * 0.28, 0.0, -0.48)),
                Vector((sign * 0.34, 0.0, spec["roof_z"] + 0.02)),
            ],
            0.058, 8, METAL, loop=False,
        )
        add_box(
            bm, uv, part,
            (0.16, 0.14, 0.05),
            (sign * 0.34, 0.0, spec["roof_z"] - 0.01),
            PLATE,
        )
    add_tube(
        bm, uv, part,
        [Vector((-0.28, 0.0, -0.50)), Vector((0.28, 0.0, -0.50))],
        0.04, 8, METAL, loop=False,
    )
    add_box(bm, uv, part, (0.55, 0.36, 0.10), (0.0, 0.0, spec["roof_z"] + 0.02), PLATE)
    add_bolts(
        bm, uv, part,
        [
            (-0.34, -0.08, spec["roof_z"] + 0.02),
            (0.34, -0.08, spec["roof_z"] + 0.02),
            (-0.34, 0.08, spec["roof_z"] + 0.02),
            (0.34, 0.08, spec["roof_z"] + 0.02),
        ],
    )


def finish_mesh(bm, name):
    orient_outward(bm)
    part = bm.faces.layers.int.get("part")
    for edge in bm.edges:
        codes = {f[part] for f in edge.link_faces}
        if GLASS_ID in codes and len(codes) > 1:
            edge.smooth = False
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate(clean_customdata=False)
    return mesh


def make_object(name, builder, mat):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    part = bm.faces.layers.int.new("part")
    builder(bm, uv, part)
    mesh = finish_mesh(bm, name)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(55))
    except Exception as exc:
        print("shade_auto_smooth skipped", exc)
    obj.select_set(False)
    return obj


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def bounds(obj):
    xs, ys, zs = [], [], []
    for v in obj.data.vertices:
        xs.append(v.co.x)
        ys.append(v.co.y)
        zs.append(v.co.z)
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def assert_cabin(obj, width, depth, height, roof_z):
    mesh = obj.data
    tris = triangle_count(mesh)
    x0, x1, y0, y1, z0, z1 = bounds(obj)
    w = x1 - x0
    d = y1 - y0
    mat = mesh.materials[0]
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    metallic = bsdf.inputs["Metallic"].default_value
    tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE")
    problems = []
    if tris > 4000 or tris < 900:
        problems.append(f"triangles {tris}")
    if not (width - 0.12 <= w <= width + 0.18):
        problems.append(f"width {w:.3f}")
    if not (depth - 0.12 <= d <= depth + 0.18):
        problems.append(f"depth {d:.3f}")
    floor = roof_z - height
    if z0 > floor + 0.08 or z0 < floor - 0.08:
        problems.append(f"floor {z0:.3f} expected {floor:.3f}")
    if z1 > 0.20 or z1 < 0.02:
        problems.append(f"top {z1:.3f}")
    if abs(obj.location.length) > 1e-6:
        problems.append("origin moved")
    near = [v.co.length for v in mesh.vertices if v.co.length < 0.2]
    if not near:
        problems.append("grip not at origin")
    if metallic > 0.001:
        problems.append(f"metallic {metallic}")
    if tex.image is None:
        problems.append("missing albedo")
    if any(not math.isfinite(c) for v in mesh.vertices for c in v.co):
        problems.append("non-finite")
    if any(p.area <= 0 for p in mesh.polygons):
        problems.append("zero area face")
    glass = 0
    part = mesh.attributes.get("part") if hasattr(mesh, "attributes") else None
    # Face int layer survives as an attribute named part on recent Blender, else skip.
    if part is not None:
        pass
    print(
        f"{obj.name} tris={tris} size=({w:.3f},{d:.3f}) "
        f"z=({z0:.3f},{z1:.3f}) y=({y0:.3f},{y1:.3f})"
    )
    if problems:
        raise RuntimeError(obj.name + ": " + "; ".join(problems))
    return tris, glass


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


def add_light(name, location, energy, size, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.color = color
    light.size = size
    obj = bpy.data.objects.new(name, light)
    obj.location = Vector(location)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def staging():
    add_camera("Gondola_Front", (0.0, -6.4, -1.15), (0.0, 0.0, -1.35), 48)
    add_camera("Gondola_Side", (6.6, -0.15, -1.15), (0.0, 0.0, -1.35), 48)
    add_camera("Gondola_Three", (4.2, -5.4, -0.35), (0.0, 0.0, -1.30), 42)
    add_camera("Gondola_Hang", (3.4, -5.6, 0.35), (0.0, 0.0, -1.15), 38)
    add_camera("Cable_Front", (0.0, -8.4, -1.55), (0.0, 0.0, -1.85), 48)
    add_camera("Cable_Side", (8.8, -0.2, -1.55), (0.0, 0.0, -1.85), 48)
    add_camera("Cable_Three", (5.4, -7.0, -0.45), (0.0, 0.0, -1.75), 40)
    add_camera("Cable_Hang", (4.4, -7.2, 0.55), (0.0, 0.0, -1.55), 36)

    look = (0.0, 0.0, -1.5)
    add_light("Key", (2.6, -3.4, 2.2), 220, 2.6)
    add_light("Fill", (-3.1, -2.4, -0.2), 70, 3.2, (0.86, 0.90, 1.0))
    add_light("Rim", (-1.4, 3.2, 1.2), 110, 1.8)
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

    stage = bpy.data.collections.new("Staging")
    bpy.context.scene.collection.children.link(stage)
    snow_mat = bpy.data.materials.new("snow")
    snow_mat.use_nodes = True
    snow_bsdf = next(n for n in snow_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    snow_bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.90, 0.93, 0.95)), 1)
    snow_bsdf.inputs["Roughness"].default_value = 0.92
    snow_bsdf.inputs["Metallic"].default_value = 0.0
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -5.4))
    snow = bpy.context.active_object
    snow.name = "Snow"
    snow.data.materials.append(snow_mat)
    cable_mat = bpy.data.materials.new("cable")
    cable_mat.use_nodes = True
    cable_bsdf = next(n for n in cable_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    cable_bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.22, 0.24, 0.27)), 1)
    cable_bsdf.inputs["Metallic"].default_value = 0.0
    cable_bsdf.inputs["Roughness"].default_value = 0.55
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=4.2, location=(0, 0, 0.03), vertices=12)
    cable = bpy.context.active_object
    cable.name = "Cable"
    cable.rotation_euler = (math.radians(90), 0, 0)
    cable.data.materials.append(cable_mat)
    for obj in (snow, cable):
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        stage.objects.link(obj)
        obj.hide_render = True
    return stage


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


def render_shots(stage, gondola, cable):
    scene = bpy.context.scene
    engine = pick_engine(scene)
    print("beauty engine", engine)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    bg = scene.world.node_tree.nodes.get("Background")
    shots = (
        ("gondola-front", "Gondola_Front", gondola, False),
        ("gondola-side", "Gondola_Side", gondola, False),
        ("gondola-three-quarter", "Gondola_Three", gondola, False),
        ("gondola-hang", "Gondola_Hang", gondola, True),
        ("cable-front", "Cable_Front", cable, False),
        ("cable-side", "Cable_Side", cable, False),
        ("cable-three-quarter", "Cable_Three", cable, False),
        ("cable-hang", "Cable_Hang", cable, True),
    )
    for name, cam, subject, snow in shots:
        scene.camera = bpy.data.objects[cam]
        bg.inputs[0].default_value = (0.78, 0.84, 0.88, 1) if snow else (1, 1, 1, 1)
        bg.inputs[1].default_value = 0.85 if snow else 1.0
        gondola.hide_render = subject is not gondola
        cable.hide_render = subject is not cable
        for obj in stage.objects:
            obj.hide_render = not snow
        scene.render.filepath = str(SHOT_DIR / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)
    gondola.hide_render = False
    cable.hide_render = False
    for obj in stage.objects:
        obj.hide_render = True
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0


def export_glb(objects):
    addon_utils = __import__("addon_utils")
    addon_utils.enable("io_scene_gltf2")
    for other in bpy.data.objects:
        other.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
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
    gondola = make_object("Gondola", build_gondola, mat)
    cable = make_object("CableCar", build_cable_car, mat)
    assert_cabin(gondola, 2.20, 1.80, 1.80, -0.48)
    assert_cabin(cable, 3.20, 2.20, 2.20, -0.90)
    stage = staging()
    bpy.context.scene.camera = bpy.data.objects["Gondola_Three"]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb([gondola, cable])
    render_shots(stage, gondola, cable)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("wrote", BLEND_PATH, GLB_PATH)


if __name__ == "__main__":
    main()

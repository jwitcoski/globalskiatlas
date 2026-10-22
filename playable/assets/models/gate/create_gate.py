"""One slalom pole. Durable source for playable/assets/models/gate/.

The game places two copies, 8 m apart, and drops each one onto the snow under it.
A single mesh for the pair sank the uphill flag on a pitch.

Blender Z-up. The shaft stands on Z. The flag hangs toward -X and faces +Y,
which glTF Y-up export turns into -Z (toward the skier). The left-hand copy
is yawed 180 degrees so its flag still points at the other pole.
Origin is the snow contact. The screw continues below that.
Run: blender --background --factory-startup --python create_gate.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parent
BLEND_PATH = ROOT / "gate.blend"
GLB_PATH = ROOT / "gate.glb"
ALBEDO_PATH = ROOT / "gate_albedo.png"
SHOT_DIR = ROOT / "evidence" / "beauty"

# One pole. The game puts a copy 4 m either side of the trail center.
SHAFT_R = 0.036
SHAFT_Z0 = 0.205
SHAFT_Z1 = 1.80
SIDES = 24
FLAG_W = 0.56
FLAG_H = 0.38
FLAG_Z = 1.38
GREEN = (0.22, 0.62, 0.28)
SILVER = (0.75, 0.79, 0.83)
BOOT = (0.12, 0.13, 0.14)
TEX = 256


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


def write_albedo():
    """Left third green hinge, middle silver collar, right dark boot. sRGB in the file."""
    h = w = TEX
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / (w - 1)
    n = 0.04 * np.sin(xx * 0.41) * np.cos(yy * 0.27) + 0.02 * np.sin((xx + yy) * 0.15)
    green = np.array(GREEN, dtype=np.float32)
    silver = np.array(SILVER, dtype=np.float32)
    boot = np.array(BOOT, dtype=np.float32)
    rgb[:] = green
    rgb[u > (1 / 3)] = silver
    rgb[u > (2 / 3)] = boot
    rgb *= (1.0 + n)[:, :, None]
    rgb = np.clip(rgb, 0, 1)
    img = bpy.data.images.new("gate_albedo", width=w, height=h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    buf = np.ones((h, w, 4), dtype=np.float32)
    buf[:, :, :3] = rgb
    img.pixels.foreach_set(buf.ravel())
    img.filepath_raw = str(ALBEDO_PATH)
    img.file_format = "PNG"
    img.save()
    return img


def make_material(name, image, base_srgb, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*srgb_to_linear(base_srgb), 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if image is not None:
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def orient_outward(bm):
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
        score = sum(face.normal.dot(face.calc_center_median() - center) for face in comp)
        if score < 0:
            bmesh.ops.reverse_faces(bm, faces=comp)


def tag(bm, faces, band):
    uv = bm.loops.layers.uv["UVMap"]
    u = (band + 0.5) / 3.0
    for face in faces:
        for loop in face.loops:
            loop[uv].uv = (u, (loop.vert.co.z + 0.3) / 2.3)


def add_cyl(bm, cx, cy, z0, z1, radius, sides=SIDES, segments=1, radius1=None):
    r1 = radius if radius1 is None else radius1
    rings = []
    for i in range(segments + 1):
        t = i / segments
        z = z0 + (z1 - z0) * t
        r = radius + (r1 - radius) * t
        ring = []
        for s in range(sides):
            a = 2 * math.pi * s / sides
            ring.append(bm.verts.new((cx + r * math.cos(a), cy + r * math.sin(a), z)))
        rings.append(ring)
    faces = []
    for i in range(segments):
        for s in range(sides):
            n = (s + 1) % sides
            faces.append(bm.faces.new((rings[i][s], rings[i][n], rings[i + 1][n], rings[i + 1][s])))
    return rings, faces


def add_dome(bm, ring, cx, cy, z_base, radius, rings=6):
    """Dome standing on an existing equator ring. One vertex at the pole."""
    sides = len(ring)
    prev = ring
    faces = []
    for i in range(1, rings):
        phi = (math.pi / 2) * i / (rings - 1)
        r = radius * math.cos(phi)
        z = z_base + radius * math.sin(phi)
        if i == rings - 1:
            pole = bm.verts.new((cx, cy, z))
            for s in range(sides):
                faces.append(bm.faces.new((prev[s], prev[(s + 1) % sides], pole)))
            break
        nxt = []
        for s in range(sides):
            a = 2 * math.pi * s / sides
            nxt.append(bm.verts.new((cx + r * math.cos(a), cy + r * math.sin(a), z)))
        for s in range(sides):
            n = (s + 1) % sides
            faces.append(bm.faces.new((prev[s], prev[n], nxt[n], nxt[s])))
        prev = nxt
    return faces


def add_tube(bm, pts, radius, sides=8):
    def basis(tangent):
        up = Vector((0.0, 0.0, 1.0))
        if abs(tangent.dot(up)) > 0.85:
            up = Vector((1.0, 0.0, 0.0))
        side = tangent.cross(up).normalized()
        return side, side.cross(tangent).normalized()

    rings = []
    for i, p in enumerate(pts):
        if i == 0:
            tangent = (pts[1] - pts[0]).normalized()
        elif i == len(pts) - 1:
            tangent = (pts[-1] - pts[-2]).normalized()
        else:
            tangent = (pts[i + 1] - pts[i - 1]).normalized()
        side, normal = basis(tangent)
        ring = []
        for s in range(sides):
            a = 2 * math.pi * s / sides
            ring.append(bm.verts.new(p + (side * math.cos(a) + normal * math.sin(a)) * radius))
        rings.append(ring)
    faces = []
    for i in range(len(rings) - 1):
        for s in range(sides):
            n = (s + 1) % sides
            faces.append(bm.faces.new((rings[i][s], rings[i][n], rings[i + 1][n], rings[i + 1][s])))
    for ring, center, outward in ((rings[0], pts[0], pts[0] - pts[1]), (rings[-1], pts[-1], pts[-1] - pts[-2])):
        hub = bm.verts.new(center + outward.normalized() * radius * 0.15)
        order = ring if outward.dot(pts[1] - pts[0]) < 0 else list(reversed(ring))
        for s in range(sides):
            faces.append(bm.faces.new((order[s], order[(s + 1) % sides], hub)))
    return faces


def helix(cx, cy, z0, z1, radius, turns, n):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = t * turns * math.tau
        z = z0 + (z1 - z0) * t
        pts.append(Vector((cx + radius * math.cos(a), cy + radius * math.sin(a), z)))
    return pts


def add_panel(bm, x0, x1, z0, z1, bow=0.035, nx=10, nz=7, thick=0.018):
    def sheet(sign):
        rows = []
        for j in range(nz + 1):
            v = j / nz
            row = []
            for i in range(nx + 1):
                u = i / nx
                x = x0 + (x1 - x0) * u
                z = z0 + (z1 - z0) * v
                y = sign * thick * 0.5 + bow * math.sin(math.pi * u) * math.sin(math.pi * v)
                row.append(bm.verts.new((x, y, z)))
            rows.append(row)
        faces = []
        for j in range(nz):
            for i in range(nx):
                a, b = rows[j][i], rows[j][i + 1]
                d, c = rows[j + 1][i], rows[j + 1][i + 1]
                faces.append(bm.faces.new((a, b, c, d) if sign > 0 else (a, d, c, b)))
        return rows, faces

    front, ff = sheet(1)
    back, bf = sheet(-1)

    def stitch(edge_f, edge_b, flip):
        faces = []
        for i in range(len(edge_f) - 1):
            a, b = edge_f[i], edge_f[i + 1]
            c, d = edge_b[i], edge_b[i + 1]
            faces.append(bm.faces.new((a, c, d, b) if flip else (a, b, d, c)))
        return faces

    top_f = [front[0][i] for i in range(nx + 1)]
    bot_f = [front[-1][i] for i in range(nx + 1)]
    left_f = [front[j][0] for j in range(nz + 1)]
    right_f = [front[j][-1] for j in range(nz + 1)]
    top_b = [back[0][i] for i in range(nx + 1)]
    bot_b = [back[-1][i] for i in range(nx + 1)]
    left_b = [back[j][0] for j in range(nz + 1)]
    right_b = [back[j][-1] for j in range(nz + 1)]
    hems = []
    hems += stitch(top_f, top_b, False)
    hems += stitch(bot_f, bot_b, True)
    hems += stitch(left_f, left_b, True)
    hems += stitch(right_f, right_b, False)
    return ff + bf + hems


def build():
    tint = bmesh.new()
    hard = bmesh.new()
    tint.loops.layers.uv.new("UVMap")
    hard.loops.layers.uv.new("UVMap")
    x = 0.0
    inner = -1
    rings, _shaft = add_cyl(tint, x, 0.0, SHAFT_Z0, SHAFT_Z1 - SHAFT_R, SHAFT_R, segments=10)
    add_dome(tint, rings[-1], x, 0.0, SHAFT_Z1 - SHAFT_R, SHAFT_R, rings=5)
    x_pole = x + inner * (SHAFT_R * 0.55)
    x_far = x + inner * (SHAFT_R + FLAG_W)
    z0 = FLAG_Z - FLAG_H * 0.5
    z1 = FLAG_Z + FLAG_H * 0.5
    add_panel(tint, min(x_pole, x_far), max(x_pole, x_far), z0, z1, bow=0.07)
    clip_x0 = x + inner * (SHAFT_R - 0.01)
    clip_x1 = x + inner * (SHAFT_R + 0.05)
    hw = abs(clip_x1 - clip_x0)
    box = bmesh.ops.create_cube(tint, size=1.0)
    bmesh.ops.scale(tint, verts=box["verts"], vec=(hw, 0.11, 0.045))
    bmesh.ops.translate(tint, verts=box["verts"], vec=((clip_x0 + clip_x1) * 0.5, 0.0, FLAG_Z))

    hard_faces = {0: [], 1: [], 2: []}
    for sign in (1,):
        x = 0.0
        _, boot = add_cyl(hard, x, 0.0, -0.01, 0.045, 0.05, segments=1)
        hard_faces[2] += boot
        _, cup = add_cyl(hard, x, 0.0, 0.02, 0.095, 0.058, radius1=0.05, segments=3)
        hard_faces[0] += cup
        hard_faces[1] += add_tube(hard, helix(x, 0.0, 0.09, 0.168, 0.036, 3.5, 32), 0.011, sides=8)
        _, neck = add_cyl(hard, x, 0.0, 0.09, 0.205, 0.02, segments=1)
        hard_faces[1] += neck
        _, collar = add_cyl(hard, x, 0.0, 0.168, 0.214, 0.044, radius1=0.04, segments=2)
        hard_faces[1] += collar
        hard_faces[1] += add_tube(hard, helix(x, 0.0, -0.22, 0.02, 0.046, 4.5, 40), 0.012, sides=6)

    orient_outward(tint)
    orient_outward(hard)
    for face in tint.faces:
        face.smooth = True
    for face in hard.faces:
        face.smooth = True
    tag(tint, list(tint.faces), 1)
    for band, faces in hard_faces.items():
        tag(hard, [f for f in faces if f.is_valid], band)
    return tint, hard


def finish_mesh(bm, name, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.validate(clean_customdata=False)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    me.materials.append(mat)
    for poly in me.polygons:
        poly.use_smooth = True
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "tris", tris, "verts", len(me.vertices))
    return obj, tris


def bounds(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    zs = [p.z for p in pts]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def assert_gate(tint, hard, tint_tris, hard_tris):
    total = tint_tris + hard_tris
    if not (700 <= total <= 5000):
        raise SystemExit(f"triangle count {total} outside 700-5000")
    tx0, tx1, ty0, ty1, tz0, tz1 = bounds(tint)
    hx0, hx1, _, _, hz0, hz1 = bounds(hard)
    print("tint bounds", round(tx0, 3), round(tx1, 3), round(tz0, 3), round(tz1, 3))
    print("hard bounds", round(hx0, 3), round(hx1, 3), round(hz0, 3), round(hz1, 3))
    if tz1 < 1.7 or tz0 > 0.25:
        raise SystemExit("shaft is not the 1.8 m upright")
    if tx0 > -0.4 or tx1 > 0.15:
        raise SystemExit("flag should hang off -X only")
    if hz0 > -0.15:
        raise SystemExit("screw base does not extend below the snow")
    tiny = 0
    for obj in (tint, hard):
        for poly in obj.data.polygons:
            if poly.area < 1e-10:
                tiny += 1
    if tiny:
        raise SystemExit(f"{tiny} degenerate faces")


def look_at(obj, target):
    direction = Vector(target) - obj.location
    q = direction.to_track_quat("-Z", "Z")
    # Track-to can roll 180 when the view is nearly horizontal. Keep camera +Y toward world up.
    if (q @ Vector((0.0, 1.0, 0.0))).z < 0:
        q = q @ Quaternion((0.0, 0.0, 1.0), math.pi)
    obj.rotation_euler = q.to_euler()


def staging():
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0
    key_data = bpy.data.lights.new("Key", "AREA")
    key_data.energy = 1800
    key_data.size = 8
    key = bpy.data.objects.new("Key", key_data)
    key.location = (2.5, 6.0, 6.0)
    look_at(key, (0, 0, 1))
    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 500
    fill_data.size = 10
    fill = bpy.data.objects.new("Fill", fill_data)
    fill.location = (-4.0, 3.0, 2.5)
    look_at(fill, (0, 0, 1))
    bpy.context.scene.collection.objects.link(key)
    bpy.context.scene.collection.objects.link(fill)

    snow_mat = bpy.data.materials.new("snow")
    snow_mat.use_nodes = True
    bsdf = next(n for n in snow_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.90, 0.93, 0.95)), 1)
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Metallic"].default_value = 0.0
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, 0))
    snow = bpy.context.active_object
    snow.name = "Snow"
    snow.data.materials.append(snow_mat)

    shots = {
        "front": ((-0.2, 4.4, 1.15), (-0.2, 0.0, 0.9)),
        "side": ((2.6, 2.2, 1.2), (-0.15, 0.0, 0.85)),
        "three-quarter": ((1.8, 3.2, 1.7), (-0.15, 0.0, 0.85)),
        "snow": ((0.7, 2.4, 0.38), (-0.05, 0.0, 0.45)),
    }
    for name, (loc, target) in shots.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.lens = 50
        cam = bpy.data.objects.new(name, cam_data)
        cam.location = loc
        look_at(cam, target)
        bpy.context.scene.collection.objects.link(cam)
    return snow


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


def render_shots(snow):
    scene = bpy.context.scene
    engine = pick_engine(scene)
    print("beauty engine", engine)
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    bg = scene.world.node_tree.nodes.get("Background")
    for name in ("front", "side", "three-quarter", "snow"):
        snow.hide_render = name != "snow"
        bg.inputs[0].default_value = (0.78, 0.84, 0.88, 1) if name == "snow" else (1, 1, 1, 1)
        scene.camera = bpy.data.objects[name]
        scene.render.filepath = str(SHOT_DIR / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)
    snow.hide_render = True


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
    tint_mat = make_material("GateTint", None, (1, 1, 1), 0.45)
    hard_mat = make_material("GateHardware", image, (1, 1, 1), 0.48)
    tint_bm, hard_bm = build()
    tint, tint_tris = finish_mesh(tint_bm, "GateTint", tint_mat)
    hard, hard_tris = finish_mesh(hard_bm, "GateHardware", hard_mat)
    assert_gate(tint, hard, tint_tris, hard_tris)
    snow = staging()
    export_glb([tint, hard])
    # Beauty shows the "next gate" blue. The exported material stays white.
    tint_bsdf = next(n for n in tint_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    tint_bsdf.inputs["Base Color"].default_value = (*srgb_to_linear((0.16, 0.45, 0.86)), 1)
    render_shots(snow)
    tint_bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    for obj in bpy.data.objects:
        obj.hide_render = obj.name == "Snow"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("wrote", BLEND_PATH, GLB_PATH)


if __name__ == "__main__":
    main()

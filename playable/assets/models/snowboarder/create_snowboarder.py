"""Riding-pose snowboarder. Durable source for playable/assets/models/snowboarder/.

Blender Z-up. The board runs along Y, nose toward -Y. glTF Y-up turns that nose into +Z,
which is downhill once the rider is parented to the skier group.
Origin is the snow under the middle of the board. Regular stance: left foot forward,
toes toward +X. No poles.
Run: blender --background --factory-startup --python create_snowboarder.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Quaternion, Vector

ROOT = Path(__file__).resolve().parent
BLEND_PATH = ROOT / "snowboarder.blend"
GLB_PATH = ROOT / "snowboarder.glb"
ALBEDO_PATH = ROOT / "snowboarder_albedo.png"
SHOT_DIR = ROOT / "evidence" / "beauty"

# Jacket blue matches the skier dye (blue channel leads red and green).
JACKET, PANTS, BOOT, HELMET, LENS, GLOVE, BOARD, BASE, BIND = range(9)
SRGB = {
    JACKET: (0.27, 0.40, 0.55),
    PANTS: (0.12, 0.13, 0.15),
    BOOT: (0.16, 0.17, 0.19),
    HELMET: (0.10, 0.11, 0.12),
    LENS: (0.20, 0.42, 0.48),
    GLOVE: (0.08, 0.08, 0.09),
    BOARD: (0.82, 0.18, 0.14),
    BASE: (0.14, 0.15, 0.16),
    BIND: (0.20, 0.21, 0.23),
}
TEX = 256
SIDES = 12


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
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def write_albedo():
    h = w = TEX
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / (w - 1)
    n = 0.035 * np.sin(xx * 0.37) * np.cos(yy * 0.21)
    cols = np.array([SRGB[i] for i in range(9)], dtype=np.float32)
    band = np.clip((u * 9).astype(np.int32), 0, 8)
    rgb[:] = cols[band]
    rgb *= (1.0 + n)[:, :, None]
    rgb = np.clip(rgb, 0, 1)
    img = bpy.data.images.new("snowboarder_albedo", width=w, height=h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    buf = np.ones((h, w, 4), dtype=np.float32)
    buf[:, :, :3] = rgb
    img.pixels.foreach_set(buf.ravel())
    img.filepath_raw = str(ALBEDO_PATH)
    img.file_format = "PNG"
    img.save()
    return img


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


class Build:
    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.tag = self.bm.faces.layers.int.new("tag")

    def face(self, verts, tag):
        f = self.bm.faces.new(tuple(verts))
        f[self.tag] = tag
        f.smooth = True
        return f

    def capsule(self, a, b, r0, r1, tag, sides=SIDES):
        a = Vector(a)
        b = Vector(b)
        axis = b - a
        length = axis.length
        if length < 1e-5:
            return
        direction = axis / length
        up = Vector((0.0, 0.0, 1.0))
        if abs(direction.dot(up)) > 0.85:
            up = Vector((1.0, 0.0, 0.0))
        side = direction.cross(up).normalized()
        normal = side.cross(direction).normalized()

        def ring(center, radius):
            verts = []
            for i in range(sides):
                ang = 2 * math.pi * i / sides
                verts.append(self.bm.verts.new(center + side * math.cos(ang) * radius + normal * math.sin(ang) * radius))
            return verts

        rings = [ring(a, r0), ring(b, r1)]
        for i in range(sides):
            n = (i + 1) % sides
            self.face((rings[0][i], rings[0][n], rings[1][n], rings[1][i]), tag)
        for center, verts, outward in ((a, rings[0], -direction), (b, rings[1], direction)):
            hub = self.bm.verts.new(center + outward * (r0 if outward.dot(direction) < 0 else r1) * 0.35)
            order = verts if outward.dot(direction) > 0 else list(reversed(verts))
            for i in range(sides):
                self.face((order[i], order[(i + 1) % sides], hub), tag)

    def sphere(self, center, radius, tag, seg=12, rings=8):
        center = Vector(center)
        prev = None
        for j in range(rings + 1):
            phi = math.pi * j / rings
            z = math.cos(phi) * radius
            r = math.sin(phi) * radius
            if j == 0 or j == rings:
                ring = [self.bm.verts.new(center + Vector((0, 0, z)))]
            else:
                ring = []
                for i in range(seg):
                    ang = 2 * math.pi * i / seg
                    ring.append(self.bm.verts.new(center + Vector((math.cos(ang) * r, math.sin(ang) * r, z))))
            if prev is not None:
                if len(prev) == 1:
                    for i in range(seg):
                        self.face((prev[0], ring[i], ring[(i + 1) % seg]), tag)
                elif len(ring) == 1:
                    for i in range(seg):
                        self.face((prev[i], prev[(i + 1) % seg], ring[0]), tag)
                else:
                    for i in range(seg):
                        n = (i + 1) % seg
                        self.face((prev[i], prev[n], ring[n], ring[i]), tag)
            prev = ring

    def box(self, center, size, tag, rot=None):
        c = Vector(center)
        hx, hy, hz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
        corners = []
        for x in (-hx, hx):
            for y in (-hy, hy):
                for z in (-hz, hz):
                    p = Vector((x, y, z))
                    if rot:
                        p = rot @ p
                    corners.append(self.bm.verts.new(c + p))
        # corner index: x 0/1, y 0/1, z 0/1 -> i = x*4 + y*2 + z
        def ix(x, y, z):
            return x * 4 + y * 2 + z
        quads = (
            (0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1),
            (1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0),
            (0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0),
            (0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1),
            (0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0),
            (0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1),
        )
        for q in quads:
            self.face(tuple(corners[ix(q[i], q[i + 1], q[i + 2])] for i in range(0, 12, 3)), tag)

    def board(self):
        nu, nv = 16, 5
        length, waist = 1.54, 0.25
        top = []
        bot = []
        for i in range(nu + 1):
            t = i / nu
            y = 0.70 - t * length
            sidecut = 0.90 + 0.16 * (2 * t - 1) ** 2
            nose = 1.0 + 0.08 * max(0.0, t - 0.82) / 0.18
            half = waist * 0.5 * sidecut * nose
            rocker = 0.055 * ((t - 0.42) ** 2)
            z = 0.018 + rocker
            top.append([])
            bot.append([])
            for j in range(nv + 1):
                x = -half + (2 * half) * j / nv
                top[-1].append(self.bm.verts.new((x, y, z + 0.012)))
                bot[-1].append(self.bm.verts.new((x, y, z)))
        for i in range(nu):
            for j in range(nv):
                self.face((top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j]), BOARD)
                self.face((bot[i][j], bot[i + 1][j], bot[i + 1][j + 1], bot[i][j + 1]), BASE)
        for i in range(nu):
            self.face((top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]), BASE)
            self.face((top[i][-1], bot[i][-1], bot[i + 1][-1], top[i + 1][-1]), BASE)
        for j in range(nv):
            self.face((top[0][j], bot[0][j], bot[0][j + 1], top[0][j + 1]), BASE)
            self.face((top[-1][j], top[-1][j + 1], bot[-1][j + 1], bot[-1][j]), BASE)

    def finish(self):
        orient_outward(self.bm)
        for face in self.bm.faces:
            u = (face[self.tag] + 0.5) / 9.0
            for loop in face.loops:
                loop[self.uv].uv = (u, (loop.vert.co.z + 0.2) / 2.0)
        for face in self.bm.faces:
            face.smooth = True
        return self.bm


def rider(build):
    """Regular stance. Lead foot is the left foot, toward the nose (-Y). Toes point +X."""
    build.board()
    # Bindings and soft boots. Boot length is the foot, along +X.
    feet = ((-0.16, True), (0.30, False))
    ankles = []
    for y, lead in feet:
        build.box((0.0, y, 0.055), (0.12, 0.20, 0.045), BIND)
        build.box((0.02, y - 0.02, 0.11), (0.10, 0.16, 0.07), BIND)
        build.capsule((0.02, y, 0.09), (0.22, y, 0.11), 0.055, 0.048, BOOT)
        build.capsule((0.04, y, 0.16), (0.04, y, 0.30), 0.07, 0.055, BOOT)
        ankles.append(Vector((0.04, y, 0.28)))
    lead_ankle, rear_ankle = ankles
    lead_knee = Vector((0.10, -0.02, 0.58))
    rear_knee = Vector((0.06, 0.16, 0.56))
    lead_hip = Vector((0.09, 0.02, 0.86))
    rear_hip = Vector((-0.07, 0.10, 0.84))
    build.capsule(lead_ankle, lead_knee, 0.055, 0.065, PANTS)
    build.capsule(rear_ankle, rear_knee, 0.055, 0.065, PANTS)
    build.capsule(lead_knee, lead_hip, 0.07, 0.085, PANTS)
    build.capsule(rear_knee, rear_hip, 0.07, 0.085, PANTS)
    build.capsule(lead_hip, rear_hip, 0.09, 0.09, PANTS)
    chest = Vector((0.04, -0.06, 1.12))
    neck = Vector((0.02, -0.10, 1.32))
    build.capsule((lead_hip + rear_hip) * 0.5, chest, 0.13, 0.15, JACKET)
    build.capsule(chest, neck, 0.14, 0.07, JACKET)
    head = Vector((0.01, -0.12, 1.46))
    build.sphere(head, 0.115, HELMET, seg=14, rings=8)
    build.capsule(neck, head + Vector((0, 0, -0.08)), 0.045, 0.05, JACKET)
    # Goggles on the downhill face.
    build.box(head + Vector((0.0, -0.09, -0.01)), (0.16, 0.04, 0.055), LENS)
    # Shoulders a little open toward the toes, lead arm downhill, rear arm out.
    shoulder_l = neck + Vector((0.02, -0.04, -0.02))
    shoulder_r = neck + Vector((-0.16, 0.06, -0.04))
    build.capsule(shoulder_l, shoulder_r, 0.07, 0.07, JACKET)
    elbow_l = Vector((0.08, -0.34, 1.08))
    hand_l = Vector((0.04, -0.52, 0.96))
    elbow_r = Vector((-0.28, 0.18, 1.08))
    hand_r = Vector((-0.36, 0.36, 0.98))
    build.capsule(shoulder_l, elbow_l, 0.055, 0.048, JACKET)
    build.capsule(elbow_l, hand_l, 0.045, 0.04, JACKET)
    build.capsule(shoulder_r, elbow_r, 0.055, 0.048, JACKET)
    build.capsule(elbow_r, hand_r, 0.045, 0.04, JACKET)
    build.sphere(hand_l, 0.045, GLOVE, seg=8, rings=6)
    build.sphere(hand_r, 0.045, GLOVE, seg=8, rings=6)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    q = direction.to_track_quat("-Z", "Z")
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
    key_data.energy = 400
    key_data.size = 3
    key = bpy.data.objects.new("Key", key_data)
    key.location = (1.6, -2.4, 2.4)
    look_at(key, (0, 0, 0.9))
    bpy.context.scene.collection.objects.link(key)
    shots = {
        "front": ((0.15, -3.4, 1.05), (0.0, 0.0, 0.85)),
        "side": ((2.8, 0.1, 1.05), (0.0, 0.0, 0.8)),
        "three-quarter": ((1.8, -2.4, 1.35), (0.0, 0.0, 0.75)),
    }
    for name, (loc, target) in shots.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.lens = 48
        cam = bpy.data.objects.new(name, cam_data)
        cam.location = loc
        look_at(cam, target)
        bpy.context.scene.collection.objects.link(cam)


def assert_rider(obj, tris):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    zs = [p.z for p in pts]
    ys = [p.y for p in pts]
    print("bounds y", round(min(ys), 3), round(max(ys), 3), "z", round(min(zs), 3), round(max(zs), 3), "tris", tris)
    if not (1200 <= tris <= 9000):
        raise SystemExit(f"triangle count {tris}")
    if max(zs) < 1.35 or max(zs) > 1.75:
        raise SystemExit("head height is off a crouched adult")
    if min(zs) > 0.02:
        raise SystemExit("board does not meet the snow")
    if max(ys) - min(ys) < 1.4:
        raise SystemExit("board is short")


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


def render_shots():
    scene = bpy.context.scene
    engines = {i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if name in engines:
            scene.render.engine = name
            break
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 24
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.image_settings.file_format = "PNG"
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    for name in ("front", "side", "three-quarter"):
        scene.camera = bpy.data.objects[name]
        scene.render.filepath = str(SHOT_DIR / f"{name}.png")
        bpy.ops.render.render(write_still=True)


def main():
    reset_scene()
    image = write_albedo()
    mat = bpy.data.materials.new("Snowboarder")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Roughness"].default_value = 0.62
    bsdf.inputs["Metallic"].default_value = 0.0
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    build = Build()
    rider(build)
    bm = build.finish()
    me = bpy.data.meshes.new("Snowboarder")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("Snowboarder", me)
    bpy.context.scene.collection.objects.link(obj)
    me.materials.append(mat)
    for poly in me.polygons:
        poly.use_smooth = True
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    assert_rider(obj, tris)
    staging()
    export_glb(obj)
    render_shots()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("wrote", BLEND_PATH, GLB_PATH)


if __name__ == "__main__":
    main()

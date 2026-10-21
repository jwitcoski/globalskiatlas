"""Chairlift tower. Durable source for playable/assets/models/lift/.

Blender Z-up. The cable runs along Y. Sheave tops sit at CABLE_Z so the
game cable (radius 0.07, centered on the lift height) rests on the wheels.
Ground is Z=0. Export glTF Y-up: cable becomes +Z, height becomes Y.
Run: blender --background --factory-startup --python create_tower.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent
BLEND_PATH = ROOT / "tower.blend"
GLB_PATH = ROOT / "tower.glb"
ALBEDO_PATH = ROOT / "tower_albedo.png"
SHOT_DIR = ROOT / "evidence" / "tower"

# Matches AERIAL_HEIGHT in lift-graphics.js. Other lifts scale this mesh.
CABLE_Z = 10.5
CABLE_R = 0.07
WHEEL_R = 0.22
STEEL = (107 / 255, 119 / 255, 133 / 255)
RUBBER = (28 / 255, 30 / 255, 34 / 255)
CONCRETE = (138 / 255, 140 / 255, 136 / 255)
TEX = 512


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    scene.frame_start = 1
    scene.frame_end = 1
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0


def write_albedo():
    h = w = TEX
    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / (w - 1)
    v = yy / (h - 1)
    n = np.sin(xx * 0.31) * np.cos(yy * 0.19) + 0.35 * np.sin(xx * 1.3 + yy * 0.7)
    steel = np.array(STEEL, dtype=np.float32)
    rubber = np.array(RUBBER, dtype=np.float32)
    concrete = np.array(CONCRETE, dtype=np.float32)
    rgb = np.empty((h, w, 3), dtype=np.float32)
    steel_band = v < 0.55
    concrete_band = (v >= 0.55) & (v < 0.78)
    rgb[steel_band] = steel * (0.96 + 0.06 * n)[steel_band, None]
    rgb[concrete_band] = concrete * (0.94 + 0.08 * n)[concrete_band, None]
    rgb[v >= 0.78] = rubber * (0.9 + 0.12 * n)[v >= 0.78, None]
    # Bolt heads in the upper-right of the steel band.
    bu = ((u - 0.55) / 0.45) % 1
    bv = (v / 0.55) % 1
    rad = np.sqrt((bu - 0.5) ** 2 + (bv - 0.5) ** 2)
    bolts = steel_band & (u > 0.55) & (rad < 0.22)
    rgb[bolts] *= 0.72
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    img = bpy.data.images.new("tower_albedo", w, h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = str(ALBEDO_PATH)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def make_material(image):
    mat = bpy.data.materials.new("tower_albedo")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.68
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def region(kind, su, sv):
    su = min(max(su, 0.0), 1.0)
    sv = min(max(sv, 0.0), 1.0)
    if kind == "rubber":
        return 0.05 + 0.9 * su, 0.82 + 0.14 * sv
    if kind == "concrete":
        return 0.05 + 0.9 * su, 0.58 + 0.16 * sv
    if kind == "plate":
        return 0.58 + 0.38 * su, 0.06 + 0.42 * sv
    return 0.04 + 0.48 * su, 0.06 + 0.42 * sv


def tag_all(bm):
    for vert in bm.verts:
        vert.tag = True


def uv_new(bm, uv, faces, kind):
    for face in faces:
        for loop in face.loops:
            loop[uv].uv = region(kind, 0.3, 0.4)


def new_faces(bm, before):
    return [face for face in bm.faces if face not in before]


def add_cone(bm, uv, radius_bottom, radius_top, depth, location, kind, segments=10):
    tag_all(bm)
    before = set(bm.faces)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        segments=segments,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
    )
    verts = [vert for vert in bm.verts if not vert.tag]
    bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(location))
    faces = new_faces(bm, before)
    uv_new(bm, uv, faces, kind)
    return faces


def add_box(bm, uv, dims, location, kind, bevel=0.0):
    # bmesh bevel clears BMVert.tag, so identity — not the tag — owns this box.
    prior = set(bm.verts)
    before = set(bm.faces)
    bmesh.ops.create_cube(bm, size=1.0)
    verts = [vert for vert in bm.verts if vert not in prior]
    for vert in verts:
        vert.co.x *= dims[0]
        vert.co.y *= dims[1]
        vert.co.z *= dims[2]
    if bevel > 0:
        owned = set(verts)
        edges = [edge for edge in bm.edges if all(vert in owned for vert in edge.verts)]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=1, affect="EDGES", profile=0.5)
        verts = [vert for vert in bm.verts if vert not in prior]
    bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(location))
    faces = new_faces(bm, before)
    uv_new(bm, uv, faces, kind)
    return faces


def add_tube(bm, uv, pts, radius, kind, sides=8):
    pts = [Vector(p) for p in pts]
    if len(pts) < 2:
        return []
    tangents = []
    for i in range(len(pts)):
        if i == 0:
            tangent = pts[1] - pts[0]
        elif i == len(pts) - 1:
            tangent = pts[-1] - pts[-2]
        else:
            tangent = pts[i + 1] - pts[i - 1]
        tangents.append(tangent.normalized() if tangent.length > 1e-8 else Vector((0, 0, 1)))
    normal = Vector((1, 0, 0)) if abs(tangents[0].z) > 0.85 else Vector((0, 0, 1))
    rings = []
    prev = tangents[0]
    for point, tangent in zip(pts, tangents):
        axis = prev.cross(tangent)
        if axis.length > 1e-8:
            axis.normalize()
            normal = Matrix.Rotation(prev.angle(tangent), 4, axis) @ normal
        normal = (normal - tangent * normal.dot(tangent)).normalized()
        bitangent = tangent.cross(normal).normalized()
        ring = []
        for step in range(sides):
            angle = (step / sides) * math.tau
            vert = bm.verts.new(point + (normal * math.cos(angle) + bitangent * math.sin(angle)) * radius)
            vert.tag = True
            ring.append(vert)
        rings.append(ring)
        prev = tangent
    faces = []
    for i in range(len(rings) - 1):
        a = rings[i]
        b = rings[i + 1]
        for step in range(sides):
            nxt = (step + 1) % sides
            face = bm.faces.new((a[step], b[step], b[nxt], a[nxt]))
            face.normal_update()
            center = sum((vert.co for vert in a), Vector()) / len(a)
            if face.normal.dot(a[step].co - center) < 0:
                face.normal_flip()
            for loop in face.loops:
                loop[uv].uv = region(kind, 0.2, 0.3)
            faces.append(face)
    return faces


def add_wheel(bm, uv, center):
    """Disk in the YZ plane so the axle runs across the cable."""
    tag_all(bm)
    before = set(bm.faces)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        segments=12,
        radius1=WHEEL_R,
        radius2=WHEEL_R,
        depth=0.07,
    )
    verts = [vert for vert in bm.verts if not vert.tag]
    rot = Matrix.Rotation(math.pi / 2.0, 4, "Y")
    bmesh.ops.transform(bm, verts=verts, matrix=Matrix.Translation(center) @ rot)
    faces = new_faces(bm, before)
    uv_new(bm, uv, faces, "rubber")
    return faces


def mark_sharp(bm):
    for edge in bm.edges:
        if len(edge.link_faces) == 2:
            edge.smooth = edge.calc_face_angle(0.0) < math.radians(62)
        else:
            edge.smooth = True


def build_mesh():
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    wheel_top = CABLE_Z - CABLE_R
    wheel_z = wheel_top - WHEEL_R

    # Mast runs into the crossarm. The cable stays above the wheels.
    add_cone(bm, uv, 0.38, 0.20, 9.55, (0.0, 0.0, 4.925), "steel", segments=10)
    add_cone(bm, uv, 0.28, 0.28, 0.22, (0.0, 0.0, 9.48), "steel", segments=10)

    add_box(bm, uv, (1.45, 1.45, 0.22), (0.0, 0.0, 0.13), "concrete", bevel=0.02)
    for x in (-0.48, 0.48):
        for y in (-0.48, 0.48):
            add_cone(bm, uv, 0.05, 0.05, 0.06, (x, y, 0.30), "plate", segments=6)

    # Crossarm across the line. The cable runs along Y, through the center.
    arm_z = 9.82
    add_tube(bm, uv, [(-3.15, 0.0, arm_z), (3.15, 0.0, arm_z)], 0.10, "steel", sides=8)
    add_tube(bm, uv, [(0.0, 0.0, 8.05), (-2.35, 0.0, arm_z - 0.06)], 0.055, "steel", sides=6)
    add_tube(bm, uv, [(0.0, 0.0, 8.05), (2.35, 0.0, arm_z - 0.06)], 0.055, "steel", sides=6)

    # Cheek plates stop at the axle so the rubber crowns clear the frame.
    for x in (-0.32, 0.32):
        add_box(bm, uv, (0.04, 1.46, 0.52), (x, 0.0, 9.96), "steel", bevel=0.006)
    for y in (-0.62, -0.2, 0.2, 0.62):
        add_tube(bm, uv, [(-0.34, y, wheel_z), (0.34, y, wheel_z)], 0.026, "steel", sides=6)
        add_wheel(bm, uv, (0.0, y, wheel_z))

    # Ladder climbs the off-line face and meets a grate under the arm.
    add_box(bm, uv, (0.04, 0.04, 9.5), (-0.20, 0.46, 4.85), "steel")
    add_box(bm, uv, (0.04, 0.04, 9.5), (0.20, 0.46, 4.85), "steel")
    z = 0.85
    while z < 9.45:
        add_box(bm, uv, (0.42, 0.03, 0.032), (0.0, 0.46, z), "steel")
        z += 0.62
    add_box(bm, uv, (0.7, 0.42, 0.035), (0.0, 0.52, 9.58), "steel")

    mark_sharp(bm)
    mesh = bpy.data.meshes.new("Tower")
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def shade(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(62))
    except Exception as exc:
        print("shade_auto_smooth skipped", exc)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, location, target, lens):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_start = 0.05
    cam.clip_end = 200
    obj = bpy.data.objects.new(name, cam)
    obj.location = Vector(location)
    bpy.context.scene.collection.objects.link(obj)
    look_at(obj, target)
    return obj


def add_light(name, location, energy, size):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.size = size
    obj = bpy.data.objects.new(name, light)
    obj.location = Vector(location)
    bpy.context.scene.collection.objects.link(obj)
    look_at(obj, (0.0, 0.0, 6.0))
    return obj


def staging():
    look = (0.0, 0.0, 6.2)
    add_camera("Cam_Front", (0.0, -16.5, 6.4), look, 38)
    add_camera("Cam_Side", (16.5, -0.4, 6.4), look, 38)
    add_camera("Cam_ThreeQuarter", (11.0, -12.5, 8.0), look, 34)
    add_camera("Cam_Head", (3.2, -4.6, 11.4), (0.0, 0.0, 10.1), 42)
    add_light("Key", (6.0, -8.0, 14.0), 2500, 6.0)
    add_light("Fill", (-7.0, -4.0, 8.0), 900, 8.0)
    world = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (1, 1, 1, 1)
    bg.inputs[1].default_value = 1.0
    stage = bpy.data.collections.new("Staging")
    bpy.context.scene.collection.children.link(stage)

    def park(obj):
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        stage.objects.link(obj)

    snow_mat = bpy.data.materials.new("snow")
    snow_mat.use_nodes = True
    snow_bsdf = next(n for n in snow_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    snow_bsdf.inputs["Base Color"].default_value = (0.90, 0.93, 0.95, 1)
    snow_bsdf.inputs["Roughness"].default_value = 0.92
    snow_bsdf.inputs["Metallic"].default_value = 0.0
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    snow = bpy.context.active_object
    snow.name = "Snow"
    snow.data.materials.append(snow_mat)
    cable_mat = bpy.data.materials.new("cable")
    cable_mat.use_nodes = True
    cable_bsdf = next(n for n in cable_mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    cable_bsdf.inputs["Base Color"].default_value = (0.16, 0.17, 0.19, 1)
    cable_bsdf.inputs["Metallic"].default_value = 0.0
    cable_bsdf.inputs["Roughness"].default_value = 0.55
    bpy.ops.mesh.primitive_cylinder_add(
        radius=CABLE_R, depth=8.0, location=(0, 0, CABLE_Z), vertices=8, rotation=(math.radians(90), 0, 0)
    )
    cable = bpy.context.active_object
    cable.name = "Cable"
    cable.data.materials.append(cable_mat)
    park(snow)
    park(cable)
    return stage


def triangle_count(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def assert_tower(obj):
    mesh = obj.data
    tris = triangle_count(mesh)
    zs = [vert.co.z for vert in mesh.vertices]
    xs = [vert.co.x for vert in mesh.vertices]
    mat = mesh.materials[0]
    bsdf = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    problems = []
    if not (500 <= tris <= 2500):
        problems.append(f"triangles {tris}")
    if min(zs) < -0.02 or max(zs) > CABLE_Z + 0.25:
        problems.append(f"z {min(zs):.2f} {max(zs):.2f}")
    if max(xs) - min(xs) < 5.5:
        problems.append("crossarm short")
    wheel_top = CABLE_Z - CABLE_R
    near = [vert.co.z for vert in mesh.vertices if abs(vert.co.z - wheel_top) < 0.05 and abs(vert.co.x) < 0.3]
    if len(near) < 8:
        problems.append(f"sheave tops {len(near)}")
    if bsdf.inputs["Metallic"].default_value > 0.001:
        problems.append("metallic")
    print(f"tower tris={tris} x={max(xs)-min(xs):.2f} z=({min(zs):.2f},{max(zs):.2f}) sheave={len(near)}")
    if problems:
        raise RuntimeError("; ".join(problems))
    return tris


def pick_engine(scene):
    engines = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if name in engines:
            scene.render.engine = name
            return name
    scene.render.engine = "CYCLES"
    return "CYCLES"


def render_shots(stage):
    scene = bpy.context.scene
    print("beauty engine", pick_engine(scene))
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 1400
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    SHOT_DIR.mkdir(parents=True, exist_ok=True)
    bg = scene.world.node_tree.nodes["Background"]
    shots = (
        ("front", "Cam_Front", False),
        ("side", "Cam_Side", False),
        ("three-quarter", "Cam_ThreeQuarter", False),
        ("cable", "Cam_Head", True),
    )
    for name, cam, show in shots:
        scene.camera = bpy.data.objects[cam]
        bg.inputs[0].default_value = (0.78, 0.84, 0.88, 1) if show else (1, 1, 1, 1)
        for obj in stage.objects:
            obj.hide_render = not show
        scene.render.filepath = str(SHOT_DIR / f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", scene.render.filepath)
    for obj in stage.objects:
        obj.hide_render = True


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
    tower = bpy.data.objects.new("Tower", mesh)
    bpy.context.scene.collection.objects.link(tower)
    shade(tower)
    stage = staging()
    tris = assert_tower(tower)
    bpy.context.scene.camera = bpy.data.objects["Cam_ThreeQuarter"]
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(tower)
    render_shots(stage)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print("wrote", BLEND_PATH, GLB_PATH, "tris", tris)


if __name__ == "__main__":
    main()

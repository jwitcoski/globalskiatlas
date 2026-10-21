"""Low-poly T-pose skier for Three.js.

Blender space: Z up, face and ski tips toward -Y, origin on the ground between the skis.
glTF export turns that into Y-up, which is what Three.js and glTF use.
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__ if "__file__" in dir() else __file__))),
    "playable", "assets", "models", "skier",
)

# albedo, roughness, metallic
PAL = {
    "jacket": ((0.11, 0.30, 0.52), 0.55, 0.0),
    "yoke": ((0.12, 0.13, 0.15), 0.62, 0.0),
    "pants": ((0.07, 0.075, 0.085), 0.7, 0.0),
    "boot": ((0.04, 0.042, 0.048), 0.4, 0.15),
    "helmet": ((0.03, 0.03, 0.033), 0.22, 0.35),
    "goggle": ((0.12, 0.22, 0.72), 0.06, 0.05),
    "skin": ((0.62, 0.42, 0.33), 0.5, 0.0),
    "glove": ((0.04, 0.04, 0.045), 0.6, 0.0),
    "pole": ((0.08, 0.08, 0.085), 0.3, 0.75),
    "ski": ((0.05, 0.055, 0.06), 0.32, 0.2),
    "teal": ((0.0, 0.48, 0.55), 0.28, 0.15),
    "zip": ((0.75, 0.76, 0.78), 0.2, 0.9),
}


def clear_meshes():
    for o in list(bpy.data.objects):
        if o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)


def ring(center, tangent, rx, ry, n):
    t = Vector(tangent).normalized()
    up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((0, 1, 0))
    x = t.cross(up).normalized()
    y = t.cross(x).normalized()
    c = Vector(center)
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        out.append(c + x * (math.cos(a) * rx) + y * (math.sin(a) * ry))
    return out


def add_loft(bm, sections, sides, key, uv_origin, uv_size):
    """sections: (center, rx, ry). All quads. Cylindrical UV into a tile."""
    rings = []
    nsec = len(sections)
    for i, (c, rx, ry) in enumerate(sections):
        if i == 0:
            tan = Vector(sections[1][0]) - Vector(c)
        elif i == nsec - 1:
            tan = Vector(c) - Vector(sections[i - 1][0])
        else:
            tan = Vector(sections[i + 1][0]) - Vector(sections[i - 1][0])
        rings.append([bm.verts.new(p) for p in ring(c, tan, rx, ry, sides)])
    uv = bm.loops.layers.uv.verify()
    mat = bm.faces.layers.int.get("pal") or bm.faces.layers.int.new("pal")
    keys = list(PAL)
    idx = keys.index(key)
    u0, v0 = uv_origin
    su, sv = uv_size
    for i in range(nsec - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            f[mat] = idx
            loops = {l.vert: l for l in f.loops}
            for vert, ku, vi in (
                (rings[i][k], k, i),
                (rings[i][k2], k + 1, i),
                (rings[i + 1][k2], k + 1, i + 1),
                (rings[i + 1][k], k, i + 1),
            ):
                loops[vert][uv].uv = (
                    u0 + (ku / sides) * su,
                    v0 + (vi / (nsec - 1)) * sv,
                )
    # caps
    for ring_vs, vcap, flip in ((rings[0], 0.0, False), (rings[-1], 1.0, True)):
        cvert = bm.verts.new(sum((v.co for v in ring_vs), Vector()) / sides)
        order = ring_vs if not flip else list(reversed(ring_vs))
        for k in range(sides):
            k2 = (k + 1) % sides
            tri = (cvert, order[k], order[k2]) if not flip else (cvert, order[k2], order[k])
            # keep quads: pair triangles. Skip odd last by a fan of tris only at caps.
            f = bm.faces.new(tri)
            f[mat] = idx
            for l in f.loops:
                l[uv].uv = (u0 + su * 0.5, v0 + sv * vcap)
    return idx


def build():
    clear_meshes()
    bm = bmesh.new()
    # torso, hips to neck. -Y is the chest.
    torso = []
    for i, (z, rx, ry, y) in enumerate((
        (0.92, 0.15, 0.11, 0.0),
        (1.05, 0.16, 0.115, -0.005),
        (1.18, 0.175, 0.12, -0.01),
        (1.32, 0.19, 0.125, -0.012),
        (1.44, 0.20, 0.12, -0.008),
        (1.52, 0.11, 0.09, 0.0),
    )):
        torso.append(((0, y, z), rx, ry))
    add_loft(bm, torso, 12, "jacket", (0.02, 0.52), (0.30, 0.40))
    # yoke band overwritten by a second loft over the shoulders
    yoke = [
        ((0, -0.006, 1.40), 0.205, 0.125),
        ((0, 0.0, 1.50), 0.16, 0.11),
    ]
    add_loft(bm, yoke, 12, "yoke", (0.34, 0.52), (0.16, 0.18))
    hood = [
        ((0, 0.06, 1.46), 0.10, 0.08),
        ((0, 0.09, 1.56), 0.12, 0.09),
        ((0, 0.05, 1.62), 0.08, 0.07),
    ]
    add_loft(bm, hood, 10, "jacket", (0.52, 0.52), (0.14, 0.22))
    face = [
        ((0, -0.02, 1.58), 0.06, 0.055),
        ((0, -0.025, 1.66), 0.068, 0.062),
        ((0, -0.01, 1.73), 0.05, 0.045),
    ]
    add_loft(bm, face, 10, "skin", (0.68, 0.52), (0.12, 0.22))
    helm = [
        ((0, 0.02, 1.60), 0.08, 0.07),
        ((0, 0.015, 1.70), 0.095, 0.085),
        ((0, 0.0, 1.78), 0.055, 0.045),
    ]
    add_loft(bm, helm, 12, "helmet", (0.82, 0.52), (0.14, 0.28))
    gog = [
        ((-0.075, -0.07, 1.64), 0.012, 0.022),
        ((0.0, -0.095, 1.645), 0.016, 0.028),
        ((0.075, -0.07, 1.64), 0.012, 0.022),
    ]
    add_loft(bm, gog, 8, "goggle", (0.52, 0.78), (0.20, 0.12))
    zip_s = [
        ((0, -0.13, 1.48), 0.008, 0.004),
        ((0, -0.14, 1.18), 0.008, 0.004),
    ]
    add_loft(bm, zip_s, 6, "zip", (0.74, 0.78), (0.08, 0.14))

    def arm(sign, u):
        secs = [
            ((sign * 0.20, 0.0, 1.46), 0.05, 0.045),
            ((sign * 0.38, 0.0, 1.46), 0.042, 0.04),
            ((sign * 0.56, 0.0, 1.46), 0.038, 0.034),
            ((sign * 0.74, 0.0, 1.46), 0.032, 0.03),
        ]
        add_loft(bm, secs[:2], 8, "yoke", (u, 0.78), (0.10, 0.14))
        add_loft(bm, secs[1:], 8, "jacket", (u, 0.62), (0.14, 0.14))
        hand = [
            ((sign * 0.76, -0.01, 1.45), 0.028, 0.024),
            ((sign * 0.84, -0.02, 1.44), 0.026, 0.022),
        ]
        add_loft(bm, hand, 8, "glove", (u, 0.48), (0.08, 0.10))
        pole = [
            ((sign * 0.84, -0.02, 1.40), 0.008, 0.008),
            ((sign * 0.84, -0.02, 0.70), 0.006, 0.006),
            ((sign * 0.84, -0.02, 0.08), 0.004, 0.004),
        ]
        add_loft(bm, pole, 6, "pole", (u, 0.28), (0.06, 0.16))

    arm(-1, 0.02)
    arm(1, 0.20)

    def leg(sign, u):
        thigh = [
            ((sign * 0.09, 0.0, 0.98), 0.08, 0.075),
            ((sign * 0.09, 0.0, 0.72), 0.07, 0.065),
            ((sign * 0.09, 0.0, 0.52), 0.058, 0.055),
        ]
        add_loft(bm, thigh, 10, "pants", (u, 0.28), (0.12, 0.18))
        shin = [
            ((sign * 0.09, 0.0, 0.50), 0.055, 0.05),
            ((sign * 0.09, 0.0, 0.28), 0.045, 0.042),
            ((sign * 0.09, -0.02, 0.16), 0.04, 0.038),
        ]
        add_loft(bm, shin, 10, "pants", (u, 0.08), (0.12, 0.16))
        boot = [
            ((sign * 0.09, -0.02, 0.18), 0.05, 0.055),
            ((sign * 0.09, -0.06, 0.10), 0.05, 0.07),
            ((sign * 0.09, -0.16, 0.06), 0.04, 0.04),
        ]
        add_loft(bm, boot, 8, "boot", (u + 0.14, 0.08), (0.12, 0.16))
        ski = []
        for i in range(16):
            t = i / 15
            y = 0.35 - t * 1.55
            z = 0.012 + max(0.0, t - 0.86) ** 2 * 0.7
            w = 0.045 * (1.0 - 0.35 * max(0.0, (t - 0.9) / 0.1))
            ski.append(((sign * 0.11, y, z), w, 0.006))
        add_loft(bm, ski, 6, "ski", (u, 0.02), (0.18, 0.05))
        edge = []
        for i in range(12):
            t = i / 11
            y = 0.30 - t * 1.35
            edge.append(((sign * 0.11, y, 0.02), 0.048, 0.002))
        add_loft(bm, edge, 4, "teal", (u + 0.14, 0.02), (0.12, 0.04))

    leg(-1, 0.36)
    leg(1, 0.62)

    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new("Skier")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("Skier", me)
    bpy.context.scene.collection.objects.link(obj)

    # ground the ski soles on z=0 and center X
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]
    dx = -(min(xs) + max(xs)) * 0.5
    dz = -min(zs)
    for v in me.vertices:
        v.co.x += dx
        v.co.z += dz
    me.update()
    obj.location = (0, 0, 0)

    mat = bpy.data.materials.get("SkierPBR") or bpy.data.materials.new("SkierPBR")
    mat.use_nodes = True
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def paint_maps(obj):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.verify()
    pal = bm.faces.layers.int.get("pal")
    keys = list(PAL)
    size = 1024
    import numpy as np
    albedo = np.zeros((size, size, 4), dtype=np.float32)
    rough = np.ones((size, size, 4), dtype=np.float32)
    metal = np.zeros((size, size, 4), dtype=np.float32)
    normal = np.zeros((size, size, 4), dtype=np.float32)
    normal[..., 0] = 0.5
    normal[..., 1] = 0.5
    normal[..., 2] = 1.0
    normal[..., 3] = 1.0
    albedo[..., 3] = 1.0
    rough[..., 3] = 1.0
    metal[..., 3] = 1.0

    def fill_tri(img, pts, rgba):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        minx, maxx = max(0, int(min(xs))), min(size - 1, int(max(xs)) + 1)
        miny, maxy = max(0, int(min(ys))), min(size - 1, int(max(ys)) + 1)
        if maxx <= minx or maxy <= miny:
            return
        # barycentric
        (x1, y1), (x2, y2), (x3, y3) = pts
        den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
        if abs(den) < 1e-8:
            return
        for y in range(miny, maxy + 1):
            for x in range(minx, maxx + 1):
                a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / den
                b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / den
                c = 1 - a - b
                if a >= -0.01 and b >= -0.01 and c >= -0.01:
                    img[y, x] = rgba

    for f in bm.faces:
        key = keys[f[pal]] if pal else "jacket"
        col, r, m = PAL[key]
        loops = list(f.loops)
        pts = [(l[uv_layer].uv.x * (size - 1), l[uv_layer].uv.y * (size - 1)) for l in loops]
        if len(pts) == 4:
            tris = (pts[0], pts[1], pts[2]), (pts[0], pts[2], pts[3])
        else:
            tris = (tuple(pts[:3]),)
        for tri in tris:
            fill_tri(albedo, tri, (col[0], col[1], col[2], 1))
            fill_tri(rough, tri, (r, r, r, 1))
            fill_tri(metal, tri, (m, m, m, 1))
    bm.free()

    def img(name, arr):
        old = bpy.data.images.get(name)
        if old:
            bpy.data.images.remove(old)
        im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
        im.colorspace_settings.name = "Non-Color" if name != "skier_albedo" else "sRGB"
        im.pixels.foreach_set(arr.reshape(-1).tolist())
        os.makedirs(OUT_DIR, exist_ok=True)
        im.filepath_raw = os.path.join(OUT_DIR, name + ".png")
        im.file_format = "PNG"
        im.save()
        return im

    # numpy image is bottom-left origin matching Blender pixels if we flip
    albedo = np.flipud(albedo)
    rough = np.flipud(rough)
    metal = np.flipud(metal)
    normal = np.flipud(normal)
    a = img("skier_albedo", albedo)
    r = img("skier_roughness", rough)
    n = img("skier_normal", normal)
    m = img("skier_metallic", metal)

    nt = bpy.data.materials["SkierPBR"].node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex_a = nt.nodes.new("ShaderNodeTexImage")
    tex_r = nt.nodes.new("ShaderNodeTexImage")
    tex_n = nt.nodes.new("ShaderNodeTexImage")
    tex_m = nt.nodes.new("ShaderNodeTexImage")
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    tex_a.image = a
    tex_r.image = r
    tex_n.image = n
    tex_m.image = m
    for t in (tex_r, tex_n, tex_m):
        t.image.colorspace_settings.name = "Non-Color"
    nt.links.new(tex_a.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex_r.outputs["Color"], bsdf.inputs["Roughness"])
    nt.links.new(tex_m.outputs["Color"], bsdf.inputs["Metallic"])
    nt.links.new(tex_n.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    out.location = (400, 0)
    bsdf.location = (100, 0)


def export(obj):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "skier.glb")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format="AUTO",
    )
    me = obj.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    print("TRIS", tris, "VERTS", len(me.vertices), "PATH", path)
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            area.spaces[0].shading.type = "MATERIAL"
            area.spaces[0].shading.use_scene_lights = True


if __name__ == "__main__":
    o = build()
    paint_maps(o)
    export(o)

"""Game-ready alpine skier. Durable source for playable/assets/models/skier/.

Blender Z up, character faces -Y, origin on the ground between the skis.
Run: blender --background --factory-startup --python create_skier.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
TEX_DIR = ROOT / "textures"
BLEND_PATH = ROOT / "skier.blend"
GLB_PATH = ROOT / "skier.glb"

HEIGHT = 1.80
STANCE = 0.148
N_BODY = 20
N_LEG = 16
N_ARM = 12
TEX = 2048

JACKET, YOKE, PANTS, BOOT, BUCKLE, HELMET, LENS, FRAME, GLOVE, SKIN = range(1, 11)
SKI_TOP, SKI_EDGE, SKI_BASE, POLE, GRIP, METAL = range(11, 17)

# Authored sRGB. Lighting is allowed to shade these; they are not baked AO.
SRGB = {
    JACKET: (0.27, 0.40, 0.55),
    YOKE: (0.29, 0.30, 0.31),
    PANTS: (0.10, 0.10, 0.11),
    BOOT: (0.07, 0.07, 0.075),
    BUCKLE: (0.55, 0.56, 0.57),
    HELMET: (0.08, 0.08, 0.085),
    LENS: (0.16, 0.28, 0.55),
    FRAME: (0.05, 0.05, 0.055),
    GLOVE: (0.08, 0.08, 0.08),
    SKIN: (0.45, 0.34, 0.28),
    SKI_TOP: (0.07, 0.075, 0.08),
    SKI_EDGE: (0.05, 0.48, 0.50),
    SKI_BASE: (0.12, 0.12, 0.13),
    POLE: (0.16, 0.16, 0.17),
    GRIP: (0.10, 0.10, 0.10),
    METAL: (0.45, 0.46, 0.47),
}
ROUGH = {
    JACKET: 0.72, YOKE: 0.68, PANTS: 0.64, BOOT: 0.48, BUCKLE: 0.28,
    HELMET: 0.42, LENS: 0.16, FRAME: 0.38, GLOVE: 0.70, SKIN: 0.55,
    SKI_TOP: 0.38, SKI_EDGE: 0.32, SKI_BASE: 0.58, POLE: 0.34, GRIP: 0.62,
    METAL: 0.24,
}
METALNESS = {
    JACKET: 0.0, YOKE: 0.0, PANTS: 0.0, BOOT: 0.0, BUCKLE: 0.85,
    HELMET: 0.0, LENS: 0.08, FRAME: 0.0, GLOVE: 0.0, SKIN: 0.0,
    SKI_TOP: 0.0, SKI_EDGE: 0.12, SKI_BASE: 0.0, POLE: 0.08, GRIP: 0.0,
    METAL: 0.9,
}


def srgb_to_linear(rgb):
    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in rgb)


LINEAR = {k: srgb_to_linear(v) for k, v in SRGB.items()}


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 2
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = 0.0
    try:
        scene.cycles.device = "CPU"
    except TypeError:
        pass


class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.reg = self.bm.faces.layers.int.new("region")
        self.grp = self.bm.faces.layers.string.new("uv_group")
        self.orient = []

    def vert(self, co):
        return self.bm.verts.new(Vector(co))

    def face(self, verts, region, group):
        f = self.bm.faces.new(tuple(verts))
        f[self.reg] = region
        f[self.grp] = group.encode()
        f.smooth = True
        return f

    def ring(self, center, side, depth, rw, rd, n):
        verts = []
        for i in range(n):
            a = -math.pi / 2.0 + (2.0 * math.pi * i) / n
            p = (
                Vector(center)
                + Vector(side) * (math.cos(a) * rw)
                + Vector(depth) * (math.sin(a) * rd)
            )
            verts.append(self.vert(p))
        return verts

    def bridge(self, ring_a, ring_b, region, group):
        faces = []
        n = len(ring_a)
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.face((ring_a[i], ring_a[j], ring_b[j], ring_b[i]), region, group))
        return faces

    def tag_orient(self, faces, centers):
        self.orient.append((faces, [Vector(c) for c in centers]))


def frames_along(points, up_hint=Vector((0.0, 1.0, 0.0))):
    """Parallel-transport a side axis. depth × side stays aligned with the tangent."""
    pts = [Vector(p) for p in points]
    out = []
    prev_side = Vector((0.0, 0.0, 1.0))
    for i, p in enumerate(pts):
        if i == 0:
            tangent = pts[1] - pts[0]
        elif i == len(pts) - 1:
            tangent = pts[-1] - pts[-2]
        else:
            tangent = pts[i + 1] - pts[i - 1]
        tangent.normalize()
        side = prev_side - tangent * prev_side.dot(tangent)
        if side.length < 1e-5:
            side = tangent.cross(Vector((1.0, 0.0, 0.0)))
            if side.length < 1e-5:
                side = tangent.cross(Vector((0.0, 0.0, 1.0)))
        side.normalize()
        depth = tangent.cross(side)
        if depth.dot(up_hint) < 0.0:
            depth.negate()
            side.negate()
        prev_side = side
        out.append((side, depth, tangent))
    return out


def loft(bld, points, radii, region, group, n, up_hint=Vector((0.0, 1.0, 0.0))):
    """radii: list of (width, depth) matching points. Returns (rings, faces)."""
    fr = frames_along(points, up_hint)
    rings = []
    for p, (rw, rd), (side, depth, _t) in zip(points, radii, fr):
        rings.append(bld.ring(p, side, depth, rw, rd, n))
    faces = []
    centers = []
    for a, b, pa, pb, (ra, rb) in zip(rings, rings[1:], points, points[1:], radii, ):
        # region may be a list aligned with segments
        faces.extend(bld.bridge(a, b, region, group))
        centers.append((Vector(pa) + Vector(pb)) * 0.5)
    bld.tag_orient(faces, centers)
    return rings, faces


def loft_regions(bld, points, radii, regions, group, n, up_hint=Vector((0.0, 1.0, 0.0))):
    """regions has one entry per segment (len = len(points) - 1)."""
    fr = frames_along(points, up_hint)
    rings = []
    for p, (rw, rd), (side, depth, _t) in zip(points, radii, fr):
        rings.append(bld.ring(p, side, depth, rw, rd, n))
    faces = []
    centers = []
    for i in range(len(rings) - 1):
        faces.extend(bld.bridge(rings[i], rings[i + 1], regions[i], group))
        centers.append((Vector(points[i]) + Vector(points[i + 1])) * 0.5)
    bld.tag_orient(faces, centers)
    return rings, faces


def orient_outward(bld):
    bld.bm.normal_update()
    for faces, centers in bld.orient:
        for f in faces:
            c = f.calc_center_median()
            best = min(centers, key=lambda p: (p - c).length_squared)
            radial = c - best
            if radial.length_squared < 1e-10:
                continue
            if f.normal.dot(radial) < 0.0:
                f.normal_flip()
    bld.bm.normal_update()


def inner_arc(verts, center, inward):
    n = len(verts)
    scores = []
    for v in verts:
        radial = v.co - Vector(center)
        radial.z = 0.0
        if radial.length < 1e-8:
            scores.append(-1.0)
        else:
            scores.append(radial.normalized().dot(inward))
    mask = [s > 0.45 for s in scores]
    doubled = mask + mask
    best = (0, 0)
    i = 0
    while i < n:
        if not doubled[i]:
            i += 1
            continue
        j = i
        while j < i + n and doubled[j]:
            j += 1
        if j - i > best[1] - best[0]:
            best = (i, j)
        i = j
    start, end = best
    if end <= start:
        raise RuntimeError("leg inner arc was empty")
    arc = [verts[k % n] for k in range(start, end)]
    if arc[0].co.y > arc[-1].co.y:
        arc.reverse()
    return arc


def walk_outer(ring, start, end, blocked):
    index = {v: i for i, v in enumerate(ring)}
    n = len(ring)
    i = index[start]
    j = index[end]

    def path(step):
        out = [ring[i]]
        k = i
        guard = 0
        while k != j:
            k = (k + step) % n
            out.append(ring[k])
            guard += 1
            if guard > n:
                break
        return out

    forward = path(1)
    backward = path(-1)

    def hits(path_verts):
        return sum(1 for v in path_verts[1:-1] if v in blocked)

    return forward if hits(forward) <= hits(backward) else backward


def build_pants(bld):
    def leg_stations(sign):
        # z, x, y, rx, ry — thigh through cuff. Feet sit on the skis.
        rows = [
            (0.86, 0.108, 0.000, 0.092, 0.086),
            (0.74, 0.112, -0.006, 0.086, 0.084),
            (0.60, 0.118, -0.010, 0.072, 0.074),
            (0.50, 0.128, -0.016, 0.062, 0.066),
            (0.38, 0.138, -0.004, 0.058, 0.060),
            (0.28, 0.146, 0.006, 0.056, 0.058),
            (0.22, 0.148, 0.010, 0.060, 0.062),
        ]
        pts, rad = [], []
        for z, x, y, rx, ry in rows:
            pts.append(Vector((sign * x, y, z)))
            rad.append((rx, ry))
        return pts, rad

    left_pts, left_rad = leg_stations(1.0)
    right_pts, right_rad = leg_stations(-1.0)
    left_rings, _ = loft(bld, left_pts, left_rad, PANTS, "leg_l", N_LEG)
    right_rings, _ = loft(bld, right_pts, right_rad, PANTS, "leg_r", N_LEG)
    top_l = left_rings[0]
    top_r = right_rings[0]
    arc_l = inner_arc(top_l, left_pts[0], Vector((-1.0, 0.0, 0.0)))
    arc_r = inner_arc(top_r, right_pts[0], Vector((1.0, 0.0, 0.0)))
    count = min(len(arc_l), len(arc_r))
    arc_l = arc_l[:count]
    arc_r = arc_r[:count]
    if count < 3:
        raise RuntimeError(f"crotch arc too short: {count}")
    seam = []
    for i in range(count - 1):
        seam.append(bld.face((arc_l[i], arc_l[i + 1], arc_r[i + 1], arc_r[i]), PANTS, "crotch"))
    # Inseam faces point down, away from a point above the crotch.
    bld.tag_orient(seam, [Vector((0.0, 0.0, 0.95))])

    blocked_l = set(arc_l)
    blocked_r = set(arc_r)
    path_l = walk_outer(top_l, arc_l[0], arc_l[-1], blocked_l)
    path_r = walk_outer(top_r, arc_r[-1], arc_r[0], blocked_r)
    # Both paths include their endpoints, so the back verts meet in the middle.
    boundary = path_l + path_r
    if boundary[0] == boundary[-1]:
        boundary = boundary[:-1]
    n = len(boundary)
    print(f"crotch arcs {count} boundary {n}")

    hip_spec = [
        (0.90, 0.185, 0.112, 0.000),
        (0.98, 0.178, 0.116, 0.008),
        (1.06, 0.168, 0.112, 0.012),
    ]
    previous = boundary
    side = Vector((1.0, 0.0, 0.0))
    depth = Vector((0.0, 1.0, 0.0))
    for z, rx, ry, y_off in hip_spec:
        ring = bld.ring(Vector((0.0, y_off, z)), side, depth, rx, ry, n)
        ring = align_ring(ring, previous)
        faces = bld.bridge(previous, ring, PANTS, "hips")
        bld.tag_orient(faces, [Vector((0.0, y_off, z))])
        previous = ring


def align_ring(ring, target):
    n = len(ring)
    if len(target) != n:
        raise RuntimeError(f"ring {n} != target {len(target)}")
    best = None
    for flip in (False, True):
        seq = list(reversed(ring)) if flip else list(ring)
        for shift in range(n):
            rot = seq[shift:] + seq[:shift]
            dist = 0.0
            for a, b in zip(rot, target):
                dist += (a.co - b.co).length_squared
            if best is None or dist < best[0]:
                best = (dist, rot)
    return best[1]


def build_jacket(bld):
    # z, half-width, half-depth, center Y (negative is toward the chest), region.
    # Chest and collar are offset so the side view has a belly, chest, and hood roll.
    spec = [
        (0.93, 0.205, 0.128, 0.012, JACKET),
        (1.02, 0.188, 0.118, 0.010, JACKET),
        (1.14, 0.176, 0.112, 0.008, JACKET),
        (1.26, 0.198, 0.142, -0.018, JACKET),
        (1.36, 0.210, 0.136, -0.010, YOKE),
        (1.46, 0.226, 0.140, 0.008, YOKE),
        (1.52, 0.128, 0.108, 0.016, JACKET),
        (1.58, 0.086, 0.092, 0.030, JACKET),
        (1.63, 0.078, 0.100, 0.038, JACKET),
    ]
    side = Vector((1.0, 0.0, 0.0))
    depth = Vector((0.0, 1.0, 0.0))
    rings = []
    for z, rx, ry, y_off, _region in spec:
        rings.append(bld.ring(Vector((0.0, y_off, z)), side, depth, rx, ry, N_BODY))
    for i in range(len(rings) - 1):
        region = spec[i + 1][4]
        group = "yoke" if region == YOKE else "jacket"
        faces = bld.bridge(rings[i], rings[i + 1], region, group)
        z = (spec[i][0] + spec[i + 1][0]) * 0.5
        bld.tag_orient(faces, [Vector((0.0, 0.0, z))])
    return spec


def build_arm(bld, sign):
    # Shoulder inside the jacket, then a slight drop to the pole.
    raw = [
        (0.10, -0.01, 1.46, 0.090, 0.078, YOKE),
        (0.20, -0.02, 1.45, 0.082, 0.074, YOKE),
        (0.34, -0.03, 1.43, 0.066, 0.060, JACKET),
        (0.48, -0.04, 1.41, 0.054, 0.050, JACKET),
        (0.62, -0.045, 1.395, 0.046, 0.042, JACKET),
        (0.70, -0.05, 1.38, 0.044, 0.036, GLOVE),
        (0.76, -0.055, 1.35, 0.040, 0.030, GLOVE),
        (0.80, -0.04, 1.32, 0.032, 0.026, GLOVE),
        (0.78, -0.02, 1.29, 0.026, 0.022, GLOVE),
    ]
    points, radii, regions = [], [], []
    for x, y, z, rw, rd, region in raw:
        points.append(Vector((sign * x, y, z)))
        radii.append((rw, rd))
    for i in range(len(raw) - 1):
        regions.append(raw[i + 1][5])
    group = "arm_l" if sign > 0 else "arm_r"
    loft_regions(bld, points, radii, regions, group, N_ARM, up_hint=Vector((0.0, 1.0, 0.0)))
    # Thumb on the forward side of the palm.
    thumb_pts = [
        Vector((sign * 0.74, -0.07, 1.36)),
        Vector((sign * 0.77, -0.085, 1.34)),
        Vector((sign * 0.79, -0.07, 1.325)),
    ]
    thumb_rad = [(0.016, 0.014), (0.014, 0.012), (0.010, 0.009)]
    loft(bld, thumb_pts, thumb_rad, GLOVE, group + "_thumb", 8)


def build_helmet(bld):
    spec = [
        (1.798, 0.028, 0.030, 0.000),
        (1.770, 0.078, 0.086, -0.004),
        (1.730, 0.108, 0.118, -0.006),
        (1.685, 0.116, 0.126, -0.004),
        (1.640, 0.112, 0.118, -0.012),
        (1.600, 0.102, 0.100, -0.028),
    ]
    side = Vector((1.0, 0.0, 0.0))
    depth = Vector((0.0, 1.0, 0.0))
    rings = [bld.ring(Vector((0.0, y, z)), side, depth, rx, ry, 16) for z, rx, ry, y in spec]
    faces = []
    for i in range(len(rings) - 1):
        faces.extend(bld.bridge(rings[i], rings[i + 1], HELMET, "helmet"))
    bld.tag_orient(faces, [Vector((0.0, 0.0, 1.70))])
    cap_edges = []
    top = rings[0]
    for i in range(len(top)):
        edge = bld.bm.edges.get((top[i], top[(i + 1) % len(top)]))
        if edge is not None:
            cap_edges.append(edge)
    try:
        result = bmesh.ops.grid_fill(bld.bm, edges=cap_edges)
        for f in result.get("faces", []):
            f[bld.reg] = HELMET
            f[bld.grp] = b"helmet"
            f.smooth = True
    except (ValueError, RuntimeError) as exc:
        print(f"helmet grid_fill failed: {exc}")
        raise


def _goggle_point(u, v, x_half, z0, z1, y_front, wrap):
    side = abs(u - 0.5) * 2.0
    x = (u - 0.5) * 2.0 * x_half
    z = z0 + v * (z1 - z0)
    y = y_front + wrap * side * side
    y -= 0.01 * math.sin(v * math.pi) * (1.0 - side)
    return (x, y, z)


def _curved_grid(bld, nu, nv, region, group, **kwargs):
    rows = []
    for j in range(nv):
        v = j / (nv - 1)
        rows.append([bld.vert(_goggle_point(i / (nu - 1), v, **kwargs)) for i in range(nu)])
    faces = []
    for j in range(nv - 1):
        for i in range(nu - 1):
            faces.append(bld.face(
                (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]),
                region, group,
            ))
    return rows, faces


def build_goggles(bld):
    # One wrapped visor. Outer quads are the black frame; the middle is the blue lens.
    nu, nv = 16, 8
    kw = dict(x_half=0.102, z0=1.598, z1=1.678, y_front=-0.162, wrap=0.08)
    rows = []
    for j in range(nv):
        v = j / (nv - 1)
        rows.append([
            bld.vert(_goggle_point(i / (nu - 1), v, **kw))
            for i in range(nu)
        ])
    faces = []
    for j in range(nv - 1):
        for i in range(nu - 1):
            border = i < 2 or j < 1 or i >= nu - 3 or j >= nv - 2
            region = FRAME if border else LENS
            group = "goggle_frame" if border else "goggle_lens"
            faces.append(bld.face(
                (rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]),
                region, group,
            ))
    # A short rearward lip so the side view has frame thickness.
    lip = []
    for j in range(nv):
        v = j / (nv - 1)
        lip.append(bld.vert(_goggle_point(
            0.0, v, x_half=0.102, z0=1.598, z1=1.678, y_front=-0.148, wrap=0.08,
        )))
        lip.append(bld.vert(_goggle_point(
            1.0, v, x_half=0.102, z0=1.598, z1=1.678, y_front=-0.148, wrap=0.08,
        )))
    side_faces = []
    for j in range(nv - 1):
        side_faces.append(bld.face((rows[j][0], rows[j + 1][0], lip[(j + 1) * 2], lip[j * 2]), FRAME, "goggle_frame"))
        side_faces.append(bld.face(
            (rows[j][-1], lip[j * 2 + 1], lip[(j + 1) * 2 + 1], rows[j + 1][-1]),
            FRAME, "goggle_frame",
        ))
    bld.tag_orient(faces, [Vector((0.0, -0.08, 1.64))])
    bld.tag_orient(side_faces, [Vector((0.0, -0.12, 1.64))])

    strap = []
    angles = [math.radians(a) for a in range(30, 331, 18)]
    bands = []
    for z, radius in ((1.615, 0.120), (1.615, 0.132), (1.655, 0.132), (1.655, 0.120)):
        ring = []
        for ang in angles:
            ring.append(bld.vert((
                math.sin(ang) * radius,
                math.cos(ang) * radius * 0.95 + 0.012,
                z,
            )))
        bands.append(ring)
    for a, b in zip(bands, bands[1:]):
        strap.extend(bld.bridge(a, b, FRAME, "strap"))
    bld.tag_orient(strap, [Vector((0.0, 0.02, 1.63))])


def build_neck(bld):
    # Gaiter inside the collar so the helmet does not float above an open neck.
    points = [
        Vector((0.0, -0.02, 1.46)),
        Vector((0.0, -0.045, 1.55)),
        Vector((0.0, -0.055, 1.62)),
    ]
    radii = [(0.070, 0.058), (0.058, 0.050), (0.046, 0.040)]
    loft(bld, points, radii, YOKE, "neck", 16, up_hint=Vector((0.0, 1.0, 0.0)))


def build_chin(bld):
    # A short jaw under the goggles, not a tube down the chest.
    points = [
        Vector((0.0, -0.078, 1.555)),
        Vector((0.0, -0.088, 1.525)),
    ]
    radii = [(0.038, 0.022), (0.028, 0.016)]
    loft(bld, points, radii, SKIN, "skin", 12, up_hint=Vector((0.0, 1.0, 0.0)))


def build_boot(bld, sign):
    x = sign * STANCE
    group = f"boot_{'l' if sign > 0 else 'r'}"
    # Foot stays horizontal so the toe does not swell into a clog. Cuff is a second shell.
    foot_pts = [
        Vector((x, -0.22, 0.040)),
        Vector((x, -0.12, 0.048)),
        Vector((x, -0.02, 0.058)),
        Vector((x, 0.09, 0.046)),
    ]
    foot_rad = [(0.040, 0.020), (0.048, 0.030), (0.050, 0.040), (0.044, 0.028)]
    foot_rings, _ = loft(bld, foot_pts, foot_rad, BOOT, group, 12)
    for ring in foot_rings:
        for v in ring:
            if v.co.z < 0.022:
                v.co.z = 0.014
    cap_end(bld, foot_rings[0], BOOT, group)
    cap_end(bld, foot_rings[-1], BOOT, group)
    cuff_pts = [
        Vector((x, 0.01, 0.07)),
        Vector((x, -0.005, 0.16)),
        Vector((x, -0.028, 0.24)),
        Vector((x, -0.048, 0.32)),
    ]
    cuff_rad = [(0.050, 0.058), (0.052, 0.062), (0.054, 0.064), (0.050, 0.058)]
    loft(bld, cuff_pts, cuff_rad, BOOT, group, 14)
    for z, y in ((0.17, -0.09), (0.23, -0.10), (0.29, -0.108)):
        buckle(bld, x, y, z, sign)


def cap_end(bld, ring, region, group):
    edges = []
    for i in range(len(ring)):
        edge = bld.bm.edges.get((ring[i], ring[(i + 1) % len(ring)]))
        if edge is not None:
            edges.append(edge)
    result = bmesh.ops.grid_fill(bld.bm, edges=edges)
    made = []
    for f in result.get("faces", []):
        f[bld.reg] = region
        f[bld.grp] = group.encode()
        f.smooth = True
        made.append(f)
    center = sum((v.co for v in ring), Vector()) / len(ring)
    bld.tag_orient(made, [center])


def buckle(bld, x, y, z, sign):
    # A short strap across the front of the cuff, plus a clasp.
    w, h, t = 0.028, 0.007, 0.004
    y0 = y
    corners = []
    for dz in (-h, h):
        row = []
        for dx in (-w, w):
            row.append(bld.vert((x + dx, y0, z + dz)))
            row.append(bld.vert((x + dx, y0 - t, z + dz)))
        corners.append(row)
    # corners are not a clean grid because each dx emitted two verts. Build an explicit box.
    # Rebuild simply:
    # Remove the accidental verts by not using `corners` — bmesh has no easy delete of unused
    # verts that are already created. Build the box from those 8 verts carefully.
    # Order per (dx, dz): index layout from the loops:
    # dz=-h: (dx=-w,y), (dx=-w,y-t), (dx=w,y), (dx=w,y-t)
    a = corners[0]
    b = corners[1]
    group = "buckle_l" if sign > 0 else "buckle_r"
    # a: 0 inner-back-low, 1 outer-low, 2 inner-back-high x, 3 outer-high x  — messy.
    # Delete this approach: the verts exist. Use them in a known order.
    v = a + b  # 8 verts
    # v[0] x-w y, v[1] x-w y-t, v[2] x+w y, v[3] x+w y-t   z-h
    # v[4] x-w y, v[5] x-w y-t, v[6] x+w y, v[7] x+w y-t   z+h
    faces = [
        (v[0], v[2], v[6], v[4]),  # back, toward cuff
        (v[1], v[5], v[7], v[3]),  # front
        (v[0], v[1], v[3], v[2]),  # bottom
        (v[4], v[6], v[7], v[5]),  # top
        (v[0], v[4], v[5], v[1]),  # -x
        (v[2], v[3], v[7], v[6]),  # +x
    ]
    made = [bld.face(face, BUCKLE, group) for face in faces]
    bld.tag_orient(made, [Vector((x, y0 - t * 0.5, z))])


def build_ski(bld, sign):
    x0 = sign * STANCE
    n_len, n_wid = 36, 8
    y_tip, y_tail = -1.02, 0.62

    def width_at(y):
        # Sidecut: wider tip and tail, narrow under the boot.
        u = (y - y_tip) / (y_tail - y_tip)
        tip, waist, tail = 0.052, 0.036, 0.048
        # Waist near the binding, around u where y=0.
        waist_u = (0.0 - y_tip) / (y_tail - y_tip)
        if u < waist_u:
            t = u / waist_u
            return tip + (waist - tip) * (t * t * (3 - 2 * t))
        t = (u - waist_u) / (1.0 - waist_u)
        return waist + (tail - waist) * (t * t * (3 - 2 * t))

    def rise_at(y):
        if y < -0.70:
            t = (-0.70 - y) / (y_tip - -0.70)
            t = max(0.0, min(1.0, t))
            s = t * t * (3 - 2 * t)
            return 0.07 * s
        if y > 0.48:
            t = (y - 0.48) / (y_tail - 0.48)
            t = max(0.0, min(1.0, t))
            return 0.016 * t * t
        return 0.0

    top, bot = [], []
    for j in range(n_len):
        v = j / (n_len - 1)
        y = y_tip + (y_tail - y_tip) * v
        half = width_at(y)
        z_rise = rise_at(y)
        top_row, bot_row = [], []
        for i in range(n_wid):
            u = i / (n_wid - 1)
            x = x0 + (-half + 2 * half * u)
            top_row.append(bld.vert((x, y, 0.012 + z_rise)))
            bot_row.append(bld.vert((x, y, z_rise)))
        top.append(top_row)
        bot.append(bot_row)

    group = "ski_l" if sign > 0 else "ski_r"
    made = []
    for j in range(n_len - 1):
        for i in range(n_wid - 1):
            outer = i == 0 or i == n_wid - 2
            region = SKI_EDGE if outer else SKI_TOP
            made.append(bld.face(
                (top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i]),
                region, group + "_top",
            ))
            made.append(bld.face(
                (bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1]),
                SKI_BASE, group + "_base",
            ))
    for j in range(n_len - 1):
        made.append(bld.face((top[j][0], bot[j][0], bot[j + 1][0], top[j + 1][0]), SKI_EDGE, group + "_side"))
        made.append(bld.face(
            (top[j][-1], top[j + 1][-1], bot[j + 1][-1], bot[j][-1]),
            SKI_EDGE, group + "_side",
        ))
    for i in range(n_wid - 1):
        made.append(bld.face((top[0][i], bot[0][i], bot[0][i + 1], top[0][i + 1]), SKI_EDGE, group + "_side"))
        made.append(bld.face(
            (top[-1][i], top[-1][i + 1], bot[-1][i + 1], bot[-1][i]),
            SKI_EDGE, group + "_side",
        ))
    # Orient from a point inside the ski body. Tip rise still has an interior.
    bld.tag_orient(made, [Vector((x0, -0.1, 0.008)), Vector((x0, 0.3, 0.008))])

    build_binding(bld, sign)


def build_binding(bld, sign):
    x = sign * STANCE
    group = "binding_l" if sign > 0 else "binding_r"

    def box(center, size, region):
        cx, cy, cz = center
        hx, hy, hz = (c * 0.5 for c in size)
        vs = []
        for iz in (-1, 1):
            for iy in (-1, 1):
                for ix in (-1, 1):
                    vs.append(bld.vert((cx + ix * hx, cy + iy * hy, cz + iz * hz)))
        # vs index: iz, iy, ix with ix fastest. 0..7
        # 0 -z -y -x, 1 -z -y +x, 2 -z +y -x, 3 -z +y +x
        # 4 +z -y -x, 5 +z -y +x, 6 +z +y -x, 7 +z +y +x
        quads = [
            (0, 1, 5, 4),
            (2, 6, 7, 3),
            (0, 4, 6, 2),
            (1, 3, 7, 5),
            (0, 2, 3, 1),
            (4, 5, 7, 6),
        ]
        made = [bld.face(tuple(vs[i] for i in q), region, group) for q in quads]
        bld.tag_orient(made, [Vector(center)])

    box((x, -0.17, 0.026), (0.055, 0.04, 0.018), BOOT)
    box((x, 0.11, 0.032), (0.048, 0.036, 0.028), BOOT)
    box((x - sign * 0.038, 0.10, 0.026), (0.006, 0.05, 0.014), BOOT)
    box((x + sign * 0.038, 0.10, 0.026), (0.006, 0.05, 0.014), BOOT)


def build_pole(bld, sign):
    x = sign * 0.785
    points = [
        Vector((x, -0.02, 0.02)),
        Vector((x, -0.02, 0.09)),
        Vector((x, -0.02, 0.12)),
        Vector((x, -0.02, 1.28)),
        Vector((x, -0.02, 1.46)),
    ]
    radii = [(0.003, 0.003), (0.004, 0.004), (0.0065, 0.0065), (0.0065, 0.0065), (0.008, 0.008)]
    regions = [POLE, POLE, POLE, GRIP]
    group = "pole_l" if sign > 0 else "pole_r"
    rings, _ = loft_regions(bld, points, radii, regions, group, 8)
    cap_end(bld, rings[0], POLE, group)
    cap_end(bld, rings[-1], GRIP, group)
    # Basket: a flat ring just above the tip.
    basket(bld, Vector((x, -0.02, 0.10)), group)


def basket(bld, center, group):
    n = 12
    rings = []
    for radius, z in ((0.010, -0.003), (0.038, -0.002), (0.038, 0.003), (0.010, 0.004)):
        ring = []
        for i in range(n):
            a = 2.0 * math.pi * i / n
            ring.append(bld.vert((
                center.x + math.cos(a) * radius,
                center.y + math.sin(a) * radius,
                center.z + z,
            )))
        rings.append(ring)
    made = []
    for a, b in zip(rings, rings[1:]):
        made.extend(bld.bridge(a, b, POLE, group))
    bld.tag_orient(made, [center])


def build_zipper(bld):
    points = [Vector((0.0, -0.172, z)) for z in (1.02, 1.16, 1.30, 1.40)]
    radii = [(0.005, 0.004)] * 4
    loft(bld, points, radii, METAL, "zipper", 8)


def build_character():
    bld = Builder()
    build_pants(bld)
    build_jacket(bld)
    build_arm(bld, 1.0)
    build_arm(bld, -1.0)
    build_helmet(bld)
    build_goggles(bld)
    build_neck(bld)
    build_chin(bld)
    build_boot(bld, 1.0)
    build_boot(bld, -1.0)
    build_ski(bld, 1.0)
    build_ski(bld, -1.0)
    build_pole(bld, 1.0)
    build_pole(bld, -1.0)
    build_zipper(bld)
    orient_outward(bld)
    mesh = bpy.data.meshes.new("Skier")
    bld.bm.to_mesh(mesh)
    bld.bm.free()
    obj = bpy.data.objects.new("Skier", mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def unwrap(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.151917, island_margin=0.003, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def paint_textures(obj):
    mesh = obj.data
    uv_layer = mesh.uv_layers.active.data
    TEX_DIR.mkdir(parents=True, exist_ok=True)
    albedo = np.zeros((TEX, TEX, 4), dtype=np.float32)
    rough = np.zeros((TEX, TEX, 4), dtype=np.float32)
    metal = np.zeros((TEX, TEX, 4), dtype=np.float32)
    normal = np.zeros((TEX, TEX, 4), dtype=np.float32)
    normal[..., 2] = 1.0
    normal[..., 3] = 1.0
    # Flood each face's UV bbox cell color first via the raster itself.
    for poly in mesh.polygons:
        region = poly.material_index if False else None
    # Region is not on the mesh yet. Store it as a polygon int attribute.
    # It was a bmesh face layer. to_mesh keeps custom int face layers as attributes.
    attr = mesh.attributes.get("region")
    if attr is None:
        raise RuntimeError("region attribute missing after to_mesh")
    regions = [0] * len(mesh.polygons)
    attr.data.foreach_get("value", regions)

    for poly, region in zip(mesh.polygons, regions):
        if region == 0:
            region = JACKET
        loops = poly.loop_indices
        uv = [uv_layer[i].uv for i in loops]
        world = [mesh.vertices[poly.vertices[k]].co for k in range(len(loops))]
        paint_poly(albedo, rough, metal, normal, uv, world, region)

    images = {}
    images["albedo"] = save_image("skier_albedo.png", albedo, "sRGB")
    images["roughness"] = save_image("skier_roughness.png", rough, "Non-Color")
    images["metallic"] = save_image("skier_metallic.png", metal, "Non-Color")
    images["normal"] = save_image("skier_normal.png", normal, "Non-Color")
    return images


def paint_poly(albedo, rough, metal, normal, uvs, world, region):
    if len(uvs) != 4:
        return
    tris = ((0, 1, 2), (0, 2, 3))
    base = LINEAR[region]
    rgh = ROUGH[region]
    met = METALNESS[region]
    for tri in tris:
        uv = [uvs[i] for i in tri]
        pos = [world[i] for i in tri]
        raster_tri(albedo, rough, metal, normal, uv, pos, base, rgh, met, region)


def raster_tri(albedo, rough, metal, normal, uv, pos, base, rgh, met, region):
    px = np.array([[u * (TEX - 1), v * (TEX - 1)] for u, v in uv], dtype=np.float64)
    min_x = max(int(math.floor(px[:, 0].min())), 0)
    max_x = min(int(math.ceil(px[:, 0].max())), TEX - 1)
    min_y = max(int(math.floor(px[:, 1].min())), 0)
    max_y = min(int(math.ceil(px[:, 1].max())), TEX - 1)
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
    mask = (w0 >= -0.01) & (w1 >= -0.01) & (w2 >= -0.01)
    if not np.any(mask):
        return
    p0, p1, p2 = (np.array(p, dtype=np.float64) for p in pos)
    wx = w0 * p0[0] + w1 * p1[0] + w2 * p2[0]
    wy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1]
    wz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
    nse = noise(wx, wy, wz)
    color = detail_color(np.array(base, dtype=np.float32), nse, wx, wy, wz, region)
    yy, xx = np.nonzero(mask)
    albedo[yy + min_y, xx + min_x, 0:3] = color[yy, xx]
    albedo[yy + min_y, xx + min_x, 3] = 1.0
    rough_v = np.clip(rgh + (nse - 0.5) * 0.06, 0.04, 1.0)
    metal_v = np.full(nse.shape, met, dtype=np.float32)
    rough[yy + min_y, xx + min_x, 0] = rough_v[yy, xx]
    rough[yy + min_y, xx + min_x, 1] = rough_v[yy, xx]
    rough[yy + min_y, xx + min_x, 2] = rough_v[yy, xx]
    rough[yy + min_y, xx + min_x, 3] = 1.0
    metal[yy + min_y, xx + min_x, 0] = metal_v[yy, xx]
    metal[yy + min_y, xx + min_x, 1] = metal_v[yy, xx]
    metal[yy + min_y, xx + min_x, 2] = metal_v[yy, xx]
    metal[yy + min_y, xx + min_x, 3] = 1.0
    # Tangent-free fabric grain: a tiny world-space tilt, still a valid normal map.
    grain = ((nse - 0.5) * (0.12 if region in (JACKET, YOKE, PANTS, GLOVE) else 0.04))[yy, xx]
    normal[yy + min_y, xx + min_x, 0] = 0.5 + grain
    normal[yy + min_y, xx + min_x, 1] = 0.5 - grain * 0.6
    normal[yy + min_y, xx + min_x, 2] = 1.0
    normal[yy + min_y, xx + min_x, 3] = 1.0


def detail_color(base_rgb, nse, x, y, z, region):
    """base_rgb is linear RGB. nse, x, y, z match the raster grid."""
    vary = (0.92 + 0.08 * nse)[..., None]
    out = np.array(base_rgb, dtype=np.float32) * vary
    if region in (JACKET, YOKE):
        seam = (np.abs(z - 1.35) < 0.008) & (y < 0.0)
        zipper = (np.abs(x) < 0.008) & (y < -0.05) & (z > 0.98) & (z < 1.48)
        pocket = False
        for sx in (-0.07, 0.07):
            pocket = pocket | (
                (np.abs(x - sx) < 0.032) & (z > 1.12) & (z < 1.30) & (y < -0.06)
                & ((np.abs(x - sx) > 0.026) | (z < 1.145) | (z > 1.275))
            )
        mask = seam | zipper | pocket
        out[mask] *= 0.72
    if region == PANTS:
        thigh = (z > 0.55) & (z < 0.78) & (y < 0.0) & (np.abs(x) > 0.06) & (np.abs(x) < 0.16)
        out[thigh] *= 1.18
    if region == HELMET:
        vent = (z > 1.74) & (np.abs(x) < 0.04) & (np.abs(y) < 0.03)
        out[vent] *= 0.55
    return np.clip(out, 0.0, 1.0)


def noise(x, y, z):
    def layer(scale):
        a = np.sin(x * scale + y * scale * 0.37 + z * scale * 0.71)
        b = np.sin(x * scale * 0.51 + 2.1 + y * scale * 0.83 + z * scale * 0.19)
        return a * b
    n = 0.55 * layer(18.0) + 0.30 * layer(42.0) + 0.15 * layer(90.0)
    return np.clip(0.5 + 0.5 * n, 0.0, 1.0).astype(np.float32)


def save_image(name, array, colorspace):
    # Blender images are bottom-up, which matches UV v, so no flip.
    path = TEX_DIR / name
    img = bpy.data.images.new(name, TEX, TEX, alpha=True, float_buffer=True)
    img.colorspace_settings.name = colorspace
    flat = np.ascontiguousarray(array, dtype=np.float32).reshape(-1)
    img.pixels.foreach_set(flat)
    img.filepath_raw = str(path)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def build_material(images):
    mat = bpy.data.materials.new("SkierPBR")
    mat.use_nodes = True
    mat.use_backface_culling = False
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    links = nt.links

    def tex_node(image, location, non_color=False):
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = image
        node.location = location
        if non_color:
            image.colorspace_settings.name = "Non-Color"
        return node

    albedo = tex_node(images["albedo"], (-600, 300))
    rough = tex_node(images["roughness"], (-600, 0), True)
    metallic = tex_node(images["metallic"], (-600, -250), True)
    ntex = tex_node(images["normal"], (-600, -520), True)
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.location = (-280, -520)
    links.new(albedo.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(metallic.outputs["Color"], bsdf.inputs["Metallic"])
    links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(name, location, target, lens=58):
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.sensor_width = 36.0
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = Vector(location)
    bpy.context.scene.collection.objects.link(cam)
    look_at(cam, target)
    return cam


def add_empty(name, location):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.04
    empty.location = Vector(location)
    bpy.context.scene.collection.objects.link(empty)
    return empty


def add_studio():
    world = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.78, 0.79, 0.80, 1.0)
    bg.inputs["Strength"].default_value = 0.35

    def area(name, location, target, size, power, color=(1, 1, 1)):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.shape = "RECTANGLE"
        light_data.size = size
        light_data.size_y = size * 0.7
        light_data.energy = power
        light_data.color = color
        obj = bpy.data.objects.new(name, light_data)
        obj.location = Vector(location)
        bpy.context.scene.collection.objects.link(obj)
        look_at(obj, target)
        return obj

    area("Key", (-1.4, -2.4, 2.3), (0, 0, 1.0), 1.6, 180)
    area("Fill", (1.8, -1.6, 1.6), (0, 0, 0.9), 1.4, 70, (0.85, 0.9, 1.0))
    area("Rim", (0.4, 2.2, 2.0), (0, 0, 1.1), 1.2, 90)


def export_glb(obj):
    addon_utils = __import__("addon_utils")
    addon_utils.enable("io_scene_gltf2")
    bpy.ops.object.select_all(action="DESELECT")
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


def uv_overlap_fraction(obj):
    mesh = obj.data
    uv_data = mesh.uv_layers.active.data
    scale = 256
    mask = np.zeros((scale, scale), dtype=np.uint8)
    overlap = 0
    covered = 0
    for poly in mesh.polygons:
        loops = [uv_data[i].uv for i in poly.loop_indices]
        tris = ((0, 1, 2), (0, 2, 3)) if len(loops) == 4 else ((0, 1, 2),)
        for tri in tris:
            px = np.array([[loops[i].x * (scale - 1), loops[i].y * (scale - 1)] for i in tri])
            min_x = max(int(px[:, 0].min()), 0)
            max_x = min(int(px[:, 0].max()), scale - 1)
            min_y = max(int(px[:, 1].min()), 0)
            max_y = min(int(px[:, 1].max()), scale - 1)
            if max_x <= min_x or max_y <= min_y:
                continue
            xs = np.arange(min_x, max_x + 1) + 0.5
            ys = np.arange(min_y, max_y + 1) + 0.5
            gx, gy = np.meshgrid(xs, ys)
            v0, v1, v2 = px
            den = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1])
            if abs(den) < 1e-8:
                continue
            w0 = ((v1[1] - v2[1]) * (gx - v2[0]) + (v2[0] - v1[0]) * (gy - v2[1])) / den
            w1 = ((v2[1] - v0[1]) * (gx - v2[0]) + (v0[0] - v2[0]) * (gy - v2[1])) / den
            w2 = 1.0 - w0 - w1
            hit = (w0 > 0.02) & (w1 > 0.02) & (w2 > 0.02)
            if not np.any(hit):
                continue
            sub = mask[min_y:max_y + 1, min_x:max_x + 1]
            overlap += int(np.count_nonzero(hit & (sub > 0)))
            covered += int(np.count_nonzero(hit))
            sub[hit] = 1
    return overlap / max(covered, 1)


def validate(obj):
    mesh = obj.data
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    quads = sum(1 for p in mesh.polygons if len(p.vertices) == 4)
    zs = [v.co.z for v in mesh.vertices]
    ys = [v.co.y for v in mesh.vertices]
    problems = []
    if tris >= 15000:
        problems.append(f"triangles {tris} >= 15000")
    if quads != len(mesh.polygons):
        problems.append(f"non-quad faces: {len(mesh.polygons) - quads}")
    if not (1.72 <= max(zs) <= 1.88):
        problems.append(f"height {max(zs):.3f} m")
    if min(zs) < -0.002 or min(zs) > 0.004:
        problems.append(f"ground min z {min(zs):.4f}")
    if min(ys) > -0.7:
        problems.append("ski tips do not face -Y")
    if len(mesh.materials) != 1 or mesh.materials[0] is None or mesh.materials[0].name != "SkierPBR":
        problems.append("expected one SkierPBR material")
    if mesh.uv_layers.active is None:
        problems.append("missing UVs")
    else:
        fraction = uv_overlap_fraction(obj)
        print(f"uv overlap fraction {fraction:.4f}")
        if fraction > 0.01:
            problems.append(f"UV overlap {fraction:.3f}")
    print(
        f"tris {tris} faces {len(mesh.polygons)} quads {quads} "
        f"z {min(zs):.3f}..{max(zs):.3f} y {min(ys):.3f}..{max(ys):.3f}"
    )
    return problems


def main():
    reset_scene()
    obj = build_character()
    for poly in obj.data.polygons:
        poly.use_smooth = True
    unwrap(obj)
    images = paint_textures(obj)
    mat = build_material(images)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth()
    except RuntimeError as exc:
        print(f"shade_smooth skipped: {exc}")

    target = (0.0, 0.0, 0.95)
    front = add_camera("REF_Front", (0.0, -4.6, 1.05), target, lens=62)
    add_camera("CAM_Side", (4.4, 0.15, 1.05), target, lens=62)
    add_camera("CAM_ThreeQuarter", (2.5, -3.3, 1.15), target, lens=55)
    add_camera("CAM_Back", (0.0, 4.6, 1.05), target, lens=62)
    bpy.context.scene.camera = front
    add_empty("HelmetCrown", (0.0, 0.0, 1.795))
    add_empty("HandL", (0.78, -0.03, 1.33))
    add_empty("HandR", (-0.78, -0.03, 1.33))
    add_empty("SkiTipL", (STANCE, -1.02, 0.07))
    add_empty("SkiTipR", (-STANCE, -1.02, 0.07))
    add_empty("Crotch", (0.0, 0.0, 0.86))
    add_studio()

    problems = validate(obj)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    export_glb(obj)
    print(f"saved {BLEND_PATH}")
    print(f"exported {GLB_PATH}")
    if problems:
        print("VALIDATION FAILED")
        for item in problems:
            print(" -", item)
        sys.exit(1)


if __name__ == "__main__":
    main()

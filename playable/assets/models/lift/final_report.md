# Fixed-grip quad chair

Blender 5.2.2 LTS (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`).

## Deliverables

- `create_chair.py` — durable source
- `chair.blend`
- `chair.glb` — one mesh, one albedo, no animation
- `chair_albedo.png` — steel `0x6b7785` and charcoal seat in one image

## Metrics (fresh GLB import)

- 2,060 triangles, 2,773 vertices, 0 degenerate faces, 0 zero-length edges
- Width 2.19 m. Bounds Z (Blender up) -3.09 to 0.19 m, so the grip is the origin and the hanger goes down
- glTF accessor: X ±1.09 m, Y -3.09 to 0.19 m, Z -0.30 to 0.67 m. Travel is +Z
- Material `chair_albedo`, metallicFactor 0, base color from the texture
- Albedo steel samples about rgb(100, 111, 124), near `0x6b7785`. Seat samples about rgb(23, 24, 28)
- 92% smooth polygons. Open tube ends are boundary edges; the assembly is not a closed solid

## Evidence

Authored white stills (EEVEE, 1280, Standard view): `evidence/beauty/front.png`, `side.png`, `three-quarter.png`, `hang-snow.png`.

Fresh-import multiview (EEVEE, 768, light studio): `evidence/final/contact_sheet.png` and the six views beside it.

The gray frame stays separate from the snow plane in `hang-snow.png`. The seat is the dark shape.

## Game

`makeChair` loads `chair.glb` once, clones it per chair, and still returns a Group with `userData.seat` at `{ y: -2.55, x: -0.484, z: 0.02 }`. Other carrier types are unchanged. Chairs do not cast shadows.

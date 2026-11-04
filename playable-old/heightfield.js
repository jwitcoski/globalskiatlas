/** Sample uint16 DEM in game XZ (X east, Z = -north). */

export function makeHeightfield(meta, u16) {
  const rows = meta.rows;
  const cols = meta.cols;
  const cell = meta.cell_size_m;
  const nodata = meta.nodata_uint16;
  const off = meta.elevation_offset_m;
  const sc = meta.elevation_scale_m;
  const b = meta.bounds_local_m;
  const minE = b.min_east_m;
  const maxE = b.max_east_m;
  const minN = b.min_north_m;
  const maxN = b.max_north_m;
  const mid = (meta.elevation_min_m + meta.elevation_max_m) / 2;
  const overlay = new Float32Array(rows * cols);

  const bounds = {
    minX: minE,
    maxX: maxE,
    minZ: -maxN,
    maxZ: -minN,
  };

  function raw(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return NaN;
    const v = u16[r * cols + c];
    if (v === nodata) return NaN;
    return off + v * sc;
  }

  function ov(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return 0;
    return overlay[r * cols + c];
  }

  function gridAt(x, z) {
    const east = Math.min(maxE, Math.max(minE, x));
    const north = Math.min(maxN, Math.max(minN, -z));
    const fc = Math.min(cols - 1.001, Math.max(0, east / cell - 0.5));
    const fr = Math.min(rows - 1.001, Math.max(0, (maxN - north) / cell - 0.5));
    return { fc, fr, c0: Math.floor(fc), r0: Math.floor(fr), tx: fc - Math.floor(fc), ty: fr - Math.floor(fr) };
  }

  function bilerp(fn, g) {
    const z00 = fn(g.r0, g.c0);
    const z10 = fn(g.r0, g.c0 + 1);
    const z01 = fn(g.r0 + 1, g.c0);
    const z11 = fn(g.r0 + 1, g.c0 + 1);
    return z00 * (1 - g.tx) * (1 - g.ty) + z10 * g.tx * (1 - g.ty) + z01 * (1 - g.tx) * g.ty + z11 * g.tx * g.ty;
  }

  function sampleBase(x, z) {
    const g = gridAt(x, z);
    const z00 = raw(g.r0, g.c0);
    const z10 = raw(g.r0, g.c0 + 1);
    const z01 = raw(g.r0 + 1, g.c0);
    const z11 = raw(g.r0 + 1, g.c0 + 1);
    const a = Number.isFinite(z00) ? z00 : mid;
    const b1 = Number.isFinite(z10) ? z10 : a;
    const d = Number.isFinite(z01) ? z01 : a;
    const e = Number.isFinite(z11) ? z11 : b1;
    return a * (1 - g.tx) * (1 - g.ty) + b1 * g.tx * (1 - g.ty) + d * (1 - g.tx) * g.ty + e * g.tx * g.ty;
  }

  function sample(x, z) {
    return sampleBase(x, z) + bilerp(ov, gridAt(x, z));
  }

  function sculptDelta(x, z) {
    return bilerp(ov, gridAt(x, z));
  }

  function cellXZ(r, c) {
    const east = (c + 0.5) * cell;
    const north = maxN - (r + 0.5) * cell;
    return { x: east, z: -north };
  }

  function normal(THREE, x, z, out) {
    const n = out || new THREE.Vector3();
    const eps = 1.4;
    /* Heightfield n ∝ (-dh/dx, 1, -dh/dz). Horizontal n points downhill. */
    n.set(
      sample(x - eps, z) - sample(x + eps, z),
      2 * eps,
      sample(x, z - eps) - sample(x, z + eps),
    );
    return n.normalize();
  }

  return {
    sample,
    sampleBase,
    normal,
    sculptDelta,
    overlay,
    cellXZ,
    rows,
    cols,
    cell,
    bounds,
    min: meta.elevation_min_m,
    max: meta.elevation_max_m,
  };
}

export function localToGame(east, north) {
  return { x: east, z: -north };
}

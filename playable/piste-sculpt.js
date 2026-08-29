/** Client-only DEM overlay hook. Zipper moguls used to live only in the heightfield
 * (up to ~2.7 m) while the exported terrain mesh stayed smooth — skier bounced on
 * invisible bumps. Overlay stays empty so physics matches the visible GLB. */

export function bakePisteSculpt(hf, _polylines) {
  if (hf?.overlay) hf.overlay.fill(0);
}

/** No-op while overlay is empty; kept so a future visible gutter can drape onto the mesh. */
export function drapeSculptOnMesh(root, hf) {
  if (!root || !hf?.sculptDelta) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const pos = o.geometry.attributes.position;
    let touched = false;
    for (let i = 0; i < pos.count; i++) {
      const dy = hf.sculptDelta(pos.getX(i), pos.getZ(i));
      if (Math.abs(dy) > 1e-4) {
        pos.setY(i, pos.getY(i) + dy);
        touched = true;
      }
    }
    if (touched) {
      pos.needsUpdate = true;
      o.geometry.computeVertexNormals();
    }
  });
}

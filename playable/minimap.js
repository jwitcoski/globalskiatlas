/** Top-right trail radar. World X east, Z −north; north is up. */

export function makeMinimap(canvas, trailMap) {
  if (!canvas || !trailMap?.bounds) return { draw() {} };
  const ctx = canvas.getContext("2d");
  const { cx, cz, span } = trailMap.bounds;
  const half = Math.max(span * 0.52, 80);

  function to(x, z, w, h, pad) {
    const u = pad + ((x - cx) / (half * 2) + 0.5) * (w - pad * 2);
    const v = pad + ((z - cz) / (half * 2) + 0.5) * (h - pad * 2);
    return { u, v };
  }

  function hex(n) {
    return `#${n.toString(16).padStart(6, "0")}`;
  }

  function skierMark(u, v, heading, scale) {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    ctx.save();
    ctx.translate(u, v);
    ctx.rotate(Math.atan2(fz, fx));
    ctx.beginPath();
    ctx.moveTo(7 * scale, 0);
    ctx.lineTo(-5 * scale, 4.5 * scale);
    ctx.lineTo(-3 * scale, 0);
    ctx.lineTo(-5 * scale, -4.5 * scale);
    ctx.closePath();
    ctx.fillStyle = "#2a3238";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function yetiMark(u, v, scale) {
    ctx.save();
    ctx.translate(u, v);
    ctx.fillStyle = "#f4f6f8";
    ctx.strokeStyle = "#3a3c40";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 3.2 * scale, 4.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -2.2 * scale, 3.1 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a1c1e";
    ctx.beginPath();
    ctx.arc(-1.1 * scale, -2.4 * scale, 0.55 * scale, 0, Math.PI * 2);
    ctx.arc(1.1 * scale, -2.4 * scale, 0.55 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(state) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 180;
    const h = canvas.clientHeight || 180;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(232,238,242,0.72)";
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1;
    const r = 10;
    ctx.beginPath();
    ctx.roundRect?.(0.5, 0.5, w - 1, h - 1, r);
    if (!ctx.roundRect) ctx.rect(0.5, 0.5, w - 1, h - 1);
    ctx.fill();
    ctx.stroke();

    const pad = 12;
    const selected = state.courseId;

    const rings = trailMap.skiArea?.rings;
    if (rings?.length) {
      ctx.beginPath();
      for (const ring of rings) {
        ring.forEach((pt, i) => {
          const q = to(pt.x, pt.z, w, h, pad);
          if (i === 0) ctx.moveTo(q.u, q.v);
          else ctx.lineTo(q.u, q.v);
        });
      }
      ctx.strokeStyle = "rgba(36,48,56,0.55)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of trailMap.picks) {
      const pts = p.pts || [];
      if (pts.length < 2) continue;
      const on = p.course.id === selected;
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const q = to(pt.x, pt.z, w, h, pad);
        if (i === 0) ctx.moveTo(q.u, q.v);
        else ctx.lineTo(q.u, q.v);
      });
      ctx.strokeStyle = hex(p.style.color);
      ctx.globalAlpha = on ? 1 : 0.7;
      ctx.lineWidth = on ? 4.2 : 2.6;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (state.finish) {
      const q = to(state.finish.x, state.finish.z, w, h, pad);
      ctx.strokeStyle = "#c4b06a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(q.u, q.v, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.yeti && state.yetiX != null) {
      const q = to(state.yetiX, state.yetiZ, w, h, pad);
      yetiMark(q.u, q.v, 1.15);
    }

    if (state.x != null) {
      const q = to(state.x, state.z, w, h, pad);
      skierMark(q.u, q.v, state.heading || 0, 1.1);
    }
  }

  return { draw, canvas };
}

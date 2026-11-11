// The front-row edge of a venue, as a closed chain of straight lines and arcs.
// u is the distance along that edge; d is the offset outwards from it. Every row of seats is
// the same outline pushed out by d, so rows stay parallel.
//
// Unless a builder says otherwise the seam (u = 0) is the far-end centre (0, +halfZ) and u grows
// towards +x first: far end, +x side, stage end (-z), -x side, back to the far end.

const line = (x, z, dx, dz, nx, nz, len) => ({ t: 'l', x, z, dx, dz, nx, nz, len });
const arc = (cx, cz, r, f0, f1) => ({ t: 'a', cx, cz, r, f0, f1, len: Math.abs(f1 - f0) * r });
const H = Math.PI / 2;

/** A rectangle with rounded corners. seam 'stage' starts at (0, -halfZ) instead. */
export function roundedRect(halfX, halfZ, r, seam = 'far') {
  const ha = halfX - r, hb = halfZ - r;
  const far = (len, x0) => line(x0, halfZ, 1, 0, 0, 1, len);
  const stage = (len, x0) => line(x0, -halfZ, -1, 0, 0, -1, len);
  const right = [arc(ha, hb, r, H, 0), line(halfX, hb, 0, -1, 1, 0, 2 * hb), arc(ha, -hb, r, 0, -H)];
  const left = [arc(-ha, -hb, r, -H, -2 * H), line(-halfX, -hb, 0, 1, -1, 0, 2 * hb), arc(-ha, hb, r, 2 * H, H)];
  return seam === 'stage'
    ? [stage(ha, 0), ...left, far(2 * ha, -ha), ...right, stage(ha, ha)]
    : [far(ha, 0), ...right, stage(2 * ha, ha), ...left, far(ha, -ha)];
}

/** An oval of four arcs: tight ones of radius endR at the +z and -z ends, wide ones along the sides. */
export function fourCentredOval(halfX, halfZ, endR) {
  const ce = halfZ - endR;                                   // end-arc centres at (0, +-ce)
  const rs = (ce * ce + halfX * halfX - endR * endR) / (2 * (halfX - endR));
  const cs = rs - halfX;                                     // side-arc centres at (-+cs, 0)
  const th = Math.atan2(ce, cs);
  return [
    arc(0, ce, endR, H, th),
    arc(-cs, 0, rs, th, -th),
    arc(0, -ce, endR, -th, -2 * H + th),
    arc(cs, 0, rs, -2 * H + th, -2 * H - th),
    arc(0, ce, endR, 2 * H - th, H)
  ];
}

export function makeOutline(pieceList) {
  const pieces = pieceList.filter((p) => p.len > 1e-9).map((p) => ({ ...p }));
  let L = 0;
  for (const p of pieces) { p.u0 = L; L += p.len; p.u1 = L; }
  const grow = (p, d) => (p.t === 'a' ? (p.r + d) / p.r : 1);
  const wrap = (u) => ((u % L) + L) % L;

  function ring(u, d) {
    u = wrap(u);
    let p = pieces[pieces.length - 1];
    for (const q of pieces) { if (u <= q.u1) { p = q; break; } }
    const s = u - p.u0;
    if (p.t === 'l') return { x: p.x + p.dx * s + p.nx * d, z: p.z + p.dz * s + p.nz * d, nx: p.nx, nz: p.nz };
    const f = p.f0 + ((p.f1 - p.f0) * s) / p.len, c = Math.cos(f), sn = Math.sin(f);
    return { x: p.cx + (p.r + d) * c, z: p.cz + (p.r + d) * sn, nx: c, nz: sn };
  }

  /** Length of the stretch u0..u1 measured d metres out from the front row. */
  function lenAt(u0, u1, d) {
    let len = 0;
    for (const p of pieces) {
      const a = Math.max(u0, p.u0), b = Math.min(u1, p.u1);
      if (b > a) len += (b - a) * grow(p, d);
    }
    return len;
  }

  /** The u reached by walking len metres from u0 along the row d metres out. */
  function uAtLen(u0, len, d) {
    let u = u0;
    for (const p of pieces) {
      if (p.u1 <= u) continue;
      const k = grow(p, d), avail = (p.u1 - u) * k;
      if (len <= avail) return u + len / k;
      len -= avail; u = p.u1;
    }
    return u;
  }

  /** Values of u from u0 to u1, close enough together on arcs to draw them smoothly. */
  function sampleU(u0, u1, step = 1.5) {
    const us = [u0];
    for (const p of pieces) {
      if (p.u1 <= u0 || p.u0 >= u1) continue;
      const a = Math.max(u0, p.u0), b = Math.min(u1, p.u1);
      if (p.t === 'a') {
        const n = Math.max(1, Math.ceil((b - a) / step));
        for (let i = 1; i <= n; i++) us.push(a + ((b - a) * i) / n);
      } else us.push(b);
    }
    return us.filter((u, i) => i === 0 || u - us[i - 1] > 1e-6);
  }

  /** The outline pushed out by d, as a closed polygon [[x, z], ...]. */
  function polygon(d, step = 1.5) {
    const us = sampleU(0, L, step);
    us.pop();                                                 // the last point repeats the first
    return us.map((u) => { const p = ring(u, d); return [p.x, p.z]; });
  }

  return { L, pieces, ring, lenAt, uAtLen, sampleU, wrap, polygon };
}

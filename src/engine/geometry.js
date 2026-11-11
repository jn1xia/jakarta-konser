// Small geometry helpers shared by the engine. Plan view only: x across, z along the floor.

export const D2R = Math.PI / 180;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Is the point inside the polygon [[x, z], ...]? Even-odd rule. */
export function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the segment (x0, z0)-(x1, z1). */
export function segDist(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, len2 = dx * dx + dz * dz;
  const t = len2 ? clamp(((px - x0) * dx + (pz - z0) * dz) / len2, 0, 1) : 0;
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

/** Distance from a point to an axis-aligned rectangle; 0 inside it. */
export function rectDist(x, z, x0, x1, z0, z1) {
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
}

/** Seeded random numbers in [0, 1) (mulberry32), so every visit draws the same crowd. */
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turns a venue definition (front-row outline, tiers, sectors) into seat positions.

import { makeOutline } from './outline.js';
import { D2R } from './geometry.js';

export const SEAT_W = 0.5;   // metres per seat along a row
export const AISLE = 0.6;    // gap at each end of a section's rows

/** Adds the outline and each tier's derived figures to a venue definition. */
export function buildVenue(def) {
  const outline = makeOutline(def.outline);
  const tiers = def.tiers.map((t, index) => {
    const rise = t.depth * Math.tan(t.rake * D2R);
    return { ...t, index, rise, dBack: t.d0 + t.rows * t.depth, yTop: t.y0 + (t.rows - 1) * rise };
  });
  return { def, outline, tiers };
}

/**
 * The sectors of one tier, numbered from 1. A full-ring tier is cut into def.sectors equal
 * parts (or follows an explicit list of [u0, u1]). A tier with `span` only covers those
 * stretches of the outline, cut into parts about as long as a full-ring sector.
 */
export function sectorsOf(venue, tier) {
  const L = venue.outline.L, n = venue.def.sectors;
  if (!tier.span && Array.isArray(n)) return n.map(([u0, u1], i) => ({ k: i + 1, u0, u1 }));
  const size = L / (Array.isArray(n) ? n.length : n);
  const out = [];
  for (const [a, b] of tier.span || [[0, L]]) {
    const parts = Math.max(1, Math.round((b - a) / size));
    for (let i = 0; i < parts; i++) {
      out.push({ k: out.length + 1, u0: a + ((b - a) * i) / parts, u1: a + ((b - a) * (i + 1)) / parts });
    }
  }
  return out;
}

/** Seats of rows r0 <= r < r1 between u0 and u1: one x, y, z triple per seat. */
export function seatRows(venue, tier, u0, u1, r0, r1) {
  const o = venue.outline, rows = [], rowsU = [];
  for (let r = r0; r < r1; r++) {
    const d = tier.d0 + (r + 0.55) * tier.depth, y = tier.y0 + r * tier.rise;
    const len = o.lenAt(u0, u1, d) - 2 * AISLE, n = Math.max(1, Math.floor(len / SEAT_W));
    const xyz = new Float32Array(n * 3), us = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = o.uAtLen(u0, AISLE + ((i + 0.5) * len) / n, d), p = o.ring(u, d);
      xyz[i * 3] = p.x; xyz[i * 3 + 1] = y; xyz[i * 3 + 2] = p.z; us[i] = u;
    }
    rows.push(xyz); rowsU.push(us);
  }
  return { rows, rowsU };
}

/** Every seat in the stands, with nothing closed off. */
export function venueSeatCount(venue) {
  let n = 0;
  for (const t of venue.tiers) {
    for (const s of sectorsOf(venue, t)) {
      for (const row of seatRows(venue, t, s.u0, s.u1, 0, t.rows).rows) n += row.length / 3;
    }
  }
  return n;
}

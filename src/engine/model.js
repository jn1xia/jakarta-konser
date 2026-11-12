// Builds everything the 3D view and the seat panel need for one concert: the venue, the stage
// layout, and a list of sections that each know their seats and their ticket category.

import { buildVenue, sectorsOf, seatRows } from './venue.js';
import { buildStage } from './stage.js';
import { buildFloor } from './floor.js';
import { zoneOf, tierBands, pickCategory } from './categories.js';

const CLOSED = { id: 'CLOSED', name: { id: 'Ditutup', en: 'Closed' }, price: null, kind: 'closed', color: '#24272e' };
const pad2 = (n) => String(n).padStart(2, '0');
const places = (section) => section.rows.reduce((n, row) => n + row.length / 3, 0);
const middle = (n) => Math.floor(n / 2);

export function buildModel(concert, venueDef) {
  const sim = concert.sim;
  const venue = buildVenue(venueDef);
  const stage = buildStage(venue, sim.stage || { preset: 'end' });

  const cats = {}, catOrder = [];
  for (const c of sim.categories) { cats[c.id] = c; catOrder.push(c.id); }
  cats.CLOSED = CLOSED;

  const rules = sim.stands || [], overrides = sim.sections || {};
  const sections = [];

  for (const block of buildFloor(venue, stage, sim.floor || [])) {
    if (block.rows.length) sections.push({ ...block, cat: overrides[block.id] || block.cat });
  }
  for (const tier of venue.tiers) {
    const bands = tierBands(tier, rules), banded = bands.length > 1;
    for (const s of sectorsOf(venue, tier)) {
      const { zone, side } = zoneOf(venue, stage, tier, s.u0, s.u1);
      bands.forEach(([r0, r1], i) => {
        const id = `${tier.id}-${pad2(s.k)}${banded ? `.${i + 1}` : ''}`;
        const { rows, rowsU } = seatRows(venue, tier, s.u0, s.u1, r0, r1);
        if (!rows.length) return;
        const cat = overrides[id] || pickCategory(rules, { tier: tier.id, zone, side, r0, r1 }) || 'CLOSED';
        sections.push({
          id, kind: 'stand', tier, sector: s.k, band: banded ? i + 1 : 0,
          u0: s.u0, u1: s.u1, r0, r1, zone, side, cat, rows, rowsU
        });
      });
    }
  }

  // byId is keyed by text from the address (?s=), so it has no prototype: ?s=constructor finds nothing
  const byId = Object.create(null), byCat = {};
  let total = 0;
  for (const s of sections) {
    byId[s.id] = s;
    if (s.cat === 'CLOSED') continue;
    const n = places(s);
    byCat[s.cat] = (byCat[s.cat] || 0) + n; total += n;
  }

  const model = { concert, venue, stage, cats, catOrder, sections, byId, stats: { total, byCat } };
  model.defaultSeat = defaultSeat(model);
  return model;
}

const seatAtMiddle = (sec) => {
  const row = middle(sec.rows.length);
  return { sec, row, seat: middle(sec.rows[row].length / 3) };
};

/** A straight-on view to open with: the lowest tier, as near the far-end centre as it gets. */
function defaultSeat(model) {
  const { venue, sections } = model, { halfZ } = venue.def.floor;
  const open = sections.filter((s) => s.cat !== 'CLOSED');
  const away = (s) => {
    const p = venue.outline.ring((s.u0 + s.u1) / 2, s.tier.d0);
    return Math.hypot(p.x, p.z - halfZ);
  };
  for (const tier of [...venue.tiers].sort((a, b) => a.y0 - b.y0 || a.index - b.index)) {
    const mine = open.filter((s) => s.kind === 'stand' && s.tier === tier);
    if (!mine.length) continue;
    mine.sort((a, b) => away(a) - away(b) || a.sector - b.sector || a.band - b.band);
    return seatAtMiddle(mine[0]);
  }
  return open.length ? seatAtMiddle(open[0]) : null;
}

/**
 * The seat named in the address: section id, then row and seat counted from 1. Anything missing,
 * unknown or closed falls back to the default seat; numbers out of range are clamped.
 */
export function resolveSeat(model, s, r, n) {
  const sec = model.byId[s];
  if (!sec || sec.cat === 'CLOSED') return { ...model.defaultSeat };
  const index = (value, count) => {
    const x = value === null || value === undefined || value === '' ? NaN : Number(value);
    return Number.isFinite(x) ? Math.max(0, Math.min(count - 1, Math.round(x) - 1)) : middle(count);
  };
  const row = index(r, sec.rows.length);
  return { sec, row, seat: index(n, sec.rows[row].length / 3) };
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue, sectorsOf, seatRows, venueSeatCount, SEAT_W } from '../src/engine/venue.js';
import { VENUES } from '../src/data/venues/index.js';

const CAPACITY_RANGE = {};          // filled in Task 3 for venues without a firm figure
for (const id of ['jis', 'gbk-main']) {
  test(`${id}: seat count is within 5% of the published capacity`, () => {
    const v = buildVenue(VENUES[id]), n = venueSeatCount(v);
    assert.ok(Math.abs(n - v.def.capacity) / v.def.capacity <= 0.05, `${n} seats`);
  });
}
test('rows hold xyz triples, climb with the rake, and seats are a seat-width apart', () => {
  const v = buildVenue(VENUES.jis), t = v.tiers[0], s = sectorsOf(v, t)[3];
  const { rows } = seatRows(v, t, s.u0, s.u1, 0, t.rows);
  assert.equal(rows.length, t.rows);
  assert.ok(rows[5][1] > rows[4][1]);
  const r = rows[0];
  for (let i = 3; i < r.length; i += 3)
    assert.ok(Math.hypot(r[i] - r[i - 3], r[i + 2] - r[i - 1]) >= SEAT_W * 0.9);
});
test('24 sectors per full-ring tier, numbered from 1', () => {
  const v = buildVenue(VENUES['gbk-main']), s = sectorsOf(v, v.tiers[1]);
  assert.equal(s.length, 24); assert.equal(s[0].k, 1); assert.equal(s[0].u0, 0);
});

CAPACITY_RANGE['ice-bsd-5-6'] = [2500, 5000];
CAPACITY_RANGE['ice-bsd-5'] = [1200, 2500];
CAPACITY_RANGE.madya = [8000, 10500];   // no reliable published figure found
for (const id of ['indonesia-arena', 'istora', 'madya', 'ice-bsd-5-6', 'ice-bsd-5']) {
  test(`${id}: seat count is plausible`, () => {
    const v = buildVenue(VENUES[id]), n = venueSeatCount(v), r = CAPACITY_RANGE[id];
    if (r) assert.ok(n >= r[0] && n <= r[1], `${n} seats`);
    else assert.ok(Math.abs(n - v.def.capacity) / v.def.capacity <= 0.05, `${n} seats`);
  });
}
test('Madya stands sit only on the two long sides', () => {
  const v = buildVenue(VENUES.madya);
  for (const t of v.tiers) for (const s of sectorsOf(v, t)) {
    const p = v.outline.ring((s.u0 + s.u1) / 2, t.d0);
    assert.ok(Math.abs(p.x) > 45 && Math.abs(p.z) < 60);
  }
});
test('the ICE stand is at the far end only', () => {
  const v = buildVenue(VENUES['ice-bsd-5']);
  for (const s of sectorsOf(v, v.tiers[0])) assert.ok(v.outline.ring((s.u0 + s.u1) / 2, 0.5).z > 49);
});

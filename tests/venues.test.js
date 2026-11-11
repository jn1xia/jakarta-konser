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

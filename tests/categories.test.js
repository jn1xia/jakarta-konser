import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { zoneOf, tierBands, pickCategory } from '../src/engine/categories.js';
import { VENUES } from '../src/data/venues/index.js';
const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end' }), L = v.outline.L, t = v.tiers[0];
const at = (u) => zoneOf(v, s, t, u - 2, u + 2);

test('zones follow the stage', () => {
  assert.equal(at(0.01 + 2).zone, 'end');
  assert.equal(at(L / 2).zone, 'behind');
  assert.deepEqual(at(L / 4), { zone: 'sideNear', side: 'R' });
  assert.equal(at(3 * L / 4).side, 'L');
});
test('row rules cut a tier into bands', () => {
  const u = v.tiers[2];
  assert.deepEqual(tierBands(u, [{ tier: 'U', rows: [1, 12], cat: 'A' }, { tier: 'U', cat: 'B' }]), [[0, 12], [12, u.rows]]);
  assert.deepEqual(tierBands(u, [{ tier: 'U', cat: 'B' }]), [[0, u.rows]]);
});
test('first matching rule wins; behind is closed unless named', () => {
  const rules = [{ tier: 'L', zone: 'beside', cat: 'C6' }, { tier: 'L', cat: 'C2' }, { zone: 'behind', tier: 'U', cat: 'C9' }];
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'beside', side: 'L', r0: 0, r1: 26 }), 'C6');
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'end', side: 'L', r0: 0, r1: 26 }), 'C2');
  assert.equal(pickCategory(rules, { tier: 'L', zone: 'behind', side: 'L', r0: 0, r1: 26 }), null);
  assert.equal(pickCategory(rules, { tier: 'U', zone: 'behind', side: 'R', r0: 0, r1: 33 }), 'C9');
  assert.equal(pickCategory([{ tier: 'U', rows: [1, 12], cat: 'A' }], { tier: 'U', zone: 'end', side: 'L', r0: 12, r1: 33 }), null);
});

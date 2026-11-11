import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { buildFloor } from '../src/engine/floor.js';
import { inPoly } from '../src/engine/geometry.js';
import { VENUES } from '../src/data/venues/index.js';
const spots = (b) => b.rows.flatMap((r) => Array.from({ length: r.length / 3 }, (_, i) => [r[i * 3], r[i * 3 + 2]]));

test('bands become lettered blocks from the stage outwards', () => {
  const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end' });
  const f = buildFloor(v, s, [{ depth: 1, blocks: ['VA', 'VB'], standing: true }, { depth: 3, blocks: ['C1'] }]);
  assert.deepEqual(f.map((b) => b.id), ['F1-A', 'F1-B', 'F2-A']);
  assert.ok(f[0].x1 <= 0 && f[1].x0 >= 0 && f[0].standing && !f[2].standing);
  assert.ok(f[2].z0 > f[0].z1);
  const depth1 = f[0].z1 - f[0].z0, depth2 = f[2].z1 - f[2].z0;
  assert.ok(Math.abs(depth2 / depth1 - 3) < 0.2);
  assert.ok(f[2].rows[0][2] < f[2].rows[1][2]);          // row 1 is nearest the stage
});
test('no spot lies in the stage, a runway, the sound desk or a tower', () => {
  const v = buildVenue(VENUES.jis), s = buildStage(v, { preset: 'end', runway: 'T', bStage: true });
  for (const b of buildFloor(v, s, [{ depth: 1, blocks: ['A'] }]))
    for (const [x, z] of spots(b)) assert.equal(s.blocked(x, z), false);
});
test('on an oval field, spots outside the front row are dropped', () => {
  const v = buildVenue(VENUES['gbk-main']), s = buildStage(v, { preset: 'end' });
  const edge = v.outline.polygon(-1.5, 2);
  for (const b of buildFloor(v, s, [{ depth: 1, blocks: ['A', 'B'] }]))
    for (const [x, z] of spots(b)) assert.ok(inPoly(x, z, edge));
});

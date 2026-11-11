import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCERTS } from '../src/data/concerts.js';
import { VENUES } from '../src/data/venues/index.js';
import { validate } from '../src/engine/config.js';
import { buildModel } from '../src/engine/model.js';
const engine = CONCERTS.filter((c) => c.sim && !c.sim.external);

test('33 entries with unique ids, real dates and at least one source', () => {
  assert.equal(CONCERTS.length, 33);
  assert.equal(new Set(CONCERTS.map((c) => c.id)).size, 33);
  for (const c of CONCERTS) {
    assert.deepEqual(validate(c, VENUES), [], c.id);
    assert.ok(c.sources.length >= 1, c.id);
    assert.ok(c.venue ? VENUES[c.venue] : c.venueName === null || typeof c.venueName === 'string', c.id);
  }
});
test('twelve engine simulations and two external ones', () => {
  assert.equal(engine.length, 12);
  assert.deepEqual(CONCERTS.filter((c) => c.sim && c.sim.external).map((c) => c.id).sort(), ['bigbang-jis-2027', 'bts-gbk-2026']);
  assert.ok(engine.every((c) => c.sim.accuracy === 'estimated'));
});
for (const c of engine) {
  test(`${c.id}: the model is complete`, () => {
    const m = buildModel(c, VENUES[c.venue]);
    assert.ok(m.stats.total > 1000, `${m.stats.total} places`);
    for (const s of m.sections) if (s.kind === 'stand' && s.zone !== 'behind') assert.notEqual(s.cat, 'CLOSED', s.id);
    for (const id of m.catOrder) assert.ok(m.stats.byCat[id] > 0, `${id} has no seats`);
  });
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCERTS } from '../src/data/concerts.js';
import { VENUES } from '../src/data/venues/index.js';
import { validate } from '../src/engine/config.js';
import { buildModel } from '../src/engine/model.js';
import { readFileSync } from 'node:fs';
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

test('a card never contradicts the prices the research file quotes', () => {
  const research = readFileSync(new URL('../docs/research/jakarta-concerts-2026-2027.md', import.meta.url), 'utf8');
  const quoted = {};                                            // artist -> every rupiah amount in its rows
  for (const line of research.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (!/^\d+$/.test(cells[1] || '')) continue;
    const amounts = [...cells[7].matchAll(/Rp([\d.]+)/g)].map((m) => Number(m[1].replace(/\./g, '')));
    if (amounts.length) (quoted[cells[3]] = quoted[cells[3]] || []).push(...amounts);
  }
  let compared = 0;
  for (const c of CONCERTS) {
    const amounts = Object.entries(quoted).find(([artist]) => artist.startsWith(c.artist))?.[1];
    if (!amounts) continue;
    if (c.priceFrom) { assert.equal(c.priceFrom, Math.min(...amounts), `${c.id}: starting price`); compared++; }
    if (c.priceTo && amounts.length > 1) { assert.equal(c.priceTo, Math.max(...amounts), `${c.id}: top price`); compared++; }
  }
  assert.ok(compared >= 15, `only ${compared} prices compared`);
});

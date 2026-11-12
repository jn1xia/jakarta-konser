import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, resolveSeat } from '../src/engine/model.js';
import { verdictKeys } from '../src/engine/verdict.js';
import { VENUES } from '../src/data/venues/index.js';

const concert = { id: 'fixture', artist: 'X', tour: 'Y', dates: ['2027-01-01'], venue: 'jis', sim: {
  accuracy: 'estimated', stage: { preset: 'end', runway: 'straight' },
  categories: [{ id: 'VIP', name: 'VIP', price: 3000000, kind: 'standing', color: '#e5484d' },
               { id: 'C1', name: 'CAT 1', price: null, kind: 'seat', color: '#0090ff' },
               { id: 'C2', name: 'CAT 2', price: 1000000, kind: 'seat', color: '#46a758' }],
  floor: [{ depth: 1, blocks: ['VIP', 'VIP'], standing: true }],
  stands: [{ tier: 'U', rows: [1, 10], cat: 'C1' }, { tier: 'U', cat: 'C2' }, { cat: 'C1' }],
  sections: { 'L-01': 'C2' } } };
const m = buildModel(concert, VENUES.jis);

test('every section has a category, ids are stable, bands are numbered', () => {
  assert.ok(m.byId['L-01'] && m.byId['U-01.1'] && m.byId['U-01.2'] && m.byId['F1-A']);
  assert.equal(m.byId['L-01'].cat, 'C2');                       // explicit override
  assert.equal(m.byId['U-01.1'].cat, 'C1'); assert.equal(m.byId['U-01.2'].cat, 'C2');
  assert.ok(m.sections.every((s) => m.cats[s.cat]));
  assert.ok(m.sections.some((s) => s.cat === 'CLOSED' && s.zone === 'behind'));
  assert.ok(m.sections.every((s) => s.rows.length > 0));
});
test('stats add up and leave out closed seats', () => {
  const sum = Object.values(m.stats.byCat).reduce((a, b) => a + b, 0);
  assert.equal(sum, m.stats.total); assert.equal(m.stats.byCat.CLOSED, undefined);
});
test('seat values from the address are clamped or replaced by the default', () => {
  assert.deepEqual(resolveSeat(m, 'ZZ', 999, -3), m.defaultSeat);
  assert.deepEqual(resolveSeat(m, undefined, undefined, undefined), m.defaultSeat);
  for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.deepEqual(resolveSeat(m, key, 1, 1), m.defaultSeat, key);
  const closed = m.sections.find((s) => s.cat === 'CLOSED');
  assert.deepEqual(resolveSeat(m, closed.id, 1, 1), m.defaultSeat);
  const r = resolveSeat(m, 'L-05', 999, 'abc'), sec = m.byId['L-05'];
  assert.equal(r.sec, sec); assert.equal(r.row, sec.rows.length - 1);
  assert.equal(r.seat, Math.floor(sec.rows[r.row].length / 3 / 2));
  assert.equal(m.defaultSeat.sec.zone, 'end'); assert.equal(m.defaultSeat.sec.tier.id, 'L');
});
test('verdict keys', () => {
  const f = (o) => ({ dStage: 60, mainVis: 1, off: 10, blockedByTower: false, ...o });
  assert.deepEqual(verdictKeys(f({ dStage: 10 }), { kind: 'stand' }, 5), ['v.close']);
  assert.deepEqual(verdictKeys(f({ mainVis: 0 }), { kind: 'stand' }, 5), ['v.small', 'v.screenHidden']);
  assert.deepEqual(verdictKeys(f({ dStage: 120, off: 70 }), { kind: 'stand' }, 5), ['v.far', 'v.screenAngle']);
  assert.deepEqual(verdictKeys(f({ dStage: 8, blockedByTower: true }), { kind: 'floor', standing: true }, 1), ['v.close', 'v.pit', 'v.tower']);
});

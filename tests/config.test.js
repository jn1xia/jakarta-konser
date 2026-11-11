import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, pack, unpack } from '../src/engine/config.js';
import { VENUES } from '../src/data/venues/index.js';
const base = () => ({ id: 'x', artist: 'A', tour: 'T', dates: ['2027-01-23'], venue: 'jis', sim: {
  accuracy: 'estimated', stage: { preset: 'end' },
  categories: [{ id: 'C1', name: 'CAT 1', price: null, kind: 'seat', color: '#0090ff' }],
  floor: [{ depth: 1, blocks: ['C1'] }], stands: [{ cat: 'C1' }] } });
const bad = (edit) => { const c = base(); edit(c); return validate(c, VENUES); };

test('a sound entry has no problems', () => assert.deepEqual(validate(base(), VENUES), []));
test('each kind of mistake is reported', () => {
  assert.equal(bad((c) => { c.venue = 'nowhere'; }).length, 1);
  assert.equal(bad((c) => { c.dates = ['2027-02-30']; }).length, 1);
  assert.equal(bad((c) => { c.sim.stands.push({ cat: 'C9' }); }).length, 1);
  assert.equal(bad((c) => { c.sim.stands.push({ tier: 'Z', cat: 'C1' }); }).length, 1);
  assert.equal(bad((c) => { c.sim.categories[0].color = 'red'; }).length, 1);
  assert.equal(bad((c) => { c.sim.categories[0].price = 12.5; }).length, 1);
  assert.equal(bad((c) => { c.sim.categories.push({ ...c.sim.categories[0] }); }).length, 1);
  assert.equal(bad((c) => { c.sim.floor[0].depth = 0; }).length, 1);
  assert.equal(bad((c) => { c.sim.stage.preset = 'centre'; }).length, 1);
});
test('pack then unpack returns the same settings', () => {
  const c = base(), r = unpack(pack(c), VENUES);
  assert.equal(r.ok, true); assert.deepEqual(r.concert.sim, c.sim);
  assert.equal(r.concert.custom, true); assert.equal(r.concert.id, 'custom');
  assert.match(pack(c), /^[A-Za-z0-9_-]+$/);
});
test('damaged, oversized or unsafe text is refused; long names are cut', () => {
  assert.equal(unpack('!!!', VENUES).ok, false);
  assert.equal(unpack('A'.repeat(20001), VENUES).ok, false);
  const ext = base(); ext.sim = { external: 'https://example.com' };
  assert.equal(unpack(pack(ext), VENUES).ok, false);
  const long = base(); long.artist = '<img src=x onerror=alert(1)>'.repeat(10);
  const r = unpack(pack(long), VENUES);
  assert.equal(r.ok, true); assert.equal(r.concert.artist.length, 80);
});
test('a link cannot ask for a stage size that would run the floor loops away', () => {
  assert.equal(bad((c) => { c.sim.stage.depth = -1e9; }).length, 1);
  assert.equal(bad((c) => { c.sim.stage.runwayLength = 1e9; }).length, 1);
  assert.equal(bad((c) => { c.sim.stage.width = 'wide'; }).length, 1);
  assert.equal(bad((c) => { c.sim.theme = { stick: 'javascript:1' }; }).length, 1);
  assert.equal(bad((c) => { c.sim.categories[0].id = '__proto__'; }).length >= 1, true);
  assert.equal(bad((c) => { c.venue = 'constructor'; }).length, 1);
});

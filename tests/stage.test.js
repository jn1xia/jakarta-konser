import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVenue } from '../src/engine/venue.js';
import { buildStage } from '../src/engine/stage.js';
import { VENUES } from '../src/data/venues/index.js';
const jis = buildVenue(VENUES.jis), near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test('plain end stage on JIS', () => {
  const s = buildStage(jis, { preset: 'end' });
  near(s.backZ, -55); near(s.frontZ, -38.2); near(s.width, 46.25); near(s.deckY, 2.2);
  assert.equal(s.blocked(0, s.frontZ - 1), true);
  assert.equal(s.blocked(0, s.frontZ + 5), false);
  near(s.dist(0, s.frontZ + 10), 10);
  assert.deepEqual(s.screens[0].n, [0, 0, 1]); near(s.screens[0].c[0], 0);
  assert.equal(s.screens.length, 3); assert.equal(s.towers.length, 2);
  assert.ok(s.foh && s.blocked((s.foh.x0 + s.foh.x1) / 2, (s.foh.z0 + s.foh.z1) / 2));
});
test('runway, T bar and B-stage extend the footprint', () => {
  const r = buildStage(jis, { preset: 'end', runway: 'straight', runwayLength: 30 });
  assert.equal(r.blocked(0, r.frontZ + 15), true); near(r.runwayEndZ, r.frontZ + 30);
  near(r.dist(0, r.runwayEndZ + 4), 4);
  const t = buildStage(jis, { preset: 'end', runway: 'T', runwayLength: 30 });
  assert.equal(t.blocked(t.width * 0.25 - 0.5, t.runwayEndZ - 1.5, 0), true);
  const b = buildStage(jis, { preset: 'end', runway: 'straight', runwayLength: 30, bStage: true });
  assert.equal(b.blocked(4, b.runwayEndZ, 0), true);
});
test('small indoor floor: lower deck, no towers, no side screens', () => {
  const s = buildStage(buildVenue(VENUES.istora), { preset: 'end' });
  near(s.deckY, 1.6); assert.equal(s.towers.length, 0); assert.equal(s.screens.length, 1); assert.equal(s.foh, null);
});
test('unknown preset is refused', () => {
  assert.throws(() => buildStage(jis, { preset: 'centre' }), /Unknown stage preset: centre/);
});

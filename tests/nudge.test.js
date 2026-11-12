import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldNudge, NUDGE } from '../src/nudge.js';

const H = 3600 * 1000, D = 24 * H, now = Date.parse('2026-11-12T12:00:00Z');

test('a first visit gets the note', () => {
  assert.equal(shouldNudge({}, now), true);
  assert.equal(shouldNudge(null, now), true);
});
test('at most once a day', () => {
  assert.equal(shouldNudge({ shown: now - 23 * H }, now), false);
  assert.equal(shouldNudge({ shown: now - 25 * H }, now), true);
});
test('closing it with × keeps it away for a week', () => {
  assert.equal(shouldNudge({ shown: now - 6 * D, dismissed: now - 6 * D }, now), false);
  assert.equal(shouldNudge({ shown: now - 8 * D, dismissed: now - 8 * D }, now), true);
});
test('opening the QRIS keeps it away for a month', () => {
  assert.equal(shouldNudge({ opened: now - 29 * D }, now), false);
  assert.equal(shouldNudge({ opened: now - 31 * D }, now), true);
});
test('timings match what was agreed', () => {
  assert.deepEqual([NUDGE.delay, NUDGE.visible], [8000, 12000]);
  assert.deepEqual([NUDGE.every, NUDGE.afterClose, NUDGE.afterOpen], [D, 7 * D, 30 * D]);
});
test('a stored record that is not numbers is treated as nothing stored', () => {
  assert.equal(shouldNudge({ shown: 'yesterday', opened: {} }, now), true);
});

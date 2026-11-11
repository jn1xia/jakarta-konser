// tests/calendar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jakartaToday, upcoming, nextDate, dday, groupByMonth } from '../src/engine/calendar.js';
const bts = { id: 'bts', dates: ['2026-12-26', '2026-12-27', '2026-12-29'] };
const mit = { id: 'mit', dates: ['2026-11-12'] };

test('the day changes at midnight in Jakarta', () => {
  assert.equal(jakartaToday(new Date('2026-12-28T16:59:00Z')), '2026-12-28');
  assert.equal(jakartaToday(new Date('2026-12-28T17:30:00Z')), '2026-12-29');
});
test('a partly finished run is still upcoming and counts down to its next date', () => {
  assert.deepEqual(upcoming([bts, mit], '2026-12-28').map((s) => s.id), ['bts']);
  assert.equal(nextDate(bts, '2026-12-28'), '2026-12-29');
  assert.equal(dday('2026-12-29', '2026-12-28'), 1);
});
test('a show stays on its last day and goes the day after', () => {
  assert.equal(upcoming([bts], '2026-12-29').length, 1);
  assert.equal(upcoming([bts], '2026-12-30').length, 0);
});
test('shows are sorted and grouped by the month of their next date', () => {
  const g = groupByMonth([bts, mit], '2026-11-11');
  assert.deepEqual(g.map((x) => x.month), ['2026-11', '2026-12']);
});

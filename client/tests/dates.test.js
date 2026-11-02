import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, weekDates, addDays, historyStart, habitHistoryStart, dateRange, monthlyViewStart } from '../src/utils/dates.js';
test('weeks run Monday to Sunday across month boundaries', () => { assert.equal(weekStart('2026-11-01'),'2026-10-26'); assert.deepEqual(weekDates('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']); });
test('date strings handle leap days and year boundaries', () => { assert.equal(addDays('2024-02-28',1),'2024-02-29'); assert.equal(addDays('2026-12-31',1),'2027-01-01'); });

test('history begins at the earliest record, ignoring future dates', () => {
  assert.equal(historyStart(['2026-11-02', '2026-10-29', '2026-12-01'], '2026-11-02'), '2026-10-29');
  assert.equal(historyStart([], '2026-11-02'), '2026-11-02');
});

test('habit tracking uses entries of any status before falling back to habit creation', () => {
  const habits = [{ createdOn: '2026-01-01' }];
  assert.equal(habitHistoryStart({ a: { date: '2026-10-29', status: 'missed' } }, habits, '2026-11-02'), '2026-10-29');
  assert.equal(habitHistoryStart({}, habits, '2026-11-02'), '2026-01-01');
  assert.equal(habitHistoryStart({}, [], '2026-11-02'), '2026-11-02');
});

test('history includes gaps and today without adding days before the first record', () => {
  assert.deepEqual(dateRange('2024-02-28', '2024-03-01'), ['2024-02-28', '2024-02-29', '2024-03-01']);
  assert.deepEqual(dateRange('2026-11-02', '2026-11-02'), ['2026-11-02']);
  assert.deepEqual(dateRange('2026-10-19', '2026-11-02', 7), ['2026-10-19', '2026-10-26', '2026-11-02']);
  assert.equal(dateRange('2025-01-01', '2026-11-02')[0], '2025-01-01');
  assert.ok(dateRange('2025-01-01', '2026-11-02').length > 365);
});

test('monthly views reset on December 1 instead of including November', () => {
  for (const limit of [4, 10, 14, 15]) {
    const start = monthlyViewStart('2026-11-02', '2026-12-01', limit);
    assert.deepEqual(dateRange(start, '2026-12-01'), ['2026-12-01']);
  }
  assert.equal(monthlyViewStart('2026-11-02', '2027-01-01'), '2027-01-01');
});

test('display windows grow from two days up to each device or chart limit', () => {
  for (const limit of [4, 10, 14, 15]) {
    assert.equal(dateRange(monthlyViewStart('2026-11-01', '2026-11-02', limit), '2026-11-02').length, 2);
    assert.equal(dateRange(monthlyViewStart('2026-11-01', '2026-11-30', limit), '2026-11-30').length, limit);
    assert.equal(monthlyViewStart('2026-11-29', '2026-11-30', limit), '2026-11-29');
  }
});

test('a week crossing a month boundary only contributes current-month days', () => {
  const start = monthlyViewStart('2026-11-02', '2026-12-02');
  const days = weekDates(weekStart(start)).filter(day => day >= start && day <= '2026-12-02');
  assert.deepEqual(days, ['2026-12-01', '2026-12-02']);
});

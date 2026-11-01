import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, weekDates, addDays } from '../src/utils/dates.js';
test('weeks run Monday to Sunday across month boundaries', () => { assert.equal(weekStart('2026-11-01'),'2026-10-26'); assert.deepEqual(weekDates('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']); });
test('date strings handle leap days and year boundaries', () => { assert.equal(addDays('2024-02-28',1),'2024-02-29'); assert.equal(addDays('2026-12-31',1),'2027-01-01'); });

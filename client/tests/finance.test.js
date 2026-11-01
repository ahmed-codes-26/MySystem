import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRupees, formatMoney, spendingComparison } from '../src/utils/finance.js';

test('Finance entry accepts only safe whole rupees, with zero allowed for opening balances', () => {
  assert.equal(parseRupees('45000'), 45000);
  assert.equal(parseRupees('0', true), 0);
  for (const value of ['', ' ', '0', '-1', '1.5', '1e3', '45,000', '9007199254740992', 'Infinity']) assert.throws(() => parseRupees(value));
});
test('Finance money uses Pakistani grouping and spending comparison handles a zero baseline', () => {
  assert.equal(formatMoney(45000), 'Rs 45,000');
  assert.equal(formatMoney(1000000), 'Rs 1,000,000');
  assert.equal(spendingComparison(0, 0), 'Unchanged from last month');
  assert.equal(spendingComparison(100, 0), 'No spending last month');
  assert.equal(spendingComparison(112, 100), '12% more than last month');
  assert.equal(spendingComparison(80, 100), '20% less than last month');
});

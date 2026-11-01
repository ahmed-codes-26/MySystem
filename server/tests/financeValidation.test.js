import test from 'node:test';
import assert from 'node:assert/strict';
import { financeSchemas } from '../src/financeValidation.js';

const schemas = financeSchemas(() => '2026-11-01');
const expense = { type: 'expense', amount: 100, date: '2026-11-01', categoryId: 'food' };
test('strict Finance schemas reject client balances, metadata, decimals and future dates', () => {
  for (const body of [{ ...expense, amount: 0 }, { ...expense, amount: 1.5 }, { ...expense, amount: '100' }, { ...expense, date: '2026-11-02' }, { ...expense, date: '2026-02-30' }, { ...expense, categoryNameSnapshot: 'Spoofed' }, { ...expense, recurringId: 'spoofed' }, { ...expense, available: 999 }]) assert.equal(schemas.transaction.safeParse(body).success, false);
  assert.equal(schemas.transaction.safeParse(expense).success, true);
  assert.equal(schemas.transactionPatch.safeParse({}).success, false);
  assert.equal(schemas.transfer.safeParse({ bucket: 'savings', direction: 'in', amount: 10, date: expense.date, goalId: 'unexpected' }).success, false);
  assert.equal(schemas.transfer.safeParse({ bucket: 'goal', direction: 'in', amount: 10, date: expense.date }).success, false);
});
test('queries are bounded and unknown fields are rejected', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1000000' }, { month: '2026-13' }, { type: 'invalid' }, { unexpected: '1' }]) assert.equal(schemas.logQuery.safeParse(query).success, false);
  assert.deepEqual(schemas.logQuery.parse({ month: 'all', page: '2', search: ' [note] ' }), { month: 'all', page: 2, search: '[note]' });
});
test('all editable entities reject unknown or computed fields', () => {
  const cases = [
    ['settings', { openingAvailable: 0, openingSavings: 0, revision: 99 }],
    ['goal', { name: 'Goal', targetAmount: 100, saved: 100 }],
    ['goalPatch', { isArchived: true }],
    ['categoryPatch', { isArchived: true }],
    ['category', { name: 'Category', kind: 'expense', order: -1 }],
    ['category', { name: 'Category', kind: 'income', order: 1.5 }],
    ['recurring', { name: 'Bill', amount: 10, categoryId: 'bills', dueDay: 32 }],
    ['owed', { person: 'Person', direction: 'i_owe', amount: 10, amountPaid: 10 }],
    ['payment', { amount: 0 }],
    ['pay', { period: '2026-11', amount: -1 }],
    ['budget', { limit: 0 }],
    ['empty', { hidden: true }],
  ];
  for (const [name, body] of cases) assert.equal(schemas[name].safeParse(body).success, false, name);
});

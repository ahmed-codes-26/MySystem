import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMoney, assertDate, monthBounds, calculateBalances, assertTransferAllowed, assertBucketBalances, monthlySpending, recurringDueDate, recurringStatus, assertRecurringUnpaid, financeOverview, budgetProgress, owedRemaining } from '../src/financeService.js';
import { FinanceSettings, FinanceTransaction, FinanceGoal, FinanceBudget, FinanceRecurring, FinanceOwed, defaultFinanceCategories } from '../src/financeModels.js';

const expense = (amount, date = '2026-11-01', extra = {}) => ({ type: 'expense', amount, date, categoryId: 'food', categoryNameSnapshot: 'Food', ...extra });
const transfer = (amount, bucket = 'savings', direction = 'in', extra = {}) => ({ type: 'transfer', date: '2026-11-01', amount, bucket, direction, ...extra });

test('owed remaining is computed for partial payments and settled records and rejects overpayments', () => {
  assert.equal(owedRemaining({ amount: 100 }), 100);
  assert.equal(owedRemaining({ amount: 100, amountPaid: 40 }), 60);
  assert.equal(owedRemaining({ amount: 100, amountPaid: 100, isSettled: true }), 0);
  assert.throws(() => owedRemaining({ amount: 100, amountPaid: 101 }));
  assert.throws(() => owedRemaining({ amount: 100, amountPaid: -1 }));
});

test('budget boundaries distinguish no limit, empty spending, exactly full and over budget', () => {
  assert.deepEqual(budgetProgress(undefined, 200), { limit: null, spent: 200, percent: 0, isOverBudget: false });
  assert.deepEqual(budgetProgress(100, 0), { limit: 100, spent: 0, percent: 0, isOverBudget: false });
  assert.deepEqual(budgetProgress(100, 75), { limit: 100, spent: 75, percent: 75, isOverBudget: false });
  assert.deepEqual(budgetProgress(100, 100), { limit: 100, spent: 100, percent: 100, isOverBudget: false });
  assert.deepEqual(budgetProgress(100, 101), { limit: 100, spent: 101, percent: 100, isOverBudget: true });
  for (const limit of [0, -1, 1.5]) assert.throws(() => budgetProgress(limit, 0));
});

test('budget limits repeat while selected-month spending excludes income and transfers', () => {
  const data = { settings: {}, categories: [{ id: 'food', name: 'Food', kind: 'expense' }], budgets: [{ categoryId: 'food', limit: 100 }], transactions: [expense(80, '2026-10-31'), expense(120, '2026-11-01'), transfer(500), { type: 'income', amount: 1000, date: '2026-11-01', categoryId: 'food' }], today: '2026-11-01' };
  const october = financeOverview({ ...data, month: '2026-10' }).budgets[0];
  const november = financeOverview({ ...data, month: '2026-11' }).budgets[0];
  assert.equal(october.limit, november.limit);
  assert.equal(october.spent, 80);
  assert.equal(october.isOverBudget, false);
  assert.equal(november.spent, 120);
  assert.equal(november.isOverBudget, true);
  assert.equal(november.percent, 100);
});

test('balances separate available, savings and goal buckets across all months', () => {
  const transactions = [{ type: 'income', amount: 1000 }, expense(300, '2026-10-01'), transfer(200), transfer(50, 'savings', 'out'), transfer(150, 'goal', 'in', { goalId: 'laptop' }), transfer(20, 'goal', 'out', { goalId: 'laptop' })];
  assert.deepEqual(calculateBalances({ openingAvailable: 500, openingSavings: 100 }, transactions), { available: 920, savings: 250, goals: { laptop: 130 } });
});

test('only expenses count as spending; month boundaries exclude adjacent months', () => {
  const rows = [expense(10, '2026-10-31'), expense(20), expense(30, '2026-11-30'), expense(40, '2026-12-01'), transfer(500), { type: 'income', amount: 1000, date: '2026-11-01' }];
  assert.deepEqual(monthlySpending(rows, '2026-11'), { total: 50, byCategory: { food: 50 } });
  assert.deepEqual(monthBounds('2027-01'), { start: '2027-01-01', end: '2027-02-01', previous: '2026-12' });
  assert.equal(monthlySpending([expense(8, '2024-02-29')], '2024-02').total, 8);
});

test('transfer guards reject overdraws for available and each bucket', () => {
  const balances = { available: 100, savings: 80, goals: { laptop: 60 } };
  for (const transaction of [transfer(101), transfer(81, 'savings', 'out'), transfer(61, 'goal', 'out', { goalId: 'laptop' }), transfer(1, 'goal', 'out', { goalId: 'missing' })]) assert.throws(() => assertTransferAllowed(transaction, balances), { status: 409 });
  assert.doesNotThrow(() => assertTransferAllowed(transfer(100), balances));
  assert.throws(() => assertBucketBalances({ savings: 0, goals: { laptop: -1 } }), { status: 409 });
  assert.throws(() => assertBucketBalances({ savings: -1, goals: {} }), { status: 409 });
});

test('rupees reject decimals, zero, negatives, unsafe totals and non-numbers', () => {
  for (const amount of [0, -1, 0.25, '100', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => assertMoney(amount));
  assert.equal(assertMoney(0, true), 0);
  assert.throws(() => calculateBalances({ openingAvailable: Number.MAX_SAFE_INTEGER }, [{ type: 'income', amount: 1 }]));
});

test('dates reject invalid calendar dates, future dates and malformed months', () => {
  for (const value of ['2026-02-29', '2026-04-31', '2026-1-01', '2026-13-01', '2026-11-02']) assert.throws(() => assertDate(value, '2026-11-01'));
  assert.equal(assertDate('2024-02-29', '2026-11-01'), '2024-02-29');
  for (const month of ['2026-00', '2026-13', '2026-1']) assert.throws(() => monthBounds(month));
});

test('recurring due days clamp to short months and statuses cross year boundaries', () => {
  assert.equal(recurringDueDate('2026-02', 31), '2026-02-28');
  assert.equal(recurringDueDate('2024-02', 31), '2024-02-29');
  assert.equal(recurringDueDate('2026-04', 31), '2026-04-30');
  const item = { id: 'rent', dueDay: 5 };
  assert.equal(recurringStatus(item, '2027-01', [], '2026-12-30').status, 'Due soon');
  assert.equal(recurringStatus(item, '2027-01', [], '2026-12-01').status, 'Upcoming');
  assert.equal(recurringStatus(item, '2027-01', [], '2027-01-06').status, 'Overdue');
  assert.equal(recurringStatus(item, '2027-01', [], '2027-01-05').status, 'Due soon');
});

test('paid-once guard and status use recurring period; deletion makes it unpaid', () => {
  const paid = expense(100, '2026-11-01', { recurringId: 'rent', recurringPeriod: '2026-10' });
  assert.throws(() => assertRecurringUnpaid([paid], 'rent', '2026-10'), { status: 409 });
  assert.doesNotThrow(() => assertRecurringUnpaid([paid], 'rent', '2026-11'));
  assert.equal(recurringStatus({ id: 'rent', dueDay: 1 }, '2026-10', [paid], '2026-11-01').status, 'Paid');
  assert.equal(recurringStatus({ id: 'rent', dueDay: 1 }, '2026-10', [], '2026-11-01').status, 'Overdue');
});

test('overview keeps archived category spending, caps budget progress and separates owed', () => {
  const result = financeOverview({ settings: { openingAvailable: 1000 }, transactions: [expense(150), expense(50, '2026-10-31')], categories: [{ id: 'food', name: 'Food renamed', kind: 'expense', isArchived: true }, { id: 'other', name: 'Other', kind: 'expense' }], budgets: [{ categoryId: 'food', limit: 100 }], owed: [{ amount: 500, amountPaid: 100, direction: 'i_owe' }, { amount: 200, amountPaid: 0, direction: 'owed_to_me' }, { amount: 900, amountPaid: 900, direction: 'i_owe', isSettled: true }], month: '2026-11', today: '2026-11-01' });
  assert.equal(result.available, 800);
  assert.equal(result.previousMonthSpent, 50);
  assert.deepEqual(result.owed, { iOwe: 400, owedToMe: 200 });
  assert.equal(result.budgets[0].spent, 150);
  assert.equal(result.budgets[0].percent, 100);
  assert.equal(result.budgets[0].isOverBudget, true);
  assert.equal(result.budgets[1].limit, null);
});

test('goal saved and reached values derive from transfers without touching savings', () => {
  const result = financeOverview({ settings: { openingAvailable: 500 }, transactions: [transfer(100, 'goal', 'in', { goalId: 'laptop' })], goals: [{ id: 'laptop', targetAmount: 80 }, { id: 'old', targetAmount: 200, isArchived: true }], month: '2026-11', today: '2026-11-01' });
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].saved, 100);
  assert.equal(result.goals[0].percent, 100);
  assert.equal(result.goals[0].reached, true);
  assert.equal(result.savings, 0);
});

test('Mongoose models validate ledger variants without database access', async () => {
  await new FinanceTransaction(expense(20)).validate();
  await new FinanceGoal({ name: 'Laptop', targetAmount: 100 }).validate();
  await new FinanceTransaction(transfer(20)).validate();
  for (const row of [expense(0), expense(1.5), expense(20, '2026-02-30'), transfer(20, 'goal'), { ...transfer(20), categoryId: 'food' }, expense(20, undefined, { recurringId: 'rent' }), { ...expense(20), type: 'income', recurringId: 'rent', recurringPeriod: '2026-11' }]) await assert.rejects(new FinanceTransaction(row).validate());
  assert.throws(() => new FinanceTransaction({ ...expense(20), arbitrary: 1 }));
  assert.throws(() => new FinanceSettings({ _id: 'another', arbitrary: 1 }));
  await assert.rejects(new FinanceSettings({ _id: 'another' }).validate());
  await assert.rejects(new FinanceGoal({ name: 'Laptop', targetAmount: 0 }).validate());
  await assert.rejects(new FinanceBudget({ categoryId: 'food', limit: 0 }).validate());
  await assert.rejects(new FinanceRecurring({ name: 'Rent', categoryId: 'food', amount: 100, dueDay: 1.5 }).validate());
  await assert.rejects(new FinanceOwed({ person: 'Person', direction: 'i_owe', amount: 10, amountPaid: 11, createdOn: '2026-11-01' }).validate());
});

test('recurring uniqueness is scoped to present metadata; defaults have stable seed IDs', () => {
  const index = FinanceTransaction.schema.indexes().find(([fields, options]) => fields.recurringId && options.unique);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { recurringId: { $type: 'string' }, recurringPeriod: { $type: 'string' } });
  assert.equal(new Set(defaultFinanceCategories.map(category => category.id)).size, 8);
});

import { FinanceTransaction, FinanceSettings, FinanceCategory, FinanceGoal, FinanceBudget, FinanceRecurring, FinanceOwed } from './financeModels.js';
import { calculateBalances, monthBounds } from './financeService.js';

const groupedBalances = { $group: { _id: { type: '$type', bucket: '$bucket', direction: '$direction', goalId: '$goalId' }, amount: { $sum: '$amount' } } };
const balances = (settings, groups) => calculateBalances(settings, groups.map(group => ({ ...group._id, amount: group.amount })));

export async function readBalanceSnapshot(session, settings) {
  const groups = await FinanceTransaction.aggregate([groupedBalances]).session(session).option({ maxTimeMS: 10000 });
  return balances(settings, groups);
}

function ledgerFacet(month) {
  const period = monthBounds(month), previous = monthBounds(period.previous);
  // One database read returns grouped totals, not every note and ledger document.
  // The existing pure service still validates and computes all money values.
  return { $facet: {
    balances: [groupedBalances],
    spending: [{ $match: { type: 'expense', date: { $gte: previous.start, $lt: period.end } } }, { $group: { _id: { month: { $substrBytes: ['$date', 0, 7] }, categoryId: '$categoryId' }, amount: { $sum: '$amount' } } }],
    paid: [{ $match: { recurringPeriod: month } }, { $project: { _id: 0, recurringId: 1, recurringPeriod: 1 } }],
  } };
}
function unpackLedger(settings, result) {
  return {
    balances: balances(settings, result.balances),
    transactions: [...result.spending.map(group => ({ type: 'expense', amount: group.amount, date: `${group._id.month}-01`, categoryId: group._id.categoryId })), ...result.paid],
  };
}
export async function readOverviewLedger(session, settings, month) {
  const [result] = await FinanceTransaction.aggregate([ledgerFacet(month)]).session(session).option({ maxTimeMS: 10000 });
  return unpackLedger(settings, result);
}

export async function readOverviewSnapshot(session, month) {
  // Uncorrelated lookups share one snapshot and one database round trip.
  const [result] = await FinanceSettings.aggregate([
    { $match: { _id: 'finance' } },
    { $lookup: { from: FinanceTransaction.collection.name, pipeline: [ledgerFacet(month)], as: 'ledger' } },
    { $lookup: { from: FinanceCategory.collection.name, pipeline: [{ $sort: { order: 1, name: 1 } }], as: 'categories' } },
    { $lookup: { from: FinanceGoal.collection.name, pipeline: [{ $match: { isArchived: false } }, { $sort: { order: 1, name: 1 } }], as: 'goals' } },
    { $lookup: { from: FinanceBudget.collection.name, pipeline: [], as: 'budgets' } },
    { $lookup: { from: FinanceRecurring.collection.name, pipeline: [{ $match: { isActive: true } }], as: 'recurring' } },
    { $lookup: { from: FinanceOwed.collection.name, pipeline: [{ $project: { _id: 0, amount: 1, amountPaid: 1, direction: 1, isSettled: 1 } }], as: 'owed' } },
  ]).session(session).option({ maxTimeMS: 10000 });
  const settings = { openingAvailable: result.openingAvailable, openingSavings: result.openingSavings, setupCompleted: result.setupCompleted };
  const summary = unpackLedger(settings, result.ledger[0]);
  const clean = ({ _id, __v, ...item }) => item;
  return { settings, transactions: summary.transactions, balanceSnapshot: summary.balances, categories: result.categories.map(clean), goals: result.goals.map(clean), budgets: result.budgets.map(clean), recurring: result.recurring.map(clean), owed: result.owed };
}

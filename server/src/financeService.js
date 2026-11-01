import dayjs from 'dayjs';

export function financeError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function assertMoney(value, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw financeError(`Enter a ${allowZero ? 'non-negative' : 'positive'} whole-rupee amount.`);
  }
  return value;
}

export function assertDate(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !dayjs(value).isValid() || dayjs(value).format('YYYY-MM-DD') !== value || (today && value > today)) {
    throw financeError('Choose a valid date up to today.');
  }
  return value;
}

export function monthBounds(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw financeError('Choose a valid month.');
  const start = `${month}-01`;
  assertDate(start);
  return { start, end: dayjs(start).add(1, 'month').format('YYYY-MM-DD'), previous: dayjs(start).subtract(1, 'month').format('YYYY-MM') };
}

function addMoney(a, b) {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw financeError('The balance exceeds the supported rupee range.');
  return result;
}

// Every balance derives from the ledger. Goal balances never enter general savings.
export function calculateBalances(settings = {}, transactions = []) {
  let available = assertMoney(settings.openingAvailable ?? 0, true);
  let savings = assertMoney(settings.openingSavings ?? 0, true);
  const goals = {};
  for (const transaction of transactions) {
    const amount = assertMoney(transaction.amount);
    if (transaction.type === 'income') available = addMoney(available, amount);
    else if (transaction.type === 'expense') available = addMoney(available, -amount);
    else if (transaction.type === 'transfer') {
      if (!['in', 'out'].includes(transaction.direction) || !['savings', 'goal'].includes(transaction.bucket) || (transaction.bucket === 'goal' && !transaction.goalId)) throw financeError('Invalid transfer.');
      const delta = transaction.direction === 'in' ? amount : -amount;
      available = addMoney(available, -delta);
      if (transaction.bucket === 'savings') savings = addMoney(savings, delta);
      else goals[transaction.goalId] = addMoney(goals[transaction.goalId] || 0, delta);
    } else throw financeError('Invalid transaction type.');
  }
  return { available, savings, goals };
}

export function assertTransferAllowed(transfer, balances) {
  assertMoney(transfer.amount);
  if (!['in', 'out'].includes(transfer.direction) || !['savings', 'goal'].includes(transfer.bucket) || (transfer.bucket === 'goal' && !transfer.goalId)) throw financeError('Invalid transfer.');
  const balance = transfer.direction === 'in' ? balances.available : transfer.bucket === 'savings' ? balances.savings : balances.goals[transfer.goalId] || 0;
  if (transfer.amount > balance) throw financeError(transfer.direction === 'in' ? 'Not enough Available money.' : 'Not enough money in this bucket.', 409);
}

export function assertBucketBalances(balances) {
  // Expenses can exceed income; savings and goal buckets must never be overdrawn.
  if (balances.savings < 0 || Object.values(balances.goals).some(amount => amount < 0)) throw financeError('This change would overdraw savings or a goal.', 409);
}

export function monthlySpending(transactions, month) {
  const { start, end } = monthBounds(month);
  const byCategory = {};
  let total = 0;
  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || transaction.date < start || transaction.date >= end) continue;
    total = addMoney(total, assertMoney(transaction.amount));
    byCategory[transaction.categoryId] = addMoney(byCategory[transaction.categoryId] || 0, transaction.amount);
  }
  return { total, byCategory };
}

export function budgetProgress(limit, spent) {
  if (limit == null) return { limit: null, spent, percent: 0, isOverBudget: false };
  assertMoney(limit);
  return { limit, spent, percent: Math.min(100, spent / limit * 100), isOverBudget: spent > limit };
}

export function recurringDueDate(month, dueDay) {
  const { start } = monthBounds(month);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw financeError('Due day must be between 1 and 31.');
  return dayjs(start).date(Math.min(dueDay, dayjs(start).daysInMonth())).format('YYYY-MM-DD');
}

export function assertRecurringUnpaid(transactions, recurringId, period) {
  monthBounds(period);
  if (transactions.some(transaction => transaction.recurringId === recurringId && transaction.recurringPeriod === period)) throw financeError('Already paid for this month.', 409);
}

export function recurringStatus(item, month, transactions, today) {
  const dueDate = recurringDueDate(month, item.dueDay);
  if (transactions.some(transaction => transaction.recurringId === item.id && transaction.recurringPeriod === month)) return { dueDate, status: 'Paid' };
  if (dueDate < today) return { dueDate, status: 'Overdue' };
  return { dueDate, status: dueDate <= dayjs(today).add(7, 'day').format('YYYY-MM-DD') ? 'Due soon' : 'Upcoming' };
}

export function owedRemaining(item) {
  assertMoney(item.amount);
  assertMoney(item.amountPaid ?? 0, true);
  if ((item.amountPaid ?? 0) > item.amount) throw financeError('Payment exceeds the amount owed.');
  return item.isSettled ? 0 : item.amount - (item.amountPaid || 0);
}

export function owedTotals(items) {
  return items.reduce((totals, item) => {
    const remaining = owedRemaining(item);
    if (!item.isSettled) {
      const key = item.direction === 'i_owe' ? 'iOwe' : item.direction === 'owed_to_me' ? 'owedToMe' : null;
      if (!key) throw financeError('Invalid owed direction.');
      totals[key] = addMoney(totals[key], remaining);
    }
    return totals;
  }, { iOwe: 0, owedToMe: 0 });
}

export function financeOverview({ settings, transactions = [], categories = [], goals = [], budgets = [], recurring = [], owed = [], month, today, balanceSnapshot }) {
  const balances = balanceSnapshot || calculateBalances(settings, transactions);
  const spending = monthlySpending(transactions, month);
  const previousMonthSpent = monthlySpending(transactions, monthBounds(month).previous).total;
  const limits = new Map(budgets.map(budget => [budget.categoryId, budget.limit]));
  return {
    today, month, available: balances.available, savings: balances.savings,
    spentThisMonth: spending.total, previousMonthSpent, owed: owedTotals(owed),
    goals: goals.filter(goal => !goal.isArchived).map(goal => ({ ...goal, saved: balances.goals[goal.id] || 0, percent: Math.min(100, (balances.goals[goal.id] || 0) / goal.targetAmount * 100), reached: (balances.goals[goal.id] || 0) >= goal.targetAmount })),
    // Archived categories with budgets or spending stay visible in historical months.
    budgets: categories.filter(category => category.kind === 'expense' && (!category.isArchived || limits.has(category.id) || spending.byCategory[category.id])).map(category => ({ categoryId: category.id, categoryName: category.name, isArchived: category.isArchived, ...budgetProgress(limits.get(category.id), spending.byCategory[category.id] || 0) })),
    recurring: recurring.filter(item => item.isActive).map(item => ({ ...item, ...recurringStatus(item, month, transactions, today) })),
  };
}

import { Router } from 'express';
import mongoose from 'mongoose';
import { today } from './dates.js';
import { financeSchemas } from './financeValidation.js';
import { readBalanceSnapshot, readOverviewSnapshot } from './financeRepository.js';
import { FinanceSettings as Settings, FinanceCategory as Category, FinanceTransaction as Transaction, FinanceGoal as Goal, FinanceBudget as Budget, FinanceRecurring as Recurring, FinanceOwed as Owed, initializeFinance, withFinanceWrite } from './financeModels.js';
import { calculateBalances, assertTransferAllowed, assertBucketBalances, assertRecurringUnpaid, financeOverview, financeError, monthBounds, recurringStatus, owedRemaining } from './financeService.js';

export const financeRouter = Router();
const schema = financeSchemas(today);
const clean = value => { const { _id, __v, ...data } = value.toObject ? value.toObject() : value; return data; };
const rows = async (Model, session, filter = {}) => (await Model.find(filter).session(session).lean()).map(clean);
async function find(Model, id, session) {
  const item = await Model.findOne({ id }).session(session);
  if (!item) throw financeError('Record not found.', 404);
  return item;
}
async function categoryFor(id, kind, session, previous) {
  const item = await find(Category, id, session);
  if (item.kind !== kind || (item.isArchived && id !== previous)) throw financeError('Choose an active category of the correct type.');
  return item;
}
async function ledger(session, settings) {
  return { balances: await readBalanceSnapshot(session, settings) };
}
async function reconcileGoals(session, settings) {
  const { balances } = await ledger(session, settings);
  assertBucketBalances(balances);
  const goals = await Goal.find().session(session);
  for (const [id, amount] of Object.entries(balances.goals)) {
    if (amount > 0 && !goals.some(goal => goal.id === id && !goal.isArchived)) throw financeError('This change would leave money in an archived or deleted goal.', 409);
  }
  for (const goal of goals) {
    const reached = (balances.goals[goal.id] || 0) >= goal.targetAmount;
    const completedOn = reached ? goal.completedOn || today() : null;
    if (goal.completedOn !== completedOn) { goal.completedOn = completedOn; await goal.save({ session }); }
  }
}
const empty = req => schema.empty.parse(req.body ?? {});
const write = (handler, status = 200) => async (req, res) => {
  const result = await withFinanceWrite((session, settings) => handler(req, session, settings));
  res.status(status).json(result);
};

// Initialized only after authentication; indexes exist before transactional writes.
financeRouter.use(async (_req, _res, next) => { await initializeFinance(); next(); });
financeRouter.get('/settings', async (_req, res) => res.json(clean(await Settings.findById('finance'))));
financeRouter.put('/settings', write(async (req, session, settings) => {
  const data = schema.settings.parse(req.body);
  Object.assign(settings, data, { setupCompleted: data.setupCompleted ?? true });
  const { balances } = await ledger(session, settings);
  assertBucketBalances(balances);
  await settings.save({ session });
  return clean(settings);
}));
financeRouter.get('/overview', async (req, res) => {
  const { month = today().slice(0, 7) } = schema.monthQuery.parse(req.query);
  // A snapshot keeps all cards and sections consistent with concurrent writes.
  const result = await mongoose.connection.transaction(async session => {
    const data = await readOverviewSnapshot(session, month);
    return { ...financeOverview({ ...data, month, today: today() }), settings: data.settings };
  }, { readConcern: { level: 'snapshot' } });
  res.json(result);
});

financeRouter.get('/categories', async (_req, res) => res.json((await Category.find().sort({ kind: 1, order: 1, name: 1 })).map(clean)));
financeRouter.post('/categories', write(async (req, session) => clean((await Category.create([schema.category.parse(req.body)], { session }))[0]), 201));
financeRouter.patch('/categories/:id', write(async (req, session) => {
  const data = schema.categoryPatch.parse(req.body), item = await find(Category, req.params.id, session);
  if (data.kind && data.kind !== item.kind && (await Transaction.exists({ categoryId: item.id }).session(session) || await Recurring.exists({ categoryId: item.id }).session(session) || await Budget.exists({ categoryId: item.id }).session(session))) throw financeError('A category with history, a budget or recurring items cannot change type.', 409);
  Object.assign(item, data); await item.save({ session }); return clean(item);
}));
financeRouter.post('/categories/:id/archive', write(async (req, session) => {
  empty(req); const item = await find(Category, req.params.id, session);
  item.isArchived = true; await item.save({ session }); return clean(item);
}));

financeRouter.get('/transactions', async (req, res) => {
  const query = schema.logQuery.parse(req.query), filter = {};
  if (query.month !== 'all') { const { start, end } = monthBounds(query.month || today().slice(0, 7)); filter.date = { $gte: start, $lt: end }; }
  if (query.category) filter.categoryId = query.category;
  if (query.type) filter.type = query.type;
  if (query.search) filter.note = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const page = query.page || 1;
  const result = await mongoose.connection.transaction(async session => {
    const total = await Transaction.countDocuments(filter).session(session);
    const items = await Transaction.find(filter).sort({ date: -1, createdAt: -1, id: -1 }).skip((page - 1) * 20).limit(20).session(session);
    return { items: items.map(clean), total, page, pageSize: 20, pages: Math.ceil(total / 20) };
  }, { readConcern: { level: 'snapshot' } });
  res.json(result);
});
financeRouter.post('/transactions', write(async (req, session, settings) => {
  const data = schema.transaction.parse(req.body), category = await categoryFor(data.categoryId, data.type, session);
  const item = (await Transaction.create([{ ...data, categoryNameSnapshot: category.name }], { session }))[0];
  await reconcileGoals(session, settings); return clean(item);
}, 201));
financeRouter.patch('/transactions/:id', write(async (req, session, settings) => {
  const changes = schema.transactionPatch.parse(req.body), item = await find(Transaction, req.params.id, session);
  if (item.type === 'transfer') throw financeError('Transfers cannot be edited.', 409);
  if (item.recurringId && changes.type === 'income') throw financeError('Recurring payments must remain expenses.');
  const category = await categoryFor(changes.categoryId || item.categoryId, changes.type || item.type, session, item.categoryId);
  if (changes.categoryId && changes.categoryId !== item.categoryId) item.categoryNameSnapshot = category.name;
  Object.assign(item, changes); await item.save({ session });
  await reconcileGoals(session, settings); return clean(item);
}));
async function removeTransaction(req, session, settings, transfersOnly = false) {
  empty(req); const item = await find(Transaction, req.params.id, session);
  if (transfersOnly && item.type !== 'transfer') throw financeError('Transfer not found.', 404);
  await item.deleteOne({ session });
  await reconcileGoals(session, settings);
  return { ok: true };
}
financeRouter.delete('/transactions/:id', write(removeTransaction));
financeRouter.post('/transfers', write(async (req, session, settings) => {
  const data = schema.transfer.parse(req.body);
  if (data.bucket === 'goal') { const goal = await find(Goal, data.goalId, session); if (goal.isArchived) throw financeError('This goal is archived.', 409); }
  const { balances } = await ledger(session, settings);
  assertTransferAllowed(data, balances);
  const item = (await Transaction.create([{ ...data, type: 'transfer' }], { session }))[0];
  await reconcileGoals(session, settings); return clean(item);
}, 201));
financeRouter.delete('/transfers/:id', write((req, session, settings) => removeTransaction(req, session, settings, true)));

financeRouter.get('/goals', async (_req, res) => {
  const result = await mongoose.connection.transaction(async session => {
    const settings = await Settings.findById('finance').session(session), { balances } = await ledger(session, settings);
    return (await Goal.find().sort({ order: 1, createdAt: 1 }).session(session)).map(goal => ({ ...clean(goal), saved: balances.goals[goal.id] || 0 }));
  }, { readConcern: { level: 'snapshot' } });
  res.json(result);
});
financeRouter.post('/goals', write(async (req, session) => clean((await Goal.create([schema.goal.parse(req.body)], { session }))[0]), 201));
financeRouter.patch('/goals/:id', write(async (req, session, settings) => {
  const data = schema.goalPatch.parse(req.body), goal = await find(Goal, req.params.id, session);
  Object.assign(goal, data); await goal.save({ session }); await reconcileGoals(session, settings);
  return clean(await find(Goal, goal.id, session));
}));
financeRouter.post('/goals/:id/archive', write(async (req, session, settings) => {
  const data = schema.goalClose.parse(req.body ?? {}), goal = await find(Goal, req.params.id, session);
  const { balances } = await ledger(session, settings), saved = balances.goals[goal.id] || 0;
  if (saved > 0 && !data.returnMoney) throw financeError('Confirm returning this goal’s money to Available first.', 409);
  if (saved > 0) await Transaction.create([{ type: 'transfer', bucket: 'goal', goalId: goal.id, direction: 'out', amount: saved, date: today(), note: `Return money from ${goal.name}` }], { session });
  if (data.delete) await goal.deleteOne({ session });
  else { goal.isArchived = true; goal.completedOn = null; await goal.save({ session }); }
  await reconcileGoals(session, settings); return { ok: true };
}));

financeRouter.put('/budgets/:categoryId', write(async (req, session) => {
  const data = schema.budget.parse(req.body); await categoryFor(req.params.categoryId, 'expense', session);
  return clean(await Budget.findOneAndUpdate({ categoryId: req.params.categoryId }, { $set: data }, { upsert: true, new: true, runValidators: true, session }));
}));
financeRouter.delete('/budgets/:categoryId', write(async (req, session) => { empty(req); await Budget.deleteOne({ categoryId: req.params.categoryId }, { session }); return { ok: true }; }));

financeRouter.get('/recurring', async (req, res) => {
  const { month = today().slice(0, 7) } = schema.monthQuery.parse(req.query);
  const result = await mongoose.connection.transaction(async session => {
    const transactions = await rows(Transaction, session, { recurringPeriod: month });
    return (await rows(Recurring, session)).map(item => ({ ...item, ...recurringStatus(item, month, transactions, today()) }));
  }, { readConcern: { level: 'snapshot' } });
  res.json(result);
});
financeRouter.post('/recurring', write(async (req, session) => {
  const data = schema.recurring.parse(req.body); await categoryFor(data.categoryId, 'expense', session);
  return clean((await Recurring.create([data], { session }))[0]);
}, 201));
financeRouter.patch('/recurring/:id', write(async (req, session) => {
  const data = schema.recurringPatch.parse(req.body), item = await find(Recurring, req.params.id, session);
  await categoryFor(data.categoryId || item.categoryId, 'expense', session, item.categoryId);
  Object.assign(item, data); await item.save({ session }); return clean(item);
}));
financeRouter.delete('/recurring/:id', write(async (req, session) => { empty(req); const item = await find(Recurring, req.params.id, session); await item.deleteOne({ session }); return { ok: true }; }));
financeRouter.post('/recurring/:id/pay', write(async (req, session, settings) => {
  const data = schema.pay.parse(req.body), item = await find(Recurring, req.params.id, session);
  if (!item.isActive) throw financeError('This recurring item is inactive.', 409);
  if (data.period > today().slice(0, 7)) throw financeError('Cannot pay a future recurring period.');
  const category = await categoryFor(item.categoryId, 'expense', session);
  const transactions = await rows(Transaction, session, { recurringId: item.id, recurringPeriod: data.period });
  assertRecurringUnpaid(transactions, item.id, data.period);
  const payment = (await Transaction.create([{ type: 'expense', amount: data.amount ?? item.amount, date: data.date ?? today(), categoryId: category.id, categoryNameSnapshot: category.name, note: item.name, recurringId: item.id, recurringPeriod: data.period }], { session }))[0];
  await reconcileGoals(session, settings); return clean(payment);
}, 201));

financeRouter.get('/owed', async (_req, res) => res.json((await Owed.find().sort({ isSettled: 1, createdOn: -1, createdAt: -1 })).map(item => ({ ...clean(item), remaining: owedRemaining(item) }))));
financeRouter.post('/owed', write(async (req, session) => {
  const data = schema.owed.parse(req.body);
  return clean((await Owed.create([{ ...data, createdOn: data.createdOn ?? today() }], { session }))[0]);
}, 201));
financeRouter.patch('/owed/:id', write(async (req, session) => {
  const data = schema.owedPatch.parse(req.body), item = await find(Owed, req.params.id, session);
  if (data.amount != null && data.amount < item.amountPaid) throw financeError('Amount cannot be less than payments already recorded.');
  Object.assign(item, data); item.isSettled = item.amountPaid === item.amount;
  await item.save({ session }); return clean(item);
}));
financeRouter.post('/owed/:id/payment', write(async (req, session) => {
  const { amount } = schema.payment.parse(req.body), item = await find(Owed, req.params.id, session);
  if (item.isSettled || amount > item.amount - item.amountPaid) throw financeError('Payment exceeds the outstanding amount.', 409);
  item.amountPaid += amount; item.isSettled = item.amountPaid === item.amount;
  await item.save({ session }); return clean(item);
}));
financeRouter.post('/owed/:id/settle', write(async (req, session) => {
  empty(req); const item = await find(Owed, req.params.id, session);
  item.amountPaid = item.amount; item.isSettled = true; await item.save({ session }); return clean(item);
}));
financeRouter.delete('/owed/:id', write(async (req, session) => { empty(req); const item = await find(Owed, req.params.id, session); await item.deleteOne({ session }); return { ok: true }; }));

financeRouter.use((error, _req, _res, next) => {
  // A unique index remains the final safeguard if two recurring payments race.
  if (error.code === 11000) return next(financeError('This record already exists or this recurring period is already paid.', 409));
  next(error);
});

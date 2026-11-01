import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { assertDate } from './financeService.js';

const { Schema, model } = mongoose;
const options = { timestamps: true, strict: 'throw' };
const id = () => ({ type: String, required: true, unique: true, default: () => randomUUID(), immutable: true });
const text = (max = 100) => ({ type: String, trim: true, required: true, maxlength: max });
const money = (allowZero = false) => ({ type: Number, required: true, min: allowZero ? 0 : 1, validate: Number.isSafeInteger });
const calendarDate = () => ({ type: String, required: true, validate: value => { if (value == null) return true; try { assertDate(value); return true; } catch { return false; } } });

export const FinanceSettings = model('FinanceSettings', new Schema({
  _id: { type: String, enum: ['finance'], default: 'finance' },
  openingAvailable: { ...money(true), default: 0 },
  openingSavings: { ...money(true), default: 0 },
  setupCompleted: { type: Boolean, default: false },
  revision: { type: Number, default: 0 },
}, options));

const category = new Schema({ id: id(), name: text(), kind: { type: String, enum: ['expense', 'income'], required: true }, order: { type: Number, default: 0 }, isArchived: { type: Boolean, default: false } }, options);
export const FinanceCategory = model('FinanceCategory', category);

const transaction = new Schema({
  id: id(), type: { type: String, enum: ['expense', 'income', 'transfer'], required: true, index: true },
  date: { ...calendarDate(), index: true }, amount: money(),
  categoryId: { type: String, index: true }, categoryNameSnapshot: { type: String, maxlength: 100 },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  recurringId: String, recurringPeriod: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  bucket: { type: String, enum: ['savings', 'goal'] }, direction: { type: String, enum: ['in', 'out'] }, goalId: String,
}, options);
transaction.pre('validate', function () {
  const transfer = this.type === 'transfer';
  if (transfer) {
    if (!this.bucket || !this.direction || (this.bucket === 'goal' && !this.goalId)) this.invalidate('bucket', 'A transfer requires a bucket, direction and goal when applicable.');
    for (const field of ['categoryId', 'categoryNameSnapshot', 'recurringId', 'recurringPeriod']) if (this[field] != null) this.invalidate(field, 'Transfers cannot have categories or recurring metadata.');
    if (this.bucket === 'savings' && this.goalId != null) this.invalidate('goalId', 'Savings cannot reference a goal.');
  } else {
    if (!this.categoryId || !this.categoryNameSnapshot) this.invalidate('categoryId', 'A category and name snapshot are required.');
    for (const field of ['bucket', 'direction', 'goalId']) if (this[field] != null) this.invalidate(field, 'Only transfers can reference buckets.');
    if ((this.recurringId != null) !== (this.recurringPeriod != null) || (this.recurringId != null && this.type !== 'expense')) this.invalidate('recurringId', 'Recurring metadata must be paired on an expense.');
  }
});
transaction.index({ date: -1, createdAt: -1, id: -1 });
transaction.index({ type: 1, date: -1, createdAt: -1, id: -1 });
transaction.index({ categoryId: 1, date: -1, createdAt: -1, id: -1 });
transaction.index({ recurringPeriod: 1, recurringId: 1 });
transaction.index({ recurringId: 1, recurringPeriod: 1 }, { unique: true, partialFilterExpression: { recurringId: { $type: 'string' }, recurringPeriod: { $type: 'string' } } });
export const FinanceTransaction = model('FinanceTransaction', transaction);

export const FinanceGoal = model('FinanceGoal', new Schema({ id: id(), name: text(), targetAmount: money(), order: { type: Number, default: 0 }, isArchived: { type: Boolean, default: false }, completedOn: { ...calendarDate(), required: false, default: null } }, options));
export const FinanceBudget = model('FinanceBudget', new Schema({ categoryId: { type: String, required: true, unique: true }, limit: money() }, options));
export const FinanceRecurring = model('FinanceRecurring', new Schema({ id: id(), name: text(), amount: money(), categoryId: { type: String, required: true }, dueDay: { type: Number, min: 1, max: 31, required: true, validate: Number.isInteger }, isActive: { type: Boolean, default: true } }, options));
const owed = new Schema({ id: id(), person: text(), direction: { type: String, enum: ['i_owe', 'owed_to_me'], required: true }, amount: money(), amountPaid: { ...money(true), default: 0 }, note: { type: String, trim: true, maxlength: 1000, default: '' }, createdOn: calendarDate(), isSettled: { type: Boolean, default: false } }, options);
owed.pre('validate', function () { if (this.amountPaid > this.amount) this.invalidate('amountPaid', 'Payments cannot exceed the amount owed.'); });
export const FinanceOwed = model('FinanceOwed', owed);

export const defaultFinanceCategories = [
  ...['Food', 'Transport', 'Bills', 'Study', 'Shopping', 'Other'].map((name, order) => ({ id: `finance-expense-${order}`, name, kind: 'expense', order })),
  ...['Income', 'Other income'].map((name, order) => ({ id: `finance-income-${order}`, name, kind: 'income', order })),
];

let initialization;
export async function initializeFinance() {
  if (!initialization) initialization = seedFinance().catch(error => { initialization = undefined; throw error; });
  return initialization;
}

async function seedFinance() {
  // Create collections and unique indexes before the first multi-document transaction.
  for (const Model of [FinanceSettings, FinanceCategory, FinanceTransaction, FinanceGoal, FinanceBudget, FinanceRecurring, FinanceOwed]) await Model.init();
  await FinanceSettings.updateOne({ _id: 'finance' }, { $setOnInsert: { openingAvailable: 0, openingSavings: 0, setupCompleted: false, revision: 0 } }, { upsert: true });
  await FinanceCategory.bulkWrite(defaultFinanceCategories.map(category => ({ updateOne: { filter: { id: category.id }, update: { $setOnInsert: category }, upsert: true } })));
}

// Each write first touches the singleton. MongoDB retries concurrent write conflicts,
// forcing competing transfers to re-read balances before committing their ledger rows.
// Callers must use the supplied session for every read and write in the callback.
export async function withFinanceWrite(work) {
  await initializeFinance();
  return mongoose.connection.transaction(async session => {
    const settings = await FinanceSettings.findOneAndUpdate({ _id: 'finance' }, { $inc: { revision: 1 } }, { new: true, session });
    return work(session, settings);
  });
}

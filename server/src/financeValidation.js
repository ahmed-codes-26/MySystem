import { z } from 'zod';
import { assertDate, monthBounds } from './financeService.js';

const money = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const balance = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const name = z.string().trim().min(1).max(100);
const identifier = z.string().trim().min(1).max(100);
const note = z.string().trim().max(1000);
const month = z.string().refine(value => { try { monthBounds(value); return true; } catch { return false; } });
const order = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const patch = schema => schema.partial().refine(value => Object.keys(value).length > 0, 'No changes supplied.');

export function financeSchemas(today) {
  const date = z.string().refine(value => { try { assertDate(value, today()); return true; } catch { return false; } });
  const category = z.object({ name, kind: z.enum(['expense', 'income']), order: order.optional() }).strict();
  const transaction = z.object({ type: z.enum(['expense', 'income']), amount: money, date, categoryId: identifier, note: note.optional() }).strict();
  const goal = z.object({ name, targetAmount: money, order: order.optional() }).strict();
  const recurring = z.object({ name, amount: money, categoryId: identifier, dueDay: z.number().int().min(1).max(31), isActive: z.boolean().optional() }).strict();
  const owed = z.object({ person: name, direction: z.enum(['i_owe', 'owed_to_me']), amount: money, note: note.optional(), createdOn: date.optional() }).strict();
  return {
    empty: z.object({}).strict(),
    settings: z.object({ openingAvailable: balance, openingSavings: balance, setupCompleted: z.boolean().optional() }).strict(),
    monthQuery: z.object({ month: month.optional() }).strict(),
    logQuery: z.object({ month: z.union([month, z.literal('all')]).optional(), category: identifier.optional(), type: z.enum(['expense', 'income', 'transfer']).optional(), search: z.string().trim().max(1000).optional(), page: z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).optional() }).strict(),
    category, categoryPatch: patch(category), transaction, transactionPatch: patch(transaction),
    transfer: z.discriminatedUnion('bucket', [
      z.object({ bucket: z.literal('savings'), direction: z.enum(['in', 'out']), amount: money, date, note: note.optional() }).strict(),
      z.object({ bucket: z.literal('goal'), goalId: identifier, direction: z.enum(['in', 'out']), amount: money, date, note: note.optional() }).strict(),
    ]),
    goal, goalPatch: patch(goal), goalClose: z.object({ returnMoney: z.boolean().optional(), delete: z.boolean().optional() }).strict(),
    budget: z.object({ limit: money }).strict(), recurring, recurringPatch: patch(recurring),
    pay: z.object({ period: month, amount: money.optional(), date: date.optional() }).strict(),
    owed, owedPatch: patch(owed), payment: z.object({ amount: money }).strict(),
  };
}

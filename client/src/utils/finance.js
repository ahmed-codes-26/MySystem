const rupees = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });
export const formatMoney = amount => `Rs ${rupees.format(amount)}`;
export function parseRupees(value, allowZero = false) {
  if (!/^\d+$/.test(String(value))) throw new Error('Enter a whole-rupee amount.');
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1)) throw new Error(allowZero ? 'Enter zero or a positive whole-rupee amount.' : 'Enter an amount greater than zero.');
  return amount;
}
export function spendingComparison(current, previous) {
  if (current === previous) return 'Unchanged from last month';
  if (!previous) return 'No spending last month';
  const percent = Math.round(Math.abs(current - previous) / previous * 100);
  return `${percent}% ${current > previous ? 'more' : 'less'} than last month`;
}

import { formatMoney, spendingComparison } from '../../utils/finance';
import Button from '../Button';

export default function FinanceStats({ overview, onMoveMoney, onManageOwed, busy }) {
  return <div className="finance-stats">
    <section className="card finance-stat"><h2>Available</h2><strong>{formatMoney(overview.available)}</strong><p>Savings and goals not included</p></section>
    <section className="card finance-stat"><h2>Spent This Month</h2><strong>{formatMoney(overview.spentThisMonth)}</strong><p>{spendingComparison(overview.spentThisMonth, overview.previousMonthSpent)}</p></section>
    <section className="card finance-stat"><div className="finance-stat-heading"><h2>Owed</h2><Button variant="ghost" size="small" aria-label="Manage owed items" disabled={busy} onClick={onManageOwed}>Manage</Button></div><dl><div><dt>You owe</dt><dd>{formatMoney(overview.owed.iOwe)}</dd></div><div><dt>Owed to you</dt><dd className="finance-positive">{formatMoney(overview.owed.owedToMe)}</dd></div></dl><p>Owed amounts do not affect Available</p></section>
    <section className="card finance-stat"><div className="finance-stat-heading"><h2>Savings</h2><Button variant="ghost" size="small" disabled={busy} onClick={() => onMoveMoney({ direction: 'in' })}>Move money</Button></div><strong>{formatMoney(overview.savings)}</strong><p>General savings</p></section>
  </div>;
}

import FinanceState from './FinanceState';
import BudgetRow from './BudgetRow';

export default function FinanceBudgets({ resource, busy, mutate, onNotice }) {
  const budgets = resource.data?.budgets || [];
  return <section className="finance-budgets" aria-labelledby="finance-budgets-title">
    <div className="finance-section-heading"><h2 id="finance-budgets-title">Monthly budgets</h2><p className="finance-muted">Limits repeat each month.</p></div>
    <div className="card finance-budget-card"><FinanceState {...resource} label="budgets">
      {budgets.length ? <ul className="finance-budget-list">{budgets.map(budget => <BudgetRow key={budget.categoryId} budget={budget} busy={busy} mutate={mutate} onNotice={onNotice}/>)}</ul> : <p className="finance-empty">No expense categories available for budgets.</p>}
    </FinanceState></div>
  </section>;
}

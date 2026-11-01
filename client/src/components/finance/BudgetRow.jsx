import { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { formatMoney, parseRupees } from '../../utils/finance';

export default function BudgetRow({ budget, busy, mutate, onNotice }) {
  const [editing, setEditing] = useState(false), [limit, setLimit] = useState(''), [error, setError] = useState('');
  const trigger = useRef(null);
  const restoreFocus = useRef(false);
  const hasLimit = budget.limit != null;
  useEffect(() => { if (!editing && restoreFocus.current) { trigger.current?.focus(); restoreFocus.current = false; } }, [editing]);
  function edit() { setLimit(hasLimit ? String(budget.limit) : ''); setError(''); setEditing(true); }
  function cancel() { restoreFocus.current = true; setEditing(false); setError(''); }
  async function save(event) {
    event.preventDefault(); setError('');
    try {
      const result = await mutate(`/budgets/${budget.categoryId}`, 'PUT', { limit: parseRupees(limit) });
      if (result.ok) { setEditing(false); onNotice(`${budget.categoryName} budget saved.`); } else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  async function remove() {
    setError('');
    const result = await mutate(`/budgets/${budget.categoryId}`, 'DELETE');
    if (result.ok) { setEditing(false); onNotice(`${budget.categoryName} budget removed.`); } else setError(result.error);
  }
  return <li className={`finance-budget-row ${budget.isOverBudget ? 'finance-budget-over' : ''}`}>
    <div className="finance-budget-heading"><div className="finance-budget-name"><h3>{budget.categoryName}</h3>{budget.isArchived && <span className="finance-category-tag">Archived</span>}{budget.isOverBudget && <span className="finance-budget-warning">Over budget</span>}</div>
      <div className="finance-budget-values"><span>{hasLimit ? `${formatMoney(budget.spent)} / ${formatMoney(budget.limit)}` : `${formatMoney(budget.spent)} spent · No budget`}</span>
        {!editing && !budget.isArchived && <Button ref={trigger} variant="ghost" size="small" disabled={busy} aria-label={`${hasLimit ? 'Edit' : 'Set'} ${budget.categoryName} budget`} onClick={edit}>{hasLimit ? 'Edit' : 'Set'}</Button>}
        {!editing && budget.isArchived && hasLimit && <Button variant="ghost" size="small" disabled={busy} aria-label={`Remove ${budget.categoryName} budget`} onClick={remove}>Remove limit</Button>}
      </div>
    </div>
    {hasLimit && <progress className="finance-progress" aria-label={`${budget.categoryName} monthly budget used`} aria-valuetext={`${formatMoney(budget.spent)} spent of ${formatMoney(budget.limit)}${budget.isOverBudget ? ', over budget' : ''}`} value={budget.percent} max="100">{budget.percent}%</progress>}
    {editing && <form className="finance-budget-editor" onSubmit={save} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); cancel(); } }}>
      <label>Monthly limit (Rs)<input autoFocus inputMode="numeric" pattern="[0-9]+" required value={limit} disabled={busy} onChange={event => setLimit(event.target.value)}/></label>
      <div className="finance-form-actions"><Button variant="primary" size="small" type="submit" loading={busy}>Save</Button><Button variant="secondary" size="small" disabled={busy} onClick={cancel}>Cancel</Button>{hasLimit && <Button variant="ghost" size="small" disabled={busy} onClick={remove}>Remove limit</Button>}</div>
    </form>}
    {error && <p role="alert" className="finance-error">{error}</p>}
  </li>;
}

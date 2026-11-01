import { useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import FinanceState from './FinanceState';
import RecurringForm from './RecurringForm';
import RecurringPayment from './RecurringPayment';
import { useFinanceResource } from '../../hooks/useFinance';
import { date } from '../../utils/dates';
import { formatMoney } from '../../utils/finance';

export default function FinanceRecurring({ resource, categories, revision, busy, mutate, onNotice }) {
  const [action, setAction] = useState(null), [error, setError] = useState('');
  const month = action?.month || resource.data?.month;
  const all = useFinanceResource(action?.kind === 'manage' ? `/finance/recurring?month=${month}` : null, revision);
  const items = resource.data?.recurring || [];
  const selected = items.find(item => item.id === action?.item?.id) || action?.item;
  const ready = !resource.loading && !resource.error;
  const category = id => categories.data?.find(item => item.id === id);
  function open(value) { setError(''); setAction(value); }
  function finish(saved) {
    if (saved) onNotice(action.kind === 'pay' ? 'Recurring payment recorded.' : action.kind === 'delete' ? 'Recurring item deleted.' : 'Recurring item saved.');
    setAction(action.back ? { kind: 'manage', month: action.month } : null);
  }
  async function toggle(item) {
    setError(''); const result = await mutate(`/recurring/${item.id}`, 'PATCH', { isActive: !item.isActive });
    if (result.ok) onNotice(item.isActive ? 'Recurring item paused.' : 'Recurring item resumed.'); else setError(result.error);
  }
  async function remove() {
    setError(''); const result = await mutate(`/recurring/${selected.id}`, 'DELETE');
    if (result.ok) finish(true); else setError(result.error);
  }
  return <section className="finance-recurring" aria-labelledby="finance-recurring-title">
    <div className="finance-section-heading"><h2 id="finance-recurring-title">Recurring</h2><div className="finance-form-actions"><Button variant="ghost" size="small" aria-label="Manage recurring items" disabled={busy || !ready} onClick={() => open({ kind: 'manage', month })}>Manage</Button><Button variant="secondary" size="small" disabled={busy || !ready} onClick={() => open({ kind: 'new' })}>Add recurring</Button></div></div>
    <div className="card finance-recurring-card"><FinanceState {...resource} label="recurring items">
      {items.length ? <ul className="finance-recurring-list">{items.map(item => <li key={item.id} className="finance-recurring-row"><div className="finance-recurring-info"><h3>{item.name}</h3><p>{category(item.categoryId)?.name || 'Expense'} · Due {date(item.dueDate).format('MMM D')}{category(item.categoryId)?.isArchived ? ' · Category archived' : ''}</p><span className={`finance-recurring-status finance-status-${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span></div><div className="finance-recurring-actions"><strong>{formatMoney(item.amount)}</strong>{item.status !== 'Paid' && <Button size="small" variant="secondary" disabled={busy || category(item.categoryId)?.isArchived || categories.loading || Boolean(categories.error)} onClick={() => open({ kind: 'pay', item, month, today: resource.data.today })}>Mark paid</Button>}<Button variant="icon" aria-label={`Edit recurring ${item.name}`} disabled={busy} onClick={() => open({ kind: 'edit', item })}><Icon name="edit" size={16}/></Button></div></li>)}</ul> : <p className="finance-empty">No active recurring items.</p>}
    </FinanceState></div>
    <Modal open={Boolean(action)} label={action?.kind === 'manage' ? 'Manage recurring items' : action?.kind === 'pay' ? 'Confirm recurring payment' : action?.kind === 'delete' ? 'Delete recurring item' : action?.kind === 'edit' ? 'Edit recurring item' : 'Add recurring item'} className="finance-dialog" onClose={() => { if (!busy) setAction(null); }}>
      {action?.kind === 'manage' && <div className="finance-dialog-content"><h2>Manage recurring items</h2><FinanceState {...all} label="recurring items">{all.data?.length ? <ul className="finance-management-list">{all.data.map(item => <li key={item.id}><div><strong>{item.name}</strong><p className="finance-muted">{formatMoney(item.amount)} · {item.isActive ? 'Active' : 'Paused'}</p></div><div className="finance-form-actions"><Button variant="secondary" size="small" disabled={busy} onClick={() => open({ kind: 'edit', item, back: true, month })}>Edit</Button><Button variant="ghost" size="small" disabled={busy} onClick={() => toggle(item)}>{item.isActive ? 'Pause' : 'Resume'}</Button><Button variant="icon" aria-label={`Delete recurring ${item.name}`} disabled={busy} onClick={() => open({ kind: 'delete', item, back: true, month })}><Icon name="trash" size={16}/></Button></div></li>)}</ul> : <p className="finance-muted">No recurring items yet.</p>}</FinanceState>{error && <p className="finance-error" role="alert">{error}</p>}<Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>Close</Button></div>}
      {(action?.kind === 'new' || action?.kind === 'edit') && <RecurringForm key={selected?.id || 'new'} item={action.kind === 'edit' ? selected : null} categories={categories} busy={busy} mutate={mutate} onClose={finish}/>}
      {action?.kind === 'pay' && selected && <RecurringPayment item={selected} month={action.month} today={action.today} resourceError={resource.error} busy={busy} refreshing={!ready} mutate={mutate} retry={resource.retry} onClose={finish}/>}
      {action?.kind === 'delete' && selected && <div className="finance-dialog-content"><h2>Delete {selected.name}?</h2><p className="finance-muted">Past payments stay in your transaction log. This recurring item cannot be restored after deletion.</p>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="secondary" autoFocus disabled={busy} onClick={() => finish(false)}>Cancel</Button><Button variant="destructive" confirm loading={busy} onClick={remove}>Delete recurring item</Button></div></div>}
    </Modal>
  </section>;
}

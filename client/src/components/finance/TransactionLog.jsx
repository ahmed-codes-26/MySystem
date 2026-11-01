import { useEffect, useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import Select from '../Select';
import Modal from '../Modal';
import FinanceState from './FinanceState';
import TransactionForm from './TransactionForm';
import { date } from '../../utils/dates';
import { formatMoney } from '../../utils/finance';

export default function TransactionLog({ resource, categoryResource, filters, setFilters, today, busy, mutate, onNotice }) {
  const [search, setSearch] = useState(filters.search), [editing, setEditing] = useState(null), [deleting, setDeleting] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setFilters(old => old.search === search.trim() ? old : { ...old, search: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);
  const categories = categoryResource.data || [];
  function filter(key, value) { setFilters(old => ({ ...old, [key]: value, page: 1 })); }
  async function remove() {
    setError('');
    const result = await mutate(`/transactions/${deleting.id}`, 'DELETE');
    if (result.ok) { setDeleting(null); filter('page', 1); onNotice('Transaction deleted.'); } else setError(result.error);
  }
  const log = resource.data;
  useEffect(() => {
    if (!resource.loading && log && filters.page > Math.max(1, log.pages)) setFilters(old => ({ ...old, page: Math.max(1, log.pages) }));
  }, [resource.loading, log, filters.page, setFilters]);
  return <section className="finance-log" aria-labelledby="finance-log-title">
    <div className="finance-section-heading"><h2 id="finance-log-title">Transactions</h2><div className="finance-log-filters">
      <label className="finance-search"><Icon name="search" size={17}/><input type="search" aria-label="Search transaction notes" placeholder="Search notes" maxLength={1000} value={search} onChange={event => setSearch(event.target.value)}/></label>
      <Select label="Filter category" value={filters.category} options={[{ value: '', label: 'All categories' }, ...categories.map(category => ({ value: category.id, label: category.name + (category.isArchived ? ' (archived)' : '') }))]} onChange={value => filter('category', value)} disabled={categoryResource.loading || Boolean(categoryResource.error)}/>
      <Select label="Filter type" value={filters.type} options={[{ value: '', label: 'All types' }, { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} onChange={value => filter('type', value)}/>
      <label className="finance-all-time"><input type="checkbox" checked={filters.allTime} onChange={event => filter('allTime', event.target.checked)}/>All time</label>
    </div></div>
    {categoryResource.error && <div className="finance-error" role="alert">Category filter unavailable. <Button variant="ghost" size="small" onClick={categoryResource.retry}>Retry categories</Button></div>}
    <div className="card finance-log-card"><FinanceState {...resource} label="transactions">
      {log && <><div className="finance-table-scroll" tabIndex={0} role="region" aria-label="Transaction table"><table className="finance-table"><thead><tr><th scope="col">Date</th><th scope="col">Note</th><th scope="col">Category</th><th scope="col">Type</th><th scope="col" className="finance-align-right">Amount</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {log.items.map(item => <tr key={item.id}>
          <td>{date(item.date).format('MMM D, YYYY')}</td><td className="finance-transaction-note">{item.note || (item.type === 'transfer' ? `${item.direction === 'in' ? 'To' : 'From'} ${item.bucket === 'savings' ? 'savings' : 'goal'}` : '—')}</td>
          <td><span className="finance-category-tag">{item.type === 'transfer' ? item.bucket === 'savings' ? 'Savings' : 'Goal' : item.categoryNameSnapshot}</span></td>
          <td className="finance-type-label">{item.type}</td><td className={`finance-align-right finance-transaction-amount ${item.type === 'income' ? 'finance-positive' : ''}`}>{item.type === 'income' ? '+' : item.type === 'expense' ? '−' : ''}{formatMoney(item.amount)}</td>
          <td><div className="finance-row-actions">{item.type !== 'transfer' && <Button variant="icon" aria-label={`Edit transaction ${item.note || date(item.date).format('MMM D')}`} disabled={busy || categoryResource.loading || Boolean(categoryResource.error)} onClick={() => setEditing(item)}><Icon name="edit" size={16}/></Button>}<Button variant="icon" aria-label={`Delete transaction ${item.note || date(item.date).format('MMM D')}`} disabled={busy} onClick={() => { setError(''); setDeleting(item); }}><Icon name="trash" size={16}/></Button></div></td>
        </tr>)}
        {!log.items.length && <tr><td colSpan={6} className="finance-empty">{filters.search || filters.category || filters.type ? 'No transactions match these filters.' : 'No transactions in this period.'}</td></tr>}
      </tbody></table></div>
      <div className="finance-pagination"><span aria-live="polite">{log.total ? `${(log.page - 1) * log.pageSize + 1}–${Math.min(log.page * log.pageSize, log.total)} of ${log.total} transactions` : '0 transactions'}</span><div><Button size="small" variant="ghost" disabled={log.page <= 1} onClick={() => setFilters(old => ({ ...old, page: old.page - 1 }))}>Previous</Button><Button size="small" variant="secondary" disabled={log.page >= log.pages} onClick={() => setFilters(old => ({ ...old, page: old.page + 1 }))}>Next</Button></div></div></>}
    </FinanceState></div>
    <Modal open={Boolean(editing)} label="Edit transaction" className="finance-dialog" onClose={() => { if (!busy) setEditing(null); }}>{editing && <div className="finance-dialog-content"><h2>Edit transaction</h2><TransactionForm transaction={editing} categories={categories} today={today} busy={busy} mutate={mutate} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); onNotice('Transaction updated.'); }}/></div>}</Modal>
    <Modal open={Boolean(deleting)} label="Delete transaction" className="finance-dialog" onClose={() => { if (!busy) setDeleting(null); }}>{deleting && <div className="finance-dialog-content"><h2>Delete this transaction?</h2><p className="finance-muted">{formatMoney(deleting.amount)} · {date(deleting.date).format('MMM D, YYYY')}. This will update your balances and cannot be undone.</p>{error && <p role="alert" className="finance-error">{error}</p>}<div className="finance-form-actions"><Button variant="secondary" autoFocus disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" confirm loading={busy} onClick={remove}>Delete transaction</Button></div></div>}</Modal>
  </section>;
}

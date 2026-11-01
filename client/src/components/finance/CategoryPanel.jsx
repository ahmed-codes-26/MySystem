import { useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import FinanceState from './FinanceState';
import CategoryForm from './CategoryForm';

export default function CategoryPanel({ resource, busy, mutate, onNotice, onClose }) {
  const [action, setAction] = useState(null), [showArchived, setShowArchived] = useState(false), [error, setError] = useState('');
  const items = (resource.data || []).filter(item => showArchived || !item.isArchived);
  const ready = !resource.loading && !resource.error;
  function finish(saved) { if (saved) onNotice(action.kind === 'archive' ? 'Category archived.' : 'Category saved.'); setAction(null); setError(''); }
  async function archive() {
    setError(''); const result = await mutate(`/categories/${action.item.id}/archive`, 'POST');
    if (result.ok) finish(true); else setError(result.error);
  }
  return <div className="finance-dialog-content"><div className="finance-section-heading"><h2>Categories</h2><Button variant="icon" aria-label="Close categories" disabled={busy} onClick={onClose}><Icon name="close" size={18}/></Button></div>
    {!action && <><div className="finance-form-actions"><Button variant="secondary" disabled={busy || !ready} onClick={() => setAction({ kind: 'new' })}>New category</Button><Button variant="ghost" size="small" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Hide archived' : 'Show archived'}</Button></div><FinanceState {...resource} label="categories">
      {items.length ? <ul className="finance-management-list">{items.map(item => <li key={item.id}><div><strong>{item.name}</strong><p className="finance-muted">{item.kind === 'expense' ? 'Expense' : 'Income'} · Order {item.order}{item.isArchived ? ' · Archived' : ''}</p></div><div className="finance-form-actions"><Button variant="secondary" size="small" disabled={busy || !ready} aria-label={`Edit category ${item.name}`} onClick={() => setAction({ kind: 'edit', item })}>Edit</Button>{!item.isArchived && <Button variant="ghost" size="small" disabled={busy || !ready} aria-label={`Archive category ${item.name}`} onClick={() => setAction({ kind: 'archive', item })}>Archive</Button>}</div></li>)}</ul> : <p className="finance-muted">No categories to show.</p>}
    </FinanceState></>}
    {(action?.kind === 'new' || action?.kind === 'edit') && <CategoryForm item={action.item} busy={busy} mutate={mutate} onClose={finish}/>}
    {action?.kind === 'archive' && <div className="finance-owed-form"><h3>Archive {action.item.name}?</h3><p className="finance-muted">Past transactions and category names are preserved. This category will no longer be offered for new transactions. Reassign its recurring items before recording new payments.</p>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="secondary" autoFocus disabled={busy} onClick={() => finish(false)}>Cancel</Button><Button variant="destructive" confirm loading={busy} onClick={archive}>Archive category</Button></div></div>}
  </div>;
}

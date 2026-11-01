import { useState } from 'react';
import Button from '../Button';
import Select from '../Select';
import { parseRupees } from '../../utils/finance';

export default function CategoryForm({ item, busy, mutate, onClose }) {
  const [name, setName] = useState(item?.name || ''), [kind, setKind] = useState(item?.kind || 'expense');
  const [order, setOrder] = useState(String(item?.order ?? 0)), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!name.trim()) throw new Error('Enter a category name.');
      const result = await mutate(item ? `/categories/${item.id}` : '/categories', item ? 'PATCH' : 'POST', { name: name.trim(), kind, order: parseRupees(order, true) });
      if (result.ok) onClose(true); else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-owed-form"><h3>{item ? 'Edit category' : 'New category'}</h3><form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy}>
    <label>Name<input autoFocus maxLength={100} required value={name} onChange={event => setName(event.target.value)}/></label>
    <div className="finance-form-field"><span>Type</span><Select label="Category type" value={kind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} onChange={setKind} disabled={busy}/></div>
    <label>Display order<input inputMode="numeric" pattern="[0-9]+" required value={order} onChange={event => setOrder(event.target.value)}/></label>
    <p className="finance-muted">Lower numbers appear first. A category with transactions, a budget or recurring items cannot change type.</p>
  </fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy}>Save category</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form></div>;
}

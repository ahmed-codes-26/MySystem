import { useState } from 'react';
import Button from '../Button';
import Select from '../Select';
import FinanceState from './FinanceState';
import { parseRupees } from '../../utils/finance';

export default function RecurringForm({ item, categories, busy, mutate, onClose }) {
  const [name, setName] = useState(item?.name || ''), [amount, setAmount] = useState(item ? String(item.amount) : '');
  const [categoryId, setCategoryId] = useState(item?.categoryId || ''), [dueDay, setDueDay] = useState(String(item?.dueDay || 1));
  const [active, setActive] = useState(item?.isActive ?? true), [error, setError] = useState('');
  const choices = (categories.data || []).filter(category => category.kind === 'expense' && (!category.isArchived || category.id === item?.categoryId));
  const selected = choices.some(category => category.id === categoryId) ? categoryId : choices[0]?.id || '';
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!name.trim() || !selected) throw new Error('Enter a name and choose an expense category.');
      if (!/^\d+$/.test(dueDay) || Number(dueDay) < 1 || Number(dueDay) > 31) throw new Error('Due day must be a whole number from 1 to 31.');
      const result = await mutate(item ? `/recurring/${item.id}` : '/recurring', item ? 'PATCH' : 'POST', { name: name.trim(), amount: parseRupees(amount), categoryId: selected, dueDay: Number(dueDay), isActive: active });
      if (result.ok) onClose(true); else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-dialog-content"><h2>{item ? 'Edit recurring item' : 'Add recurring item'}</h2><p className="finance-muted">Items are never posted automatically. Editing an item keeps past payments unchanged.</p>
    <FinanceState {...categories} loading={categories.loading && !categories.data} label="categories"><form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy}>
      <label>Name<input autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)}/></label>
      <label>Amount (Rs)<input inputMode="numeric" pattern="[0-9]+" required value={amount} onChange={event => setAmount(event.target.value)}/></label>
      <div className="finance-form-field"><span>Expense category</span><Select label="Recurring category" value={selected} options={choices.map(category => ({ value: category.id, label: category.name + (category.isArchived ? ' (archived)' : '') }))} onChange={setCategoryId} disabled={busy}/></div>
      {!choices.length && <p className="finance-muted">No active expense categories available.</p>}
      <label>Due day (1–31)<input inputMode="numeric" pattern="[0-9]+" required value={dueDay} onChange={event => setDueDay(event.target.value)}/></label>
      <p className="finance-muted">For shorter months, the last day of the month is used.</p>
      <label className="finance-checkbox-label"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/>Active</label>
    </fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button type="submit" variant="primary" loading={busy} disabled={!selected}>Save recurring item</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form></FinanceState>
    {categories.error && <Button variant="secondary" onClick={() => onClose(false)}>Cancel</Button>}
  </div>;
}

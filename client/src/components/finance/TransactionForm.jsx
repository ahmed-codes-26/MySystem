import { useState } from 'react';
import Button from '../Button';
import Select from '../Select';
import DatePicker from '../DatePicker';
import { date } from '../../utils/dates';
import { parseRupees } from '../../utils/finance';

function rememberedCategory(type) {
  try { return localStorage.getItem(`finance-category-${type}`) || ''; } catch { return ''; }
}

export default function TransactionForm({ categories, today, busy, mutate, transaction, onSaved, onCancel }) {
  const editing = Boolean(transaction);
  const [type, setType] = useState(transaction?.type || 'expense');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [day, setDay] = useState(transaction?.date || today), [note, setNote] = useState(transaction?.note || '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || rememberedCategory('expense'));
  const [error, setError] = useState('');
  const choices = categories.filter(category => category.kind === type && (!category.isArchived || category.id === transaction?.categoryId));
  const selected = choices.some(category => category.id === categoryId) ? categoryId : choices[0]?.id || '';
  function changeType(value) { setType(value); setCategoryId(rememberedCategory(value)); setError(''); }
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!selected) throw new Error('Choose a category.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !date(day).isValid() || date(day).format('YYYY-MM-DD') !== day || day > today) throw new Error('Choose a valid date up to today.');
      const result = await mutate(editing ? `/transactions/${transaction.id}` : '/transactions', editing ? 'PATCH' : 'POST', { type, amount: parseRupees(amount), date: day, categoryId: selected, note: note.trim() });
      if (!result.ok) { setError(result.error); return; }
      try { localStorage.setItem(`finance-category-${type}`, selected); } catch { /* Optional preference. */ }
      if (!editing) { setAmount(''); setNote(''); }
      onSaved?.(result.data);
    } catch (cause) { setError(cause.message); }
  }
  return <form className={`finance-transaction-form ${editing ? 'finance-edit-form' : ''}`} onSubmit={submit}>
    <fieldset disabled={busy} className="finance-quick-fields">
      <div className="finance-type-toggle" role="group" aria-label="Transaction type">{['expense', 'income'].map(value => <Button key={value} size="small" variant={type === value ? 'secondary' : 'ghost'} aria-pressed={type === value} disabled={Boolean(transaction?.recurringId) && value === 'income'} onClick={() => changeType(value)}>{value === 'expense' ? 'Expense' : 'Income'}</Button>)}</div>
      <label className="finance-amount-label"><span className="sr-only">Amount in rupees</span><input aria-label="Amount in rupees" autoFocus={editing} inputMode="numeric" pattern="[0-9]+" required placeholder="Rs amount" value={amount} onChange={event => setAmount(event.target.value)}/></label>
      <Select label="Category" value={selected} options={choices.map(category => ({ value: category.id, label: category.name + (category.isArchived ? ' (archived)' : '') }))} onChange={setCategoryId} disabled={busy}/>
      <label className="finance-note-label"><span className="sr-only">Note</span><input aria-label="Note" placeholder="Add note" maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
      <DatePicker value={day} max={today} onChange={setDay} label="Transaction date"/>
      <Button variant="primary" type="submit" loading={busy} disabled={!selected}>{editing ? 'Save changes' : 'Add'}</Button>
    </fieldset>
    {editing && <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>}
    {error && <p className="finance-error" role="alert">{error}</p>}
  </form>;
}

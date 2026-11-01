import { useState } from 'react';
import Button from '../Button';
import Select from '../Select';
import DatePicker from '../DatePicker';
import { date } from '../../utils/dates';
import { parseRupees } from '../../utils/finance';

export default function OwedForm({ item, today, busy, mutate, onClose }) {
  const [person, setPerson] = useState(item?.person || ''), [direction, setDirection] = useState(item?.direction || 'i_owe');
  const [amount, setAmount] = useState(item ? String(item.amount) : ''), [note, setNote] = useState(item?.note || '');
  const [day, setDay] = useState(item?.createdOn || today), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!person.trim()) throw new Error('Enter the person’s name.');
      const value = parseRupees(amount);
      if (item && value < item.amountPaid) throw new Error('The amount cannot be less than payments already recorded.');
      if (!date(day).isValid() || date(day).format('YYYY-MM-DD') !== day || day > today) throw new Error('Choose a valid date up to today.');
      const result = await mutate(item ? `/owed/${item.id}` : '/owed', item ? 'PATCH' : 'POST', { person: person.trim(), direction, amount: value, note: note.trim(), createdOn: day });
      if (result.ok) onClose(true); else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-owed-form"><h3>{item ? 'Edit owed item' : 'Add owed item'}</h3><form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy}>
    <label>Person<input autoFocus required maxLength={100} value={person} onChange={event => setPerson(event.target.value)}/></label>
    <div className="finance-form-field"><span>Direction</span><Select label="Owed direction" value={direction} options={[{ value: 'i_owe', label: 'I owe' }, { value: 'owed_to_me', label: 'Owed to me' }]} onChange={setDirection} disabled={busy}/></div>
    <label>Total amount (Rs)<input inputMode="numeric" pattern="[0-9]+" required value={amount} onChange={event => setAmount(event.target.value)}/></label>
    <div className="finance-form-date"><span>Created on</span><DatePicker label="Owed record date" value={day} max={today} onChange={setDay}/></div>
    <label>Note (optional)<input maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
  </fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy}>Save owed item</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form></div>;
}

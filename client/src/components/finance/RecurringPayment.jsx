import { useState } from 'react';
import Button from '../Button';
import DatePicker from '../DatePicker';
import { date } from '../../utils/dates';
import { parseRupees } from '../../utils/finance';

export default function RecurringPayment({ item, month, today, busy, refreshing, resourceError, mutate, retry, onClose }) {
  const [amount, setAmount] = useState(String(item.amount)), [day, setDay] = useState(today), [error, setError] = useState('');
  const unavailable = item.status === 'Paid' || !item.isActive || month > today.slice(0, 7);
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!date(day).isValid() || date(day).format('YYYY-MM-DD') !== day || day > today) throw new Error('Choose a valid date up to today.');
      const result = await mutate(`/recurring/${item.id}/pay`, 'POST', { period: month, amount: parseRupees(amount), date: day });
      if (result.ok) onClose(true); else { setError(result.error); retry(); }
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-dialog-content"><h2>Mark {item.name} paid</h2><p className="finance-muted">For {date(`${month}-01`).format('MMMM YYYY')}. This creates an expense on the date below.</p>
    {resourceError && <div className="finance-error" role="alert"><p>{resourceError}</p><Button variant="secondary" size="small" onClick={retry}>Retry recurring status</Button></div>}
    {item.status === 'Paid' && <p className="finance-positive">Already paid for this month.</p>}
    <form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy || refreshing || unavailable}>
      <label>Amount (Rs)<input autoFocus inputMode="numeric" pattern="[0-9]+" required value={amount} onChange={event => setAmount(event.target.value)}/></label>
      <div className="finance-form-date"><span>Payment date</span><DatePicker label="Recurring payment date" value={day} max={today} onChange={setDay}/></div>
    </fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button type="submit" variant="primary" loading={busy} disabled={refreshing || unavailable}>Confirm payment</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form>
  </div>;
}

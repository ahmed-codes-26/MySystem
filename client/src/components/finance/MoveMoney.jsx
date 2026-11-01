import { useState } from 'react';
import Button from '../Button';
import Select from '../Select';
import DatePicker from '../DatePicker';
import { date } from '../../utils/dates';
import { formatMoney, parseRupees } from '../../utils/finance';

export default function MoveMoney({ initial, overview, busy, refreshing, mutate, retry, onClose }) {
  const [bucketId, setBucketId] = useState(initial.goalId || 'savings');
  const [direction, setDirection] = useState(initial.direction || 'in');
  const [amount, setAmount] = useState(''), [day, setDay] = useState(overview.today), [note, setNote] = useState(''), [error, setError] = useState('');
  const goal = overview.goals.find(item => item.id === bucketId);
  const savings = bucketId === 'savings';
  const bucketBalance = savings ? overview.savings : goal?.saved ?? 0;
  const sourceBalance = direction === 'in' ? overview.available : bucketBalance;
  const bucketName = savings ? 'Savings' : goal?.name || 'Goal';
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const value = parseRupees(amount);
      if (!savings && !goal) throw new Error('This goal is no longer available.');
      if (value > sourceBalance) throw new Error(`You can move up to ${formatMoney(Math.max(0, sourceBalance))} from this source.`);
      if (!date(day).isValid() || date(day).format('YYYY-MM-DD') !== day || day > overview.today) throw new Error('Choose a valid date up to today.');
      const result = await mutate('/transfers', 'POST', { bucket: savings ? 'savings' : 'goal', ...(savings ? {} : { goalId: goal.id }), direction, amount: value, date: day, note: note.trim() });
      if (result.ok) onClose(true);
      else { setError(result.error); retry(); }
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-dialog-content"><h2>Move money</h2>
    <p className="finance-muted">Transfers move money between Available and savings or a goal. They do not count as spending.</p>
    <form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy || refreshing}>
      <div className="finance-form-field"><span>Bucket</span><Select label="Savings or goal" value={bucketId} options={[{ value: 'savings', label: 'General savings' }, ...overview.goals.map(item => ({ value: item.id, label: item.name }))]} onChange={value => { setBucketId(value); setError(''); }} disabled={busy || refreshing}/></div>
      <div className="finance-type-toggle" role="group" aria-label="Transfer direction"><Button variant={direction === 'in' ? 'secondary' : 'ghost'} size="small" aria-pressed={direction === 'in'} onClick={() => { setDirection('in'); setError(''); }}>Add money</Button><Button variant={direction === 'out' ? 'secondary' : 'ghost'} size="small" aria-pressed={direction === 'out'} onClick={() => { setDirection('out'); setError(''); }}>Withdraw</Button></div>
      <dl className="finance-transfer-balances"><div><dt>Available</dt><dd>{formatMoney(overview.available)}</dd></div><div><dt>{bucketName}</dt><dd>{formatMoney(bucketBalance)}</dd></div></dl>
      <p className="finance-muted">{direction === 'in' ? `Available → ${bucketName}` : `${bucketName} → Available`}</p>
      {sourceBalance <= 0 && <p className="finance-muted">There is no money in this source to move.</p>}
      <label>Amount (Rs)<input autoFocus inputMode="numeric" pattern="[0-9]+" required value={amount} onChange={event => setAmount(event.target.value)}/></label>
      <div className="finance-form-date"><span>Date</span><DatePicker label="Transfer date" value={day} max={overview.today} onChange={setDay}/></div>
      <label>Note (optional)<input maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
    </fieldset>
    {error && <p className="finance-error" role="alert">{error}</p>}
    <div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy} disabled={refreshing || sourceBalance <= 0 || (!savings && !goal)}>{direction === 'in' ? 'Add money' : 'Withdraw money'}</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div>
    </form>
  </div>;
}

import { useState } from 'react';
import Button from '../Button';
import { formatMoney, parseRupees } from '../../utils/finance';

export default function OwedAction({ item, kind, busy, refreshing, mutate, retry, onClose }) {
  const [amount, setAmount] = useState(''), [error, setError] = useState('');
  const payment = kind === 'payment', deleting = kind === 'delete';
  async function submit(event) {
    event?.preventDefault(); setError('');
    try {
      let body;
      if (payment) {
        const value = parseRupees(amount);
        if (value > item.remaining) throw new Error('Payment cannot exceed the outstanding amount.');
        body = { amount: value };
      }
      const path = `/owed/${item.id}${payment ? '/payment' : deleting ? '' : '/settle'}`;
      const result = await mutate(path, deleting ? 'DELETE' : 'POST', body);
      if (result.ok) onClose(true); else { setError(result.error); retry(); }
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-owed-form"><h3>{payment ? 'Record payment' : deleting ? 'Delete owed item?' : 'Mark settled?'}</h3>
    <p className="finance-muted">{item.person} · {item.direction === 'i_owe' ? 'You owe' : 'Owed to you'} {formatMoney(item.remaining)}.</p>
    <p className="finance-muted">{deleting ? 'This deletes the tracker and its recorded payments. It cannot be undone.' : 'This updates the tracker only. No expense or income transaction is created.'}</p>
    {payment ? <form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy || refreshing || item.isSettled}><label>Payment amount (Rs)<input autoFocus inputMode="numeric" pattern="[0-9]+" required value={amount} onChange={event => setAmount(event.target.value)}/></label></fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy} disabled={refreshing || item.isSettled}>Record payment</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form>
      : <>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="secondary" autoFocus disabled={busy} onClick={() => onClose(false)}>Cancel</Button><Button variant={deleting ? 'destructive' : 'primary'} confirm={deleting} loading={busy} disabled={refreshing || (!deleting && item.isSettled)} onClick={submit}>{deleting ? 'Delete owed item' : 'Mark settled'}</Button></div></>}
  </div>;
}

import { useState } from 'react';
import Button from '../Button';
import { parseRupees } from '../../utils/finance';

export default function StartingBalances({ settings, busy, mutate, onClose, setup = false }) {
  const [available, setAvailable] = useState(String(settings.openingAvailable));
  const [savings, setSavings] = useState(String(settings.openingSavings));
  const [error, setError] = useState('');
  async function save(event, dismiss = false) {
    event?.preventDefault(); setError('');
    try {
      const result = await mutate('/settings', 'PUT', { openingAvailable: dismiss ? settings.openingAvailable : parseRupees(available, true), openingSavings: dismiss ? settings.openingSavings : parseRupees(savings, true), setupCompleted: true });
      if (result.ok) onClose(true); else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  return <section className={setup ? 'card finance-setup' : 'finance-dialog-content'}>
    <h2>{setup ? 'Set starting balances' : 'Adjust starting balances'}</h2><p className="finance-muted">Enter the money you had before the transactions recorded here.</p>
    <form className="finance-balance-form" onSubmit={save}><fieldset disabled={busy}>
      <label>Available (Rs)<input autoFocus={!setup} inputMode="numeric" required pattern="[0-9]+" value={available} onChange={event => setAvailable(event.target.value)}/></label>
      <label>Savings (Rs)<input inputMode="numeric" required pattern="[0-9]+" value={savings} onChange={event => setSavings(event.target.value)}/></label>
    </fieldset><div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy}>Save balances</Button><Button variant="ghost" disabled={busy} onClick={setup ? event => save(event, true) : () => onClose(false)}>{setup ? 'Skip for now' : 'Cancel'}</Button></div></form>
    {error && <p role="alert" className="finance-error">{error}</p>}
  </section>;
}

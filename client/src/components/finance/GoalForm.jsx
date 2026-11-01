import { useState } from 'react';
import Button from '../Button';
import { parseRupees } from '../../utils/finance';

export default function GoalForm({ goal, busy, mutate, onClose }) {
  const [name, setName] = useState(goal?.name || ''), [target, setTarget] = useState(goal ? String(goal.targetAmount) : ''), [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      if (!name.trim()) throw new Error('Enter a goal name.');
      const result = await mutate(goal ? `/goals/${goal.id}` : '/goals', goal ? 'PATCH' : 'POST', { name: name.trim(), targetAmount: parseRupees(target) });
      if (result.ok) onClose(true); else setError(result.error);
    } catch (cause) { setError(cause.message); }
  }
  return <div className="finance-dialog-content"><h2>{goal ? 'Edit goal' : 'New goal'}</h2><form className="finance-stack-form" onSubmit={submit}><fieldset disabled={busy}>
    <label>Name<input autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)}/></label>
    <label>Target (Rs)<input required inputMode="numeric" pattern="[0-9]+" value={target} onChange={event => setTarget(event.target.value)}/></label>
  </fieldset>{error && <p className="finance-error" role="alert">{error}</p>}<div className="finance-form-actions"><Button variant="primary" type="submit" loading={busy}>{goal ? 'Save changes' : 'Create goal'}</Button><Button variant="secondary" disabled={busy} onClick={() => onClose(false)}>Cancel</Button></div></form></div>;
}

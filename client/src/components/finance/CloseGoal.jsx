import { useState } from 'react';
import Button from '../Button';
import { formatMoney } from '../../utils/finance';

export default function CloseGoal({ goal, deleting, busy, refreshing, mutate, onClose }) {
  const [confirmed, setConfirmed] = useState(false), [error, setError] = useState('');
  async function close() {
    setError('');
    const result = await mutate(`/goals/${goal.id}/archive`, 'POST', { delete: deleting, returnMoney: goal.saved > 0 && confirmed });
    if (result.ok) onClose(true); else setError(result.error);
  }
  return <div className="finance-dialog-content"><h2>{deleting ? 'Delete' : 'Archive'} {goal.name}?</h2>
    <p className="finance-muted">{deleting ? 'The goal will be deleted. Past transfers stay in your transaction log. This cannot be undone.' : 'The goal will be removed from your active goals. Past transfers stay in your transaction log.'}</p>
    {goal.saved > 0 && <label className="finance-return-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/><span>Return {formatMoney(goal.saved)} to Available before {deleting ? 'deleting' : 'archiving'} this goal.</span></label>}
    {error && <p className="finance-error" role="alert">{error}</p>}
    <div className="finance-form-actions"><Button variant="secondary" autoFocus disabled={busy} onClick={() => onClose(false)}>Cancel</Button><Button variant="destructive" confirm loading={busy} disabled={refreshing || (goal.saved > 0 && !confirmed)} onClick={close}>{deleting ? 'Delete goal' : 'Archive goal'}</Button></div>
  </div>;
}

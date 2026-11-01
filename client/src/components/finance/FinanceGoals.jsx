import { useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';
import FinanceState from './FinanceState';
import GoalForm from './GoalForm';
import CloseGoal from './CloseGoal';
import MoveMoney from './MoveMoney';
import { formatMoney } from '../../utils/finance';

export default function FinanceGoals({ resource, busy, mutate, onMoveMoney, onNotice }) {
  const [action, setAction] = useState(null);
  const goals = resource.data?.goals || [];
  const selected = goals.find(goal => goal.id === action?.goal?.id) || action?.goal;
  const ready = !resource.loading && !resource.error;
  function finish(saved) {
    if (saved) onNotice(action.kind === 'new' ? 'Goal created.' : action.kind === 'edit' ? 'Goal updated.' : action.kind === 'delete' ? 'Goal deleted.' : action.kind === 'withdraw' ? 'Money withdrawn to Available.' : 'Goal archived.');
    setAction(null);
  }
  return <section className="finance-goals" aria-labelledby="finance-goals-title">
    <div className="finance-section-heading"><h2 id="finance-goals-title">Goals</h2><Button variant="secondary" size="small" disabled={busy || !ready} onClick={() => setAction({ kind: 'new' })}>New goal</Button></div>
    <FinanceState {...resource} label="goals">
      {goals.length ? <div className="finance-goal-grid">{goals.map(goal => <article className="card finance-goal" key={goal.id}>
        <div className="finance-goal-heading"><h3>{goal.name}</h3><Button variant="icon" aria-label={`Actions for ${goal.name}`} disabled={busy} onClick={() => setAction({ kind: 'menu', goal })}><Icon name="more" size={18}/></Button></div>
        <div className="finance-goal-progress-label"><span>{Math.floor(goal.percent)}%</span>{goal.reached && <span className="finance-reached">Reached</span>}</div>
        <progress className="finance-progress" aria-label={`${goal.name} saved`} value={goal.percent} max="100">{goal.percent}%</progress>
        <div className="finance-goal-footer"><p>{formatMoney(goal.saved)} of {formatMoney(goal.targetAmount)}</p><Button variant="ghost" size="small" disabled={busy} onClick={() => onMoveMoney({ goalId: goal.id, direction: 'in' })}>Add money</Button></div>
      </article>)}</div> : <div className="card finance-goals-empty"><p className="finance-muted">No savings goals yet.</p><Button variant="ghost" size="small" disabled={busy || !ready} onClick={() => setAction({ kind: 'new' })}>Create a goal</Button></div>}
    </FinanceState>
    <Modal open={Boolean(action)} label={action?.kind === 'menu' ? 'Goal actions' : action?.kind === 'new' ? 'New goal' : action?.kind === 'edit' ? 'Edit goal' : action?.kind === 'delete' ? 'Delete goal' : action?.kind === 'withdraw' ? 'Move money' : 'Archive goal'} className="finance-dialog" onClose={() => { if (!busy) setAction(null); }}>
      {action?.kind === 'menu' && selected && <div className="finance-dialog-content"><h2>{selected.name}</h2><p className="finance-muted">{formatMoney(selected.saved)} saved of {formatMoney(selected.targetAmount)}</p><div className="finance-goal-actions">
        <Button variant="secondary" disabled={busy || !ready} onClick={() => setAction({ kind: 'edit', goal: selected })}>Edit goal</Button>
        <Button variant="secondary" disabled={busy || !ready || selected.saved <= 0} onClick={() => setAction({ kind: 'withdraw', goal: selected })}>Withdraw money</Button>
        <Button variant="secondary" disabled={busy || !ready} onClick={() => setAction({ kind: 'archive', goal: selected })}>Archive goal</Button>
        <Button variant="destructive" disabled={busy || !ready} onClick={() => setAction({ kind: 'delete', goal: selected })}>Delete goal</Button>
      </div><Button variant="ghost" autoFocus onClick={() => setAction(null)}>Cancel</Button></div>}
      {(action?.kind === 'new' || action?.kind === 'edit') && <GoalForm key={action.kind + (selected?.id || '')} goal={action.kind === 'edit' ? selected : null} busy={busy} mutate={mutate} onClose={finish}/>}
      {(action?.kind === 'archive' || action?.kind === 'delete') && selected && <CloseGoal key={action.kind + selected.id} goal={selected} deleting={action.kind === 'delete'} busy={busy} refreshing={!ready} mutate={mutate} onClose={finish}/>}
      {action?.kind === 'withdraw' && resource.data && <MoveMoney initial={{ goalId: selected.id, direction: 'out' }} overview={resource.data} busy={busy} refreshing={!ready} mutate={mutate} retry={resource.retry} onClose={finish}/>}
      {action?.kind === 'withdraw' && !resource.data && <div className="finance-dialog-content"><FinanceState {...resource} label="balances"/><Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button></div>}
    </Modal>
  </section>;
}

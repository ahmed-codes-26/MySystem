import ThemePicker from '../components/ThemePicker';
import Icon from '../components/Icon';
import Button from '../components/Button';
import PageSkeleton from '../components/PageSkeleton';
import Modal from '../components/Modal';
import { useEffect, useState } from 'react';
import useDashboardData from '../hooks/useDashboardData';

export default function Habits() {
  const { habits, loading, busy, error, saveHabit, archiveHabit, restoreHabit, deleteHabit } = useDashboardData({habitsOnly:true});
  const [editing,setEditing] = useState(null), [name,setName] = useState(''), [weight,setWeight] = useState(5), [pending,setPending] = useState(null), [message,setMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  useEffect(() => { if (!successToast) return; const timer = setTimeout(() => setSuccessToast(''), 4500); return () => clearTimeout(timer); }, [successToast]);
  const active = habits.filter(h => !h.archivedOn), archived = habits.filter(h => h.archivedOn);
  function reset() {setEditing(null); setName(''); setWeight(5);}
  async function submit(e) {e.preventDefault(); if(await saveHabit({name,weight},editing)) {setMessage(editing ? 'Habit updated.' : 'Habit added.'); reset();}}
  function edit(h) {setEditing(h.id); setName(h.name); setWeight(h.weight); setMessage('');}
  const editor = (<section className="card habit-editor"><h2>{editing ? 'Edit Habit' : 'Add a Habit'}</h2><p className="card-subtitle">Choose what matters. Give it a score from 1 to 10.</p>
      <form className="habit-form" onSubmit={submit}><label>Habit name<input autoFocus={Boolean(editing)} autoComplete="off" maxLength={60} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Read 20 pages"/></label><fieldset><legend>Score <span>{weight}/10</span></legend><div className="score-options">{Array.from({length:10},(_,i) => i+1).map(n => <Button variant="secondary" size="small" type="button" aria-label={`Score ${n} out of 10`} aria-pressed={Number(weight) === n} className={Number(weight) === n ? 'selected' : ''} onClick={() => setWeight(n)} key={n}>{n}</Button>)}</div></fieldset><div className="habit-form-actions"><Button variant="primary" loading={busy} type="submit">{editing ? 'Save changes' : 'Add habit'}</Button>{editing && <Button variant="secondary" type="button"  onClick={reset}>Cancel</Button>}</div></form>
      <p className="habit-help">Higher scores give a habit more weight in your daily percentage. Editing a score keeps previously logged scores intact.</p>
      {error && <p className="error-message" role="alert">{error}</p>}<p role="status" className="habit-status">{message}</p>
    </section>);
  if(loading) return <PageSkeleton/>;
  return <div className="habits-page"><div className="settings-heading"><h2>Settings</h2><p className="card-subtitle">Personalize your workspace and manage the habits you track.</p></div>
    <section className="card appearance-settings"><div><h2>Appearance</h2><p className="card-subtitle">Choose your workspace colors.</p></div><ThemePicker/></section>
    {!editing && editor}<Modal open={Boolean(editing)} label="Edit habit" onClose={reset} className="edit-habit-dialog">{editor}</Modal>
    <section className="card habit-list"><div className="card-heading"><h2>Your Habits</h2><span className="subtle-badge">{active.length} active</span></div>{!active.length && <p className="empty-state">Your next routine starts here. Add your first habit above.</p>}{active.map(h => <div className="manage-habit" key={h.id}><strong title={h.name}>{h.name}</strong><span className="habit-weight">{h.weight}<small>/10</small></span><div className="habit-row-actions"><Button variant="secondary"  onClick={() => edit(h)}>Edit</Button><Button variant="destructive"  onClick={() => setPending({...h, action:'archive'})}>Remove</Button></div></div>)}</section>
    {archived.length > 0 && <section className="card habit-list"><h2>Archived Habits</h2><p className="card-subtitle">Removed from tracking. Past records are preserved.</p>{archived.map(h => <div className="manage-habit" key={h.id}><strong title={h.name}>{h.name}</strong><span className="habit-weight">{h.weight}<small>/10</small></span><div className="habit-row-actions"><Button variant="secondary"  onClick={async () => {if(await restoreHabit(h.id)) setMessage('Habit restored.');}}>Restore</Button><Button variant="destructive"  onClick={() => setPending({...h, action:'delete'})}>Delete</Button></div></div>)}</section>}
    <Modal open={Boolean(pending)} label={pending?.action === 'archive' ? 'Confirm habit removal' : 'Confirm permanent deletion'} onClose={() => setPending(null)} className="confirmation-toast">{pending && <><section className="habit-modal card"><h2>{pending.action === 'archive' ? 'Remove this habit?' : 'Delete habit permanently?'}</h2><p>{pending.action === 'archive' ? 'Remove “' + pending.name + '” from tracking? Its history will be preserved, and you can restore it later.' : 'Delete “' + pending.name + '” and all its history? Past scores will change. This cannot be undone.'}</p>{error && <p role="alert" className="error-message">{error}</p>}<div className="habit-form-actions"><Button variant="secondary" autoFocus  onClick={() => setPending(null)}>Cancel</Button><Button variant="destructive" confirm loading={busy} onClick={async () => {const permanent = pending.action === 'delete'; if(await (permanent ? deleteHabit : archiveHabit)(pending.id)) {setPending(null); const notice = permanent ? 'Habit and its history deleted successfully.' : 'Habit removed successfully. Its history is preserved.'; setMessage(notice); setSuccessToast(notice);}}}>{pending.action === 'archive' ? 'Confirm removal' : 'Delete permanently'}</Button></div></section></>}</Modal>

    {successToast && <div className="success-toast" role="status" aria-live="polite"><span className="success-toast-check" aria-hidden="true">✓</span><span>{successToast}</span><Button variant="icon" type="button" aria-label="Dismiss notification" onClick={() => setSuccessToast('')}><Icon name="close" size={18}/></Button></div>}
  </div>;
}

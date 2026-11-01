import Button from './Button';
import DatePicker from './DatePicker';
import { useState } from 'react';
export default function SleepInput({ today, sleep, onSave }) {
  const [day,setDay] = useState(today); const [hours,setHours] = useState(sleep[today] ?? ''); const [message,setMessage] = useState(''), [saving,setSaving] = useState(false);
  async function submit(event) { event.preventDefault(); const value = Number(hours); if (!day || day > today || hours === '' || !Number.isFinite(value) || value < 0 || value > 24 || !Number.isInteger(value * 4)) { setMessage('Enter 0–24 hours in 0.25-hour steps and a date up to today.'); return; } setSaving(true); const saved = await onSave(day,value); setSaving(false); setMessage(saved ? 'Sleep saved.' : 'Could not save sleep. Please try again.'); }
  return <form className="sleep-form" onSubmit={submit}><div className="sleep-form-label">Log your rest</div><div className="sleep-fields"><DatePicker value={day} max={today} onChange={value => { setDay(value); setHours(sleep[value] ?? ''); setMessage(''); }}/><label className="hours-field"><input aria-label="Hours of sleep" type="number" inputMode="decimal" placeholder="7.5" step="0.25" min="0" max="24" required value={hours} onChange={e => {setHours(e.target.value); setMessage('');}}/><span>hrs</span></label><Button variant="primary" loading={saving} type="submit" >Save</Button></div><span className="sleep-message" role="status">{message}</span></form>;
}

import { activeHabits } from '../utils/scoring';
export default function DonutProgress({ habits, entries, today }) {
  const active = activeHabits(habits,today); const todayEntries = active.map(h => entries[`${h.id}:${today}`]).filter(Boolean);
  const count = (status) => todayEntries.filter(e => e.status === status).length;
  const done = count('done'), skipped = count('skipped'), total = active.length - skipped;
  const circumference = 2 * Math.PI * 74;
  return <section className="card progress-card"><div className="card-heading"><h2>Today's Progress</h2><span className="subtle-badge">{total ? Math.round(done / total * 100) : 0}%</span></div><p className="card-subtitle">Show up for yourself.</p><div className="donut" role="img" aria-label={`${done} of ${total} habits completed today`}><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="74" fill="none" stroke="var(--border)" strokeWidth="14"/><circle cx="90" cy="90" r="74" fill="none" stroke="var(--primary)" strokeWidth="14" strokeLinecap={done ? 'round' : 'butt'} strokeDasharray={`${total ? done / total * circumference : 0} ${circumference}`} transform="rotate(-90 90 90)"/></svg><div><strong>{done}<span>/{total}</span></strong><small>Habits completed</small></div></div></section>;
}

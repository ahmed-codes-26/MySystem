import Button from './Button';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import HabitCell from './HabitCell';
import { addDays, date } from '../utils/dates';
import { activeHabits, dailyScore } from '../utils/scoring';
export default function WeeklyHabitTable({ habits, entries, today, onChange }) {
  const [dayCount, setDayCount] = useState(() => window.innerWidth < 768 ? 4 : window.innerWidth < 1200 ? 10 : 15);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 767px)');
    const tablet = window.matchMedia('(max-width: 1199px)');
    const update = () => { setDayCount(phone.matches ? 4 : tablet.matches ? 10 : 15); };
    phone.addEventListener('change', update); tablet.addEventListener('change', update);
    return () => { phone.removeEventListener('change', update); tablet.removeEventListener('change', update); };
  }, []);
  const end = addDays(today, -offset);
  const days = Array.from({ length: dayCount }, (_, i) => addDays(end, i - dayCount + 1)); const rows = habits.filter(h => days.some(d => activeHabits([h], d).length));
  return <section className="card week-card" aria-labelledby="week-title"><div className="card-heading"><div className="flex items-center gap-3"><h2 id="week-title">Last {dayCount} Days</h2><span className="subtle-badge">{date(days[0]).format('MMM D')} – {date(end).format('MMM D, YYYY')}</span></div><div className="week-controls"><Button variant="ghost"  onClick={() => setOffset(0)} disabled={offset === 0}>Today</Button><Button variant="icon"  aria-label="Previous period" onClick={() => setOffset(offset + dayCount)}><Icon name="left" size={16}/></Button><Button variant="icon"  aria-label="Next period" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - dayCount))}><Icon name="right" size={16}/></Button></div></div>
    <div className="table-scroll"><table className="habit-table" style={{ '--day-count': dayCount }}><thead><tr><th scope="col">Habits</th>{days.map(day => <th scope="col" key={day} className={day === today ? 'today-col' : ''}><span>{date(day).format('ddd')}</span><b>{date(day).format('DD')}</b></th>)}</tr></thead><tbody>{rows.map(habit => <tr key={habit.id}><th scope="row"><div className="habit-info"><strong>{habit.name}</strong></div></th>{days.map(day => <td key={day} className={day === today ? 'today-col' : ''}><HabitCell habit={habit} day={day} status={entries[`${habit.id}:${day}`]?.status} disabled={day > today || !activeHabits([habit],day).length} onChange={onChange}/></td>)}</tr>)}</tbody><tfoot><tr><th scope="row"><div className="habit-info"><strong>Daily Score</strong></div></th>{days.map(day => { const score = dailyScore(Object.values(entries).filter(e => e.date === day)); return <td key={day} className={day === today ? 'today-col' : ''}><span className={`score-tile ${score === null ? 'no-score' : score >= 80 ? 'high-score' : 'day-score'}`}>{score === null ? '—' : `${score}%`}</span></td>; })}</tr></tfoot></table>{!rows.length && <p className="empty-state">No habits in this period. Return to today to see your current habits.</p>}</div>
  </section>;
}

import Button from './Button';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import HabitCell from './HabitCell';
import { addDays, date, dateRange, habitHistoryStart, monthlyViewStart } from '../utils/dates';
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
  const start = monthlyViewStart(habitHistoryStart(entries, habits, today), today);
  const month = today.slice(0, 7);
  useEffect(() => setOffset(0), [month, dayCount]);
  const maxOffset = Math.max(0, date(today).diff(date(start), 'day'));
  const currentOffset = Math.min(offset, maxOffset);
  const end = addDays(today, -currentOffset);
  const first = addDays(end, 1 - dayCount);
  const days = dateRange(first < start ? start : first, end); const rows = habits.filter(h => days.some(d => activeHabits([h], d).length));
  return <section className="card week-card" aria-labelledby="week-title"><div className="card-heading"><div className="flex items-center gap-3"><h2 id="week-title">{currentOffset === 0 ? 'Latest' : 'Previous'} {days.length} {days.length === 1 ? 'Day' : 'Days'}</h2><span className="subtle-badge">{date(days[0]).format('MMM D')} – {date(end).format('MMM D, YYYY')}</span></div><div className="week-controls"><Button variant="ghost"  onClick={() => setOffset(0)} disabled={currentOffset === 0}>Today</Button><Button variant="icon"  aria-label="Previous period" disabled={days[0] <= start} onClick={() => setOffset(Math.min(maxOffset, currentOffset + dayCount))}><Icon name="left" size={16}/></Button><Button variant="icon"  aria-label="Next period" disabled={currentOffset === 0} onClick={() => setOffset(Math.max(0, currentOffset - dayCount))}><Icon name="right" size={16}/></Button></div></div>
    <div className="table-scroll"><table className="habit-table" style={{ '--day-count': days.length }}><thead><tr><th scope="col">Habits</th>{days.map(day => <th scope="col" key={day} className={day === today ? 'today-col' : ''}><span>{date(day).format('ddd')}</span><b>{date(day).format('DD')}</b></th>)}</tr></thead><tbody>{rows.map(habit => <tr key={habit.id}><th scope="row"><div className="habit-info"><strong>{habit.name}</strong></div></th>{days.map(day => <td key={day} className={day === today ? 'today-col' : ''}><HabitCell habit={habit} day={day} status={entries[`${habit.id}:${day}`]?.status} disabled={day > today || !activeHabits([habit],day).length} onChange={onChange}/></td>)}</tr>)}</tbody><tfoot><tr><th scope="row"><div className="habit-info"><strong>Daily Score</strong></div></th>{days.map(day => { const score = dailyScore(Object.values(entries).filter(e => e.date === day)); return <td key={day} className={day === today ? 'today-col' : ''}><span className={`score-tile ${score === null ? 'no-score' : score >= 80 ? 'high-score' : 'day-score'}`}>{score === null ? '—' : `${score}%`}</span></td>; })}</tr></tfoot></table>{!rows.length && <p className="empty-state">No habits in this period. Return to today to see your current habits.</p>}</div>
  </section>;
}

import { useMemo } from 'react';
import { addDays, date } from '../utils/dates';
import { activeHabits, heatmapLevel } from '../utils/scoring';

export default function YearHeatmap({ entries, habits, today }) {
  const counts = useMemo(() => Object.values(entries).reduce((all, entry) => {
    if (entry.status === 'done') all[entry.date] = (all[entry.date] || 0) + 1;
    return all;
  }, {}), [entries]);
  const days = Array.from({ length: 365 }, (_, index) => addDays(today, index - 364));
  const activeDays = days.filter(day => counts[day]).length;
  return <section className="card heatmap-card">
    <div className="card-heading"><div><h2>{activeDays} active days</h2><p className="card-subtitle">Last 365 days · Top to bottom, column by column.</p></div></div>
    <div className="consistency-scroll" tabIndex={0} role="region" aria-label="Scrollable activity heatmap"><div className="consistency-grid" aria-label="Habit activity over the last 365 days">{days.map(day => {
      const done = counts[day] || 0;
      const description = date(day).format('MMM D, YYYY') + ': ' + done + ' habits completed';
      return <div key={day} className={'heatmap-cell level-' + heatmapLevel(done, activeHabits(habits, day).length)} tabIndex={0} aria-label={description} title={description}/>;
    })}</div></div>
    <div className="heatmap-footer"><span>One square, one day.</span><div className="heatmap-legend"><span>Less</span>{[0,1,2,3,4,5].map(level => <i key={level} className={'level-' + level}/>)}<span>More</span></div></div>
  </section>;
}

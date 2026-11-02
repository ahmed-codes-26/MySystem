import { useMemo } from 'react';
import { date, dateRange, habitHistoryStart } from '../utils/dates';
import { activeHabits, heatmapLevel } from '../utils/scoring';

export default function YearHeatmap({ entries, habits, today }) {
  const counts = useMemo(() => Object.values(entries).reduce((all, entry) => {
    if (entry.status === 'done') all[entry.date] = (all[entry.date] || 0) + 1;
    return all;
  }, {}), [entries]);
  const start = habitHistoryStart(entries, habits, today);
  const days = dateRange(start, today);
  const cellCount = Math.max(371, Math.ceil(days.length / 7) * 7);
  const activeDays = days.filter(day => counts[day]).length;
  return <section className="card heatmap-card">
    <div className="card-heading"><div><h2>{activeDays} active days</h2><p className="card-subtitle">Since {date(start).format('MMM D, YYYY')} · Top to bottom, column by column.</p></div></div>
    <div className="consistency-scroll" tabIndex={0} role="region" aria-label="Scrollable activity heatmap"><div className="consistency-grid" style={{ '--heatmap-columns': cellCount / 7 }} aria-label="Habit activity since tracking began">{days.map(day => {
      const done = counts[day] || 0;
      const description = date(day).format('MMM D, YYYY') + ': ' + done + ' habits completed';
      return <div key={day} className={'heatmap-cell level-' + heatmapLevel(done, activeHabits(habits, day).length)} tabIndex={0} aria-label={description} title={description}/>;
    })}{Array.from({ length: cellCount - days.length }, (_, index) => <div key={'empty-' + index} className="heatmap-cell level-0" aria-hidden="true"/>)}</div></div>
    <div className="heatmap-footer"><span>One square, one day.</span><div className="heatmap-legend"><span>Less</span>{[0,1,2,3,4,5].map(level => <i key={level} className={'level-' + level}/>)}<span>More</span></div></div>
  </section>;
}

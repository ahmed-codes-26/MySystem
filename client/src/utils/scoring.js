export const activeHabits = (habits, date) => habits.filter(h => h.createdOn <= date && (!h.archivedOn || h.archivedOn > date));
export function dailyScore(entries) {
  const counted = entries.filter(e => e.status === 'done' || e.status === 'missed');
  const total = counted.reduce((sum, e) => sum + e.weightSnapshot, 0);
  return total ? Math.round(counted.filter(e => e.status === 'done').reduce((sum, e) => sum + e.weightSnapshot, 0) / total * 100) : null;
}
export function weeklyScore(days) { const values = days.filter(v => v !== null); return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null; }
export const heatmapLevel = (done, count) => done && count ? Math.min(5, Math.max(1, Math.ceil(done / count * 5))) : 0;
export const nextStatus = (status) => ({ empty: 'done', done: 'skipped', skipped: 'missed', missed: null })[status || 'empty'];

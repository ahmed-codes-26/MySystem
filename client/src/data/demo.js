import { addDays, date } from '../utils/dates';
export const habits = [
  { id:'prayer', name:'Fajr Prayer', detail:'A mindful start to the day', icon:'sun', color:'amber', weight:3 },
  { id:'study', name:'Deep Work', detail:'90 minutes of focused learning', icon:'study', color:'blue', weight:3 },
  { id:'gym', name:'Move Your Body', detail:'A workout, a walk, a little energy', icon:'gym', color:'violet', weight:2 },
  { id:'read', name:'Read 20 Pages', detail:'A few pages, a fresh perspective', icon:'book', color:'rose', weight:1 },
  { id:'water', name:'Stay Hydrated', detail:'8 glasses throughout the day', icon:'water', color:'cyan', weight:1 },
  { id:'reflect', name:'Daily Reflection', detail:'Pause. Reflect. Reset.', icon:'leaf', color:'green', weight:1 },
].map(h => ({ ...h, createdOn:'2020-01-01', archivedOn:null }));
// Deterministic sample history keeps the preview stable between reloads.
export function createDemo(today) {
  const entries = {}; const sleep = {};
  const start = `${date(today).year()}-01-01`;
  for (let day = start, index = 0; day <= today; day = addDays(day, 1), index++) {
    habits.forEach((habit, i) => {
      const n = (index * 17 + i * 13) % 23;
      const status = day === today ? ['done','done','done','skipped',null,'done'][i] : n < 17 ? 'done' : n < 19 ? 'skipped' : n < 21 ? 'missed' : null;
      if (status) entries[`${habit.id}:${day}`] = { habitId:habit.id, date:day, status, weightSnapshot:habit.weight, nameSnapshot:habit.name };
    });
    sleep[day] = 6 + ((index * 7) % 11) * .25;
  }
  return { entries, sleep };
}

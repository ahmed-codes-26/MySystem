import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc); dayjs.extend(timezone);
export const todayInKarachi = () => dayjs().tz('Asia/Karachi').format('YYYY-MM-DD');
export const date = (value) => dayjs(value);
export const addDays = (value, count) => dayjs(value).add(count, 'day').format('YYYY-MM-DD');
export const weekStart = (value) => addDays(value, -((dayjs(value).day() + 6) % 7));
export const weekDates = (value) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(value), i));

export function historyStart(days, today) {
  return days.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today).sort()[0] || today;
}
export function dateRange(start, end, step = 1) {
  const days = [];
  for (let day = start; day <= end; day = addDays(day, step)) days.push(day);
  return days;
}
export function habitHistoryStart(entries, habits, today) {
  const recorded = Object.values(entries).map(entry => entry.date);
  return historyStart(recorded.some(day => day <= today) ? recorded : habits.map(habit => habit.createdOn), today);
}

// Keep a view inside the current month and its display limit, without inventing
// history before tracking began. Stored records from older months are retained.
export function monthlyViewStart(start, today, limit) {
  const month = date(today).startOf('month').format('YYYY-MM-DD');
  const earliest = limit ? addDays(today, 1 - limit) : month;
  return [start, month, earliest].sort().at(-1);
}

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc); dayjs.extend(timezone);
export const todayInKarachi = () => dayjs().tz('Asia/Karachi').format('YYYY-MM-DD');
export const date = (value) => dayjs(value);
export const addDays = (value, count) => dayjs(value).add(count, 'day').format('YYYY-MM-DD');
export const weekStart = (value) => addDays(value, -((dayjs(value).day() + 6) % 7));
export const weekDates = (value) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(value), i));

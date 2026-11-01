import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { config } from './config.js';

dayjs.extend(utc);
dayjs.extend(timezone);
export const today = () => dayjs().tz(config.APP_TIMEZONE).format('YYYY-MM-DD');

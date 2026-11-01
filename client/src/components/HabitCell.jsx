import Button from './Button';
import Icon from './Icon';
import { date } from '../utils/dates';
import { nextStatus } from '../utils/scoring';
export default function HabitCell({ habit, day, status, disabled, onChange }) {
  return <Button variant="ghost" className={`habit-cell ${status || 'empty'}`} disabled={disabled} aria-label={`${habit.name}, ${date(day).format('dddd, MMMM D')}, ${disabled ? 'future date' : status || 'not logged'}`} title={disabled ? 'Future date' : `${status || 'Not logged'} · click to mark ${nextStatus(status) || 'not logged'}`} onClick={() => onChange(habit, day, nextStatus(status))}>{status === 'done' ? <Icon name="check" size={24} strokeWidth={3}/> : status === 'skipped' ? <span className="skip-circle"/> : status === 'missed' ? <Icon name="close" size={23} strokeWidth={3}/> : <span className="empty-dash">–</span>}</Button>;
}

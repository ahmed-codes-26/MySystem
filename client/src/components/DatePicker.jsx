import Button from './Button';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Modal from './Modal';
import { addDays, date, weekStart } from '../utils/dates';
import Icon from './Icon';

export default function DatePicker({ value, max, onChange, label = 'Sleep date' }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => date(value).startOf('month'));
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef(null), popup = useRef(null);
  const id = useId();
  const pendingFocus = useRef(null);
  const place = useCallback(() => {
    if (!trigger.current) return;
    const box = trigger.current.getBoundingClientRect();
    const height = popup.current?.offsetHeight || 330;
    const left = Math.max(8, Math.min(box.left, window.innerWidth - 288));
    const top = Math.max(8, box.top >= height + 8 ? box.top - height - 8 : Math.min(box.bottom + 8, window.innerHeight - height - 8));
    setPosition(old => old.left === left && old.top === top ? old : { left, top });
  }, []);
  const bindPopup = useCallback(node => { popup.current = node; if (node) place(); }, [place]);
  useEffect(() => {
    if (!open) return;
    function outside(e) { if (!trigger.current?.contains(e.target) && !popup.current?.contains(e.target)) setOpen(false); }
    place();
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    if (pendingFocus.current) { popup.current?.querySelector(`[aria-label="${date(pendingFocus.current).format('MMMM D, YYYY')}"]`)?.focus(); pendingFocus.current = null; }
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open, month]);
  const choose = day => { onChange(day); setOpen(false); trigger.current?.focus(); };
  const start = weekStart(month.format('YYYY-MM-DD'));
  return <><Button variant="secondary" ref={trigger} type="button" className="date-trigger" aria-label={`${label}: ${date(value).format('MMMM D, YYYY')}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {setMonth(date(value).startOf('month')); setOpen(!open);}}><Icon name="calendar" size={14}/>{date(value).format('MMM D, YYYY')}</Button>
    <Modal open={open} label={`Choose ${label.toLowerCase()}`} className="calendar-dialog" style={position} initialFocus='[data-selected="true"]' animate={false} onClose={() => setOpen(false)}><div ref={bindPopup} id={id} className="date-calendar" onKeyDown={e => {if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); } if(e.key === 'Tab') { const controls = [...popup.current.querySelectorAll('button:not(:disabled)')]; const first = controls[0], last = controls.at(-1); if(e.shiftKey && document.activeElement === first) {e.preventDefault(); last.focus();} else if(!e.shiftKey && document.activeElement === last) {e.preventDefault(); first.focus();} }}}>
      <div className="calendar-heading"><Button variant="icon" type="button"  aria-label="Previous month" onClick={() => setMonth(month.subtract(1,'month'))}><Icon name="left" size={15}/></Button><strong aria-live="polite">{month.format('MMMM YYYY')}</strong><Button variant="icon" type="button"  aria-label="Next month" disabled={month.format('YYYY-MM') >= date(max).format('YYYY-MM')} onClick={() => setMonth(month.add(1,'month'))}><Icon name="right" size={15}/></Button></div>
      <div className="calendar-grid">{['M','T','W','T','F','S','S'].map((d,i) => <span className="calendar-weekday" key={i}>{d}</span>)}{Array.from({length:42},(_,i) => {const day = addDays(start,i); return <Button variant="icon" key={day} type="button" disabled={day > max} data-selected={day === value} aria-label={date(day).format('MMMM D, YYYY')} aria-pressed={day === value} className={`calendar-day ${day === value ? 'selected' : ''} ${date(day).month() !== month.month() ? 'muted' : ''}`} onClick={() => choose(day)} onKeyDown={e => {const step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key]; if(step) {e.preventDefault(); const next = addDays(day,step); if(next <= max) {const target = popup.current.querySelector(`[aria-label="${date(next).format('MMMM D, YYYY')}"]`); if(target) target.focus(); else { pendingFocus.current = next; setMonth(date(next).startOf('month')); }}}}}>{date(day).date()}</Button>;})}</div>
      <Button variant="ghost" type="button" className="calendar-today" onClick={() => choose(max)}>Today · {date(max).format('MMM D')}</Button>
    </div></Modal>
  </>;
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open = true, children, onClose, label, className = '', style, initialFocus, animate = true }) {
  const ref = useRef(null), content = useRef(children), previous = useRef(null), retainedLabel = useRef(label);
  const [mounted,setMounted] = useState(open);
  if(open) { content.current = children; retainedLabel.current = label; }
  useEffect(() => {
    if(open) {setMounted(true); return;}
    if(!mounted) return;
    const delay = !animate || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160;
    const timer = setTimeout(() => {ref.current?.close(); setMounted(false); content.current = null; previous.current?.focus();},delay);
    return () => clearTimeout(timer);
  },[open,mounted]);
  useEffect(() => {
    if(!mounted) return;
    previous.current = document.activeElement;
    ref.current?.showModal();
    if (initialFocus) ref.current?.querySelector(initialFocus)?.focus();
    return () => {ref.current?.close(); previous.current?.focus();};
  },[mounted]);
  if(!mounted) return null;
  return createPortal(<dialog ref={ref} style={style} className={`themed-dialog ${animate ? open ? 'modal-enter' : 'modal-exit' : ''} ${className}`} aria-label={retainedLabel.current} onCancel={event => {event.preventDefault(); event.stopPropagation(); onClose();}}>{content.current}</dialog>,document.body);
}

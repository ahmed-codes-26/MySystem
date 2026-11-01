import { useEffect, useId, useRef } from 'react';

// Themed native radio choices retain arrow-key support inside the existing popup.
export default function Select({ label, value, options, onChange, disabled = false, placeholder = 'Choose', className = '' }) {
  const menu = useRef(null), id = useId();
  useEffect(() => {
    const dismiss = event => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && menu.current?.contains(event.target)) return;
      if (menu.current?.open) {
        menu.current.open = false;
        if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); menu.current.querySelector('summary').focus(); }
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss); };
  }, []);
  return <details ref={menu} className={`theme-picker app-select ${className}`} onToggle={() => { if (disabled && menu.current) menu.current.open = false; }}>
    <summary aria-label={`${label}: ${options.find(option => option.value === value)?.label || placeholder}`} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0} onClick={event => { if (disabled) event.preventDefault(); }}>
      <span className="select-value">{options.find(option => option.value === value)?.label || placeholder}</span><svg className="theme-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <fieldset className="theme-options" disabled={disabled}><legend>{label}</legend>{options.length ? options.map(option => <label key={option.value} className="theme-option"><input type="radio" name={id} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onChange(option.value)}/><span>{option.label}</span></label>) : <p className="select-empty">No choices available.</p>}</fieldset>
  </details>;
}

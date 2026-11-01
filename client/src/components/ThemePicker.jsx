import { useLayoutEffect, useState } from 'react';
import Select from './Select';

const themes = [['tangerine', '1 · Ink & Tangerine'], ['raspberry', '2 · Warm Paper & Raspberry'], ['pure', '3 · Pure Ink']];

export default function ThemePicker() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('mysystem-theme');
      return themes.some(([id]) => id === saved) ? saved : 'tangerine';
    } catch { return 'tangerine'; }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('mysystem-theme', theme); } catch { /* Storage is optional. */ }
  }, [theme]);
  return <Select label="Color scheme" value={theme} options={themes.map(([value, label]) => ({ value, label }))} onChange={setTheme}/>;
}

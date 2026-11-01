import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles.css';
import './themes.css';
// Apply the saved palette on every route, before the first render.
try {
  const theme = localStorage.getItem('mysystem-theme');
  document.documentElement.dataset.theme = ['tangerine', 'raspberry', 'pure'].includes(theme) ? theme : 'tangerine';
} catch { document.documentElement.dataset.theme = 'tangerine'; }
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);

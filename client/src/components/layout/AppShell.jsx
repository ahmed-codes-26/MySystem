import Button from '../Button';
import ShellSkeleton from '../ShellSkeleton';
import {AppReadyContext} from '../../context/AppReadyContext';
import PageMotion from '../PageMotion';
import { useLocation } from 'react-router';
import { useCallback, useState } from 'react';
import Sidebar from './Sidebar';
import Icon from '../Icon';
export default function AppShell({ children }) {
  const [booting,setBooting]=useState(true);
  const ready=useCallback(()=>setBooting(false),[]);
  const location = useLocation();
  const [open,setOpen] = useState(false);
  return <AppReadyContext.Provider value={ready}>{booting && <ShellSkeleton/>}<div className={`shell-boot-content ${booting ? 'booting' : 'boot-ready'}`} inert={booting ? true : undefined} aria-hidden={booting ? true : undefined}><Sidebar open={open} close={() => setOpen(false)}/><div className="app-main"><header className="topbar"><div className="nav-main flex items-center gap-3"><Button variant="icon" className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}><Icon name="menu"/></Button><span className="mobile-brand">My<span>System</span></span><span className="breadcrumb">{location.pathname === '/finance' ? 'Finance' : location.pathname === '/passwords' ? 'Passwords' : location.pathname === '/settings' ? 'Settings' : 'Habit Tracking'}</span><div id="page-actions" className="page-actions"/></div></header><main id="main-content"><PageMotion route={location.pathname}>{children}</PageMotion></main><footer className="page-footer"><span>MySystem <span>·</span> Built around you.</span><span>One day at a time.</span></footer></div></div></AppReadyContext.Provider>;
}

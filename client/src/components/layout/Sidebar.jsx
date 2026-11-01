import Button from '../Button';
import { send } from '../../api/client';
import { NavLink } from 'react-router';
import Icon from '../Icon';
export default function Sidebar({ open, close }) {
  return <><div className={`sidebar-scrim ${open ? 'visible' : ''}`} aria-hidden="true" onClick={close}/><aside className={`sidebar ${open ? 'open' : ''}`}>
    <a className="brand" href="/">My<span>System</span><small>YOUR PERSONAL WORKSPACE</small></a>
    <div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">
      <NavLink to="/" onClick={close}><Icon name="habits"/>Habit Tracking</NavLink>
      <NavLink to="/finance" onClick={close}><Icon name="finance"/>Finance</NavLink>
      <NavLink to="/passwords" onClick={close}><Icon name="lock"/>Passwords</NavLink>
    </nav>
    <div className="sidebar-bottom"><nav aria-label="Settings navigation"><NavLink to="/settings" onClick={close}><Icon name="settings"/>Settings</NavLink></nav><div className="sidebar-owner">AHMED ALI</div><Button variant="ghost" className="logout" onClick={async () => {try {await send('/auth/logout','POST');window.dispatchEvent(new Event('session-expired'));} catch {window.alert('Could not log out. Please try again.');}}}><Icon name="logout"/>Log out</Button></div>
  </aside></>;
}

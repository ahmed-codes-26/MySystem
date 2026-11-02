import Button from '../components/Button';
import ShellSkeleton from '../components/ShellSkeleton';
import {useEffect,useState} from 'react';
import {api,send} from '../api/client';
export default function AuthGate({children}) {
 const [state,setState]=useState('loading'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;const check=()=>api('/auth/me').then(()=>{if(active)setState('ready');}).catch(()=>{if(active)setState('login');});check();const expired=()=>{setState('login');setPassword('');};const visit=()=>{if(!document.hidden)check();};window.addEventListener('session-expired',expired);document.addEventListener('visibilitychange',visit);return()=>{active=false;window.removeEventListener('session-expired',expired);document.removeEventListener('visibilitychange',visit);};},[]);
 if(state==='loading')return <ShellSkeleton/>;
 if(state==='ready')return children;
 return <div className="login-page"><section className="card vault-unlock"><h1>MySystem</h1><p>Your personal workspace.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await send('/auth/login','POST',{password});await api('/auth/me');setPassword('');setState('ready');}catch(e){setError(e.message);}finally{setBusy(false);}}}><label>Password<input autoFocus type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><Button type="submit" variant="primary"  loading={busy}>{busy?'Signing in…':'Log in'}</Button></form>{error&&<p className="error-message" role="alert">{error}</p>}</section></div>;
}

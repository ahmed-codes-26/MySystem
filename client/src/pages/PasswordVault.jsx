import Button from '../components/Button';
import PageSkeleton from '../components/PageSkeleton';
import {createPortal} from 'react-dom';
import {useEffect,useMemo,useRef,useState} from 'react';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import AccountForm from '../components/AccountForm';
import useVault from '../hooks/useVault';
import {isSecretField} from '../utils/vaultDetails';
import {accountInitials,accountUsername} from '../utils/passwordAccounts';
import {copyAccountValue} from '../utils/accountClipboard';

export default function PasswordVault(){
 const [headerTarget,setHeaderTarget]=useState(null);
 useEffect(()=>{setHeaderTarget(document.getElementById('page-actions'));},[]);
 const vault=useVault();const [search,setSearch]=useState(''),[selectedId,setSelectedId]=useState(null),[form,setForm]=useState(null),[deleting,setDeleting]=useState(false),[revealed,setRevealed]=useState({}),[message,setMessage]=useState(''),[copyError,setCopyError]=useState('');
 const [detail,setDetail]=useState(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState(''),[detailRetry,setDetailRetry]=useState(0),[visible,setVisible]=useState(()=>!document.hidden);
 const searchRef=useRef(null),detailRef=useRef(null),revealTimers=useRef({}),alive=useRef(true),copySequence=useRef(0);
 const categories=useMemo(()=>[...new Set(['Personal','Work','Finance','Social','Other',...vault.records.map(r=>r.category||'Other')])],[vault.records]);
 const filtered=useMemo(()=>vault.records.filter(r=>[r.name,accountUsername(r)].some(v=>v.toLowerCase().includes(search.toLowerCase().trim()))).sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite))||a.name.localeCompare(b.name)),[vault.records,search]);
 const selected=filtered.find(r=>r.id===selectedId)||filtered[0]||null;
 const clearReveals=()=>{Object.values(revealTimers.current).forEach(clearTimeout);revealTimers.current={};setRevealed({});};
 useEffect(()=>{const shortcut=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!document.querySelector('dialog[open]')){e.preventDefault();searchRef.current?.focus();searchRef.current?.select();}};window.addEventListener('keydown',shortcut);return()=>window.removeEventListener('keydown',shortcut);},[]);
 useEffect(()=>{clearReveals();setCopyError('');},[selected?.id,selected?.updatedOn]);
 useEffect(()=>{alive.current=true;const hidden=()=>{setVisible(!document.hidden);if(document.hidden){clearReveals();setDetail(null);setForm(null);}};document.addEventListener('visibilitychange',hidden);return()=>{alive.current=false;Object.values(revealTimers.current).forEach(clearTimeout);document.removeEventListener('visibilitychange',hidden);};},[]);
 useEffect(()=>{
  setDetail(null);setDetailError('');if(!selected?.id||!visible){setDetailLoading(false);return;}
  const controller=new AbortController();setDetailLoading(true);
  vault.read(selected.id,controller.signal).then(record=>{if(!controller.signal.aborted)setDetail(record);}).catch(error=>{if(!controller.signal.aborted)setDetailError(error.message);}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
  return()=>controller.abort();
 },[selected?.id,selected?.updatedOn,visible,detailRetry,vault.read]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(timer);},[message]);
 function toggleReveal(index){clearTimeout(revealTimers.current[index]);if(revealed[index])setRevealed(old=>({...old,[index]:false}));else{setRevealed(old=>({...old,[index]:true}));revealTimers.current[index]=setTimeout(()=>setRevealed(old=>({...old,[index]:false})),10000);}}
 async function copy(field){const sequence=++copySequence.current;try{await copyAccountValue(field.value,text=>{if(alive.current&&copySequence.current===sequence)setMessage(text);});setMessage('Copied · clears after 30 seconds');setCopyError('');}catch{setCopyError('Copy was blocked. Reveal and select the value to copy manually.');}}
 function select(record){setSelectedId(record.id);clearReveals();if(matchMedia('(max-width: 767px)').matches){detailRef.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});detailRef.current?.focus({preventScroll:true});}}
 if(vault.loading) return <PageSkeleton/>;
 return <div className="accounts-page">
  {headerTarget && createPortal(<Button variant="primary"  disabled={vault.loading} onClick={()=>setForm({kind:'add'})}>Add account</Button>,headerTarget)}
  {vault.error&&<div className="error-message" role="alert">{vault.error}<Button variant="secondary"  onClick={vault.reload}>Retry</Button></div>}
  <div className="accounts-panes">
   <section className="card accounts-browser" aria-label="Find an account"><label className="accounts-search"><Icon name="search" size={18}/><span className="sr-only">Search accounts by name or username</span><input ref={searchRef} type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accounts"/><kbd>Ctrl K</kbd></label>
    <div className="accounts-results" aria-live="polite">{vault.loading?'Loading accounts…':`${filtered.length} ${filtered.length===1?'account':'accounts'}`}</div>
    <ul className="accounts-list">{filtered.map(record=><li key={record.id}><Button variant="ghost"  aria-current={selected?.id===record.id?'true':undefined} onClick={()=>select(record)}><span className="accounts-initial" aria-hidden="true">{accountInitials(record.name)}</span><span className="accounts-list-text"><strong>{record.favorite&&<span aria-label="Pinned">★ </span>}{record.name}</strong><small>{accountUsername(record)}</small></span></Button></li>)}</ul>
    {!vault.loading&&!filtered.length&&<div className="accounts-empty"><p>{vault.records.length?'No accounts match your filters.':'Add your first account to save its sign-in details.'}</p><Button variant="secondary" onClick={()=>vault.records.length?(setSearch('')):setForm({kind:'add'})}>{vault.records.length?'Clear filters':'Add account'}</Button></div>}
   </section>
   <section ref={detailRef} tabIndex={-1} className="card accounts-detail" aria-label="Selected account details">
    {selected?<><div className="accounts-detail-header"><div><h2>{selected.name}</h2></div><div className="accounts-detail-actions"><Button variant="icon" title={selected.favorite?'Unpin account':'Pin account'} aria-label={selected.favorite?'Unpin account':'Pin account'} disabled={vault.busy} aria-pressed={Boolean(selected.favorite)} onClick={async()=>{await vault.update(selected.id,{favorite:!selected.favorite});}}><Icon name="pin" size={18} fill={selected.favorite?'currentColor':'none'}/></Button><Button variant="secondary"  disabled={vault.busy||detailLoading||!detail||detail.id!==selected.id} onClick={()=>{clearReveals();setForm({kind:'edit',account:detail});}}>Edit</Button></div></div>
     {detailLoading&&<p role="status" className="empty-state">Loading account details…</p>}{detailError&&<div role="alert" className="error-message">{detailError}<Button variant="secondary" onClick={()=>setDetailRetry(value=>value+1)}>Retry details</Button></div>}{detail&&detail.id===selected.id&&visible&&<dl className="accounts-fields">{detail.fields.map((field,index)=><div className="accounts-field" key={`${selected.id}-${index}`}><dt>{field.label}</dt><dd><span className="accounts-value">{isSecretField(field.label)&&!revealed[index]?'••••••••••••':field.value}</span><span className="accounts-field-actions">{isSecretField(field.label)&&<Button variant="icon"  aria-label={`${revealed[index]?'Hide':'Reveal'} ${field.label}, field ${index+1}`} aria-pressed={Boolean(revealed[index])} title={revealed[index]?'Hide':'Reveal for 10 seconds'} onClick={()=>toggleReveal(index)}><Icon name={revealed[index]?'eyeOff':'eye'} size={19}/></Button>}<Button variant="icon" title="Copy" aria-label={`Copy ${field.label}, field ${index+1}`} onClick={()=>copy(field)}><Icon name="copy" size={17}/></Button></span></dd></div>)}</dl>}
     {copyError&&<p className="error-message" role="alert">{copyError}</p>}
     <div className="accounts-detail-footer"><span>Last updated {selected.updatedOn||selected.createdOn?new Date(selected.updatedOn||selected.createdOn).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Unknown'}</span><Button variant="destructive"  disabled={vault.busy} onClick={()=>setDeleting(true)}>Delete account</Button></div>
    </>:<div className="accounts-empty"><p>{vault.loading?'Loading details…':'Select an account to view and copy its details.'}</p></div>}
   </section>
  </div>
  <Modal open={Boolean(form)} label={form?.kind==='edit'?'Edit account':'Add account'} onClose={()=>{if(!vault.busy)setForm(null);}} className="accounts-form-dialog">{form&&<AccountForm key={form.account?.id||'new'} account={form.account} categories={categories} busy={vault.busy} error={vault.error} onClose={()=>setForm(null)} onSave={async body=>{const saved= form.kind==='edit'?await vault.update(form.account.id,body):await vault.add(body);if(saved){setSearch('');setSelectedId(saved.id);setMessage(form.kind==='edit'?'Account updated.':'Account added.');}return saved;}}/>}</Modal>
  <Modal open={deleting&&Boolean(selected)} label="Confirm account deletion" onClose={()=>{if(!vault.busy)setDeleting(false);}} className="accounts-confirm-dialog">{selected&&<section className="card accounts-form-content"><h2>Delete {selected.name}?</h2><p>This permanently removes this account and all its fields. It cannot be undone.</p>{vault.error&&<p className="error-message" role="alert">{vault.error}</p>}<div className="habit-form-actions"><Button variant="secondary" autoFocus  disabled={vault.busy} onClick={()=>setDeleting(false)}>Cancel</Button><Button variant="destructive" confirm  loading={vault.busy} onClick={async()=>{if(await vault.remove(selected.id)){setDeleting(false);clearReveals();setMessage('Account deleted.');}}}>{vault.busy?'Deleting…':'Delete account'}</Button></div></section>}</Modal>
  <div className={`accounts-feedback ${message?'is-visible':''}`} role="status" aria-live="polite">{message}</div>
 </div>;
}

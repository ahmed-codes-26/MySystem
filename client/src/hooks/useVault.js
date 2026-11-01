import {AppReadyContext} from '../context/AppReadyContext';
import {useCallback,useContext,useEffect,useRef,useState} from 'react';
import {api,send} from '../api/client';
export default function useVault(){
 const ready=useContext(AppReadyContext);
 const read=useCallback((id,signal)=>api(`/passwords/${encodeURIComponent(id)}`,{signal}),[]);
 const [records,setRecords]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');const working=useRef(false);
 useEffect(()=>{if(!loading)ready();},[loading,ready]);
 async function reload(){setLoading(true);setError('');try{setRecords(await api('/passwords'));}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{let active=true;api('/passwords').then(data=>{if(active)setRecords(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function mutate(path,method,body){if(working.current||loading)return false;working.current=true;setBusy(true);setError('');try{const result=await send(path,method,body);if(method==='DELETE')setRecords(old=>old.filter(r=>'/passwords/'+r.id!==path));else if(method==='POST')setRecords(old=>[...old,result]);else setRecords(old=>old.map(r=>r.id===result.id?result:r));return result;}catch(e){setError(e.message);return false;}finally{working.current=false;setBusy(false);}}
 return {records,loading,busy,error,reload,read,add:body=>mutate('/passwords','POST',body),update:(id,body)=>mutate('/passwords/'+id,'PATCH',body),remove:id=>mutate('/passwords/'+id,'DELETE')};
}

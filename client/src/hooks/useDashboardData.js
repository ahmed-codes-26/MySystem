import {AppReadyContext} from '../context/AppReadyContext';
import {useContext,useEffect,useRef,useState} from 'react';
import {api,send} from '../api/client';
export default function useDashboardData(options) {
 const habitsOnly=options?.habitsOnly===true;
 const path=habitsOnly?'/habits':'/dashboard';
 const normalize=value=>habitsOnly?{habits:value,entries:{},sleep:{}}:value;
 const ready=useContext(AppReadyContext);
 const [data,setData]=useState({habits:[],entries:{},sleep:{}}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);const chains=useRef({});
 useEffect(()=>{if(!loading)ready();},[loading,ready]);
 async function refresh(){const next=normalize(await api(path));setData(next);return next;}
 useEffect(()=>{let active=true;api(path).then(normalize).then(next=>{if(active)setData(next);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[path]);
 async function mutate(path,method,body){if(busy)return false;setBusy(true);try{await send(path,method,body);await refresh();setError('');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 function setEntry(habit,date,status){const key=`${habit.id}:${date}`;setData(old=>{const entries={...old.entries};if(status)entries[key]={habitId:habit.id,date,status,weightSnapshot:habit.weight};else delete entries[key];return {...old,entries};});chains.current[key]=(chains.current[key]||Promise.resolve()).then(async()=>{try{await send('/entries','PUT',{habitId:habit.id,date,status});setError('');}catch(e){setError(e.message);await refresh().catch(()=>{});}});}
 return {...data,loading,busy,error,setEntry,setSleep:(date,hours)=>mutate('/sleep','PUT',{date,hours}),saveHabit:(input,id)=>mutate(id?`/habits/${id}`:'/habits',id?'PATCH':'POST',{name:input.name.trim(),weight:Number(input.weight)}),archiveHabit:id=>mutate(`/habits/${id}/archive`,'POST'),restoreHabit:id=>mutate(`/habits/${id}/restore`,'POST'),deleteHabit:id=>mutate(`/habits/${id}`,'DELETE')};
}

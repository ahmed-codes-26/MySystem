import DashboardSkeleton from '../components/DashboardSkeleton';
import { useEffect, useState } from 'react';

import { addDays, date, todayInKarachi, weekDates, weekStart } from '../utils/dates';
import { dailyScore, weeklyScore } from '../utils/scoring';
import useDashboardData from '../hooks/useDashboardData';
import WeeklyHabitTable from '../components/WeeklyHabitTable';
import DonutProgress from '../components/DonutProgress';
import CrossLineChart from '../components/CrossLineChart';
import SleepInput from '../components/SleepInput';

import YearHeatmap from '../components/YearHeatmap';
import Icon from '../components/Icon';
export default function Dashboard() {
  const [today,setToday] = useState(todayInKarachi);
  useEffect(() => { const timer = setInterval(() => setToday(todayInKarachi()),30000); return () => clearInterval(timer); },[]);
  const { habits, entries, sleep, error, loading, today: serverToday, setEntry, setSleep } = useDashboardData(today);
  useEffect(() => {if(serverToday)setToday(serverToday);},[serverToday]);
  const all = Object.values(entries);
  const sleepPoints = Array.from({length:14},(_,i) => {const day = addDays(today,i-13); return {label:i === 13 ? 'Today' : date(day).format('MMM D'), value:sleep[day] ?? null};});
  const sleepValues = sleepPoints.filter(p => p.value !== null); const sleepAverage = sleepValues.length ? (sleepValues.reduce((sum,p) => sum+p.value,0) / sleepValues.length).toFixed(1) : null;
  const scoresByDay = {}; all.forEach(e => (scoresByDay[e.date] ??= []).push(e));
  const weeklyPoints = Array.from({length:12},(_,i) => {const start = addDays(weekStart(today),(i-11)*7); return {label:date(start).format('MMM D'), value:weeklyScore(weekDates(start).map(day => dailyScore(scoresByDay[day] || [])))};});
  const latestScore = weeklyPoints.at(-1).value;
  if(loading) return <DashboardSkeleton/>;
  return <div className="dashboard page-enter">
    {error && <div className="error-message" role="alert">{error}</div>}
    <WeeklyHabitTable habits={habits} entries={entries} today={today} onChange={setEntry}/>
    <div className="progress-row"><DonutProgress habits={habits} entries={entries} today={today}/><section className="card sleep-card"><div className="card-heading"><div className="flex items-center gap-2"><span className="section-icon"><Icon name="moon" size={19}/></span><h2>Sleep Hours</h2></div><span className="sleep-average">{sleepAverage === null ? 'No logs yet' : <><strong>{sleepAverage}h</strong> avg.</>}</span></div><p className="card-subtitle">Last 14 days</p><CrossLineChart compact points={sleepPoints} yMin={0} yMax={Math.max(10,...sleepValues.map(p => p.value))} yTicks={[0,2,4,6,8,10]} unit="h" label="Sleep hours over the last 14 days"/><SleepInput key={today} today={today} sleep={sleep} onSave={setSleep}/></section></div>

    <section className="card score-card"><div className="card-heading"><div><h2>The Bigger Picture</h2><p className="card-subtitle">Weekly score <span>·</span> Your progress over the last 12 weeks</p></div><span className="score-badge">{latestScore === null ? 'No score yet' : <><strong>{latestScore}%</strong><span>This week</span></>}</span></div><CrossLineChart points={weeklyPoints} yMin={0} yMax={100} yTicks={[0,25,50,75,100]} unit="%" label="Weekly score history for the last 12 weeks"/></section>
    <YearHeatmap entries={entries} habits={habits} today={today}/>
  </div>;
}

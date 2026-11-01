import {useLocation} from 'react-router';
import DashboardSkeleton from './DashboardSkeleton';
export default function PageSkeleton(){
 const {pathname}=useLocation();
 if(pathname==='/finance')return <div className="dashboard dashboard-skeleton" role="status" aria-label="Loading Finance" aria-busy="true"><section className="card skeleton-progress"><div className="skeleton-bar skeleton-title"/><div className="skeleton-bar"/></section><section className="card skeleton-progress"><div className="skeleton-bar skeleton-chart"/></section></div>;
 if(pathname==='/passwords')return <div className="accounts-panes dashboard-skeleton" role="status" aria-label="Loading accounts" aria-busy="true"><section className="card skeleton-progress"><div className="skeleton-bar"/>{Array.from({length:4},(_,i)=><div className="skeleton-bar skeleton-account-row" key={i}/>)}</section><section className="card skeleton-progress"><div className="skeleton-bar skeleton-title"/>{Array.from({length:3},(_,i)=><div className="skeleton-bar skeleton-account-row" key={i}/>)}</section></div>;
 if(pathname==='/settings'||pathname==='/habits')return <div className="dashboard dashboard-skeleton" role="status" aria-label="Loading settings" aria-busy="true"><section className="card skeleton-progress"><div className="skeleton-bar skeleton-title"/><div className="skeleton-bar skeleton-chart"/></section><section className="card skeleton-progress">{Array.from({length:6},(_,i)=><div className="skeleton-bar skeleton-account-row" key={i}/>)}</section></div>;
 return <DashboardSkeleton/>;
}

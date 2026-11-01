import { createPortal } from 'react-dom';
import { useContext, useEffect, useState } from 'react';
import { AppReadyContext } from '../context/AppReadyContext';
import useFinance from '../hooks/useFinance';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import FinanceState from '../components/finance/FinanceState';
import FinanceStats from '../components/finance/FinanceStats';
import StartingBalances from '../components/finance/StartingBalances';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionLog from '../components/finance/TransactionLog';
import FinanceGoals from '../components/finance/FinanceGoals';
import MoveMoney from '../components/finance/MoveMoney';
import FinanceBudgets from '../components/finance/FinanceBudgets';
import FinanceRecurring from '../components/finance/FinanceRecurring';
import OwedPanel from '../components/finance/OwedPanel';
import CategoryPanel from '../components/finance/CategoryPanel';
import { date, todayInKarachi } from '../utils/dates';
import '../finance.css';

export default function Finance() {
  const ready = useContext(AppReadyContext);
  const [headerTarget,setHeaderTarget]=useState(null);
  useEffect(()=>setHeaderTarget(document.getElementById('page-actions')),[]);
  const [month, setMonth] = useState(null), [filters, setFilters] = useState({ search: '', type: '', category: '', allTime: false, page: 1 });
  const [balancesOpen, setBalancesOpen] = useState(false), [setupDismissed, setSetupDismissed] = useState(false), [notice, setNotice] = useState('');
  const [moneyFlow, setMoneyFlow] = useState(null);
  const [owedOpen, setOwedOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const finance = useFinance(month, filters, owedOpen);
  const overview = finance.overview.data;
  const today = overview?.today || todayInKarachi();
  const selectedMonth = month || overview?.month;
  useEffect(() => { if (!finance.overview.loading && !finance.categories.loading) ready(); }, [finance.overview.loading, finance.categories.loading, ready]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  function changeMonth(amount) {
    setMonth(date(`${selectedMonth}-01`).add(amount, 'month').format('YYYY-MM'));
    setFilters(old => ({ ...old, page: 1 }));
  }
  return <>{headerTarget&&createPortal(<div className="finance-header-actions">
      <Button variant="ghost" size="small" disabled={finance.busy} onClick={() => setCategoriesOpen(true)}>Categories</Button>
      {overview && <Button variant="ghost" size="small" disabled={finance.busy || finance.overview.loading} onClick={() => setBalancesOpen(true)}>Adjust starting balances</Button>}
      <div className="finance-month" aria-label="Selected Finance month"><Button variant="icon" aria-label="Previous month" disabled={!selectedMonth || finance.busy} onClick={() => changeMonth(-1)}><Icon name="left" size={16}/></Button><span aria-live="polite">{selectedMonth ? date(`${selectedMonth}-01`).format('MMMM YYYY') : 'Loading month…'}</span><Button variant="icon" aria-label="Next month" disabled={!selectedMonth || finance.busy || selectedMonth >= today.slice(0, 7)} onClick={() => changeMonth(1)}><Icon name="right" size={16}/></Button></div>
    </div>,headerTarget)}<div className="finance-page">
    <TransactionLog resource={finance.log} categoryResource={finance.categories} filters={filters} setFilters={setFilters} today={today} busy={finance.busy} mutate={finance.mutate} onNotice={setNotice}/>

    <FinanceState {...finance.overview} label="summary">{overview && <>
      {!overview.settings.setupCompleted && !setupDismissed && <StartingBalances key="setup" setup settings={overview.settings} busy={finance.busy} mutate={finance.mutate} onClose={() => { setSetupDismissed(true); setNotice('Starting balances saved.'); }}/>}<FinanceStats overview={overview} busy={finance.busy} onMoveMoney={setMoneyFlow} onManageOwed={() => setOwedOpen(true)}/>
    </>}</FinanceState>
    <section className="card finance-quick-add" aria-labelledby="finance-quick-add-title"><h2 id="finance-quick-add-title" className="sr-only">Quick add transaction</h2><FinanceState {...finance.categories} loading={finance.categories.loading && !finance.categories.data} label="categories">{finance.categories.data && <TransactionForm categories={finance.categories.data} today={today} busy={finance.busy} mutate={finance.mutate} onSaved={() => setNotice('Transaction added.')}/>}</FinanceState></section>
    <FinanceGoals resource={finance.overview} busy={finance.busy} mutate={finance.mutate} onMoveMoney={setMoneyFlow} onNotice={setNotice}/>
    <div className="finance-secondary-grid"><FinanceBudgets resource={finance.overview} busy={finance.busy} mutate={finance.mutate} onNotice={setNotice}/><FinanceRecurring resource={finance.overview} categories={finance.categories} revision={finance.revision} busy={finance.busy} mutate={finance.mutate} onNotice={setNotice}/></div>
    <Modal open={balancesOpen} label="Adjust starting balances" className="finance-dialog" onClose={() => { if (!finance.busy) setBalancesOpen(false); }}>{balancesOpen && overview && <StartingBalances settings={overview.settings} busy={finance.busy} mutate={finance.mutate} onClose={saved => { setBalancesOpen(false); if (saved) setNotice('Starting balances updated.'); }}/>}</Modal>
    <Modal open={Boolean(moneyFlow)} label="Move money" className="finance-dialog" onClose={() => { if (!finance.busy) setMoneyFlow(null); }}>{moneyFlow && (overview ? <MoveMoney initial={moneyFlow} overview={overview} busy={finance.busy} refreshing={finance.overview.loading} mutate={finance.mutate} retry={finance.overview.retry} onClose={saved => { setMoneyFlow(null); if (saved) setNotice('Money moved.'); }}/> : <div className="finance-dialog-content"><h2>Move money</h2><FinanceState {...finance.overview} label="balances"/><Button variant="secondary" onClick={() => setMoneyFlow(null)}>Cancel</Button></div>)}</Modal>
    <Modal open={owedOpen} label="Manage owed items" className="finance-dialog finance-owed-dialog" onClose={() => { if (!finance.busy) setOwedOpen(false); }}>{owedOpen && <OwedPanel resource={finance.owed} today={today} busy={finance.busy} mutate={finance.mutate} onNotice={setNotice} onClose={() => setOwedOpen(false)}/>}</Modal>
    <Modal open={categoriesOpen} label="Manage Finance categories" className="finance-dialog" onClose={() => { if (!finance.busy) setCategoriesOpen(false); }}>{categoriesOpen && <CategoryPanel resource={finance.categories} busy={finance.busy} mutate={finance.mutate} onNotice={setNotice} onClose={() => setCategoriesOpen(false)}/>}</Modal>
    <div role="status" aria-live="polite" className="finance-notice">{notice}</div>
  </div></>;
}

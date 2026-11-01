import { useState } from 'react';
import Button from '../Button';
import Icon from '../Icon';
import FinanceState from './FinanceState';
import OwedForm from './OwedForm';
import OwedAction from './OwedAction';
import { date } from '../../utils/dates';
import { formatMoney } from '../../utils/finance';

export default function OwedPanel({ resource, today, busy, mutate, onNotice, onClose }) {
  const [action, setAction] = useState(null), [history, setHistory] = useState(false);
  const openItems = (resource.data || []).filter(item => !item.isSettled), settled = (resource.data || []).filter(item => item.isSettled);
  const selected = resource.data?.find(item => item.id === action?.item?.id) || action?.item;
  const ready = !resource.loading && !resource.error;
  function finish(saved) {
    if (saved) onNotice(action.kind === 'payment' ? 'Payment recorded.' : action.kind === 'settle' ? 'Owed item settled.' : action.kind === 'delete' ? 'Owed item deleted.' : 'Owed item saved.');
    setAction(null);
  }
  function list(items) {
    return <ul className="finance-owed-list">{items.map(item => <li key={item.id}><div className="finance-owed-item-heading"><h3>{item.person}</h3><span className={item.direction === 'owed_to_me' ? 'finance-positive' : ''}>{item.isSettled ? 'Settled' : formatMoney(item.remaining)}</span></div>
      <p className="finance-muted">{item.direction === 'i_owe' ? 'You owe' : 'Owed to you'} · {formatMoney(item.amountPaid)} recorded of {formatMoney(item.amount)} · {date(item.createdOn).format('MMM D, YYYY')}</p>
      {item.note && <p className="finance-owed-note">{item.note}</p>}
      <div className="finance-form-actions">{!item.isSettled && <><Button variant="secondary" size="small" disabled={busy || !ready} aria-label={`Record payment for ${item.person}`} onClick={() => setAction({ kind: 'payment', item })}>Record payment</Button><Button variant="ghost" size="small" disabled={busy || !ready} aria-label={`Mark ${item.person} settled`} onClick={() => setAction({ kind: 'settle', item })}>Mark settled</Button></>}<Button variant="icon" disabled={busy || !ready} aria-label={`Edit owed item for ${item.person}`} onClick={() => setAction({ kind: 'edit', item })}><Icon name="edit" size={16}/></Button><Button variant="icon" disabled={busy || !ready} aria-label={`Delete owed item for ${item.person}`} onClick={() => setAction({ kind: 'delete', item })}><Icon name="trash" size={16}/></Button></div>
    </li>)}</ul>;
  }
  return <div className="finance-dialog-content"><div className="finance-section-heading"><h2>Owed</h2><Button variant="icon" aria-label="Close owed panel" disabled={busy} onClick={onClose}><Icon name="close" size={18}/></Button></div><p className="finance-muted">Tracking only. These amounts and recorded payments do not change Available.</p>
    {action && resource.error && <FinanceState error={resource.error} retry={resource.retry} label="owed items"/>}
    {!action && <><Button variant="secondary" disabled={busy || !ready} onClick={() => setAction({ kind: 'new' })}>Add owed item</Button><FinanceState {...resource} label="owed items">
      <h3 className="finance-panel-subheading">Open items</h3>{openItems.length ? list(openItems) : <p className="finance-muted">No open owed items.</p>}
      <Button variant="ghost" size="small" aria-expanded={history} onClick={() => setHistory(!history)}>Settled history ({settled.length})</Button>{history && (settled.length ? list(settled) : <p className="finance-muted">No settled items.</p>)}
    </FinanceState></>}
    {(action?.kind === 'new' || action?.kind === 'edit') && <OwedForm key={selected?.id || 'new'} item={action.kind === 'edit' ? selected : null} today={today} busy={busy} mutate={mutate} onClose={finish}/>}
    {['payment', 'settle', 'delete'].includes(action?.kind) && selected && <OwedAction key={action.kind + selected.id} item={selected} kind={action.kind} busy={busy} refreshing={!ready} mutate={mutate} retry={resource.retry} onClose={finish}/>}
  </div>;
}

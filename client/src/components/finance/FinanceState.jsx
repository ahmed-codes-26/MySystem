import Button from '../Button';

export default function FinanceState({ loading, error, retry, label, children }) {
  if (loading) return <div className="finance-loading" role="status" aria-label={`Loading ${label}`} aria-busy="true"><span className="skeleton-bar"/><span className="skeleton-bar"/></div>;
  if (error) return <div className="finance-error" role="alert"><p>{error}</p><Button size="small" variant="secondary" onClick={retry}>Retry {label}</Button></div>;
  return children;
}

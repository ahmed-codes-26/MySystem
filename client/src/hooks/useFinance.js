import { useCallback, useEffect, useRef, useState } from 'react';
import { api, send } from '../api/client';

export function useFinanceResource(path, revision) {
  const [state, setState] = useState({ data: null, loading: true, error: '', key: null });
  const [retry, setRetry] = useState(0);
  const key = `${path}|${revision}|${retry}`;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState(old => ({ ...old, loading: true, error: '', key }));
    api(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: '', key });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message, key });
    });
    return () => controller.abort();
  }, [path, revision, retry]);
  const { key: stateKey, ...resource } = state;
  return { ...resource, loading: state.loading || stateKey !== key, retry: () => setRetry(value => value + 1) };
}

export default function useFinance(month, filters, owedOpen = false) {
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  const working = useRef(false);
  const overview = useFinanceResource(`/finance/overview${month ? `?month=${month}` : ''}`, revision);
  const categories = useFinanceResource('/finance/categories', revision);
  const owed = useFinanceResource(owedOpen ? '/finance/owed' : null, revision);
  const params = new URLSearchParams({ month: filters.allTime ? 'all' : month || '', page: String(filters.page) });
  if (!month && !filters.allTime) params.delete('month');
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  const log = useFinanceResource(`/finance/transactions?${params}`, revision);
  const mutate = useCallback(async (path, method, body) => {
    if (working.current) return { ok: false, error: 'Please wait for the current change to finish.' };
    working.current = true; setBusy(true);
    try {
      const data = await send(`/finance${path}`, method, body);
      setRevision(value => value + 1);
      return { ok: true, data };
    } catch (error) { return { ok: false, error: error.message }; }
    finally { working.current = false; setBusy(false); }
  }, []);
  return { overview, categories, log, owed, revision, busy, mutate };
}

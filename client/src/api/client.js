const apiOrigin = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');
const connectionError = 'Cannot reach the backend API. Check VITE_API_URL on the frontend, rebuild it, and check backend connectivity.';
export async function api(path, options = {}) {
  const response = await fetch(`${apiOrigin}/api${path}`, {
    credentials: 'include', cache: 'no-store', ...options,
    headers: { 'Content-Type': 'application/json', 'X-MySystem-Request': '1', ...options.headers },
  });
  // Static hosts can return index.html with status 200 for a misrouted API call.
  // A successful HTTP status alone must never establish authentication.
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error(connectionError);
  let data;
  try { data = await response.json(); } catch { throw new Error(connectionError); }
  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw new Error(data?.error || 'Request failed.');
  }
  if (['/auth/login', '/auth/me'].includes(path) && data?.authenticated !== true) throw new Error('The backend did not confirm authentication. Check the API deployment URL.');
  return data;
}
export const send = (path, method, body) => api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

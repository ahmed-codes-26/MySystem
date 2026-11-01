// Keep the development allowlist explicit; production accepts only its configured origin.
export function allowedClientOrigin(origin, config) {
  if(origin === config.CLIENT_ORIGIN) return true;
  return config.NODE_ENV === 'development' && [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174',
  ].includes(origin);
}

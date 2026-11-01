import { allowedClientOrigin } from './origins.js';
export function protectApi(config) {
  return (req, res, next) => {
    res.set({ 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Expires: '0' });
    if (!['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
    const origin = req.get('origin'), site = req.get('sec-fetch-site');
    if ((origin && !allowedClientOrigin(origin, config)) || (site === 'cross-site' && (!origin || !allowedClientOrigin(origin, config)))) return res.status(403).json({ error: 'Invalid request origin.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Non-simple headers block form-based CSRF even when Origin is absent.
      if (req.get('x-mysystem-request') !== '1' || (!origin && site && site !== 'same-origin')) return res.status(403).json({ error: 'Invalid request origin.' });
      if (req.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return res.status(415).json({ error: 'Use application/json.' });
    }
    next();
  };
}
export function helmetOptions(production) {
  return {
    frameguard: { action: 'deny' }, referrerPolicy: { policy: 'no-referrer' },
    strictTransportSecurity: production ? { maxAge: 31536000, includeSubDomains: true } : false,
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'], connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], baseUri: ["'none'"],
      frameAncestors: ["'none'"], formAction: ["'self'"], upgradeInsecureRequests: production ? [] : null,
    } },
  };
}

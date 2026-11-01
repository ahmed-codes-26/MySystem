import { z } from 'zod';
export const configuration = z.object({
  COOKIE_SAME_SITE: z.enum(['lax','none']).default('lax'),
  ADDITIONAL_CLIENT_ORIGINS: z.string().default('').transform(value=>value.split(',').map(v=>v.trim()).filter(Boolean)).refine(values=>values.every(value=>{try{return value===new URL(value).origin&&value.startsWith('https://');}catch{return false;}}),'Use comma-separated HTTPS origins.'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  JWT_SECRET: z.string().min(32),
  ADMIN_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$(1[0-5])\$[./A-Za-z0-9]{53}$/),
  VAULT_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/),
  APP_TIMEZONE: z.string().max(60).default('Asia/Karachi').refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }),
  CLIENT_ORIGIN: z.string().url().refine(value => { const url = new URL(value); return !url.username && !url.password && ['http:', 'https:'].includes(url.protocol) && (value === url.origin || value === url.origin + '/'); }).transform(value => new URL(value).origin),
}).superRefine((value, context) => {
  const options = new URLSearchParams(value.MONGODB_URI.split('?')[1] || '');
  const insecure = [...options].some(([key, option]) => (['tls', 'ssl'].includes(key.toLowerCase()) && option === 'false') || (['tlsinsecure', 'tlsallowinvalidcertificates', 'tlsallowinvalidhostnames'].includes(key.toLowerCase()) && option !== 'false'));
  if (value.NODE_ENV !== 'production') return;
  const reject = field => context.addIssue({ code: 'custom', path: [field], message: 'Unsafe production configuration.' });
  if (!value.CLIENT_ORIGIN.startsWith('https://')) reject('CLIENT_ORIGIN');
  if (insecure || (!value.MONGODB_URI.startsWith('mongodb+srv://') && options.get('tls') !== 'true' && options.get('ssl') !== 'true')) reject('MONGODB_URI');
  if (new Set(value.JWT_SECRET).size < 8) reject('JWT_SECRET');
  if (new Set(value.VAULT_ENCRYPTION_KEY).size < 8 || value.JWT_SECRET === value.VAULT_ENCRYPTION_KEY) reject('VAULT_ENCRYPTION_KEY');
});

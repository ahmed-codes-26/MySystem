import { createHmac } from 'node:crypto';
import { LoginAttempt } from './models.js';
import { config } from './config.js';
const windowMs = 15 * 60 * 1000;
async function increment(key) {
  const now = new Date(), expiresAt = new Date(now.getTime() + windowMs);
  const reset = { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] };
  const update = [{ $set: { count: { $cond: [reset, 1, { $add: [{ $ifNull: ['$count', 0] }, 1] }] }, expiresAt: { $cond: [reset, expiresAt, '$expiresAt'] } } }];
  try { return await LoginAttempt.findOneAndUpdate({ _id: key }, update, { upsert: true, new: true }); }
  catch (error) { if (error.code !== 11000) throw error; return LoginAttempt.findOneAndUpdate({ _id: key }, update, { new: true }); }
}
export async function loginThrottle(req, res, next) {
  await LoginAttempt.init();
  const hash = value => createHmac('sha256', config.JWT_SECRET).update(value).digest('hex');
  const ip = await increment(hash(`login:${req.ip}`));
  // An already-blocked IP must not be able to exhaust the owner's global bucket.
  const global = ip.count > 5 ? { count: 0, expiresAt: new Date(0) } : await increment(hash('login:owner'));
  if (ip.count > 5 || global.count > 60) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((Math.max(ip.count > 5 ? ip.expiresAt.getTime() : 0, global.count > 60 ? global.expiresAt.getTime() : 0) - Date.now()) / 1000))));
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  // Durable, shared counters; successful logins do not consume failed-attempt capacity.
  res.once('finish', () => {
    if (res.statusCode < 400) for (const item of [ip, global]) LoginAttempt.updateOne({ _id: item.id, expiresAt: item.expiresAt, count: { $gt: 0 } }, { $inc: { count: -1 } }).catch(() => {});
  });
  next();
}

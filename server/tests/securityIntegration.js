import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { writeFile } from 'node:fs/promises';
import { app } from '../src/app.js';
import { financeRouter } from '../src/financeRoutes.js';
import { config } from '../src/config.js';
import { COOKIE, issue } from '../src/auth.js';
import { Session, Password, LoginAttempt } from '../src/models.js';
import { encrypt, decrypt } from '../src/encryption.js';

const database = `audit_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
const headers = { 'Content-Type': 'application/json', 'X-MySystem-Request': '1' };
let server;
try {
  await mongoose.connect(config.MONGODB_URI, { dbName: database, serverSelectionTimeoutMS: 15000 });
  await Session.init(); await Password.init();
  const fakePassword = randomUUID() + 'Test!';
  config.ADMIN_PASSWORD_HASH = await bcrypt.hash(fakePassword, 12);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = 'GET', body, extra = {}) => fetch(base + path, { method, headers: { ...headers, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const routes = app.router.stack.filter(layer => layer.route && String(layer.route.path).startsWith('/api/')).flatMap(layer => Object.keys(layer.route.methods).map(method => [method.toUpperCase(), layer.route.path]));
  for (const layer of financeRouter.stack.filter(layer => layer.route)) for (const method of Object.keys(layer.route.methods)) routes.push([method.toUpperCase(), '/api/finance' + layer.route.path]);
  let protectedRoutes = 0;
  for (const [method, route] of routes.filter(([, path]) => !['/api/health', '/api/auth/login'].includes(path))) {
    const path = route.replace(/:[A-Za-z]+/g, 'missing');
    assert.equal((await request(path, method, ['GET', 'HEAD'].includes(method) ? undefined : {})).status, 401, `${method} ${route} must require auth`);
    if (method === 'GET') assert.equal((await request(path, 'HEAD')).status, 401);
    protectedRoutes++;
  }
  assert.ok(protectedRoutes >= 40);
  assert.equal((await request('/api/health')).status, 200);
  const login = await request('/api/auth/login', 'POST', { password: fakePassword });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Lax/);
  const cookie = setCookie.split(';')[0], token = decodeURIComponent(cookie.split('=')[1]), payload = jwt.verify(token, config.JWT_SECRET);
  const authenticated = { cookie };
  const me = await request('/api/auth/me', 'GET', undefined, authenticated);
  assert.equal(me.status, 200); assert.equal(me.headers.get('set-cookie'), null, 'fresh sessions should not write/renew on every read');
  assert.match(me.headers.get('cache-control'), /no-store/); assert.equal(me.headers.get('x-frame-options'), 'DENY');
  assert.match(me.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(me.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(me.headers.get('x-powered-by'), null);

  const otherSid = randomUUID(); await Session.create({ id: otherSid, expiresAt: new Date(Date.now() + 3600000) });
  const sign = (value, options = {}) => jwt.sign(value, config.JWT_SECRET, { issuer: 'mysystem', audience: 'owner', expiresIn: '1h', ...options });
  const invalidTokens = [sign({ role: 'guest', sid: otherSid }), sign({ role: 'owner', sid: { $ne: null } }), sign({ role: 'owner', sid: randomUUID() }), sign({ role: 'owner', sid: otherSid }, { expiresIn: -1 }), sign({ role: 'owner', sid: otherSid }, { algorithm: 'HS384' }), jwt.sign({ role: 'owner', sid: otherSid }, 'incorrect-test-key', { expiresIn: '1h', issuer: 'mysystem', audience: 'owner' })];
  for (const invalid of invalidTokens) assert.equal((await request('/api/passwords', 'GET', undefined, { cookie: `${COOKIE}=${invalid}` })).status, 401);
  const short = sign({ role: 'owner', sid: otherSid });
  assert.ok((await request('/api/auth/me', 'GET', undefined, { cookie: `${COOKIE}=${short}` })).headers.get('set-cookie'));
  const absoluteSid=randomUUID();await Session.create({id:absoluteSid,expiresAt:new Date(Date.now()+3600000),absoluteExpiresAt:new Date(Date.now()-1000)});
  assert.equal((await request('/api/auth/me','GET',undefined,{cookie:`${COOKIE}=${sign({role:'owner',sid:absoluteSid})}`})).status,401);

  for (const extra of [{ origin: 'https://evil.invalid' }, { origin: 'https://evil.invalid', host: 'evil.invalid' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }, { 'X-MySystem-Request': '' }]) assert.equal((await request('/api/passwords', 'POST', {}, { ...authenticated, ...extra })).status, 403);
  assert.equal((await fetch(base + '/api/passwords', { method: 'POST', headers: { ...headers, cookie, 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
  const malformed = await fetch(base + '/api/passwords', { method: 'POST', headers: { ...headers, cookie }, body: '{bad json' });
  assert.equal(malformed.status, 400); assert.equal((await malformed.text()).includes('bad json'), false);
  assert.equal((await request('/api/passwords', 'POST', { name: 'x'.repeat(110000) }, authenticated)).status, 413);
  assert.equal((await request('/api/passwords', 'POST', { name: 'Fake', fields: [{ label: 'Password', value: 'FAKE' }], admin: true }, authenticated)).status, 400);
  assert.equal((await request('/api/finance/transactions?category%5B%24ne%5D=x', 'GET', undefined, authenticated)).status, 400);
  assert.equal((await request('/api/finance/transactions?search=%5B.*%5D', 'GET', undefined, authenticated)).status, 200);
  assert.equal((await request('/api/sleep', 'PUT', { date: '2026-01-01', hours: { $gt: 0 } }, authenticated)).status, 400);
  const habit=await (await request('/api/habits','POST',{name:'Audit habit',weight:10},authenticated)).json();
  // Use today's server date so the habit is active when its first entry is created.
  const dashboard=await (await request('/api/dashboard','GET',undefined,authenticated)).json();
  const entry={habitId:habit.id,date:dashboard.today,status:'done'};
  assert.equal((await request('/api/entries','PUT',entry,authenticated)).status,200);
  await request('/api/habits/'+habit.id,'PATCH',{name:'Audit renamed',weight:2},authenticated);
  await request('/api/entries','PUT',{...entry,status:'missed'},authenticated);
  const snapshot=(await (await request('/api/dashboard','GET',undefined,authenticated)).json()).entries[habit.id+':'+entry.date];
  assert.equal(snapshot.weightSnapshot,10);assert.equal(snapshot.nameSnapshot,'Audit habit');
  assert.equal((await request('/api/habits/'+habit.id,'DELETE',{unknown:true},authenticated)).status,400);
  assert.equal((await request('/api/habits/'+habit.id,'DELETE',undefined,authenticated)).status,200);

  const record = await (await request('/api/passwords', 'POST', { name: 'Fake audit account', fields: [{ label: 'Email', value: 'fake@example.invalid' }, { label: 'Password', value: 'FAKE-AUDIT-SECRET' }] }, authenticated)).json();
  assert.equal('fields' in record, false);
  const listing = await (await request('/api/passwords', 'GET', undefined, authenticated)).json();
  assert.equal(listing[0].username, 'fake@example.invalid'); assert.equal(JSON.stringify(listing).includes('FAKE-AUDIT-SECRET'), false);
  const detail = await (await request('/api/passwords/' + record.id, 'GET', undefined, authenticated)).json(); assert.equal(detail.fields[1].value, 'FAKE-AUDIT-SECRET');
  const stored = await Password.findOne({ id: record.id }); assert.equal(stored.encrypted.startsWith('v2.'), true); assert.equal(stored.encrypted.includes('FAKE-AUDIT'), false);
  assert.throws(() => decrypt(stored.encrypted, 'vault:wrong'));
  const edited = await request('/api/passwords/' + record.id, 'PATCH', { favorite: true }, authenticated); assert.equal(edited.status, 200);
  assert.equal('fields' in await edited.json(), false);
  await Password.create({ id: 'legacy-test', encrypted: encrypt({ name: 'Legacy fake', fields: [{ label: 'Password', value: 'FAKE-LEGACY' }] }) });
  assert.equal((await request('/api/passwords/legacy-test', 'GET', undefined, authenticated)).status, 200);
  assert.equal((await request('/api/passwords/' + record.id, 'DELETE', undefined, authenticated)).status, 200);

  for (const path of ['/server/.env', '/.git/config', '/server/atlas-credentials.env']) { const response = await fetch(base + path); assert.match(response.headers.get('content-type'), /text\/html/); assert.equal((await response.text()).includes(config.JWT_SECRET), false); }
  assert.equal((await request('/api/auth/logout', 'POST', undefined, authenticated)).status, 200);
  assert.equal((await request('/api/auth/me', 'GET', undefined, authenticated)).status, 401);
  let cookieWasSet = false;
  assert.equal(await issue({ cookie: () => { cookieWasSet = true; } }, payload.sid), false);
  assert.equal(cookieWasSet, false); assert.equal(await Session.exists({ id: payload.sid }), null);

  let limited = false;
  for (let attempt = 0; attempt < 7; attempt++) { const response = await request('/api/auth/login', 'POST', { password: 'incorrect-test-password' }); if (response.status === 429) { assert.ok(Number(response.headers.get('retry-after')) > 0); limited = true; break; } assert.equal(response.status, 401); }
  assert.equal(limited, true);
  assert.ok(await LoginAttempt.countDocuments() >= 2);
  await writeFile(new URL('../../docs/security-endpoints.json',import.meta.url),JSON.stringify({scope:'Isolated test server; not a deployed penetration test',generatedAt:new Date().toISOString(),routes:routes.map(([method,path])=>({method,path,authentication:['/api/auth/login','/api/health'].includes(path)?'public':'401 without session verified'}))},null,2)+'\n');
  console.log(JSON.stringify({ protectedRoutesChecked: protectedRoutes, result: 'passed', checks: ['JWT tampering/expiry/roles', 'CSRF/origin/Host spoofing', 'JSON/body limits/injection', 'vault summaries/detail/encryption', 'logout revocation', 'durable login throttling', 'CSP/cache/secret-file protection'] }));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database && /^audit_test_[a-f0-9]{24}$/.test(database)) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

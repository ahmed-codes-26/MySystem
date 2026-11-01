import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { protectApi, helmetOptions } from '../src/security.js';
import { configuration } from '../src/configuration.js';
import { createRecordCipher } from '../src/recordCipher.js';
import { vaultSummary } from '../src/vaultService.js';

const local = { NODE_ENV: 'development', CLIENT_ORIGIN: 'http://localhost:5173' };
function guard(method, headers = {}, settings = local) {
  let status = 200, passed = false;
  const req = { method, get: name => headers[name] };
  const res = { set: () => {}, status: value => { status = value; return res; }, json: () => {} };
  protectApi(settings)(req, res, () => { passed = true; });
  return { status, passed };
}
const json = { 'content-type': 'application/json', 'x-mysystem-request': '1' };
test('CSRF: JSON/custom header and exact trusted Origin are required for unsafe browser requests', () => {
  assert.deepEqual(guard('POST', json), { status: 200, passed: true });
  assert.equal(guard('POST', { ...json, origin: local.CLIENT_ORIGIN }).passed, true);
  for (const headers of [{ 'content-type': 'application/json' }, { ...json, origin: 'null' }, { ...json, origin: 'https://evil.invalid', host: 'evil.invalid' }, { ...json, origin: 'http://localhost:5173.evil.invalid' }, { ...json, 'sec-fetch-site': 'same-site' }, { ...json, 'sec-fetch-site': 'cross-site' }]) assert.equal(guard('POST', headers).status, 403);
  assert.equal(guard('POST', { ...json, 'content-type': 'text/plain' }).status, 415);
  assert.equal(guard('TRACE', json).status, 405);
  assert.equal(guard('GET').passed, true);
  assert.equal(guard('GET', { origin: 'https://evil.invalid' }).status, 403);
});
test('production policy blocks third-party scripts, framing and object embedding', () => {
  const policy = helmetOptions(true);
  assert.deepEqual(policy.contentSecurityPolicy.directives.scriptSrc, ["'self'"]);
  assert.deepEqual(policy.contentSecurityPolicy.directives.frameAncestors, ["'none'"]);
  assert.deepEqual(policy.contentSecurityPolicy.directives.objectSrc, ["'none'"]);
  assert.equal(policy.frameguard.action, 'deny');
  assert.equal(policy.referrerPolicy.policy, 'no-referrer');
  assert.equal(policy.strictTransportSecurity.maxAge, 31536000);
  assert.equal(helmetOptions(false).strictTransportSecurity, false);
});
const environment = { NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://example.invalid/database', JWT_SECRET: 'test-only-JWT-secret-with-sufficient-variety-123456', ADMIN_PASSWORD_HASH: '$2b$12$' + 'a'.repeat(53), VAULT_ENCRYPTION_KEY: '0123456789abcdef'.repeat(4), CLIENT_ORIGIN: 'https://app.example.invalid' };
test('production configuration rejects weak keys, insecure database TLS and non-origin client URLs', () => {
  assert.equal(configuration.safeParse(environment).success, true);
  for (const change of [{ CLIENT_ORIGIN: 'http://app.example.invalid' }, { CLIENT_ORIGIN: 'https://app.example.invalid/path' }, { CLIENT_ORIGIN: 'https://user:password@app.example.invalid' }, { MONGODB_URI: 'mongodb+srv://example.invalid/db?tls=false' }, { MONGODB_URI: 'mongodb+srv://example.invalid/db?tlsAllowInvalidCertificates=true' }, { MONGODB_URI: 'mongodb://example.invalid/db' }, { JWT_SECRET: 'a'.repeat(32) }, { VAULT_ENCRYPTION_KEY: '0'.repeat(64) }, { ADMIN_PASSWORD_HASH: '$2b$04$' + 'a'.repeat(53) }, { APP_TIMEZONE: 'invalid-zone' }, { PORT: 70000 }]) assert.equal(configuration.safeParse({ ...environment, ...change }).success, false);
});
test('vault ciphertext rejects tampering and record substitution, with legacy compatibility', () => {
  const { encrypt, decrypt } = createRecordCipher(randomBytes(32));
  const record = { name: 'Fake account', fields: [{ label: 'Password', value: 'FAKE-SECRET' }] };
  const sealed = encrypt(record, 'vault:one');
  assert.deepEqual(decrypt(sealed, 'vault:one'), record);
  assert.notEqual(encrypt(record, 'vault:one'), sealed);
  assert.throws(() => decrypt(sealed, 'vault:two'));
  assert.throws(() => decrypt(sealed));
  assert.throws(() => decrypt(sealed.slice(0, -4) + 'AAAA', 'vault:one'));
  assert.throws(() => decrypt('broken'));
  assert.deepEqual(decrypt(encrypt(record), 'vault:legacy'), record);
});
test('vault summaries never include password or arbitrary custom-field values', () => {
  const record = { name: 'Fake account', fields: [{ label: 'Email', value: 'fake@example.invalid' }, { label: 'Password', value: 'FAKE-SECRET' }, { label: 'API key', value: 'FAKE-API-SECRET' }] };
  const summary = vaultSummary(record, 'one');
  assert.equal(summary.username, 'fake@example.invalid');
  assert.equal('fields' in summary, false);
  assert.equal(JSON.stringify(summary).includes('FAKE-SECRET'), false);
  assert.equal(JSON.stringify(summary).includes('FAKE-API-SECRET'), false);
});

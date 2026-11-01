import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVaultDetails, isSecretField } from '../src/utils/vaultDetails.js';
import { deriveVaultKey, encryptVault, unlockVault } from '../src/utils/vaultCrypto.js';

test('details normalize known labels and preserve arbitrary fields, duplicates, colon values and spaces', () => {
  assert.deepEqual(parseVaultDetails('E-mail: test@example.com\r\nPassword: ab:cd  \nPhone Number: +92 123\nAccount ID: 123\nAccount ID: 456\nWebsite: https://example.com'), [
    {label:'Email',value:'test@example.com'}, {label:'Password',value:'ab:cd  '}, {label:'Phone',value:'+92 123'}, {label:'Account ID',value:'123'}, {label:'Account ID',value:'456'}, {label:'Website',value:'https://example.com'},
  ]);
});
test('parser rejects malformed and empty fields with no silent data loss', () => {
  for(const text of ['', 'not a field', ': value', 'Email: ', 'Email: a\nsecond line']) assert.throws(() => parseVaultDetails(text));
  assert.equal(isSecretField('Password'),true); assert.equal(isSecretField('Recovery Code'),true); assert.equal(isSecretField('Email'),false);
});
test('encrypted vault round trips without plaintext and rejects wrong passwords or tampering', async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey('test-only-master-passphrase',salt);
  assert.equal(key.extractable,false);
  const records = [{id:'test',name:'Private app',fields:[{label:'Password',value:'test-only-secret:123'}]}];
  const raw = await encryptVault(records,key,salt);
  assert.equal(raw.includes('Private app'),false); assert.equal(raw.includes('test-only-secret'),false);
  assert.deepEqual((await unlockVault(raw,'test-only-master-passphrase')).records,records);
  await assert.rejects(unlockVault(raw,'incorrect-password'));
  const tampered = JSON.parse(raw); tampered.data = (tampered.data[0] === 'A' ? 'B' : 'A') + tampered.data.slice(1);
  await assert.rejects(unlockVault(JSON.stringify(tampered),'test-only-master-passphrase'));
  const second = await encryptVault(records,key,salt); assert.notEqual(JSON.parse(raw).iv,JSON.parse(second).iv);
});

const encoder = new TextEncoder();
const encode = bytes => { let binary = ''; const data = new Uint8Array(bytes); for(let i=0;i<data.length;i+=8192) binary += String.fromCharCode(...data.subarray(i,i+8192)); return btoa(binary); };
const decode = text => Uint8Array.from(atob(text), ch => ch.charCodeAt(0));
const aad = encoder.encode('MySystem vault v1');
export const VAULT_KEY = 'mysystem.vault.v1';
export async function deriveVaultKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:600000, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
export async function encryptVault(records, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name:'AES-GCM', iv, additionalData:aad }, key, encoder.encode(JSON.stringify(records)));
  return JSON.stringify({version:1,salt:encode(salt),iv:encode(iv),data:encode(data)});
}
export async function unlockVault(raw, password) {
  const envelope = JSON.parse(raw);
  if (envelope.version !== 1) throw new Error('Unsupported vault version.');
  const salt = decode(envelope.salt), iv = decode(envelope.iv);
  if(salt.length !== 16 || iv.length !== 12) throw new Error('Invalid vault.');
  const key = await deriveVaultKey(password,salt);
  const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad},key,decode(envelope.data));
  const records = JSON.parse(new TextDecoder().decode(plaintext));
  if(!Array.isArray(records) || !records.every(r => typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.fields) && r.fields.every(f => typeof f.label === 'string' && typeof f.value === 'string'))) throw new Error('Invalid vault contents.');
  return {records,key,salt};
}

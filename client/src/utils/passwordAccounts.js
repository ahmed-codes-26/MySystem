import { date } from './dates.js';
export const passwordFields = record => record.fields.filter(f => /^(password|pass|pwd|passphrase)$/i.test(f.label.trim()));
export function passwordChecks(records, now = new Date()) {
 const counts = new Map();
 records.forEach(r => new Set(passwordFields(r).map(f => f.value)).forEach(value => counts.set(value,(counts.get(value)||0)+1)));
 const cutoff = date(now).subtract(6,'month').toDate();
 return Object.fromEntries(records.map(r => {const fields=passwordFields(r);const timestamp=r.passwordChangedOn || r.createdOn;return [r.id,{
 weak:fields.some(f => f.value.length < 12 || [/[a-z]/,/[A-Z]/,/\d/,/[^a-zA-Z0-9]/].filter(pattern=>pattern.test(f.value)).length < 3),
 reused:fields.some(f => counts.get(f.value)>1),
 old:fields.length>0 && Boolean(timestamp) && new Date(timestamp) <= cutoff,
 }];}));
}
export function generatePassword(length=20) {
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-=?';
 let output='';const ceiling=Math.floor(256/alphabet.length)*alphabet.length;
 while(output.length<length) {const bytes=crypto.getRandomValues(new Uint8Array(length*2));for(const byte of bytes){if(byte<ceiling)output+=alphabet[byte%alphabet.length];if(output.length===length)break;}}
 return output;
}
export const accountUsername = record => record.username || record.fields?.find(f => /^(e[ -]?mail|username|user name|login)$/i.test(f.label))?.value || 'No username saved';
export const accountInitials = name => name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase();

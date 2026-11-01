import { randomBytes,createCipheriv,createDecipheriv } from 'node:crypto';
export function createRecordCipher(key) {
if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('A 32-byte key is required.');
function encrypt(value,context) {const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);if(context)cipher.setAAD(Buffer.from(context,'utf8'));const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return (context?'v2.':'')+[iv,cipher.getAuthTag(),data].map(b=>b.toString('base64')).join('.');}
function decrypt(value,context) {
 if(typeof value!=='string'||value.length>200000)throw new Error('Invalid encrypted record.');
 const parts=value.split('.'),bound=parts[0]==='v2';if(bound)parts.shift();
 if(parts.length!==3||parts.some(part=>!/^[A-Za-z0-9+/]*={0,2}$/.test(part)))throw new Error('Invalid encrypted record.');
 const [iv,tag,data]=parts.map(part=>Buffer.from(part,'base64'));if(iv.length!==12||tag.length!==16||!data.length||(bound&&!context))throw new Error('Invalid encrypted record.');
 const cipher=createDecipheriv('aes-256-gcm',key,iv);if(bound)cipher.setAAD(Buffer.from(context,'utf8'));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8'));
}

return {encrypt,decrypt};
}

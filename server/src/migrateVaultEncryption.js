import mongoose from 'mongoose';
import { connect } from './db.js';
import { Password } from './models.js';
import { encrypt, decrypt } from './encryption.js';
const apply = process.argv.includes('--apply');
try {
  await connect(); let legacy = 0, migrated = 0;
  for await (const item of Password.find().cursor()) {
    const context = `vault:${item.id}`, record = decrypt(item.encrypted, context);
    if (item.encrypted.startsWith('v2.')) continue;
    legacy++;
    const encrypted = encrypt(record, context);
    if (JSON.stringify(decrypt(encrypted, context)) !== JSON.stringify(record)) throw new Error('Verification failed.');
    if (apply) { const result = await Password.updateOne({ id: item.id, encrypted: item.encrypted }, { $set: { encrypted } }); migrated += result.modifiedCount; }
  }
  console.log(JSON.stringify({ legacy, migrated, applied: apply }));
} catch { console.error('Vault migration failed; no plaintext was logged.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }

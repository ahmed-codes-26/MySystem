import {config} from './config.js';
import {createRecordCipher} from './recordCipher.js';
export const {encrypt,decrypt}=createRecordCipher(Buffer.from(config.VAULT_ENCRYPTION_KEY,'hex'));

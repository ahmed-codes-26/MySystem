import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { configuration } from './configuration.js';
try { loadEnvFile(fileURLToPath(new URL('../.env',import.meta.url))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const result = configuration.safeParse(process.env);
if (!result.success) throw new Error('Invalid server configuration: ' + [...new Set(result.error.issues.map(issue => issue.path[0]))].join(', '));
export const config = result.data;

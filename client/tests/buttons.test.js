import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=fileURLToPath(new URL('../src/',import.meta.url));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('all native button elements are owned by the shared Button component',()=>{for(const file of files(root).filter(f=>f.endsWith('.jsx')&&!f.endsWith('Button.jsx')))assert.doesNotMatch(fs.readFileSync(file,'utf8'),/<button\b/,file);});
test('legacy one-off button themes cannot return',()=>{for(const file of files(root).filter(f=>/\.(jsx|css)$/.test(f)))assert.doesNotMatch(fs.readFileSync(file,'utf8'),/\b(primary-button|secondary-button|danger-button|accounts-icon-button|accounts-copy-button)\b/,file);});

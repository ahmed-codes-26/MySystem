import test from 'node:test';
import assert from 'node:assert/strict';
import {copyAccountValue} from '../src/utils/accountClipboard.js';
test('clipboard expires at 30 seconds, preserves newer copies and reports blocked access',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let value='',blocked=false;const notices=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{value=text;},readText:async()=>{if(blocked)throw Error();return value;}}}});
 await copyAccountValue('fake-test-secret',text=>notices.push(text));t.mock.timers.tick(29999);await Promise.resolve();assert.equal(value,'fake-test-secret');t.mock.timers.tick(1);await Promise.resolve();await Promise.resolve();assert.equal(value,'');
 await copyAccountValue('fake-original',()=>{});value='newer-user-copy';t.mock.timers.tick(30000);await Promise.resolve();assert.equal(value,'newer-user-copy');
 blocked=true;await copyAccountValue('fake-blocked',text=>notices.push(text));t.mock.timers.tick(30000);await Promise.resolve();await Promise.resolve();assert.ok(notices.some(text=>text.includes('blocked')));
 delete globalThis.navigator;t.mock.timers.reset();
});

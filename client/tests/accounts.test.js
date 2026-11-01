import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordChecks,generatePassword,accountInitials,accountUsername} from '../src/utils/passwordAccounts.js';
const record=(id,password,createdOn='2026-10-01T00:00:00Z',extra={})=>({id,name:id,createdOn,fields:[{label:'Password',value:password}],...extra});
test('attention flags are based on actual secrets and password change age',()=>{
 const records=[record('a','tiny','2025-01-01'),record('b','tiny'),record('c','StrongEnough!923','2025-01-01',{passwordChangedOn:'2026-10-31T00:00:00Z'}),{id:'d',fields:[{label:'Email',value:'test@example.invalid'}]}];
 const result=passwordChecks(records,new Date('2026-11-01T00:00:00Z'));
 assert.deepEqual(result.a,{weak:true,reused:true,old:true});assert.deepEqual(result.c,{weak:false,reused:false,old:false});assert.deepEqual(result.d,{weak:false,reused:false,old:false});
});
test('six month cutoff handles month ends; duplicate fields in one account are not reuse',()=>{
 const r=record('a','LongEnough!123','2026-02-28T00:00:00Z');r.fields.push({...r.fields[0]});const result=passwordChecks([r],new Date('2026-08-31T00:00:00Z'));assert.equal(result.a.old,true);assert.equal(result.a.reused,false);
});
test('account identity comes from its actual name and email or username',()=>{assert.equal(accountInitials('  Internet Banking '),'IB');assert.equal(accountInitials('Netflix'),'N');assert.equal(accountUsername({fields:[{label:'Email',value:'demo@example.invalid'}]}),'demo@example.invalid');});
test('generator produces requested lengths using cryptographic randomness',()=>{for(const length of [12,20,64])assert.equal(generatePassword(length).length,length);assert.notEqual(generatePassword(32),generatePassword(32));});

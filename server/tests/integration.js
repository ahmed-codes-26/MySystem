import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {app} from '../src/app.js';
import {connect} from '../src/db.js';
import {config} from '../src/config.js';
import {Session,Password} from '../src/models.js';
import {encrypt,decrypt} from '../src/encryption.js';
await connect();const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;let sid;
try {
assert.equal((await fetch(base+'/api/dashboard')).status,401);
assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-MySystem-Request':'1'},body:JSON.stringify({password:'wrong'})})).status,401);
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-MySystem-Request':'1'},body:JSON.stringify({password:process.env.TEST_PASSWORD})});assert.equal(login.status,200);const set=login.headers.get('set-cookie');assert.match(set,/HttpOnly/);assert.match(set,/SameSite=Lax/);const cookie=set.split(';')[0];const token=decodeURIComponent(cookie.split('=')[1]);const payload=jwt.verify(token,config.JWT_SECRET);sid=payload.sid;assert.equal(payload.exp-payload.iat,604800);
const short=jwt.sign({role:'owner',sid},config.JWT_SECRET,{expiresIn:'1h',issuer:'mysystem',audience:'owner'});const me=await fetch(base+'/api/auth/me',{headers:{cookie:`mysystem_session=${short}`}});assert.equal(me.status,200);const renewed=jwt.decode(decodeURIComponent(me.headers.get('set-cookie').split(';')[0].split('=')[1]));assert.equal(renewed.exp-renewed.iat,604800);
const dashboard=await fetch(base+'/api/dashboard',{headers:{cookie}});assert.equal(dashboard.status,200);const data=await dashboard.json();assert.ok(data.habits.length>=6);assert.ok(Object.keys(data.entries).length>0);
assert.equal((await fetch(base+'/api/sleep',{method:'PUT',headers:{cookie,'Content-Type':'application/json','X-MySystem-Request':'1',origin:'https://invalid.example'},body:JSON.stringify({date:data.today,hours:8})})).status,403);
assert.equal((await fetch(base+'/api/sleep',{method:'PUT',headers:{cookie,'Content-Type':'application/json','X-MySystem-Request':'1'},body:JSON.stringify({date:'2999-01-01',hours:8})})).status,400);
const saved=await Password.findOne({id:'sample-password-0'});assert.ok(saved);assert.equal(saved.encrypted.includes('FAKE-SAMPLE'),false);assert.equal(decrypt(saved.encrypted,`vault:${saved.id}`).name,'Demo Mail');assert.notEqual(encrypt({sample:true}),encrypt({sample:true}));

const headers={cookie,'Content-Type':'application/json','X-MySystem-Request':'1'};
const created=await fetch(base+'/api/habits',{method:'POST',headers,body:JSON.stringify({name:'Integration test habit',weight:10})});assert.equal(created.status,201);const h=await created.json();
try {
assert.equal((await fetch(base+'/api/entries',{method:'PUT',headers,body:JSON.stringify({habitId:h.id,date:data.today,status:'done'})})).status,200);
assert.equal((await fetch(base+'/api/habits/'+h.id,{method:'PATCH',headers,body:JSON.stringify({name:'Integration test habit updated',weight:2})})).status,200);
const updated=await (await fetch(base+'/api/dashboard',{headers:{cookie}})).json();assert.equal(updated.entries[h.id+':'+data.today].weightSnapshot,10);
assert.equal((await fetch(base+'/api/habits/'+h.id+'/archive',{method:'POST',headers})).status,200);
assert.equal((await fetch(base+'/api/habits/'+h.id+'/restore',{method:'POST',headers})).status,200);
} finally {await fetch(base+'/api/habits/'+h.id,{method:'DELETE',headers});}
const passwordResponse=await fetch(base+'/api/passwords',{method:'POST',headers,body:JSON.stringify({name:'Integration fake account',fields:[{label:'Password',value:'FAKE-INTEGRATION-SECRET'}]})});assert.equal(passwordResponse.status,201);const record=await passwordResponse.json();
try {const stored=await Password.findOne({id:record.id});assert.equal(stored.encrypted.includes('FAKE-INTEGRATION'),false);
const edited=await fetch(base+'/api/passwords/'+record.id,{method:'PATCH',headers,body:JSON.stringify({category:'Work',favorite:true})});assert.equal(edited.status,200);const pinned=await edited.json();assert.equal(pinned.category,'Work');assert.equal(pinned.favorite,true);assert.equal('fields' in pinned,false);assert.equal((await (await fetch(base+'/api/passwords/'+record.id,{headers:{cookie}})).json()).fields[0].value,'FAKE-INTEGRATION-SECRET');
const renamed=await fetch(base+'/api/passwords/'+record.id,{method:'PATCH',headers,body:JSON.stringify({name:'Renamed integration account'})});assert.equal(renamed.status,200);const retained=await renamed.json();assert.equal(retained.category,'Work');assert.equal(retained.favorite,true);assert.equal(retained.passwordChangedOn,pinned.passwordChangedOn);
const modified=await fetch(base+'/api/passwords/'+record.id,{method:'PATCH',headers,body:JSON.stringify({fields:[{label:'Password',value:'FAKE-NEW-SECRET'}]})});assert.equal(modified.status,200);const changed=await modified.json();assert.equal((await (await fetch(base+'/api/passwords/'+record.id,{headers:{cookie}})).json()).fields[0].value,'FAKE-NEW-SECRET');assert.ok(changed.passwordChangedOn>=pinned.passwordChangedOn);
}finally{assert.equal((await fetch(base+'/api/passwords/'+record.id,{method:'DELETE',headers})).status,200);}
assert.equal((await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,'Content-Type':'application/json','X-MySystem-Request':'1'}})).status,200);assert.equal((await fetch(base+'/api/auth/me',{headers:{cookie}})).status,401);
console.log('Backend integration passed: login, cookie flags, rolling expiry, protected routes, origin validation, date validation, database seed, encryption and logout revocation.');
}finally {if(sid)await Session.deleteOne({id:sid});await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();}

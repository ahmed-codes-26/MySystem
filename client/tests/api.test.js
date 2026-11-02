import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api/client.js';

test('HTML fallbacks, malformed JSON and unconfirmed auth cannot report login success', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response('<html>SPA</html>',{headers:{'content-type':'text/html'}}),new Response('{broken',{headers:{'content-type':'application/json'}}),Response.json({error:'misrouted'}),Response.json({authenticated:false})]) {
      globalThis.fetch=async()=>response;
      await assert.rejects(api('/auth/login'));
    }
    globalThis.fetch=async()=>Response.json({authenticated:true});
    assert.deepEqual(await api('/auth/login'),{authenticated:true});
    globalThis.fetch=async()=>Response.json({error:'Incorrect password'},{status:401});
    await assert.rejects(api('/auth/login'),/Incorrect password/);
    globalThis.fetch=async()=>Response.json({});
    await assert.rejects(api('/auth/me'),/did not confirm authentication/);
  } finally {globalThis.fetch=original;}
});

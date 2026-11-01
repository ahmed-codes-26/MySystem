import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedClientOrigin} from '../src/origins.js';
test('development permits only the configured origin and explicit local Vite ports',()=>{const config={NODE_ENV:'development',CLIENT_ORIGIN:'http://localhost:5174'};for(const origin of ['http://localhost:5174','http://127.0.0.1:5174','http://127.0.0.1:5173'])assert.equal(allowedClientOrigin(origin,config),true);for(const origin of ['https://evil.example','http://localhost.evil.example:5174','http://localhost:9000'])assert.equal(allowedClientOrigin(origin,config),false);});
test('production does not inherit the development allowlist',()=>{const config={NODE_ENV:'production',CLIENT_ORIGIN:'https://mysystem.example'};assert.equal(allowedClientOrigin('https://mysystem.example',config),true);assert.equal(allowedClientOrigin('http://localhost:5174',config),false);});

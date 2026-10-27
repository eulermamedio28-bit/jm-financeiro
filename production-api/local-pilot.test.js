import test from 'node:test';
import assert from 'node:assert/strict';
import {assertLocalPilotConfig} from './local-pilot.js';
const local='postgresql://pilot:dummy@127.0.0.1:5432/jm_pilot';
test('local pilot accepts only local PostgreSQL and loopback',()=>{
 assert.equal(assertLocalPilotConfig({nodeEnv:'development',host:'127.0.0.1',databaseUrl:local}).host,'127.0.0.1');
 assert.throws(()=>assertLocalPilotConfig({nodeEnv:'production',host:'127.0.0.1',databaseUrl:local}),/produção/);
 assert.throws(()=>assertLocalPilotConfig({nodeEnv:'development',host:'0.0.0.0',databaseUrl:local}),/loopback/);
 assert.throws(()=>assertLocalPilotConfig({nodeEnv:'development',host:'127.0.0.1',databaseUrl:'postgresql://user:pass@remote.example/db'}),/local/);
 assert.throws(()=>assertLocalPilotConfig({nodeEnv:'development',host:'127.0.0.1',databaseUrl:'sqlite:///tmp/jm.db'}),/PostgreSQL/);
 assert.throws(()=>assertLocalPilotConfig({nodeEnv:'development',host:'127.0.0.1',databaseUrl:''}),/obrigatório/);
});

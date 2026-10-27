import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seedLocalPilot} from './seed-local-pilot.js';

test('pilot seeding refuses missing password and nonlocal databases',async()=>{
 await assert.rejects(seedLocalPilot({databaseUrl:'postgresql://test:dummy@127.0.0.1/pilot',password:'short'}),/12 caracteres/);
 await assert.rejects(seedLocalPilot({databaseUrl:'postgresql://test:dummy@remote.example/pilot',password:'StrongTestPasswordOnly'}),/local/);
});
test('mobile pilot defines session error handler and prevents duplicate submissions',()=>{
 const html=readFileSync(new URL('./mobile.html',import.meta.url),'utf8');
 assert.match(html,/const handleError=/);
 assert.match(html,/const withBusy=/);
 assert.match(html,/button\.disabled=true/);
 assert.match(html,/withBusy\(el\('entry-form'\)/);
 assert.match(html,/withBusy\(el\('transfer-form'\)/);
});

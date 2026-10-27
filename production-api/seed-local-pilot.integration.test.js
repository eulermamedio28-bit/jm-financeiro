import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {seedLocalPilot} from './seed-local-pilot.js';
import {verifyPassword} from './auth-core.js';

test('local pilot seeds two fictitious establishments and refuses second initialization',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL)return t.skip('PostgreSQL temporário não configurado');
 // Dedicated throwaway DB is required; do not reuse the shared integration database.
 const parsed=new URL(process.env.JM_TEST_DATABASE_URL);
 const dbName='jm_pilot_seed_test';
 const admin=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL});
 let created=false;
 try{
  await admin.query('CREATE DATABASE '+dbName);
  created=true;
  parsed.pathname='/'+dbName;
  const url=parsed.toString();
  const password='SenhaFicticiaLocal2026';
  const seeded=await seedLocalPilot({databaseUrl:url,password});
  assert.deepEqual(seeded,{establishments:2,accounts:4,categories:4,realFinancialData:false});
  const pool=new pg.Pool({connectionString:url});
  try{
   const businesses=await pool.query('SELECT name FROM establishments ORDER BY name');
   assert.equal(businesses.rows.length,2);
   assert.ok(businesses.rows.every(x=>x.name.includes('FICTÍCIO')));
   const user=await pool.query("SELECT username,password_hash FROM auth_users WHERE username='euler'");
   assert.equal(user.rows.length,1);
   assert.ok(verifyPassword(password,user.rows[0].password_hash));
   const count=await pool.query('SELECT count(*)::int AS n FROM entries');
   assert.equal(count.rows[0].n,0);
  }finally{await pool.end()}
  await assert.rejects(seedLocalPilot({databaseUrl:url,password}),/já inicializado/);
 }finally{
  if(created){
   await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1',[dbName]);
   await admin.query('DROP DATABASE '+dbName);
  }
  await admin.end();
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {hashPassword} from './auth-core.js';
import {login,authenticatedActor,logout} from './auth-db.js';

test('PostgreSQL: Euler login, lockout, session and logout',async t=>{
 if(!process.env.JM_TEST_DATABASE_URL) return t.skip('Temporary database unavailable');
 const pool=new pg.Pool({connectionString:process.env.JM_TEST_DATABASE_URL});
 try{
  await pool.query(readFileSync(new URL('./migrations/002_auth.sql',import.meta.url),'utf8'));
  await pool.query('INSERT INTO auth_users(username,password_hash) VALUES($1,$2)', ['euler',hashPassword('SenhaLongaExclusivaTeste2026')]);
  await assert.rejects(login(pool,{username:'silvia',password:'SenhaLongaExclusivaTeste2026'}),/Credenciais/);
  await assert.rejects(login(pool,{username:'euler',password:'senha-errada'}),/Credenciais/);
  const attempts=await pool.query("SELECT failed_count FROM auth_login_attempts WHERE username='euler'");
  assert.equal(attempts.rows[0].failed_count,1);
  const session=await login(pool,{username:'euler',password:'SenhaLongaExclusivaTeste2026'});
  assert.equal(await authenticatedActor(pool,session.token),'euler');
  const stored=await pool.query('SELECT token_digest FROM auth_sessions');
  assert.notEqual(stored.rows[0].token_digest,session.token);
  await logout(pool,session.token);
  await assert.rejects(authenticatedActor(pool,session.token),/Sessão inválida/);
 }finally{await pool.end()}
});

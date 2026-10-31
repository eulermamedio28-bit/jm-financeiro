import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {prepararOAuth,criarOAuth,oauthMetadata,clientId} from './oauth-bridge.mjs';
if(process.env.JM_TEST_ISOLATED_DB!=='true')console.log('SKIP: OAuth PostgreSQL requires isolated database');
else{
 if(!process.env.DATABASE_URL?.includes('localhost'))throw Error('Refusing nonlocal database');
 const {default:pg}=await import('pg');const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const id=randomUUID(),redirect='https://chatgpt.com/connector/oauth/X9qB9nL-7lAp',verifier='a'.repeat(64),sha=x=>createHash('sha256').update(x).digest('base64url');
 try{
  await prepararOAuth(pool);
  const oauth=criarOAuth(pool,async raw=>{if(raw!=='isolated-test-identity')throw Error('unauthorized');return {accountId:id};});
  assert.ok(oauthMetadata.grant_types_supported.includes('refresh_token'));
  await assert.rejects(oauth.autorizar({supabaseToken:'wrong',clientId,redirectUri:redirect,challenge:sha(verifier)}),/unauthorized/);
  await assert.rejects(oauth.autorizar({supabaseToken:'isolated-test-identity',clientId,redirectUri:'https://evil.example',challenge:sha(verifier)}),/invalid_request/);
  const code=await oauth.autorizar({supabaseToken:'isolated-test-identity',clientId,redirectUri:redirect,challenge:sha(verifier)});
  const grant={code,redirect_uri:redirect,client_id:clientId,code_verifier:verifier,grant_type:'authorization_code'};
  await assert.rejects(oauth.trocar({...grant,code_verifier:'b'.repeat(64)}),/invalid_grant/);
  const first=await oauth.trocar(grant);
  assert.ok(first.refresh_token);assert.equal(first.expires_in,3600);assert.deepEqual(await oauth.verificarBearer('Bearer '+first.access_token),{accountId:id});
  await assert.rejects(oauth.trocar(grant),/invalid_grant/);
  // Access token expiry must not force a new interactive login.
  await pool.query("UPDATE jm_oauth_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[sha(first.access_token)]);
  await assert.rejects(oauth.verificarBearer('Bearer '+first.access_token),/unauthorized/);
  const refresh={grant_type:'refresh_token',client_id:clientId,refresh_token:first.refresh_token};
  await assert.rejects(oauth.trocar({...refresh,client_id:'other-client'}),/invalid_grant/);
  const second=await oauth.trocar(refresh);assert.notEqual(second.refresh_token,first.refresh_token);assert.notEqual(second.access_token,first.access_token);assert.deepEqual(await oauth.verificarBearer('Bearer '+second.access_token),{accountId:id});
  await assert.rejects(oauth.trocar(refresh),/invalid_grant/);
  const concurrent=await Promise.allSettled([oauth.trocar({...refresh,refresh_token:second.refresh_token}),oauth.trocar({...refresh,refresh_token:second.refresh_token})]);assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
  const third=concurrent.find(x=>x.status==='fulfilled').value;
  const stored=await pool.query('SELECT token_hash FROM jm_oauth_refresh_tokens WHERE account_id=$1',[id]);assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].token_hash,sha(third.refresh_token));assert.notEqual(stored.rows[0].token_hash,third.refresh_token);
  // Simulated DB failure must rollback consumption, retaining the existing refresh.
  const faulty=criarOAuth({connect:async()=>{const db=await pool.connect();return {query:(sql,args)=>{if(sql.startsWith('INSERT INTO jm_oauth_tokens'))throw Error('database_failure');return db.query(sql,args);},release:()=>db.release()};}},()=>{});
  await assert.rejects(faulty.trocar({...refresh,refresh_token:third.refresh_token}),/database_failure/);
  const fourth=await oauth.trocar({...refresh,refresh_token:third.refresh_token});
  await pool.query("UPDATE jm_oauth_refresh_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[sha(fourth.refresh_token)]);
  await assert.rejects(oauth.trocar({...refresh,refresh_token:fourth.refresh_token}),/invalid_grant/);
  console.log('PASS: OAuth authorization + PKCE, expiring access, refresh issuance, rotation, replay and concurrent refresh rejection, client binding, hashed storage, expiration and transactional rollback in isolated PostgreSQL.');
 }finally{
  await pool.query('DELETE FROM jm_oauth_codes WHERE account_id=$1',[id]);await pool.query('DELETE FROM jm_oauth_tokens WHERE account_id=$1',[id]);await pool.query('DELETE FROM jm_oauth_refresh_tokens WHERE account_id=$1',[id]);await pool.end();
 }
}

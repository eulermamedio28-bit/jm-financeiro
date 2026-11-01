import {randomBytes,createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('base64url');
const token=()=>randomBytes(32).toString('base64url');
const base='https://jm-financeiro-db-private-test.onrender.com';
const client='jm-financeiro-chatgpt';
const redirect='https://chatgpt.com/connector/oauth/X9qB9nL-7lAp';
export async function prepararOAuth(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_oauth_codes (code_hash text PRIMARY KEY, account_id uuid NOT NULL, redirect_uri text NOT NULL, challenge text NOT NULL, client_id text NOT NULL, expires_at timestamptz NOT NULL)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_oauth_tokens (token_hash text PRIMARY KEY, account_id uuid NOT NULL, expires_at timestamptz NOT NULL)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_oauth_refresh_tokens (token_hash text PRIMARY KEY, account_id uuid NOT NULL, client_id text NOT NULL, expires_at timestamptz NOT NULL)`);
}
export function criarOAuth(pool,verifySupabase){
 async function verificarBearer(value){if(!value||!value.startsWith('Bearer '))throw Error('unauthorized');const raw=value.slice(7);const {rows}=await pool.query('SELECT account_id FROM jm_oauth_tokens WHERE token_hash=$1 AND expires_at>now()',[sha(raw)]);if(!rows.length)throw Error('unauthorized');return {accountId:rows[0].account_id};}
 async function autorizar({supabaseToken,redirectUri,challenge,clientId}){
  if(clientId!==client||typeof challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(challenge)||redirectUri!==redirect)throw Error('invalid_request');
  const {accountId}=await verifySupabase(supabaseToken);
  const code=token();await pool.query('INSERT INTO jm_oauth_codes(code_hash,account_id,redirect_uri,challenge,client_id,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval \'5 minutes\')',[sha(code),accountId,redirectUri,challenge,clientId]);
  return code;
 }
 async function trocar({code,redirect_uri,client_id,code_verifier,grant_type,refresh_token}){
  if(client_id!==client)throw Error('invalid_grant');
  if(grant_type==='authorization_code'){
   if(typeof code!=='string'||typeof code_verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)||redirect_uri!==redirect)throw Error('invalid_grant');
  }else if(grant_type==='refresh_token'){
   if(typeof refresh_token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(refresh_token))throw Error('invalid_grant');
  }else throw Error('invalid_grant');
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   let accountId,refreshExpiry;
   if(grant_type==='authorization_code'){
    const {rows}=await db.query('SELECT * FROM jm_oauth_codes WHERE code_hash=$1 AND expires_at>now() FOR UPDATE',[sha(code)]);
    const item=rows[0];if(!item||item.client_id!==client_id||item.redirect_uri!==redirect_uri||item.challenge!==sha(code_verifier))throw Error('invalid_grant');
    accountId=item.account_id;
    await db.query('DELETE FROM jm_oauth_codes WHERE code_hash=$1',[sha(code)]);
   }else{
    // Atomic consume-and-rotate: a concurrent/replayed refresh cannot mint tokens twice.
    const {rows}=await db.query('DELETE FROM jm_oauth_refresh_tokens WHERE token_hash=$1 AND client_id=$2 AND expires_at>now() RETURNING account_id,expires_at',[sha(refresh_token),client_id]);
    if(!rows.length)throw Error('invalid_grant');accountId=rows[0].account_id;refreshExpiry=rows[0].expires_at;
   }
   const access=token(),refresh=token();
   await db.query('INSERT INTO jm_oauth_tokens(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval \'1 hour\')',[sha(access),accountId]);
   await db.query('INSERT INTO jm_oauth_refresh_tokens(token_hash,account_id,client_id,expires_at) VALUES($1,$2,$3,COALESCE($4::timestamptz,now()+interval \'30 days\'))',[sha(refresh),accountId,client_id,refreshExpiry||null]);
   await db.query('COMMIT');
   return {access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scope:'jm_financeiro'};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 }
 return {autorizar,trocar,verificarBearer};
}
export const oauthMetadata={issuer:base,authorization_endpoint:base+'/oauth/authorize',token_endpoint:base+'/oauth/token',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],scopes_supported:['jm_financeiro']};
export const resourceMetadata={resource:base+'/mcp',authorization_servers:[base],scopes_supported:['jm_financeiro']};
export const clientId=client;

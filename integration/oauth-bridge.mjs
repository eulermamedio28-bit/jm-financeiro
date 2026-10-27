import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('base64url');
const token=()=>randomBytes(32).toString('base64url');
const base='https://jm-financeiro-db-private-test.onrender.com';
const client='jm-financeiro-chatgpt';
export async function prepararOAuth(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_oauth_codes (code_hash text PRIMARY KEY, account_id uuid NOT NULL, redirect_uri text NOT NULL, challenge text NOT NULL, client_id text NOT NULL, expires_at timestamptz NOT NULL)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_oauth_tokens (token_hash text PRIMARY KEY, account_id uuid NOT NULL, expires_at timestamptz NOT NULL)`);
}
export function criarOAuth(pool,verifySupabase){
 async function verificarBearer(value){if(!value||!value.startsWith('Bearer '))throw Error('unauthorized');const raw=value.slice(7);const {rows}=await pool.query('SELECT account_id FROM jm_oauth_tokens WHERE token_hash=$1 AND expires_at>now()',[sha(raw)]);if(!rows.length)throw Error('unauthorized');return {accountId:rows[0].account_id};}
 async function autorizar({supabaseToken,redirectUri,challenge,clientId}){
  if(clientId!==client||typeof challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(challenge)||typeof redirectUri!=='string'||!/^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\/connector_platform_oauth_redirect(?:\?.*)?$/.test(redirectUri))throw Error('invalid_request');
  const {accountId}=await verifySupabase(supabaseToken);
  const code=token();await pool.query('INSERT INTO jm_oauth_codes(code_hash,account_id,redirect_uri,challenge,client_id,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval \'5 minutes\')',[sha(code),accountId,redirectUri,challenge,clientId]);
  return code;
 }
 async function trocar({code,redirect_uri,client_id,code_verifier,grant_type}){
  if(grant_type!=='authorization_code'||client_id!==client||typeof code!=='string'||typeof code_verifier!=='string'||code_verifier.length<43||code_verifier.length>128)throw Error('invalid_grant');
  const {rows}=await pool.query('DELETE FROM jm_oauth_codes WHERE code_hash=$1 AND expires_at>now() RETURNING *',[sha(code)]);
  const item=rows[0];if(!item||item.client_id!==client_id||item.redirect_uri!==redirect_uri||item.challenge!==sha(code_verifier))throw Error('invalid_grant');
  const access_token=token();await pool.query('INSERT INTO jm_oauth_tokens(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval \'1 hour\')',[sha(access_token),item.account_id]);
  return {access_token,token_type:'Bearer',expires_in:3600,scope:'jm_financeiro'};
 }
 return {autorizar,trocar,verificarBearer};
}
export const oauthMetadata={issuer:base,authorization_endpoint:base+'/oauth/authorize',token_endpoint:base+'/oauth/token',response_types_supported:['code'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],scopes_supported:['jm_financeiro']};
export const resourceMetadata={resource:base+'/mcp',authorization_servers:[base],scopes_supported:['jm_financeiro']};
export const clientId=client;

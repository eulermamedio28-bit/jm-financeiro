// OIDC verifier for a future authenticated API. Not deployed or enabled.
// Requires a trusted OIDC issuer, audience and HTTPS JWKS endpoint.
import {createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';

export function criarVerificadorOidc({issuer,audience,jwksUri}={}){
  if(typeof issuer!=='string'||!issuer.startsWith('https://'))throw new Error('OIDC issuer HTTPS obrigatório');
  if(typeof audience!=='string'||!audience.trim())throw new Error('OIDC audience obrigatório');
  if(typeof jwksUri!=='string'||!jwksUri)throw new Error('JWKS URI explícita obrigatória');
  const jwksUrl=new URL(jwksUri);
  if(jwksUrl.protocol!=='https:')throw new Error('JWKS HTTPS obrigatório');
  const jwks=createRemoteJWKSet(jwksUrl);
  return async function verificarToken(token){
    if(typeof token!=='string'||token.length>16384||token.length<20)throw new Error('Token inválido');
    const {payload}=await jwtVerify(token,jwks,{issuer,audience,algorithms:['RS256','ES256','PS256'],clockTolerance:5});
    if(typeof payload.sub!=='string'||!payload.sub.trim())throw new Error('Identidade sem subject');
    // Deterministic server-side UUID; no account ID accepted from the client.
    const bytes=createHash('sha256').update(issuer+'\0'+payload.sub).digest();
    bytes[6]=(bytes[6]&0x0f)|0x40;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=bytes.subarray(0,16).toString('hex');
    return {accountId:`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`};
  };
}

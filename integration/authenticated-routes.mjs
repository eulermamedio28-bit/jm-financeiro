// Authenticated API handler, intentionally not mounted on any public server.
// verifyAccessToken MUST validate signature, issuer, audience, expiry and return
// a server-derived accountId. Never accept accountId from request payload.
import { validarSnapshot } from './snapshot-readonly.mjs';

export function criarRotasFinanceiras({verifyAccessToken,repository,syncEnabled=false}) {
  if(typeof syncEnabled!=='boolean') throw new Error('Configuração de sincronização inválida');
  if(typeof verifyAccessToken!=='function') throw new Error('Verificador de identidade obrigatório');
  if(!repository || typeof repository.consultar!=='function' || typeof repository.salvar!=='function')
    throw new Error('Repositório obrigatório');

  async function executar({authorization,method,path,body}) {
    if(typeof authorization!=='string' || !authorization.startsWith('Bearer '))
      return {status:401,body:{error:'unauthorized'}};
    let identity;
    try { identity=await verifyAccessToken(authorization.slice(7)); }
    catch { return {status:401,body:{error:'unauthorized'}}; }
    const accountId=identity?.accountId;
    if(typeof accountId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId))
      return {status:401,body:{error:'unauthorized'}};

    if(path==='/v1/sync/status' && method==='GET')
      return {status:200,body:{syncEnabled,accountAuthenticated:true,...(syncEnabled?{}:{reason:'deployment_not_ready'})}};
    if(path==='/v1/sync' && !syncEnabled)
      return {status:503,body:{error:'sync_not_enabled'}};
    if(path==='/v1/sync' && method==='GET') {
      const snapshot=await repository.consultar(accountId);
      return snapshot ? {status:200,body:snapshot} : {status:404,body:{error:'snapshot_not_found'}};
    }
    if(path==='/v1/sync' && method==='POST') {
      if(!body || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision<0)
        return {status:400,body:{error:'invalid_revision'}};
      try { validarSnapshot(body.snapshot); }
      catch { return {status:400,body:{error:'invalid_snapshot'}}; }
      const result=await repository.salvar(accountId,body.snapshot,body.expectedRevision);
      if(result.conflict) return {status:409,body:{error:'revision_conflict'}};
      return {status:200,body:{revision:result.revision,updatedAt:result.updatedAt}};
    }
    return {status:404,body:{error:'not_found'}};
  }
  return Object.freeze({executar});
}

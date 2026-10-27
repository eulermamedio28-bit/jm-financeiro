// Configuration gate for a future isolated homologation environment.
// This does not start a server, connect to databases or deploy anything.
export function validateStagingConfig(env){
 const errors=[];
 const httpsUrl=value=>{
  try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&!u.search&&!u.hash}catch{return false}
 };
 if(env.NODE_ENV!=='production')errors.push('NODE_ENV deve ser production');
 if(env.JM_ENVIRONMENT!=='staging')errors.push('JM_ENVIRONMENT deve ser staging');
 if(!httpsUrl(env.JM_PUBLIC_ORIGIN))errors.push('JM_PUBLIC_ORIGIN exige origem HTTPS sem credenciais');
 if(env.JM_ALLOW_REAL_FINANCIAL_DATA!=='false')errors.push('Dados financeiros reais devem estar desabilitados');
 if(env.JM_STAGING_ISOLATED_DB!=='true')errors.push('Banco de homologação isolado deve ser confirmado');
 if(env.JM_TLS_PROXY_VERIFIED!=='true')errors.push('Proxy HTTPS precisa ser verificado');
 if(env.JM_SHARED_RATE_LIMIT_VERIFIED!=='true')errors.push('Rate limiting compartilhado precisa ser verificado');
 if(env.JM_ENCRYPTED_BACKUP_VERIFIED!=='true')errors.push('Backup criptografado precisa ser verificado');
 if(env.JM_RESTORE_TEST_VERIFIED!=='true')errors.push('Restauração de backup precisa ser testada');
 return {ready:errors.length===0,errors};
}

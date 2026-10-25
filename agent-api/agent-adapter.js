// Adaptador de desenvolvimento: não é plugin instalado e não aceita conexões públicas.
// Nunca forneça credenciais reais neste ambiente.
import crypto from 'node:crypto';

const READ_TOOLS=Object.freeze({
  consultar_resumo:'GET /summary',
  listar_contas:'GET /accounts',
  listar_categorias:'GET /categories',
  consultar_saldos:'GET /account-balances',
  listar_lancamentos:'GET /entries',
  listar_transferencias:'GET /transfers',
  consultar_auditoria:'GET /audit'
});
const WRITE_TOOLS=Object.freeze({
  criar_conta:'POST /accounts',
  criar_categoria:'POST /categories',
  registrar_lancamento:'POST /entries',
  transferir_entre_contas:'POST /transfers'
});
const isLocalUrl=url=>{
  try {
    const u=new URL(url);
    return u.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(u.hostname)
      && !u.username && !u.password && !u.search && !u.hash;
  }catch{return false;}
};
export function createLocalAgentAdapter({baseUrl='http://127.0.0.1:8787',token,pilotSession,userSession,fetchImpl=fetch}={}){
  if(!isLocalUrl(baseUrl))throw Error('Adaptador permitido somente em localhost; não publicar na internet');
  if([token,pilotSession,userSession].some(x=>typeof x!=='string'||x.length<32))throw Error('Credenciais fictícias de desenvolvimento obrigatórias');
  const base=new URL(baseUrl);
  const request=async(route,body,idempotencyKey)=>{
    const [method,path]=route.split(' ');
    const url=new URL(path,base);
    if(url.origin!==base.origin)throw Error('Origem não permitida');
    const headers={authorization:'Bearer '+token,'x-jm-pilot-session':pilotSession,'x-jm-user-session':userSession};
    if(body!==undefined){
      headers['content-type']='application/json';
      headers['idempotency-key']=idempotencyKey;
    }
    const response=await fetchImpl(url,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    if(!response.ok)throw Error('Operação recusada pelo servidor (HTTP '+response.status+')');
    return data;
  };
  return Object.freeze({
    listTools:()=>({read:Object.keys(READ_TOOLS),write:Object.keys(WRITE_TOOLS)}),
    read:async name=>{
      if(!Object.hasOwn(READ_TOOLS,name))throw Error('Consulta desconhecida');
      return request(READ_TOOLS[name]);
    },
    prepareWrite:(name,body)=>{
      if(!Object.hasOwn(WRITE_TOOLS,name))throw Error('Operação desconhecida');
      if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Dados inválidos');
      const snapshot=structuredClone(body);
      const summary=JSON.stringify(snapshot);
      return Object.freeze({name,summary,body:snapshot,idempotencyKey:crypto.randomUUID().replaceAll('-','')});
    },
    executeApproved:async(prepared,approval)=>{
      if(!prepared||!Object.hasOwn(WRITE_TOOLS,prepared.name)||!prepared.idempotencyKey)throw Error('Operação não preparada');
      if(!approval||approval.confirmed!==true||approval.operationKey!==prepared.idempotencyKey||approval.summary!==prepared.summary)throw Error('Confirmação explícita da operação obrigatória');
      if(JSON.stringify(prepared.body)!==prepared.summary)throw Error('Operação alterada após preparação');
      return request(WRITE_TOOLS[prepared.name],prepared.body,prepared.idempotencyKey);
    }
  });
}

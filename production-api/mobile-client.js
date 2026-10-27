// Cliente para a futura interface mobile. Usar somente em origem HTTPS confiável.
// Token permanece apenas na memória e é perdido ao recarregar a página.
export function createMobileClient({baseUrl,fetchImpl=fetch}){
 const url=new URL(baseUrl);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))) throw Error('HTTPS obrigatório');
 let token=null;
 const request=async(path,{method='GET',body,idempotencyKey}={})=>{
  const headers={'accept':'application/json'};
  if(body!==undefined) headers['content-type']='application/json';
  if(token) headers.authorization='Bearer '+token;
  if(idempotencyKey) headers['idempotency-key']=idempotencyKey;
  const response=await fetchImpl(new URL(path,url),{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();
  if(!response.ok){
   if(response.status===401) token=null;
   throw Error(data.error||'Falha na solicitação');
  }
  return data;
 };
 return {
  async login(password){
   if(typeof password!=='string'||!password) throw Error('Senha obrigatória');
   const result=await request('/api/login',{method:'POST',body:{username:'euler',password}});
   token=result.token;
   return {expiresAt:result.expiresAt};
  },
  async establishments(){
   if(!token) throw Error('Sessão necessária');
   return request('/api/establishments');
  },
  async catalog(establishmentId){
   if(!token) throw Error('Sessão necessária');
   return request('/api/catalog?establishmentId='+encodeURIComponent(establishmentId));
  },
  async summary(establishmentId){
   if(!token) throw Error('Sessão necessária');
   return request('/api/summary?establishmentId='+encodeURIComponent(establishmentId));
  },
  async record(kind,input,idempotencyKey){
   if(!token) throw Error('Sessão necessária');
   return request('/api/operations',{method:'POST',body:{kind,input},idempotencyKey});
  },
  async logout(){
   if(!token) return;
   try{await request('/api/logout',{method:'POST'})}
   finally{token=null}
  },
  get authenticated(){return Boolean(token)}
 };
}

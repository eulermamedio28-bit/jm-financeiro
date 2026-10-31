// JM Financeiro MCP Streamable HTTP (JSON-RPC) adapter.
// All financial operations require a verified Supabase JWT and are scoped to its subject.
const tools=[
 {name:'registrar_lancamento',description:'Registra receita ou despesa em BRL; solicite confirmação de valor, data e conta antes de enviar. client_request_id UUID único por lançamento evita duplicação.',inputSchema:{type:'object',additionalProperties:false,required:['client_request_id','tipo','valor_centavos','descricao','data'],properties:{client_request_id:{type:'string',description:'UUID de idempotência'},tipo:{type:'string',enum:['receita','despesa']},valor_centavos:{type:'integer',minimum:1},descricao:{type:'string'},categoria:{type:'string'},conta:{type:'string'},data:{type:'string',description:'YYYY-MM-DD'}}}},
 {name:'registrar_compra_cartao',description:'Registra compra no cartão como obrigação a pagar sem movimentar saldo bancário. Exige confirmação de valor, data, cartão e vencimento; UUID impede duplicação.',inputSchema:{type:'object',additionalProperties:false,required:['client_request_id','cartao','descricao','valor_centavos','data_compra','vencimento','dia_fechamento'],properties:{client_request_id:{type:'string'},cartao:{type:'string'},descricao:{type:'string'},valor_centavos:{type:'integer',minimum:1},data_compra:{type:'string'},vencimento:{type:'string'},dia_fechamento:{type:'integer',minimum:1,maximum:28}}}},
 {name:'listar_compras_cartao',description:'Consulta compras a pagar no cartão, sem alterar saldo bancário.',inputSchema:{type:'object',additionalProperties:false,properties:{}}},
 {name:'listar_lancamentos',description:'Lista até 50 lançamentos da conta autenticada, sem dados fictícios.',inputSchema:{type:'object',additionalProperties:false,properties:{}}},
 {name:'consultar_resumo',description:'Soma receitas e despesas persistidas, em centavos. Não considera saldo inicial ou transferências.',inputSchema:{type:'object',additionalProperties:false,properties:{}}}
];
const json=(value)=>({type:'text',text:JSON.stringify(value)});
export async function executarMcp({body,authorization,verifyToken,ledger,cartoes}){
 const id=body?.id??null;
 const fail=(code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
 if(body?.jsonrpc!=='2.0'||typeof body?.method!=='string')return {status:400,body:fail(-32600,'Invalid Request')};
 if(body.method==='ping')return {status:200,body:{jsonrpc:'2.0',id,result:{}}};
 if(body.method==='initialize')return {status:200,body:{jsonrpc:'2.0',id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'JM Financeiro',version:'0.1.0'}}}};
 if(body.method==='notifications/initialized')return {status:202,body:null};
 if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))return {status:401,body:fail(-32001,'Authentication required')};
 let accountId;try{accountId=(await verifyToken(authorization.slice(7))).accountId;}catch{return {status:401,body:fail(-32001,'Invalid authentication')};}
 if(body.method==='tools/list')return {status:200,body:{jsonrpc:'2.0',id,result:{tools}}};
 if(body.method!=='tools/call')return {status:200,body:fail(-32601,'Method not found')};
 const name=body.params?.name,args=body.params?.arguments||{};
 try{
  let result;
  if(name==='registrar_compra_cartao')result=await cartoes.registrar(accountId,args);
  else if(name==='listar_compras_cartao')result={compras:await cartoes.listar(accountId)};
  else if(name==='registrar_lancamento')result=await ledger.registrar(accountId,args);
  else if(name==='listar_lancamentos')result={lancamentos:await ledger.listar(accountId)};
  else if(name==='consultar_resumo'){
   const list=await ledger.listar(accountId,100);
   result={observacao:'Resumo limitado aos últimos 100 lançamentos; não é saldo bancário.',receitas_centavos:list.filter(x=>x.tipo==='receita').reduce((n,x)=>n+Number(x.valor_centavos),0),despesas_centavos:list.filter(x=>x.tipo==='despesa').reduce((n,x)=>n+Number(x.valor_centavos),0)};
  }else return {status:200,body:fail(-32602,'Unknown tool')};
  return {status:200,body:{jsonrpc:'2.0',id,result:{content:[json(result)],isError:false}}};
 }catch(e){return {status:200,body:{jsonrpc:'2.0',id,result:{content:[json({error:e.message==='idempotency_conflict'?'idempotency_conflict':'invalid_or_unavailable'})],isError:true}}};}
}

import http from 'node:http';
const port=Number(process.env.PORT||10000);
const tools=[
{name:'consultar_resumo_ficticio',description:'Retorna um resumo exclusivamente fictício, sem dados financeiros reais.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
{name:'consultar_mes_ficticio',description:'Retorna dados fictícios de outubro de 2026.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}},
{name:'consultar_categorias_ficticias',description:'Retorna categorias financeiras fictícias.',inputSchema:{type:'object',properties:{mes:{type:'string',enum:['2026-10']}},required:['mes'],additionalProperties:false}},
{name:'comparar_meses_ficticios',description:'Compara meses fictícios.',inputSchema:{type:'object',properties:{mes_inicial:{type:'string',enum:['2026-09']},mes_final:{type:'string',enum:['2026-10']}},required:['mes_inicial','mes_final'],additionalProperties:false}}
];
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const send=(res,status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
const summary={source:'fictional-demo',currency:'BRL',income_cents:285000,expense_cents:174000,balance_cents:111000,notice:'Dados fictícios; nenhuma conexão com finanças reais.'};
const responseFor=(name)=>name==='consultar_resumo_ficticio'?summary:name==='consultar_mes_ficticio'?{...summary,month:'2026-10'}:name==='consultar_categorias_ficticias'?{...summary,month:'2026-10',income:[{category:'Marmitas',amount_cents:200000},{category:'Bebidas',amount_cents:55000},{category:'Sobremesas',amount_cents:30000}],expenses:[{category:'Ingredientes',amount_cents:100000},{category:'Embalagens',amount_cents:32000},{category:'Operacional',amount_cents:42000}]}:{source:'fictional-demo',previous:{month:'2026-09',income_cents:250000,expense_cents:160000,balance_cents:90000},current:{month:'2026-10',...summary},notice:'Comparativo fictício.'};
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'&&req.method==='GET')return send(res,200,{status:'ok',service:'jm-financeiro-mcp-v2',mode:'fictional-read-only',financialData:false});
 if(path!=='/mcp')return send(res,404,{error:'not_found'});
 if(req.method==='GET'){res.writeHead(405,{'allow':'POST, DELETE'});return res.end();}
 if(req.method==='DELETE')return send(res,200,{ok:true});
 if(req.method!=='POST')return send(res,405,{error:'method_not_allowed'});
 let body='';try{for await(const chunk of req){body+=chunk;if(body.length>32768)return send(res,413,{error:'too_large'});}
 const msg=JSON.parse(body);
 if(msg.jsonrpc!=='2.0'||typeof msg.method!=='string')return send(res,400,{error:'invalid_jsonrpc'});
 if(msg.id===undefined){res.writeHead(202);return res.end();}
 let result;
 if(msg.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'jm-financeiro-mcp-v2',version:'2.0.0'}};
 else if(msg.method==='ping')result={};
 else if(msg.method==='tools/list')result={tools};
 else if(msg.method==='tools/call'){
 const name=msg.params?.name,args=msg.params?.arguments||{};
 if(!tools.some(t=>t.name===name))return send(res,200,{jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Unknown tool'}});
 if((name==='consultar_mes_ficticio'||name==='consultar_categorias_ficticias')&&args.mes!=='2026-10'||name==='comparar_meses_ficticios'&&(args.mes_inicial!=='2026-09'||args.mes_final!=='2026-10'))return send(res,200,{jsonrpc:'2.0',id:msg.id,error:{code:-32602,message:'Invalid month'}});
 result={content:[{type:'text',text:JSON.stringify(responseFor(name))}],isError:false};
 }else return send(res,200,{jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Unknown method'}});
 return send(res,200,{jsonrpc:'2.0',id:msg.id,result});
 }catch{return send(res,400,{error:'invalid_request'});}
});
server.listen(port,'0.0.0.0',async()=>{
 console.log('JM Financeiro MCP v2 fictional demo ready');
 try{
  const invoke=async(method,params={})=>{
   const res=await fetch('http://127.0.0.1:'+port+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
   const data=await res.json();
   if(res.status!==200||data.error||!data.result)throw Error(method+' failed');
   return data.result;
  };
  const init=await invoke('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'selftest',version:'1'}});
  if(init.serverInfo?.name!=='jm-financeiro-mcp-v2')throw Error('initialize mismatch');
  const list=await invoke('tools/list');
  if(list.tools?.length!==4)throw Error('tools/list mismatch');
  for(const [name,args] of [['consultar_resumo_ficticio',{}],['consultar_mes_ficticio',{mes:'2026-10'}],['consultar_categorias_ficticias',{mes:'2026-10'}],['comparar_meses_ficticios',{mes_inicial:'2026-09',mes_final:'2026-10'}]]){
   const result=await invoke('tools/call',{name,arguments:args});
   const payload=JSON.parse(result.content?.[0]?.text||'null');
   if(payload?.source!=='fictional-demo')throw Error(name+' invalid payload');
   console.log('[mcp-selftest] PASS '+name);
  }
  console.log('[mcp-selftest] PASS initialize, tools/list, four tools/call');
 }catch(err){console.error('[mcp-selftest] FAIL',err.message);process.exitCode=1;}
});

// Isolated test-only service: validates DB authentication and a read-only query.
// Never logs credentials, SQL payloads, or account data. No financial endpoints.
import http from 'node:http';
const port=Number(process.env.PORT||10000);
async function verifyDatabase(){
  if(!process.env.DATABASE_URL)return 'not_configured';
  let u;
  try{u=new URL(process.env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(u.protocol))return 'invalid_protocol';}
  catch{return 'invalid_url';}
  let Client;
  try{({Client}=await import('pg'));}
  catch{return 'pg_driver_missing';}
  const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:8000});
  try{
    await client.connect();
    const result=await client.query('SELECT 1 AS connectivity_check');
    return result.rows[0]?.connectivity_check===1?'authenticated_query_ok':'unexpected_query_result';
  }catch(e){
    if(['28P01','28000'].includes(e.code))return 'authentication_failed';
    if(e.code==='ENOTFOUND')return 'dns_failed';
    if(e.code==='ETIMEDOUT')return 'timeout';
    return 'database_query_failed';
  }finally{await client.end().catch(()=>{});}
}
console.log('Private database auth probe:',await verifyDatabase());
http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/health'){
    res.writeHead(200);return res.end(JSON.stringify({service:'jm-financeiro-db-test',readyForFinancialData:false}));
  }
  res.writeHead(404);res.end(JSON.stringify({error:'not_found'}));
}).listen(port,'0.0.0.0');

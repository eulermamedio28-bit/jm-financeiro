// Isolated test server. Checks private TCP reachability at startup, not credentials.
import http from 'node:http';
import net from 'node:net';
const port=Number(process.env.PORT||10000);
async function checkTcp(){
  if(!process.env.DATABASE_URL) return 'not_configured';
  let u;
  try {u=new URL(process.env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(u.protocol))return 'invalid_protocol';}
  catch{return 'invalid_url';}
  return await new Promise(resolve=>{
    const socket=net.connect({host:u.hostname,port:Number(u.port||5432)});
    const timer=setTimeout(()=>{socket.destroy();resolve('timeout');},8000);
    socket.once('connect',()=>{clearTimeout(timer);socket.end();resolve('tcp_reachable');});
    socket.once('error',e=>{clearTimeout(timer);resolve(e.code==='ENOTFOUND'?'dns_failed':'tcp_failed');});
  });
}
const state=await checkTcp();
console.log('Private database TCP probe:',state);
const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/health'){
    res.writeHead(200);return res.end(JSON.stringify({service:'jm-financeiro-db-test',readyForFinancialData:false}));
  }
  res.writeHead(404);res.end(JSON.stringify({error:'not_found'}));
});
server.listen(port,'0.0.0.0');

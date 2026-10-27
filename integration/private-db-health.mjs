// Health-only deployment for private PostgreSQL connectivity preparation.
// Never expose credentials or query results; no financial data endpoints.
import http from 'node:http';
const port=Number(process.env.PORT||10000);
const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET' && req.url==='/health'){
    res.writeHead(200);
    return res.end(JSON.stringify({service:'jm-financeiro-db-test',readyForFinancialData:false,databaseConfigured:Boolean(process.env.DATABASE_URL)}));
  }
  res.writeHead(404);
  res.end(JSON.stringify({error:'not_found'}));
});
server.listen(port,'0.0.0.0');

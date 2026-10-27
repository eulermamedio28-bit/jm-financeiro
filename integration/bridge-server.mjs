import http from 'node:http';
import crypto from 'node:crypto';

// Protótipo isolado: não armazena nem aceita dados financeiros reais.
// Apenas testa a fronteira de autenticação e readiness.
const port = Number(process.env.PORT || 10000);
const secret = process.env.JM_BRIDGE_TEST_TOKEN || '';
const configured = secret.length >= 48;
const json = (res,status,data) => {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(data));
};
function authorized(req) {
  const supplied = req.headers.authorization || '';
  const expected = 'Bearer ' + secret;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return configured && a.length === b.length && crypto.timingSafeEqual(a,b);
}
export const server = http.createServer((req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  if (req.method === 'GET' && path === '/health')
    return json(res,200,{status:'ok',service:'jm-financeiro-bridge-prototype',financialData:false,readyForFinancialData:false});
  if (path === '/v1/sync/status' && req.method === 'GET') {
    if (!configured) return json(res,503,{error:'auth_not_configured'});
    if (!authorized(req)) return json(res,401,{error:'unauthorized'});
    return json(res,200,{status:'prototype',financialData:false,syncEnabled:false});
  }
  // Fail closed: no data is accepted until persistent storage, account isolation and auth are implemented.
  if (path === '/v1/sync') return json(res,503,{error:'sync_not_implemented'});
  return json(res,404,{error:'not_found'});
});
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href)
  server.listen(port,'0.0.0.0',()=>console.log('JM Bridge prototype listening'));

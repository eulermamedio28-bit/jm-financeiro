// Ambiente de desenvolvimento isolado. Nunca exponha este servidor sem HTTPS e controle de acesso.
import http from 'node:http';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const db = new Database(process.env.JM_DB_PATH || './jm-dev.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, opening_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('expense','income')), account_id TEXT NOT NULL REFERENCES accounts(id), category_id TEXT NOT NULL REFERENCES categories(id), description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_log(key TEXT PRIMARY KEY, response_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT NOT NULL, record_id TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
`);
db.pragma('foreign_keys = ON');
const token = process.env.JM_API_TOKEN;
if (!token || token.length < 32) throw new Error('Configure JM_API_TOKEN com pelo menos 32 caracteres aleatórios');
const actor = 'ambiente-dev';
const json = (res, status, data) => {res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const safeEqual = (a,b) => {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && crypto.timingSafeEqual(x,y);};
const requiredString = (v,max=120) => typeof v==='string' && v.trim().length>0 && v.trim().length<=max;
const cents = v => Number.isSafeInteger(v) && v>0 && v<=100000000000;
const handlers = {
 'GET /health': () => ({status:'ok',environment:'development'}),
 'GET /accounts': () => db.prepare('SELECT * FROM accounts ORDER BY name').all(),
 'GET /categories': () => db.prepare('SELECT * FROM categories ORDER BY name').all(),
 'GET /entries': () => db.prepare('SELECT * FROM entries ORDER BY created_at DESC LIMIT 200').all(),
 'GET /audit': () => db.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 200').all(),
 'POST /accounts': b => {
   if(!requiredString(b.name)) throw Error('Nome de conta inválido');
   if(b.opening_cents!==undefined && (!Number.isSafeInteger(b.opening_cents) || Math.abs(b.opening_cents)>100000000000)) throw Error('Saldo inicial inválido');
   const r={id:id(),name:b.name.trim(),opening_cents:b.opening_cents??0};
   db.prepare('INSERT INTO accounts VALUES (@id,@name,@opening_cents)').run(r);return r;
 },
 'POST /categories': b => {
   if(!requiredString(b.name)) throw Error('Categoria inválida');
   const r={id:id(),name:b.name.trim()};db.prepare('INSERT INTO categories VALUES (@id,@name)').run(r);return r;
 },
 'POST /entries': b => {
   if(!['expense','income'].includes(b.kind) || !requiredString(b.description,240) || !cents(b.amount_cents) || !requiredString(b.account_id) || !requiredString(b.category_id)) throw Error('Lançamento inválido');
   const r={id:id(),kind:b.kind,account_id:b.account_id,category_id:b.category_id,description:b.description.trim(),amount_cents:b.amount_cents,created_at:now()};
   db.prepare('INSERT INTO entries VALUES (@id,@kind,@account_id,@category_id,@description,@amount_cents,@created_at)').run(r);return r;
 }
};
const server=http.createServer(async(req,res)=>{
  if(!safeEqual(req.headers.authorization||'', 'Bearer '+token)) return json(res,401,{error:'Não autorizado'});
  const route=req.method+' '+new URL(req.url,'http://localhost').pathname;
  if(!handlers[route]) return json(res,404,{error:'Rota inexistente'});
  if(req.method==='GET') return json(res,200,handlers[route]());
  const key=req.headers['idempotency-key'];
  if(typeof key!=='string'||!/^[-_a-zA-Z0-9]{12,128}$/.test(key)) return json(res,400,{error:'Idempotency-Key obrigatório (12 a 128 caracteres)'});
  let raw='';
  try {
    for await(const chunk of req){raw+=chunk;if(raw.length>16384) throw Error('Corpo muito grande');}
    const body=JSON.parse(raw);
    const result=db.transaction(()=>{
      const previous=db.prepare('SELECT response_json FROM request_log WHERE key=?').get(key);
      if(previous) return JSON.parse(previous.response_json);
      const value=handlers[route](body);
      db.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').run(id(),route,value.id,actor,now());
      db.prepare('INSERT INTO request_log VALUES (?,?)').run(key,JSON.stringify(value));
      return value;
    })();
    return json(res,200,result);
  }catch(e){return json(res,400,{error:'Requisição inválida',detail:e.message});}
});
const port=Number(process.env.PORT||8787);
server.listen(port,'127.0.0.1',()=>console.log('API de desenvolvimento local iniciada na porta '+port));

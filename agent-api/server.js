// Ambiente de desenvolvimento isolado. Nunca exponha este servidor sem HTTPS e controle de acesso.
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.JM_DB_PATH || './jm-dev.sqlite');
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, opening_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('expense','income')), account_id TEXT NOT NULL REFERENCES accounts(id), category_id TEXT NOT NULL REFERENCES categories(id), description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_log(key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT NOT NULL, record_id TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
`);
db.exec('PRAGMA foreign_keys = ON');
const token = process.env.JM_API_TOKEN;
if (!token || token.length < 32) throw new Error('Configure JM_API_TOKEN com pelo menos 32 caracteres aleatórios');
const actor = 'ambiente-dev';
if (process.env.NODE_ENV === 'production') throw new Error('API experimental não pode iniciar em produção');
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('Objeto JSON obrigatório');
    const fingerprint=crypto.createHash('sha256').update(route+'\n'+JSON.stringify(body)).digest('hex');
    db.exec('BEGIN IMMEDIATE');
    let result;
    try {
      result=(()=>{
      const previous=db.prepare('SELECT fingerprint,response_json FROM request_log WHERE key=?').get(key);
      if(previous){
        if(previous.fingerprint!==fingerprint) throw Error('Chave de idempotência reutilizada para outra operação');
        return JSON.parse(previous.response_json);
      }
      const value=handlers[route](body);
      db.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').run(id(),route,value.id,actor,now());
      db.prepare('INSERT INTO request_log VALUES (?,?,?)').run(key,fingerprint,JSON.stringify(value));
      return value;
    })();
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return json(res,200,result);
  }catch(e){return json(res,400,{error:'Requisição inválida'});}
});
const port=Number(process.env.PORT||8787);
server.listen(port,'127.0.0.1',()=>console.log('API de desenvolvimento local iniciada na porta '+port));

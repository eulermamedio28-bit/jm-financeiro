// Ambiente de desenvolvimento isolado. Nunca exponha este servidor sem HTTPS e controle de acesso.
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createPilotAuth } from './pilot-auth.js';
import { readFileSync } from 'node:fs';

// Segurança: nunca inicializar banco ou endpoints experimentais em produção.
if (process.env.NODE_ENV === 'production') throw new Error('API experimental não pode iniciar em produção');
const token = process.env.JM_API_TOKEN;
if (!token || token.length < 32) throw new Error('Configure JM_API_TOKEN com pelo menos 32 caracteres aleatórios');
const passwordHash=process.env.JM_PILOT_PASSWORD_HASH;
if(!passwordHash) throw new Error('Configure JM_PILOT_PASSWORD_HASH para testes locais');
const auth=createPilotAuth({passwordHash});
const pilotSession = process.env.JM_PILOT_SESSION;
if (!pilotSession || pilotSession.length < 32) throw new Error('Configure JM_PILOT_SESSION com pelo menos 32 caracteres aleatórios');
const db = new DatabaseSync(process.env.JM_DB_PATH || './jm-dev.sqlite');
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, opening_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('expense','income')), account_id TEXT NOT NULL REFERENCES accounts(id), category_id TEXT NOT NULL REFERENCES categories(id), description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS transfers(id TEXT PRIMARY KEY, from_account_id TEXT NOT NULL REFERENCES accounts(id), to_account_id TEXT NOT NULL REFERENCES accounts(id), amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), description TEXT NOT NULL, created_at TEXT NOT NULL, CHECK(from_account_id <> to_account_id));
CREATE TABLE IF NOT EXISTS request_log(key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, response_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT NOT NULL, record_id TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
`);
db.exec('PRAGMA foreign_keys = ON');
const validSession = req => safeEqual(req.headers['x-jm-pilot-session'] || '',pilotSession);
const allowedOrigin = process.env.JM_ALLOWED_ORIGIN || '';
const hasForbiddenOrigin = req => !!req.headers.origin && req.headers.origin !== allowedOrigin;

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
 'GET /transfers': () => db.prepare('SELECT * FROM transfers ORDER BY created_at DESC LIMIT 200').all(),
 'GET /account-balances': () => db.prepare(`SELECT a.id,a.name,a.opening_cents + COALESCE((SELECT SUM(CASE WHEN e.kind='income' THEN e.amount_cents ELSE -e.amount_cents END) FROM entries e WHERE e.account_id=a.id),0) + COALESCE((SELECT SUM(t.amount_cents) FROM transfers t WHERE t.to_account_id=a.id),0) - COALESCE((SELECT SUM(t.amount_cents) FROM transfers t WHERE t.from_account_id=a.id),0) AS balance_cents FROM accounts a ORDER BY a.name`).all(),
 'GET /audit': () => db.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 200').all(),
 'GET /summary': () => {
   const rows=db.prepare("SELECT kind, COALESCE(SUM(amount_cents),0) AS total FROM entries GROUP BY kind").all();
   const income_cents=Number(rows.find(x=>x.kind==='income')?.total??0);
   const expense_cents=Number(rows.find(x=>x.kind==='expense')?.total??0);
   const opening_cents=Number(db.prepare('SELECT COALESCE(SUM(opening_cents),0) AS total FROM accounts').get().total);
   return {income_cents,expense_cents,opening_cents,balance_cents:opening_cents+income_cents-expense_cents};
 },
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
 'POST /transfers': b => {
   if (!requiredString(b.from_account_id) || !requiredString(b.to_account_id) || b.from_account_id===b.to_account_id || !cents(b.amount_cents) || !requiredString(b.description,240)) throw Error('Transferência inválida');
   const balances=handlers['GET /account-balances']();
   const source=balances.find(a=>a.id===b.from_account_id);
   if(!source || source.balance_cents<b.amount_cents) throw Error('Saldo insuficiente');
   const r={id:id(),from_account_id:b.from_account_id,to_account_id:b.to_account_id,amount_cents:b.amount_cents,description:b.description.trim(),created_at:now()};
   db.prepare('INSERT INTO transfers VALUES (@id,@from_account_id,@to_account_id,@amount_cents,@description,@created_at)').run(r);return r;
 },
 'POST /entries': b => {
   if(!['expense','income'].includes(b.kind) || !requiredString(b.description,240) || !cents(b.amount_cents) || !requiredString(b.account_id) || !requiredString(b.category_id)) throw Error('Lançamento inválido');
   const r={id:id(),kind:b.kind,account_id:b.account_id,category_id:b.category_id,description:b.description.trim(),amount_cents:b.amount_cents,created_at:now()};
   db.prepare('INSERT INTO entries VALUES (@id,@kind,@account_id,@category_id,@description,@amount_cents,@created_at)').run(r);return r;
 }
};
const pilotHtml=readFileSync(new URL('../demo-euler/login.html',import.meta.url),'utf8');
const cookieSession=req=>{
 const match=(req.headers.cookie||'').match(/(?:^|;\s*)jm_pilot=([a-f0-9]{64})(?:;|$)/);
 return match?.[1]||'';
};
const pilotOriginOk=req=>{
 const origin=req.headers.origin;
 const host=req.headers.host;
 return !req.headers['sec-fetch-site']?.includes('cross-site') && (!origin || origin==='http://'+host);
};
const pilotCookie=(value,maxAge=1800)=>'jm_pilot='+value+'; HttpOnly; SameSite=Strict; Path=/pilot; Max-Age='+maxAge;
const pilotJson=(res,status,data,cookie)=>{
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(cookie?{'set-cookie':cookie}:{})});
 res.end(JSON.stringify(data));
};
const server=http.createServer(async(req,res)=>{
  const route=req.method+' '+new URL(req.url,'http://localhost').pathname;
  if(route==='GET /pilot'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'});
    return res.end(pilotHtml);
  }
  if(route.startsWith('GET /pilot/') || route.startsWith('POST /pilot/')){
    if(!pilotOriginOk(req)) return pilotJson(res,403,{error:'Origem não autorizada'});
    if(route==='POST /pilot/login'){
      if(!req.headers['content-type']?.startsWith('application/json')) return pilotJson(res,415,{error:'JSON obrigatório'});
      let raw='';
      try{
        for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw Error('Corpo grande');}
        const body=JSON.parse(raw);
        const session=auth.login(body?.username,body?.password);
        return session?pilotJson(res,200,{username:'euler',expiresInSeconds:session.expiresInSeconds},pilotCookie(session.token)):pilotJson(res,401,{error:'Credenciais inválidas'});
      }catch{return pilotJson(res,400,{error:'Requisição inválida'});}
    }
    const sessionToken=cookieSession(req);
    const identity=auth.authenticate(sessionToken);
    if(!identity) return pilotJson(res,401,{error:'Sessão expirada ou inválida'});
    if(route==='GET /pilot/me') return pilotJson(res,200,{username:identity.username});
    if(route==='GET /pilot/summary') return pilotJson(res,200,handlers['GET /summary']());
    if(route==='GET /pilot/accounts') return pilotJson(res,200,handlers['GET /account-balances']());
    if(route==='GET /pilot/entries') return pilotJson(res,200,handlers['GET /entries']());
    if(route==='POST /pilot/logout'){auth.logout(sessionToken);return pilotJson(res,200,{ok:true},pilotCookie('',0));}
    return pilotJson(res,404,{error:'Rota inexistente'});
  }
  if(hasForbiddenOrigin(req)) return json(res,403,{error:'Origem não autorizada'});
  if(!safeEqual(req.headers.authorization||'', 'Bearer '+token) || !validSession(req)) return json(res,401,{error:'Não autorizado'});
  if(route==='POST /auth/login'){
    let raw='';
    try{
      for await(const chunk of req){raw+=chunk;if(raw.length>2048) throw Error('Corpo muito grande');}
      const body=JSON.parse(raw);
      const session=auth.login(body?.username,body?.password);
      return session?json(res,200,session):json(res,401,{error:'Credenciais inválidas'});
    }catch{return json(res,400,{error:'Requisição inválida'});}
  }
  const sessionToken=req.headers['x-jm-user-session'];
  const identity=auth.authenticate(sessionToken);
  if(!identity) return json(res,401,{error:'Sessão individual inválida ou expirada'});
  if(route==='POST /auth/logout'){auth.logout(sessionToken);return json(res,200,{ok:true});}
  if(route==='GET /auth/me') return json(res,200,{username:identity.username});
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
      db.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').run(id(),route,value.id,identity.username,now());
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

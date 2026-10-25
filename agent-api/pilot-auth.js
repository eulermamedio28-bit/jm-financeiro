import crypto from 'node:crypto';

const KEY_LENGTH=64;
const MAX_SESSIONS=5;
const SESSION_TTL_MS=30*60*1000;
const timingEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};

export function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
 if(typeof password!=='string'||password.length<12||password.length>256) throw new Error('Senha deve ter entre 12 e 256 caracteres');
 if(!/^[a-f0-9]{32}$/.test(salt)) throw new Error('Salt inválido');
 const hash=crypto.scryptSync(password,Buffer.from(salt,'hex'),KEY_LENGTH).toString('hex');
 return 'scrypt:'+salt+':'+hash;
}

export function createPilotAuth({passwordHash,clock=()=>Date.now()}){
 if(typeof passwordHash!=='string'||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Hash de senha inválido');
 const [_,salt,expected]=passwordHash.split(':');
 const sessions=new Map();
 let failures=0,blockedUntil=0;
 function login(username,password){
   if(clock()<blockedUntil) return null;
   const validUser=username==='euler';
   const derived=typeof password==='string'&&password.length<=256
     ?crypto.scryptSync(password,Buffer.from(salt,'hex'),KEY_LENGTH).toString('hex')
     :'0'.repeat(128);
   if(!validUser||!timingEqual(derived,expected)){
     failures++;
     if(failures>=5){blockedUntil=clock()+5*60*1000;failures=0;}
     return null;
   }
   failures=0;blockedUntil=0;
   for(const [k,v] of sessions) if(v.expiresAt<=clock()) sessions.delete(k);
   if(sessions.size>=MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
   const token=crypto.randomBytes(32).toString('hex');
   sessions.set(crypto.createHash('sha256').update(token).digest('hex'),{username:'euler',expiresAt:clock()+SESSION_TTL_MS});
   return {token,expiresInSeconds:SESSION_TTL_MS/1000};
 }
 function authenticate(token){
   if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)) return null;
   const key=crypto.createHash('sha256').update(token).digest('hex');
   const session=sessions.get(key);
   if(!session)return null;
   if(session.expiresAt<=clock()){sessions.delete(key);return null;}
   return {username:session.username};
 }
 function logout(token){
   if(typeof token!=='string')return;
   sessions.delete(crypto.createHash('sha256').update(token).digest('hex'));
 }
 return {login,authenticate,logout};
}

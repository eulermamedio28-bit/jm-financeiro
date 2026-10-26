import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';

// Primitivas para futura autenticação de produção. Não expõem servidor HTTP.
export function hashPassword(password,{salt=randomBytes(16).toString('hex')}={}) {
 if(typeof password!=='string'||password.length<12||password.length>1024) throw Error('Senha inválida');
 if(!/^[0-9a-f]{32}$/.test(salt)) throw Error('Salt inválido');
 return 'scrypt:'+salt+':'+scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
}
export function verifyPassword(password,encoded) {
 if(typeof password!=='string'||typeof encoded!=='string') return false;
 const match=/^scrypt:([0-9a-f]{32}):([0-9a-f]{128})$/.exec(encoded);
 if(!match||password.length>1024) return false;
 const expected=Buffer.from(match[2],'hex');
 const actual=scryptSync(password,Buffer.from(match[1],'hex'),64);
 return timingSafeEqual(actual,expected);
}
export const sessionDigest=token=> {
 if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token)) throw Error('Token inválido');
 return createHash('sha256').update(token).digest('hex');
};
export function newSession({username,now=Date.now(),ttlMs=15*60*1000}) {
 if(username!=='euler') throw Error('Usuário não autorizado');
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(ttlMs)||ttlMs<=0||ttlMs>30*60*1000) throw Error('Expiração inválida');
 const token=randomBytes(32).toString('hex');
 return {token,digest:sessionDigest(token),username,expiresAt:new Date(now+ttlMs).toISOString()};
}
export function sessionIsActive({expiresAt,revokedAt=null},now=Date.now()) {
 const expiry=Date.parse(expiresAt);
 return !revokedAt&&Number.isFinite(expiry)&&expiry>now;
}

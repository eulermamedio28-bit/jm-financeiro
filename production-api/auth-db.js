import {verifyPassword,newSession,sessionDigest,sessionIsActive} from './auth-core.js';

// Database adapter only. HTTP, cookies and TLS are intentionally not enabled here.
export async function login(pool,{username,password,now=new Date()}){
 if(username!=='euler'||typeof password!=='string') throw Error('Credenciais inválidas');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query("INSERT INTO auth_login_attempts(username) VALUES('euler') ON CONFLICT DO NOTHING");
  const attempt=await client.query("SELECT failed_count,locked_until FROM auth_login_attempts WHERE username='euler' FOR UPDATE");
  const row=attempt.rows[0];
  if(row.locked_until&&new Date(row.locked_until)>now) throw Error('Acesso temporariamente bloqueado');
  const user=await client.query("SELECT password_hash FROM auth_users WHERE username='euler'");
  const valid=user.rows.length===1&&verifyPassword(password,user.rows[0].password_hash);
  if(!valid){
   const count=row.failed_count+1;
   const locked=count>=5?new Date(now.getTime()+15*60*1000):null;
   await client.query("UPDATE auth_login_attempts SET failed_count=$1,locked_until=$2,updated_at=$3 WHERE username='euler'",[count,locked,now]);
   await client.query('COMMIT');
   throw Object.assign(Error('Credenciais inválidas'),{loginCommitted:true});
  }
  const session=newSession({username:'euler',now:now.getTime()});
  await client.query("INSERT INTO auth_sessions(token_digest,username,expires_at) VALUES($1,'euler',$2)",[session.digest,session.expiresAt]);
  await client.query("UPDATE auth_login_attempts SET failed_count=0,locked_until=NULL,updated_at=$1 WHERE username='euler'",[now]);
  await client.query('COMMIT');
  return {token:session.token,expiresAt:session.expiresAt};
 }catch(e){
  if(!e.loginCommitted) try{await client.query('ROLLBACK')}catch{}
  throw e;
 }finally{client.release()}
}
export async function authenticatedActor(pool,token,now=new Date()){
 const digest=sessionDigest(token);
 const result=await pool.query("SELECT username,expires_at AS \"expiresAt\",revoked_at AS \"revokedAt\" FROM auth_sessions WHERE token_digest=$1",[digest]);
 const session=result.rows[0];
 if(!session||!sessionIsActive(session,now.getTime())||session.username!=='euler') throw Error('Sessão inválida');
 return 'euler';
}
export async function logout(pool,token){
 const digest=sessionDigest(token);
 await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE token_digest=$1 AND revoked_at IS NULL',[digest]);
}

// Local development defense-in-depth only. Not suitable as a distributed
// production rate limiter: use shared storage and a trusted proxy there.
export function createLoginLimiter({limit=10,windowMs=15*60*1000,now=()=>Date.now()}={}){
 const attempts=new Map();
 return {
  allow(address){
   const key=String(address||'unknown');
   const time=now();
   for(const [ip,row] of attempts)if(row.resetAt<=time)attempts.delete(ip);
   const row=attempts.get(key);
   if(row&&row.count>=limit)return false;
   if(row)row.count++;
   else attempts.set(key,{count:1,resetAt:time+windowMs});
   return true;
  }
 };
}

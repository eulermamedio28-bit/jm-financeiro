// Public browser client: only project URL and publishable/anon key belong here.
// No database credentials or service-role keys are permitted.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const status=document.getElementById('status'),form=document.getElementById('form');
const config=await fetch('./config.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(Error('config unavailable'))).catch(()=>null);
const show=message=>{status.textContent=message};
if(!config||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)||typeof config.publishableKey!=='string'||!config.publishableKey){
 show('Página ainda não configurada. Entre em contato com o administrador.');
}else{
 const supabase=createClient(config.supabaseUrl,config.publishableKey,{auth:{detectSessionInUrl:false,autoRefreshToken:false,persistSession:false}});
 const url=new URL(location.href);
 const code=url.searchParams.get('code');
 const tokenHash=url.searchParams.get('token_hash');
 const type=url.searchParams.get('type');
 try{
   if(code){
     const {error}=await supabase.auth.exchangeCodeForSession(code);
     if(error)throw error;
   }else if(tokenHash && ['invite','recovery'].includes(type)){
     const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type});
     if(error)throw error;
   }else{
     throw Error('missing_token');
   }
   history.replaceState(null,'',location.pathname);
   form.hidden=false;
   show('Convite validado. Defina uma senha exclusiva com pelo menos 12 caracteres.');
 }catch{
   history.replaceState(null,'',location.pathname);
   show('Convite inválido ou expirado. Solicite um novo convite.');
 }
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   const password=document.getElementById('password').value;
   const confirmation=document.getElementById('confirm').value;
   if(password!==confirmation){show('As senhas não coincidem.');return;}
   if(password.length<12){show('Use pelo menos 12 caracteres.');return;}
   document.getElementById('save').disabled=true;
   const {error}=await supabase.auth.updateUser({password});
   if(error){show('Não foi possível definir a senha. Verifique os requisitos e tente novamente.');document.getElementById('save').disabled=false;return;}
   await supabase.auth.signOut();
   form.hidden=true;show('Senha cadastrada. Sua conta está pronta para o login no aplicativo quando a integração for publicada.');
 });
}

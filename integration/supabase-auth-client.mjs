// Isolated Supabase authentication adapter for future JM Financeiro integration.
// Not wired to the existing APK. Never accepts service-role or database secrets.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
export function criarAutenticacaoJM({supabaseUrl,publishableKey}){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl||''))throw new Error('Projeto Supabase inválido');
  if(typeof publishableKey!=='string'||!publishableKey.startsWith('sb_publishable_'))throw new Error('Chave pública inválida');
  const client=createClient(supabaseUrl,publishableKey,{auth:{detectSessionInUrl:false,autoRefreshToken:true,persistSession:true}});
  return Object.freeze({
    async entrar(email,password){
      if(typeof email!=='string'||typeof password!=='string'||!email.trim()||!password)throw new Error('Informe e-mail e senha');
      const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});
      if(error||!data?.session)throw new Error('Não foi possível autenticar. Verifique as credenciais.');
      return {userId:data.user.id,email:data.user.email};
    },
    async obterToken(){
      const {data,error}=await client.auth.getSession();
      if(error||!data?.session?.access_token)throw new Error('Sessão não autenticada');
      return data.session.access_token;
    },
    async sair(){
      const {error}=await client.auth.signOut();
      if(error)throw new Error('Não foi possível encerrar a sessão');
    }
  });
}

import {criarAutenticacaoJM} from './supabase-auth-client.mjs';
const status=document.getElementById('status'),form=document.getElementById('form'),logout=document.getElementById('logout');
const show=s=>status.textContent=s;
try{
 const response=await fetch('./config.json',{cache:'no-store'});
 if(!response.ok)throw Error('Configuração indisponível');
 const cfg=await response.json();
 const auth=criarAutenticacaoJM({supabaseUrl:cfg.supabaseUrl,publishableKey:cfg.publishableKey});
 form.hidden=false;show('Informe seu e-mail e sua senha.');
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=document.getElementById('login');button.disabled=true;show('Verificando acesso…');
  try{await auth.entrar(document.getElementById('email').value,document.getElementById('password').value);document.getElementById('password').value='';form.hidden=true;logout.hidden=false;show('Login autenticado com sucesso. Nenhum dado financeiro foi acessado.');}
  catch{show('Não foi possível entrar. Confira e-mail e senha.');}
  finally{button.disabled=false;}
 });
 logout.addEventListener('click',async()=>{try{await auth.sair();logout.hidden=true;form.hidden=false;show('Sessão encerrada.');}catch{show('Não foi possível encerrar a sessão.');}});
}catch{show('Teste ainda não configurado.');}

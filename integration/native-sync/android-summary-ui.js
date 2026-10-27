/* JM Financeiro — resumo remoto somente leitura. Tokens ficam apenas na memória. */
(()=>{'use strict';
const API='https://jm-financeiro-db-private-test.onrender.com';
const $=id=>document.getElementById(id);
const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const panel=document.createElement('section');
panel.id='jm-sync-panel';panel.style.cssText='margin:16px 0;padding:16px;border:1px solid #b28b4a;border-radius:14px;background:#260d13;color:#f5e5c7;font:14px system-ui';
panel.innerHTML='<h2 style="margin:0 0 8px">Painel financeiro online · dados do servidor</h2><p id="jm-sync-status">Entre com sua conta para consultar os lançamentos online. Os dados deste aparelho não serão modificados.</p><form id="jm-sync-form"><input id="jm-sync-email" type="email" autocomplete="username" placeholder="E-mail" required style="width:100%;padding:10px;margin:5px 0"><input id="jm-sync-password" type="password" autocomplete="current-password" placeholder="Senha" required style="width:100%;padding:10px;margin:5px 0"><button type="submit" style="padding:10px">Consultar servidor</button></form><div id="jm-sync-values" aria-live="polite"></div><button type="button" id="jm-sync-refresh" hidden style="padding:10px;margin-top:8px">Atualizar valores</button><button type="button" id="jm-sync-exit" hidden style="padding:10px;margin:8px">Sair</button>';
const parent=$('v-painel');if(!parent)return;parent.insertBefore(panel,parent.querySelector('#premiumSummary')||parent.querySelector('#kpis')||parent.firstChild);
let token=null;
async function refresh(){
 if(!token)return;
 $('jm-sync-status').textContent='Consultando resumo autenticado…';
 try{
  const r=await fetch(API+'/v1/resumo',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(r.status===401){token=null;throw Error('Sessão expirada. Entre novamente.')}
  if(!r.ok)throw Error('Servidor indisponível (HTTP '+r.status+').');
  const d=await r.json();
  const a=[d.receitas_centavos,d.despesas_centavos,d.resultado_centavos];
  if(!a.every(Number.isSafeInteger)||a[2]!==a[0]-a[1])throw Error('Dados inconsistentes no servidor.');
  const values=$('jm-sync-values');values.replaceChildren();
  values.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px;margin:12px 0';
  for(const [label,c] of [['Receitas online',a[0]],['Despesas online',a[1]],['Resultado online',a[2]]]){
   const card=document.createElement('div');card.style.cssText='border:1px solid #b28b4a;border-radius:10px;padding:12px;background:#39151e';
   const heading=document.createElement('div');heading.textContent=label;heading.style.cssText='font-size:12px;opacity:.9';
   const amount=document.createElement('strong');amount.textContent=money(c);amount.style.cssText='display:block;font-size:20px;margin-top:5px;overflow-wrap:anywhere';
   card.append(heading,amount);values.append(card);
  }
  $('jm-sync-status').textContent='Resumo online atualizado. Valores totais do servidor, independentes do filtro de período e dos saldos locais.';
 }catch(e){$('jm-sync-status').textContent=e.message||'Falha de conexão.';if(!token){$('jm-sync-form').hidden=false;$('jm-sync-refresh').hidden=true;$('jm-sync-exit').hidden=true;}}
}
$('jm-sync-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
 try{
  $('jm-sync-status').textContent='Autenticando…';
  const cfgResp=await fetch(API+'/oauth/public-config',{cache:'no-store'});if(!cfgResp.ok)throw Error('Configuração de login indisponível.');
  const cfg=await cfgResp.json();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl)||!cfg.publishableKey)throw Error('Configuração inválida.');
  const r=await fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey},body:JSON.stringify({email:$('jm-sync-email').value.trim(),password:$('jm-sync-password').value})});
  $('jm-sync-password').value='';
  if(!r.ok)throw Error('Login não autorizado. Confira suas credenciais.');
  const d=await r.json();if(typeof d.access_token!=='string')throw Error('Resposta de login inválida.');
  token=d.access_token;$('jm-sync-form').hidden=true;$('jm-sync-refresh').hidden=false;$('jm-sync-exit').hidden=false;await refresh();
 }catch(err){$('jm-sync-status').textContent=err.message||'Não foi possível autenticar.';}finally{btn.disabled=false;}
});
$('jm-sync-refresh').addEventListener('click',refresh);
$('jm-sync-exit').addEventListener('click',()=>{token=null;$('jm-sync-values').textContent='';$('jm-sync-form').hidden=false;$('jm-sync-refresh').hidden=true;$('jm-sync-exit').hidden=true;$('jm-sync-status').textContent='Sessão encerrada.';});
})();
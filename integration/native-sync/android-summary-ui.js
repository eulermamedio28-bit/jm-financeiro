/* JM Financeiro — resumo remoto somente leitura. Tokens ficam apenas na memória. */
(()=>{'use strict';
const API='https://jm-financeiro-db-private-test.onrender.com';
const $=id=>document.getElementById(id);
const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const cents=v=>{const n=typeof v==='string'&&/^-?\d+$/.test(v)?Number(v):v;if(!Number.isSafeInteger(n))throw Error('Valor monetário inválido no servidor.');return n;};
const panel=document.createElement('section');
panel.id='jm-sync-panel';panel.style.cssText='margin:16px 0;padding:16px;border:1px solid #b28b4a;border-radius:14px;background:#260d13;color:#f5e5c7;font:14px system-ui';
panel.innerHTML='<h2 style="margin:0 0 8px">Ambiente de testes · dados do servidor</h2><p id="jm-sync-status">Entre com sua conta para consultar os lançamentos online. Os dados deste aparelho não serão modificados.</p><form id="jm-sync-form"><input id="jm-sync-email" type="email" autocomplete="username" placeholder="E-mail" required style="width:100%;padding:10px;margin:5px 0"><input id="jm-sync-password" type="password" autocomplete="current-password" placeholder="Senha" required style="width:100%;padding:10px;margin:5px 0"><button type="submit" style="padding:10px">Consultar servidor</button></form><div id="jm-sync-values" aria-live="polite"></div><button type="button" id="jm-sync-refresh" hidden style="padding:10px;margin-top:8px">Atualizar valores</button><button type="button" id="jm-sync-exit" hidden style="padding:10px;margin:8px">Sair</button>';
const parent=$('v-painel');if(!parent)return;parent.insertBefore(panel,parent.querySelector('#premiumSummary')||parent.querySelector('#kpis')||parent.firstChild);
let token=null;

const credit=document.createElement('section');
credit.id='jm-credit-card-panel';
credit.style.cssText='margin:14px 0;padding:14px;border:1px solid #b28b4a;border-radius:12px;background:#32121a;color:#f5e5c7';
credit.innerHTML='<h3 style="margin:0 0 8px">Cartões de crédito · compras a pagar</h3><p id="jm-credit-status">Entre na conta para consultar compras no cartão.</p><div id="jm-credit-list" aria-live="polite"></div>';
panel.insertAdjacentElement('afterend',credit);

const invoices=document.createElement('section');
invoices.id='jm-invoices-panel';
invoices.style.cssText='margin:14px 0;padding:14px;border:1px solid #b28b4a;border-radius:12px;background:#32121a;color:#f5e5c7';
const invoicesTitle=document.createElement('h3');invoicesTitle.textContent='Faturas por cartão e vencimento';invoicesTitle.style.margin='0 0 8px';
const invoicesStatus=document.createElement('p');invoicesStatus.id='jm-invoices-status';invoicesStatus.textContent='Entre na conta para consultar faturas.';
const invoicesList=document.createElement('div');invoicesList.id='jm-invoices-list';invoicesList.setAttribute('aria-live','polite');
invoices.append(invoicesTitle,invoicesStatus,invoicesList);
credit.insertAdjacentElement('afterend',invoices);

const balances=document.createElement('section');
balances.id='jm-balances-panel';
balances.style.cssText='margin:14px 0;padding:14px;border:1px solid #b28b4a;border-radius:12px;background:#32121a;color:#f5e5c7';
const balancesTitle=document.createElement('h3');balancesTitle.textContent='Saldos por conta · servidor';balancesTitle.style.margin='0 0 8px';
const balancesStatus=document.createElement('p');balancesStatus.textContent='Entre na conta para consultar saldos.';
const balancesList=document.createElement('div');balancesList.setAttribute('aria-live','polite');
balances.append(balancesTitle,balancesStatus,balancesList);
invoices.insertAdjacentElement('afterend',balances);
const accountForm=document.createElement('form');
accountForm.style.cssText='display:grid;gap:8px;margin:12px 0;max-width:100%';
const accountName=document.createElement('input');accountName.placeholder='Nome da conta (ex.: Conta teste)';accountName.required=true;accountName.maxLength=120;
const accountInitial=document.createElement('input');accountInitial.type='number';accountInitial.step='0.01';accountInitial.value='0';accountInitial.required=true;accountInitial.placeholder='Saldo inicial (R$)';
const accountSubmit=document.createElement('button');accountSubmit.type='submit';accountSubmit.textContent='Cadastrar conta de teste';
const accountFeedback=document.createElement('p');accountFeedback.setAttribute('aria-live','polite');
accountForm.append(accountName,accountInitial,accountSubmit,accountFeedback);
balances.append(accountForm);
function parseBRLCents(value){
 const raw=String(value).trim();
 if(!/^-?\\d+(?:\\.\\d{1,2})?$/.test(raw))throw Error('Informe um valor em reais com até duas casas decimais.');
 const [whole,fraction='']=raw.split('.');
 const negative=raw.startsWith('-');
 const result=(negative?-1n:1n)*(BigInt(negative?whole.slice(1):whole)*100n+BigInt(fraction.padEnd(2,'0')));
 if(result>BigInt(Number.MAX_SAFE_INTEGER)||result<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Valor muito alto.');
 return Number(result);
}
accountForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!token){accountFeedback.textContent='Entre na conta primeiro.';return;}
 accountSubmit.disabled=true;accountFeedback.textContent='Cadastrando…';
 try{
  const response=await fetch(API+'/v1/contas',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({nome:accountName.value.trim(),saldo_inicial_centavos:parseBRLCents(accountInitial.value)})});
  if(!response.ok)throw Error('Cadastro não concluído (HTTP '+response.status+').');
  accountFeedback.textContent='Conta cadastrada. Confira o saldo abaixo.';accountName.value='';accountInitial.value='0';
  await refreshBalances();
 }catch(error){accountFeedback.textContent=error.message||'Falha ao cadastrar conta.';}
 finally{accountSubmit.disabled=false;}
});
const transferForm=document.createElement('form');
transferForm.style.cssText='display:grid;gap:8px;margin:14px 0;max-width:100%';
const transferHeading=document.createElement('h4');transferHeading.textContent='Transferência interna entre contas';
const transferFrom=document.createElement('select'),transferTo=document.createElement('select');
const transferAmount=document.createElement('input');transferAmount.type='number';transferAmount.step='0.01';transferAmount.min='0.01';transferAmount.required=true;transferAmount.placeholder='Valor da transferência (R$)';
const transferDate=document.createElement('input');transferDate.type='date';transferDate.required=true;transferDate.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const transferButton=document.createElement('button');transferButton.type='submit';transferButton.textContent='Registrar transferência de teste';
const transferFeedback=document.createElement('p');transferFeedback.setAttribute('aria-live','polite');
const fromLabel=document.createElement('label');fromLabel.textContent='Conta de origem';fromLabel.append(transferFrom);
const toLabel=document.createElement('label');toLabel.textContent='Conta de destino';toLabel.append(transferTo);
const amountLabel=document.createElement('label');amountLabel.textContent='Valor (R$)';amountLabel.append(transferAmount);
const dateLabel=document.createElement('label');dateLabel.textContent='Data';dateLabel.append(transferDate);
transferForm.append(transferHeading,fromLabel,toLabel,amountLabel,dateLabel,transferButton,transferFeedback);
balances.append(transferForm);
function updateTransferOptions(accounts){
 for(const select of [transferFrom,transferTo]){select.replaceChildren();for(const account of accounts){
  const option=document.createElement('option');option.value=account.id;option.textContent=account.nome;select.append(option);
 }}
 transferTo.selectedIndex=accounts.length>1?1:0;
 transferButton.disabled=accounts.length<2;
 if(accounts.length<2)transferFeedback.textContent='Cadastre pelo menos duas contas para transferir.';
}
let pendingTransfer=null;
transferForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!token){transferFeedback.textContent='Entre na conta primeiro.';return;}
 if(!transferFrom.value||!transferTo.value||transferFrom.value===transferTo.value){transferFeedback.textContent='Selecione duas contas diferentes.';return;}
 let amount;try{amount=parseBRLCents(transferAmount.value);if(amount<=0)throw Error('O valor deve ser positivo.');}catch(error){transferFeedback.textContent=error.message;return;}
 transferButton.disabled=true;transferFeedback.textContent='Registrando transferência…';
 try{
  const signature=[transferFrom.value,transferTo.value,amount,transferDate.value].join('|');
  if(!pendingTransfer||pendingTransfer.signature!==signature)pendingTransfer={signature,id:crypto.randomUUID()};
  const requestId=pendingTransfer.id;
  const response=await fetch(API+'/v1/transferencias',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({client_request_id:requestId,origem_id:transferFrom.value,destino_id:transferTo.value,valor_centavos:amount,data:transferDate.value})});
  if(!response.ok)throw Error('Transferência não confirmada (HTTP '+response.status+'). Confira o histórico antes de repetir.');
  pendingTransfer=null;
  transferFeedback.textContent='Transferência registrada. O saldo consolidado não deve mudar.';
  await refreshBalances();
 }catch(error){transferFeedback.textContent=error.message||'Falha na transferência.';}
 finally{transferButton.disabled=false;}
});
async function refreshBalances(){
 if(!token){balancesList.replaceChildren();balancesStatus.textContent='Entre na conta para consultar saldos.';return;}
 balancesStatus.textContent='Consultando saldos…';
 try{
  const response=await fetch(API+'/v1/saldos',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error(response.status===401?'Sessão expirada. Entre novamente.':'Consulta de saldos indisponível (HTTP '+response.status+').');
  const data=await response.json();
  if(!Array.isArray(data.contas))throw Error('Resposta de saldos inválida.');
  balancesList.replaceChildren();
  updateTransferOptions(data.contas);
  for(const account of data.contas){
   const initial=cents(account.saldo_inicial_centavos),movement=cents(account.movimentos_centavos),incoming=cents(account.entradas_transferencia_centavos),outgoing=cents(account.saidas_transferencia_centavos),balance=cents(account.saldo_centavos);
   if(initial+movement+incoming-outgoing!==balance)throw Error('Saldo inconsistente para '+String(account.nome||'conta'));
   const line=document.createElement('div');line.style.cssText='padding:10px 0;border-top:1px solid #72505a;overflow-wrap:anywhere';
   const heading=document.createElement('strong');heading.textContent=String(account.nome||'Conta')+' · '+money(balance);
   const detail=document.createElement('div');detail.textContent='Inicial: '+money(initial)+' · Movimentos: '+money(movement)+' · Transferências recebidas: '+money(incoming)+' · Enviadas: '+money(outgoing);
   line.append(heading,detail);balancesList.append(line);
  }
  const unallocated=cents(data.nao_alocado_centavos);
  const sum=data.contas.reduce((n,a)=>n+cents(a.saldo_centavos),0);
  if(!Number.isSafeInteger(sum)||sum!==cents(data.saldo_contas_cadastradas_centavos))throw Error('Total de contas inconsistente.');
  if(data.conciliado){
   const consolidated=cents(data.saldo_consolidado_centavos);
   if(consolidated!==sum)throw Error('Consolidado inconsistente.');
   balancesStatus.textContent='Saldo consolidado conciliado: '+money(consolidated);
  }else{
   if(data.saldo_consolidado_centavos!==null)throw Error('Saldo não conciliado apresentado como definitivo.');
   balancesStatus.textContent='Saldo das contas cadastradas: '+money(sum)+' · Saldo consolidado pendente de conciliação. '+String(data.quantidade_nao_alocados)+' lançamento(s) sem conta cadastrada (resultado: '+money(unallocated)+').';
  }
 }catch(error){balancesList.replaceChildren();balancesStatus.textContent=error.message||'Falha ao consultar saldos.';}
}

const paymentBox=document.createElement('section');
paymentBox.id='jm-payment-panel';
paymentBox.style.cssText='margin:14px 0;padding:14px;border:1px solid #b28b4a;border-radius:12px;background:#32121a;color:#f5e5c7';
const paymentTitle=document.createElement('h3');paymentTitle.textContent='Registrar pagamento integral de fatura';paymentTitle.style.margin='0 0 8px';
const paymentHelp=document.createElement('p');paymentHelp.textContent='Ambiente de testes. Registrar pagamento não transfere dinheiro, mas lança uma despesa e baixa a fatura no servidor.';
const paymentForm=document.createElement('form');paymentForm.id='jm-payment-form';
paymentForm.style.cssText='display:grid;gap:10px';
function paymentField(label,type,name){
 const wrapper=document.createElement('label');wrapper.textContent=label;wrapper.style.cssText='display:grid;gap:4px';
 const input=document.createElement('input');input.name=name;input.type=type;input.required=true;input.style.cssText='box-sizing:border-box;width:100%;min-width:0;padding:10px;border-radius:8px';
 wrapper.append(input);return {wrapper,input};
}
const cardField=paymentField('Cartão','text','cartao'),dueField=paymentField('Vencimento','date','vencimento'),amountField=paymentField('Valor total (R$)','number','valor'),accountField=paymentField('Conta de saída','text','conta'),dateField=paymentField('Data do pagamento','date','data_pagamento');
amountField.input.min='0.01';amountField.input.step='0.01';dateField.input.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const paymentButton=document.createElement('button');paymentButton.type='submit';paymentButton.textContent='Registrar pagamento de teste';paymentButton.disabled=true;paymentButton.style.cssText='padding:12px;border-radius:8px';
const paymentStatus=document.createElement('p');paymentStatus.id='jm-payment-status';paymentStatus.textContent='Aguardando liberação da função no servidor.';
paymentForm.append(cardField.wrapper,dueField.wrapper,amountField.wrapper,accountField.wrapper,dateField.wrapper,paymentButton);
paymentBox.append(paymentTitle,paymentHelp,paymentForm,paymentStatus);
invoices.insertAdjacentElement('afterend',paymentBox);
// Mantenha os detalhes operacionais acessíveis sem ocupar a tela inicial.
// Nenhum formulário, evento ou dado é removido: apenas agrupamos a apresentação.
const details=document.createElement('details');
details.id='jm-financial-details';
details.style.cssText='margin:12px 0;border:1px solid #b28b4a;border-radius:12px;padding:10px;background:#260d13;color:#f5e5c7';
const detailsHeading=document.createElement('summary');
detailsHeading.textContent='Contas, cartões, faturas e transferências';
detailsHeading.style.cssText='cursor:pointer;font-weight:700;padding:8px;min-height:32px';
details.append(detailsHeading);
panel.insertAdjacentElement('afterend',details);
for(const section of [balances,credit,invoices,paymentBox])details.append(section);
let invoicePaymentsAvailable=false;
let paymentRequestId=null,paymentRequestSignature=null;
function setPaymentAvailability(enabled){
 invoicePaymentsAvailable=enabled;
 paymentButton.disabled=!enabled||!token;
 paymentStatus.textContent=enabled?'Pagamento de teste habilitado. Confira os dados antes de confirmar.':'Pagamento bloqueado até a liberação do servidor.';
}
async function refreshPaymentAvailability(){
 setPaymentAvailability(false);
 if(!token)return;
 try{
  const response=await fetch(API+'/v1/pagamentos-fatura',{method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(response.status===403){setPaymentAvailability(false);return;}
  // A rota aceita apenas POST quando habilitada, sem registrar movimentação.
  if(response.status===405){setPaymentAvailability(true);return;}
  if(response.status===401){paymentStatus.textContent='Sessão expirada. Entre novamente.';return;}
 }catch{}
}
paymentForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!token||!invoicePaymentsAvailable)return;
 const valor=amountField.input.value;
 if(!/^\d+(?:\.\d{1,2})?$/.test(valor)){paymentStatus.textContent='Informe um valor válido com até duas casas decimais.';return;}
 const centsValue=Math.round(Number(valor)*100);
 if(!Number.isSafeInteger(centsValue)||centsValue<=0){paymentStatus.textContent='Valor inválido.';return;}
 const data={cartao:cardField.input.value.trim(),vencimento:dueField.input.value,data_pagamento:dateField.input.value,valor_centavos:centsValue,conta:accountField.input.value.trim()};
 const signature=JSON.stringify(data);
 if(signature!==paymentRequestSignature){paymentRequestSignature=signature;paymentRequestId=crypto.randomUUID();}
 const confirmation=window.confirm('Registrar pagamento de teste de '+money(centsValue)+' no cartão '+data.cartao+'? A fatura será baixada e uma despesa será registrada.');
 if(!confirmation)return;
 paymentButton.disabled=true;paymentStatus.textContent='Registrando pagamento…';
 try{
  const response=await fetch(API+'/v1/pagamentos-fatura',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...data,client_request_id:paymentRequestId})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Pagamento recusado (HTTP '+response.status+').');
  paymentStatus.textContent=result.created?'Pagamento de teste registrado.':'Pagamento já registrado anteriormente, sem duplicidade.';
  await refresh(); 
 }catch(error){paymentStatus.textContent=error.message||'Falha no pagamento.';}
 finally{paymentButton.disabled=!invoicePaymentsAvailable||!token;}
});

async function refreshInvoices(){
 const status=$('jm-invoices-status'),list=$('jm-invoices-list');
 if(!token){list.replaceChildren();status.textContent='Entre na conta para consultar faturas.';return;}
 status.textContent='Consultando faturas…';
 try{
  const response=await fetch(API+'/v1/faturas-cartao',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(response.status===401)throw Error('Sessão expirada. Entre novamente.');
  if(!response.ok)throw Error('Falha ao consultar faturas (HTTP '+response.status+').');
  const data=await response.json();
  if(!Array.isArray(data.faturas))throw Error('Resposta de faturas inválida.');
  list.replaceChildren();let pendente=0;
  for(const item of data.faturas){
   const total=cents(item.total_centavos),open=cents(item.pendente_centavos);
   if(total<0||open<0||open>total)throw Error('Fatura inconsistente no servidor.');
   pendente+=open;if(!Number.isSafeInteger(pendente))throw Error('Total de faturas inválido.');
   const card=document.createElement('div');card.style.cssText='padding:10px 0;border-top:1px solid #72505a;overflow-wrap:anywhere';
   const title=document.createElement('strong');title.textContent=String(item.cartao||'Cartão')+' · '+money(open)+' pendente';
   const detail=document.createElement('div');
   const due=typeof item.vencimento==='string'&&/^\d{4}-\d{2}-\d{2}/.test(item.vencimento)?item.vencimento.slice(0,10).split('-').reverse().join('/'):'não informado';
   detail.textContent='Vencimento: '+due+' · Total: '+money(total)+' · '+(open===0?'Quitada':'A pagar');
   card.append(title,detail);
   if(open===total&&open>0&&/^\d{4}-\d{2}-\d{2}$/.test(String(item.vencimento||''))){
    const choose=document.createElement('button');
    choose.type='button';choose.textContent='Selecionar para pagamento';
    choose.style.cssText='display:block;margin-top:8px;padding:9px;border-radius:8px';
    choose.addEventListener('click',()=>{
     cardField.input.value=String(item.cartao||'');
     dueField.input.value=item.vencimento;
     amountField.input.value=(open/100).toFixed(2);
     paymentStatus.textContent='Fatura selecionada. Informe a conta e confirme a data antes de registrar.';
     paymentBox.scrollIntoView({behavior:'smooth',block:'center'});
    });
    card.append(choose);
   }
   list.append(card);
  }
  status.textContent=data.faturas.length+' fatura(s) · Pendente: '+money(pendente)+'. Consulta somente leitura.';
 }catch(error){list.replaceChildren();status.textContent=error.message||'Não foi possível consultar faturas.';}
}

async function refreshCards(){
 const status=$('jm-credit-status'),list=$('jm-credit-list');
 if(!token){list.replaceChildren();status.textContent='Entre na conta para consultar compras no cartão.';return;}
 status.textContent='Consultando compras no cartão…';
 try{
  const r=await fetch(API+'/v1/compras-cartao',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(!r.ok)throw Error(r.status===401?'Sessão expirada. Entre novamente.':'Não foi possível consultar cartões (HTTP '+r.status+').');
  const data=await r.json();if(!Array.isArray(data.compras))throw Error('Resposta de cartões inválida.');
  list.replaceChildren();
  if(!data.compras.length){status.textContent='Nenhuma compra no cartão registrada.';return;}
  let total=0;
  for(const item of data.compras){
   const value=cents(item.valor_centavos);if(value<0)throw Error('Valor de cartão inválido.');
   const paid=!!item.paga_em;if(!paid)total+=value;
   const card=document.createElement('div');card.style.cssText='padding:10px 0;border-top:1px solid #72505a;overflow-wrap:anywhere';
   const heading=document.createElement('strong');heading.textContent=(item.cartao||'Cartão')+' · '+money(value);
   const detail=document.createElement('div');detail.textContent=(item.descricao||'Compra')+' · Vencimento: '+(typeof item.vencimento==='string'?item.vencimento.slice(0,10).split('-').reverse().join('/'):'não informado')+' · '+(paid?'Pago':'A pagar');
   card.append(heading,detail);list.append(card);
  }
  status.textContent=data.compras.length+' compra(s) · Total pendente: '+money(total)+'. Não altera o saldo bancário.';
 }catch(e){list.replaceChildren();status.textContent=e.message||'Falha ao consultar cartões.';}
}
async function refresh(){
 if(!token)return;
 $('jm-sync-status').textContent='Consultando resumo autenticado…';
 try{
  const r=await fetch(API+'/v1/resumo',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});
  if(r.status===401){token=null;throw Error('Sessão expirada. Entre novamente.')}
  if(!r.ok)throw Error('Servidor indisponível (HTTP '+r.status+').');
  const d=await r.json();
  const a=[cents(d.receitas_centavos),cents(d.despesas_centavos),cents(d.resultado_centavos)];
  if(!a.every(Number.isSafeInteger)||a[2]!==a[0]-a[1])throw Error('Dados inconsistentes no servidor.');
  const values=$('jm-sync-values');values.replaceChildren();
  values.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:10px;margin:12px 0';
  for(const [label,c] of [['Receitas de teste',a[0]],['Despesas de teste',a[1]],['Resultado de teste',a[2]]]){
   const card=document.createElement('div');card.style.cssText='border:1px solid #b28b4a;border-radius:10px;padding:12px;background:#39151e';
   const heading=document.createElement('div');heading.textContent=label;heading.style.cssText='font-size:12px;opacity:.9';
   const amount=document.createElement('strong');amount.textContent=money(c);amount.style.cssText='display:block;font-size:20px;margin-top:5px;overflow-wrap:anywhere';
   card.append(heading,amount);values.append(card);
  }
  await refreshCards();
  await refreshInvoices();
  await refreshBalances();
  await refreshPaymentAvailability();
  $('jm-sync-status').textContent='Dados de teste do servidor atualizados. Estes totais não usam o mês selecionado e não devem ser somados ao resultado local. Ainda não há conciliação entre as duas bases.';
 }catch(e){$('jm-sync-status').textContent=e.message||'Falha de conexão.';if(!token){$('jm-sync-form').hidden=false;$('jm-sync-refresh').hidden=true;$('jm-sync-exit').hidden=true;}}
}
// Organiza as operações avançadas sem removê-las nem alterar os dados.
// Por padrão, o usuário vê apenas o resumo; detalhes abrem sob demanda.
for (const [section, title] of [
 [credit, 'Compras no cartão'],
 [invoices, 'Faturas e pagamentos'],
 [balances, 'Contas e transferências']
]) {
 const details=document.createElement('details');
 details.className='jm-finance-detail';
 details.style.cssText='margin:10px 0;border:1px solid #b28b4a;border-radius:12px;background:#260d13;color:#f5e5c7;overflow:hidden';
 const summary=document.createElement('summary');
 summary.textContent=title;
 summary.style.cssText='cursor:pointer;padding:14px 16px;font-weight:700;list-style-position:inside';
 section.parentNode.insertBefore(details,section);
 details.append(summary,section);
 section.style.margin='0';
 section.style.border='0';
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
$('jm-sync-exit').addEventListener('click',()=>{token=null;$('jm-sync-values').textContent='';$('jm-sync-form').hidden=false;$('jm-sync-refresh').hidden=true;$('jm-sync-exit').hidden=true;$('jm-sync-status').textContent='Sessão encerrada.';refreshCards();refreshInvoices();refreshBalances();setPaymentAvailability(false);paymentRequestId=null;paymentRequestSignature=null;});
})();
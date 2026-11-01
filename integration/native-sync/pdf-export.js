// Read-only report: consumes the same period-filtered view as the dashboard.
const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
const date=s=>String(s).slice(0,10).split('-').reverse().join('/');
const clean=s=>String(s??'').normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/\r\n?/g,'\n');
export function createReportPdf(view,{PDF,regularFont,boldFont,establishment,environment,generatedAt=new Date()}={}){
 if(!PDF||!regularFont||!boldFont)throw Error('Fonte indisponível');
 const entries=[...view.lancamentos].filter(e=>!e.excluido_em&&e.data.slice(0,10)>=view.from&&e.data.slice(0,10)<=view.to).sort((a,b)=>a.data.localeCompare(b.data));
 let revenue=0,expense=0;for(const e of entries){const c=Number(e.valor_centavos);if(!Number.isSafeInteger(c)||c<=0||!['receita','despesa'].includes(e.tipo))throw Error('Valor inválido');if(e.tipo==='receita')revenue+=c;else expense+=c;}
 if(![revenue,expense,revenue-expense].every(Number.isSafeInteger)||revenue!==view.receitas||expense!==view.despesas||revenue-expense!==view.resultado)throw Error('Resumo divergente');
 const doc=new PDF({orientation:'landscape',unit:'pt',format:'a4',compress:true,putOnlyUsedFonts:true});
 doc.addFileToVFS('Inter-Regular.ttf',regularFont);doc.addFont('Inter-Regular.ttf','Inter','normal');doc.addFileToVFS('Inter-Bold.ttf',boldFont);doc.addFont('Inter-Bold.ttf','Inter','bold');
 doc.setProperties({title:'ELM Gestão - Relatório de lançamentos',subject:date(view.from)+' a '+date(view.to),author:clean(establishment||'ELM Gestão'),creator:'ELM Gestão'});doc.setCreationDate(generatedAt);
 const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=36,end=H-45,width=W-2*M;
 const wine='#6b233c',ink='#2b1a21',muted='#655b60';let y=0;
 const font=(size=9,bold=false,color=ink)=>{doc.setFont('Inter',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color);};
 const text=(s,x,yy,opts)=>doc.text(Array.isArray(s)?s.map(clean):clean(s),x,yy,opts);
 const env=environment==='demo'?'DEMONSTRAÇÃO - DADOS FICTÍCIOS':environment==='real'?'Dados do estabelecimento':'Ambiente não identificado - confira antes de compartilhar';
 function header(first){font(18,true,wine);text('ELM Gestão',M,35);font(10,true);const title=doc.splitTextToSize(clean(establishment||'Estabelecimento não informado'),width-300).slice(0,2);text(title,M,54);font(9,false,muted);text(env,M,54+title.length*12);text('Período: '+date(view.from)+' a '+date(view.to),W-M,35,{align:'right'});text('Emitido em '+generatedAt.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),W-M,51,{align:'right'});y=54+title.length*12+23;
  if(first){font(14,true);text('Relatório de lançamentos',M,y);y+=15;const box=y;doc.setFillColor('#f7f5f6');doc.roundedRect(M,box,width,52,5,5,'F');for(const [i,label,value,color]of [[0,'Receitas',revenue,'#227345'],[1,'Despesas',expense,'#b12b3a'],[2,'Resultado do período',revenue-expense,revenue>=expense?'#227345':'#b12b3a']]){font(9,true,muted);text(label,M+12+i*width/3,box+17);font(16,true,color);text(money(value),M+12+i*width/3,box+39);}y=box+69;font(8,false,muted);text('Transferências internas não entram no resultado. Compras no cartão entram como saída no pagamento da fatura.',M,y);y+=13;text('Relatório gerencial de entradas e saídas; não substitui documentos fiscais nem a escrituração contábil.',M,y);y+=20;
  }
 }
 const widths=[64,58,225,125,178,width-650],xs=[M];for(let i=0;i<widths.length;i++)xs.push(xs[i]+widths[i]);
 function tableHeader(){doc.setFillColor(wine);doc.rect(M,y,width,24,'F');font(9,true,'#ffffff');['Data','Tipo','Descrição','Categoria','Conta','Valor'].forEach((v,i)=>text(v,i===5?W-M-7:xs[i]+7,y+16,i===5?{align:'right'}:undefined));y+=24;}
 function nextPage(){doc.addPage();header(false);tableHeader();}
 header(true);tableHeader();
 if(!entries.length){font(10,false,muted);text('Nenhum lançamento no período selecionado.',M+7,y+26);}
 for(let n=0;n<entries.length;n++){
  const e=entries[n];font(9);const vals=[date(e.data),e.tipo==='receita'?'Receita':'Despesa',e.descricao||'Sem descrição',e.categoria||'Sem categoria',e.conta||'Sem conta vinculada',money(Number(e.valor_centavos))];const lines=vals.map((v,i)=>doc.splitTextToSize(clean(v),widths[i]-14));let count=Math.max(...lines.map(a=>a.length));const freshHeight=H-45-125;
  if(count*12+14<=freshHeight&&y+count*12+14>end)nextPage();
  let offset=0;while(offset<count){if(end-y<26)nextPage();const take=Math.min(count-offset,Math.floor((end-y-14)/12));const height=take*12+14;if(n%2===0){doc.setFillColor('#f7f5f6');doc.rect(M,y,width,height,'F');}for(let i=0;i<lines.length;i++){font(9,i===5,i===5?(e.tipo==='receita'?'#227345':'#b12b3a'):ink);const part=lines[i].slice(offset,offset+take);if(part.length)text(part,i===5?W-M-7:xs[i]+7,y+16,i===5?{align:'right',lineHeightFactor:12/9}:{lineHeightFactor:12/9});}y+=height;doc.setDrawColor('#e7dfe3');doc.line(M,y,W-M,y);offset+=take;if(offset<count)nextPage();}
 }
 const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor('#e7dfe3');doc.line(M,H-31,W-M,H-31);font(8,false,muted);text(entries.length+' lançamento(s) ativos no período',M,H-17);text('Página '+p+' de '+pages,W-M,H-17,{align:'right'});}
 return new Uint8Array(doc.output('arraybuffer'));
}
export function bytesBase64(bytes){let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(result);}
let loading;
export async function reportPdf(view,options){
 if(!loading)loading=(async()=>{if(!globalThis.jspdf){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='vendor/jspdf.umd.min.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('PDF indisponível'));};document.head.append(s);});}const fonts=await Promise.all(['400','700'].map(async w=>{const r=await fetch('fonts/inter-pdf-'+w+'.ttf');if(!r.ok)throw Error('Fonte indisponível');return bytesBase64(new Uint8Array(await r.arrayBuffer()));}));return {PDF:globalThis.jspdf.jsPDF,regularFont:fonts[0],boldFont:fonts[1]};})().catch(e=>{loading=null;throw e;});
 return createReportPdf(view,{...await loading,...options});
}

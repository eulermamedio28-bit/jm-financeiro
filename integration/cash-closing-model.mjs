export const FORMS=['dinheiro','pix','debito','credito','ifood'];
export const LABELS={dinheiro:'Dinheiro',pix:'Pix',debito:'Débito',credito:'Crédito',ifood:'iFood'};
const cents=x=>Number.isSafeInteger(x)&&x>=0&&x<=100000000000;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
export function normalizeClosing(v){
 if(!v||!date(v.data)||!Array.isArray(v.formas)||v.formas.length!==5||new Set(v.formas.map(f=>f?.forma)).size!==5||v.formas.some(f=>!f||typeof f!=='object'||Object.keys(f).some(k=>!['forma','bruto_centavos','taxa_centavos'].includes(k))||!FORMS.includes(f.forma)||!cents(f.bruto_centavos)||!cents(f.taxa_centavos)||f.taxa_centavos>f.bruto_centavos||(f.forma==='dinheiro'&&f.taxa_centavos!==0))||['abertura_centavos','outras_entradas_centavos','saidas_centavos','contado_centavos'].some(k=>!cents(v[k])))throw Error('invalid_closing');
 return {data:v.data,formas:FORMS.map(forma=>({...v.formas.find(f=>f.forma===forma)})),abertura_centavos:v.abertura_centavos,outras_entradas_centavos:v.outras_entradas_centavos,saidas_centavos:v.saidas_centavos,contado_centavos:v.contado_centavos};
}
export function closingSummary(closure,receipts=[]){
 const forms=closure.formas.map(f=>{const recebido=receipts.filter(r=>!r.estornado_em&&r.fechamento_id===closure.id&&r.forma===f.forma).reduce((n,r)=>n+Number(r.valor_centavos),0);return {...f,liquido_centavos:f.bruto_centavos-f.taxa_centavos,recebido_centavos:recebido,pendente_centavos:f.bruto_centavos-f.taxa_centavos-recebido};});
 const sum=k=>forms.reduce((n,f)=>n+Number(f[k]),0),esperado=Number(closure.abertura_centavos)+Number(closure.outras_entradas_centavos)+Number(forms.find(f=>f.forma==='dinheiro').bruto_centavos)-Number(closure.saidas_centavos);
 return {formas:forms,bruto:sum('bruto_centavos'),taxas:sum('taxa_centavos'),liquido:sum('liquido_centavos'),recebido:sum('recebido_centavos'),pendente:sum('pendente_centavos'),esperado,diferenca:Number(closure.contado_centavos)-esperado};
}

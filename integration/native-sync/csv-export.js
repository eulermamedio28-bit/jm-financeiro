// Export only the already filtered, authenticated view. Text fields cannot become Excel formulas.
export function csvEntries(entries){
 const escape=(value,text=false)=>{let s=String(value??'');if(text&&/^[\s\uFEFF]*[=+@\-]/u.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const rows=[['Data','Tipo','Descrição','Categoria','Conta','Valor (R$)'].map(v=>escape(v))];
 for(const entry of [...entries].sort((a,b)=>a.data.localeCompare(b.data))){
  const amount=Number(entry.valor_centavos);if(!Number.isSafeInteger(amount))throw Error('Valor inválido para exportação');
  rows.push([escape(entry.data.slice(0,10).split('-').reverse().join('/')),escape(entry.tipo==='receita'?'Receita':'Despesa'),escape(entry.descricao,true),escape(entry.categoria,true),escape(entry.conta,true),escape((amount/100).toFixed(2).replace('.',','))]);
 }
 return '\uFEFF'+rows.map(r=>r.join(';')).join('\r\n');
}

import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {jsPDF} from 'jspdf';
import {createReportPdf} from '../integration/native-sync/pdf-export.js';
import {dashboard} from '../integration/financial-dashboard.mjs';
const options={PDF:jsPDF,regularFont:readFileSync('fonts/inter-pdf-400.ttf').toString('base64'),boldFont:readFileSync('fonts/inter-pdf-700.ttf').toString('base64'),establishment:'Restaurante de demonstração',environment:'demo',generatedAt:new Date('2026-11-01T04:00:00Z')};
const entries=[{data:'2026-10-31',tipo:'receita',descricao:'Venda de marmitas',categoria:'Vendas',conta:'Banco demonstração',valor_centavos:10000},{data:'2026-10-31',tipo:'despesa',descricao:'Embalagens para retirada',categoria:'Embalagens',conta:'Caixa demonstração',valor_centavos:2000},{data:'2026-10-31',tipo:'despesa',descricao:'Pagamento da fatura do cartão',categoria:'Pagamento de fatura de cartão',conta:'Caixa demonstração',valor_centavos:5000}];
mkdirSync('test-results',{recursive:true});
for(const [name,rows]of [['pdf-example',entries],['pdf-empty',[]],['pdf-long',Array.from({length:90},(_,i)=>({...entries[i%3],descricao:'Açúcar, óleo, café e embalagens: descrição longa para conferir quebra de linha. '.repeat(i===0?60:4)}))]])writeFileSync('test-results/'+name+'.pdf',createReportPdf(dashboard({lancamentos:rows},'2026-10-01','2026-10-31'),options));
console.log('PDF previews generated: example, empty and multi-page stress case.');

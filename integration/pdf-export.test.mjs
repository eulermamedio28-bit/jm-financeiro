import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jsPDF} from 'jspdf';
import {createReportPdf} from './native-sync/pdf-export.js';
import {dashboard} from './financial-dashboard.mjs';
const options={PDF:jsPDF,regularFont:readFileSync('fonts/inter-pdf-400.ttf').toString('base64'),boldFont:readFileSync('fonts/inter-pdf-700.ttf').toString('base64'),establishment:'JM Restaurante',environment:'demo',generatedAt:new Date('2026-11-01T04:00:00Z')};
test('PDF exports the filtered financial view, rejects divergent totals and produces a real document',()=>{
 const entries=[{data:'2026-10-31',tipo:'receita',descricao:'Venda de marmitas',valor_centavos:10000},{data:'2026-10-31',tipo:'despesa',descricao:'Óleo e embalagens',categoria:'Alimentação',conta:'Caixa',valor_centavos:2000},{data:'2026-09-30',tipo:'receita',descricao:'Fora do período',valor_centavos:99999}];
 const view=dashboard({lancamentos:entries},'2026-10-01','2026-10-31');const bytes=createReportPdf(view,options);assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>10000);assert.throws(()=>createReportPdf({...view,receitas:1},options),/Resumo divergente/);
 assert.throws(()=>createReportPdf({...view,lancamentos:[{...entries[0],valor_centavos:NaN}]},options),/Valor inválido/);
});
test('PDF handles empty periods and many pages of long descriptions',()=>{
 const view=dashboard({lancamentos:[]},'2026-10-01','2026-10-31');assert.ok(createReportPdf(view,options).length>10000);
 const entries=Array.from({length:120},(_,i)=>({data:'2026-10-31',tipo:'despesa',descricao:'Descrição longa com acentos: açúcar, óleo, café. '.repeat(i===0?80:6),categoria:'Embalagens e matéria-prima',conta:'Conta do restaurante',valor_centavos:12345}));
 const CheckedPDF=function(settings){const doc=new jsPDF(settings),original=doc.text;doc.text=function(value,x,y,settings){if(y>100&&(Math.abs(x-165)<0.1||Math.abs(x-390)<0.1)){const limit=Math.abs(x-165)<0.1?211:111;for(const line of Array.isArray(value)?value:[value])assert.ok(doc.getTextWidth(line)<=limit+0.1,'Text must fit its table column');}return original.call(this,value,x,y,settings);};return doc;};const bytes=createReportPdf(dashboard({lancamentos:entries},view.from,view.to),{...options,PDF:CheckedPDF});assert.ok(bytes.length>15000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {csvEntries} from './native-sync/csv-export.js';
test('CSV keeps cents, dates, accents, BOM, quotes and neutralizes spreadsheet formulas',()=>{
 const text=csvEntries([{data:'2026-10-31',tipo:'despesa',descricao:' =HYPERLINK("x");\nóleo',categoria:'@SUM(1)',conta:'-1+2',valor_centavos:12345}]);
 assert.ok(text.startsWith('\uFEFF'));assert.match(text,/31\/10\/2026/);assert.match(text,/123,45/);assert.match(text,/"' =HYPERLINK\(""x""\);\nóleo"/);assert.match(text,/"'@SUM\(1\)"/);assert.match(text,/"'-1\+2"/);
 assert.throws(()=>csvEntries([{data:'2026-10-31',valor_centavos:'no'}]),/Valor inválido/);
});

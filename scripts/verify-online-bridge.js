// Evita regressão: o Android não deve mostrar dois painéis financeiros.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('www/index.html', 'utf8');
assert.doesNotMatch(html, /id="jm-online-panel-link"/, 'Atalho duplicado para painel externo');
assert.match(html, /src="android-summary-ui\\.js"/, 'Resumo autenticado ausente');
assert.match(html, /<\\/body>/i, 'HTML principal inválido');
console.log('Sem painel externo duplicado; resumo autenticado presente no Android.');

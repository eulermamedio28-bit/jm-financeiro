// Teste sem rede e sem dados financeiros reais.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('www/index.html', 'utf8');
assert.match(html, /id="jm-online-panel-link"/, 'Ponte online ausente');
assert.match(html, /https:\/\/jm-financeiro-ativacao-teste\.onrender\.com\/ledger\.html/, 'Destino do painel incorreto');
assert.equal((html.match(/id="jm-online-panel-link"/g) || []).length, 1, 'Link duplicado');
assert.match(html, /<\/body>/i, 'HTML principal inválido');
console.log('Ponte do painel online presente no build Android.');

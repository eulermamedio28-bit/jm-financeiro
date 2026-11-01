const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('www/cloud-app.js','utf8');
assert.match(js,/\/v1\/painel/);assert.match(js,/Authorization:'Bearer '/);
assert.doesNotMatch(js,/localStorage.setItem\(['"]jm_(receitas|despesas|contas|movs)_v1/);
assert.doesNotMatch(js,/localStorage.setItem\([^\n]*(access_token|password)/);
console.log('Cloud source, authenticated requests and preservation of legacy storage checked.');

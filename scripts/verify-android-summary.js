const fs=require('node:fs');const assert=require('node:assert/strict');const html=fs.readFileSync('www/index.html','utf8');const js=fs.readFileSync('www/android-summary-ui.js','utf8');assert.match(html,/src="android-summary-ui\.js"/);assert.equal((html.match(/src="android-summary-ui\.js"/g)||[]).length,1);assert.match(html,/id="v-painel"/);assert.match(js,/\/v1\/resumo/);assert.match(js,/Authorization:'Bearer '/);assert.match(js,/Number\.isSafeInteger/);assert.doesNotMatch(js,/localStorage|sessionStorage/);assert.match(js,/className='jm-finance-detail'/, 'Seções financeiras recolhíveis ausentes');
for (const title of ['Compras no cartão','Faturas e pagamentos','Contas e transferências']) {
 assert.ok(js.includes(title), 'Seção ausente: '+title);
}
console.log('Android summary module embedded, grouped and isolated.');

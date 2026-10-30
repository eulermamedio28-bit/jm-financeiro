const fs=require('node:fs');const assert=require('node:assert/strict');const html=fs.readFileSync('www/index.html','utf8');const js=fs.readFileSync('www/android-summary-ui.js','utf8');assert.match(html,/src="android-summary-ui\.js"/);assert.equal((html.match(/src="android-summary-ui\.js"/g)||[]).length,1);assert.match(html,/id="v-painel"/);assert.match(js,/\/v1\/resumo/);assert.match(js,/Authorization:'Bearer '/);assert.match(js,/Number\.isSafeInteger/);assert.doesNotMatch(js,/localStorage|sessionStorage/);assert.ok(js.includes("testSummary.id='jm-server-test-summary'"));
assert.ok(js.includes('testSummary.append(testHeading,panel)'));
assert.ok(js.includes('testSummary.append(details)'), 'Operações remotas devem ficar dentro do painel de testes');
assert.ok(js.includes('for(const section of [balances,credit,invoices,paymentBox])details.append(section)'), 'Nenhuma operação remota deve ficar solta');
console.log('Android summary module embedded, grouped and isolated.');

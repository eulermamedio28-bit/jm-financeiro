const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{const p=path.join(process.cwd(),'www',req.url==='/'?'index.html':req.url);if(!p.startsWith(path.join(process.cwd(),'www')))return res.end();try{res.setHeader('Content-Type',p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript':p.endsWith('.html')?'text/html':'image/png');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const db={contas:[{id:'a',nome:'Caixa',saldo_inicial_centavos:'10000'},{id:'b',nome:'Banco',saldo_inicial_centavos:'0'}],lancamentos:[],transferencias:[],compras:[],invoicePaymentsEnabled:true};
 let offline=false,writeIds=[],accepted=new Set(),serverHits=0;
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.route('https://jm-financeiro-db-private-test.onrender.com/**',async route=>{const u=new URL(route.request().url()),body=route.request().postDataJSON();serverHits++;if(offline&&u.pathname!=='/oauth/public-config')return route.abort('failed');if(u.pathname==='/oauth/public-config')return route.fulfill({json:{supabaseUrl:'https://test.supabase.co',publishableKey:'public'}});if(u.pathname==='/v1/painel')return route.fulfill({json:db});
 if(u.pathname==='/v1/lancamentos'){writeIds.push(body.client_request_id);if(!accepted.has(body.client_request_id)){accepted.add(body.client_request_id);db.lancamentos.push({...body,id:body.client_request_id,conta:'Caixa'});}return route.fulfill({json:{created:true}});}
 if(u.pathname==='/v1/transferencias'){db.transferencias.push(body);return route.fulfill({json:{created:true}});}
 if(u.pathname==='/v1/contas'){db.contas.push({...body,id:'c'});return route.fulfill({json:{conta:body}});}
 return route.fulfill({json:{}});});
 await page.route('https://test.supabase.co/**',r=>r.fulfill({json:{access_token:'test-token',user:{id:'test-user'}}}));
 const url='http://127.0.0.1:'+server.address().port;
 await page.goto(url);await page.evaluate(()=>localStorage.setItem('jm_receitas_v1','[{"id":1,"valor":999}]'));
 assert.equal(serverHits,0,'No private data requested before login');
 async function login(){await page.locator('#login [name=email]').fill('test@example.com');await page.locator('#login [name=password]').fill('test-password');await page.locator('#login button').click();await page.locator('#online').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('confirmados'));}
 await login();assert.equal(await page.locator('#totals').innerText().then(x=>x.includes('999')),false,'Legacy values never enter cloud totals');
 await page.locator('#entry [name=descricao]').fill('Venda teste');await page.locator('#entry [name=valor]').fill('123.45');await page.locator('#entry [name=conta_id]').selectOption('a');await page.locator('#entry button').click();await page.waitForFunction(()=>document.querySelector('#entries').textContent.includes('Venda teste'));assert.equal(db.lancamentos[0].valor_centavos,12345);
 await page.locator('#all').click();assert.match(await page.locator('#totals').innerText(),/223,45/);
 await page.locator('details').filter({has:page.locator('#account')}).locator('summary').click();
 await page.locator('#transfer [name=origem_id]').selectOption('a');await page.locator('#transfer [name=destino_id]').selectOption('b');await page.locator('#transfer [name=valor]').fill('50');await page.locator('#transfer button').click();await page.waitForFunction(()=>document.querySelector('#transfers').textContent.includes('50,00'));assert.match(await page.locator('#totals').innerText(),/223,45/);
 // Offline errors retain the previous confirmed balance and a durable request ID.
 offline=true;await page.locator('#entry [name=descricao]').fill('Venda pendente');await page.locator('#entry [name=valor]').fill('1.01');await page.locator('#entry [name=conta_id]').selectOption('a');await page.locator('#entry button').click();await page.locator('#pending').waitFor({state:'visible'});assert.equal(db.lancamentos.length,1);const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('jm-cloud-pending:test-user')));assert.ok(pending.id);
 offline=false;await page.reload();await login();await page.locator('#retry').click();await page.waitForFunction(()=>document.querySelector('#pending').hidden);assert.equal(writeIds.at(-1),pending.id);assert.equal(db.lancamentos.length,2);
 for(const width of [320,360,390,430]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);}
 assert.equal(await page.evaluate(()=>localStorage.getItem('jm_receitas_v1')),'[{"id":1,"valor":999}]');
 await page.screenshot({path:'test-results/cloud-mobile.png',fullPage:true});
 await page.locator('#logout').click();assert.equal(await page.locator('#online').isVisible(),false);assert.equal(await page.locator('#login [name=password]').inputValue(),'');assert.deepEqual(errors,[]);
 console.log('PASS: browser login, single dashboard, cloud writes in cents, transfer invariance, offline failure, durable retry after reload, legacy preservation, logout, 320–430px without overflow.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Run against the installed debug APK's actual Android WebView, not a desktop mock.
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9222/json')).json();
 const tab=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 if(!tab)throw Error('Android WebView debugging target missing');
 const result=await new Promise((resolve,reject)=>{
  const ws=new WebSocket(tab.webSocketDebuggerUrl),timer=setTimeout(()=>{ws.close();reject(Error('WebView DOM timeout'));},20000);
  ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:`JSON.stringify({login:!!document.querySelector('#login'),cloud:!!document.querySelector('#cloud-app'),logo:!!document.querySelector('#cloud-app header img'),brand:document.querySelector('#cloud-app h1')?.textContent,password:document.querySelector('#login [name=password]')?.type,legacy:!!document.querySelector('#premiumSummary'),text:document.querySelector('#status')?.textContent})`,returnByValue:true}}));
  ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id!==1)return;clearTimeout(timer);ws.close();if(d.error||d.result?.exceptionDetails)return reject(Error('WebView JavaScript error'));try{resolve(JSON.parse(d.result.result.value));}catch(err){reject(err);}};
  ws.onerror=()=>{clearTimeout(timer);reject(Error('WebView debug connection failed'));};
 });
 if(!result.login||!result.cloud||!result.logo||result.brand!=='ELM Gestão'||result.password!=='password'||result.legacy||!result.text?.includes('Entre para consultar'))throw Error('Installed Android UI failed validation: '+JSON.stringify(result));
 console.log('PASS: installed Android APK renders login, ELM Gestão branding and single cloud panel in the actual WebView.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});

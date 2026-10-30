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
 // Exercise the production theme handler and read the actual native window flags.
 const bars=await new Promise((resolve,reject)=>{
  const ws=new WebSocket(tab.webSocketDebuggerUrl),timer=setTimeout(()=>{ws.close();reject(Error('Native appearance timeout'));},20000);
  ws.onopen=()=>ws.send(JSON.stringify({id:2,method:'Runtime.evaluate',params:{awaitPromise:true,returnByValue:true,expression:`(async()=>{
   const cap=window.Capacitor;
   if(cap.getPlatform()!=='android')throw Error('Expected native Android bridge');
   async function check(light){for(let i=0;i<40;i++){const s=await cap.nativePromise('ELMSystemBars','getTheme',{});if(s.lightStatusBar===light&&s.lightNavigationBar===light)return;await new Promise(r=>setTimeout(r,100));}throw Error('Native bars do not follow theme');}
   await check(true);
   for(const theme of ['dark','light']){const input=document.querySelector('input[name=elm-theme][value='+theme+']');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));await check(theme==='light');if(document.documentElement.dataset.theme!==theme)throw Error('Web/native theme mismatch');}
   return 'light and dark native status/navigation flags verified';
  })()`}}));
  ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id!==2)return;clearTimeout(timer);ws.close();if(d.error||d.result?.exceptionDetails)return reject(Error('Native theme verification failed: '+JSON.stringify(d.result?.exceptionDetails||d.error)));resolve(d.result.result.value);};
  ws.onerror=()=>{clearTimeout(timer);reject(Error('Native appearance connection failed'));};
 });
 console.log('PASS: '+bars);
 console.log('PASS: installed Android APK renders login, ELM Gestão branding and single cloud panel in the actual WebView.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});

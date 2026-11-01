// Save fictitious CSV and generated PDF through native pickers; verify bytes on disk.
const {execFileSync}=require('node:child_process');
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9222/json')).json(),tab=tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);
 async function evaluate(expression){return new Promise((resolve,reject)=>{const ws=new WebSocket(tab.webSocketDebuggerUrl),timer=setTimeout(()=>{ws.close();reject(Error('Native export timeout'));},20000);ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));ws.onmessage=e=>{const d=JSON.parse(e.data);if(d.id!==1)return;clearTimeout(timer);ws.close();if(d.error||d.result?.exceptionDetails)reject(Error(JSON.stringify(d)));else resolve(d.result.result.value);};ws.onerror=reject;});}
 await evaluate(`window.elmExportResult=null;window.Capacitor.nativePromise('ELMExport','saveCsv',{name:'elm-native-test.csv',text:'\\uFEFFData;Descrição;Valor\\r\\n31/10/2026;Óleo;2,50'}).then(r=>window.elmExportResult=r);'picker requested'`);
 let found=false;
 for(let i=0;i<30;i++){
  await pause(500);adb('shell','uiautomator','dump','/sdcard/elm-picker.xml');const xml=adb('shell','cat','/sdcard/elm-picker.xml');
  const nodes=xml.match(/<node\b[^>]*>/g)||[];
  if(xml.includes('Quickstep')&&/responding/.test(xml)){const close=nodes.find(n=>/text="Close app"/i.test(n));if(close){const b=close.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);adb('shell','input','tap',String(Math.floor((+b[1]+ +b[3])/2)),String(Math.floor((+b[2]+ +b[4])/2)));console.log('Dismissed Quickstep launcher ANR; app export remains open.');continue;}}
  const node=nodes.find(n=>/text="SAVE"/i.test(n)&&/enabled="true"/.test(n));
  if(node){const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);adb('shell','input','tap',String(Math.floor((+b[1]+ +b[3])/2)),String(Math.floor((+b[2]+ +b[4])/2)));found=true;break;}
 }
 if(!found)throw Error('Native document Save button unavailable');
 for(let i=0;i<20;i++){await pause(200);if(await evaluate('window.elmExportResult!==null'))break;}
 const result=await evaluate('window.elmExportResult');if(!result||result.cancelled)throw Error('Native export not confirmed');
 const location=adb('shell','find','/sdcard/Download','-name','elm-native-test.csv').trim().split('\n').find(x=>x.endsWith('.csv'));
 if(!location)throw Error('Saved CSV missing');const content=execFileSync('adb',['exec-out','cat',location]);if(content.subarray(0,3).toString('hex')!=='efbbbf'||!content.toString('utf8').includes('Óleo;2,50'))throw Error('CSV bytes differ');
 console.log('PASS: native Android CSV document picker saved BOM and UTF-8 contents.');

 await evaluate(`(async()=>{const {reportPdf,bytesBase64}=await import(location.origin+'/pdf-export.js');const entry={data:'2026-10-31',tipo:'despesa',descricao:'Óleo e açúcar',categoria:'Insumos',conta:'Caixa',valor_centavos:250};const view={from:'2026-10-01',to:'2026-10-31',receitas:0,despesas:250,resultado:-250,lancamentos:[entry]};const bytes=await reportPdf(view,{establishment:'Teste nativo de demonstração',environment:'demo'});window.elmPdfBase64=bytesBase64(bytes);window.elmExportResult=null;window.Capacitor.nativePromise('ELMExport','savePdf',{name:'elm-native-test.pdf',base64:window.elmPdfBase64}).then(r=>window.elmExportResult=r);return 'PDF picker requested';})()`);
 found=false;
 for(let i=0;i<30;i++){
  await pause(500);adb('shell','uiautomator','dump','/sdcard/elm-picker.xml');const xml=adb('shell','cat','/sdcard/elm-picker.xml');const nodes=xml.match(/<node\b[^>]*>/g)||[];
  const node=nodes.find(n=>/text="SAVE"/i.test(n)&&/enabled="true"/.test(n));
  if(node){const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);adb('shell','input','tap',String(Math.floor((+b[1]+ +b[3])/2)),String(Math.floor((+b[2]+ +b[4])/2)));found=true;break;}
 }
 if(!found)throw Error('PDF document Save button unavailable');
 for(let i=0;i<30;i++){await pause(200);if(await evaluate('window.elmExportResult!==null'))break;}
 const pdfResult=await evaluate('window.elmExportResult');if(!pdfResult||pdfResult.cancelled)throw Error('Native PDF export not confirmed');
 const pdfLocation=adb('shell','find','/sdcard/Download','-name','elm-native-test.pdf').trim().split('\n').find(x=>x.endsWith('.pdf'));
 if(!pdfLocation)throw Error('Saved PDF missing');const pdf=execFileSync('adb',['exec-out','cat',pdfLocation]);const expected=Buffer.from(await evaluate('window.elmPdfBase64'),'base64');if(!pdf.equals(expected)||pdf.subarray(0,5).toString()!=='%PDF-')throw Error('Saved PDF bytes differ');
 console.log('PASS: native Android PDF picker saved the generated report byte for byte.');

})().catch(e=>{console.error(e);process.exitCode=1;});

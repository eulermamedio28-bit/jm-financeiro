// Cache only public application files; never cache authenticated API responses.
const CACHE='elm-gestao-pwa-v125';
const ASSETS=['./','./index.html','./manifest.webmanifest','./cloud-app.js','./professional-ui.js','./csv-export.js','./theme.js','./financial-dashboard.js','./professional.css','./icons/elm-mark.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-192.png','./icons/icon-maskable-512.png',...['400','500','600','700'].map(w=>'./fonts/inter-latin-'+w+'-normal.woff2')];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('jm-financeiro-pwa-')||k.startsWith('elm-gestao-pwa-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const request=e.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('Authorization')||!ASSETS.some(p=>new URL(p,self.location.href).href===url.href))return;
 e.respondWith(fetch(request).catch(()=>caches.match(request)));
});


const fs = require("node:fs");
const path = require("node:path");

const files = [
  "index.html",
  "manifest.webmanifest",
  "sw.js"
];

fs.mkdirSync("www/icons", { recursive: true });

for (const file of files) {
  fs.copyFileSync(file, path.join("www", file));
}

for (const file of fs.readdirSync("icons")) {
  fs.copyFileSync(
    path.join("icons", file),
    path.join("www/icons", file)
  );
}



// Retain the historical shell and restaurant logo while applying ELM product branding. Legacy financial data
// is never loaded into the live cloud dashboard or silently overwritten.
let page=fs.readFileSync('index.html','utf8');
page=page.replace(/<title>[^<]*<\/title>/,'<title>ELM Gestão</title>').replace('content="Gestão financeira do Restaurante JM"','content="Controle financeiro para restaurantes e lanchonetes"');
page=page.replaceAll('href="./icons/icon-192.png"','href="./icons/elm-mark.svg"');
fs.copyFileSync('brand/elm-mark.svg','www/icons/elm-mark.svg');
page=page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
page=page.replace(/<main>[\s\S]*?<\/main>/,'<main><div id="cloud-app"></div></main>');
page=page.replace('<div class="menu" id="menu"></div>','<div class="menu"><span>Painel financeiro</span></div>');
page=page.replace('</head>',`<style>
#cloud-app .panel{margin:14px 0}#cloud-app .cloud-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end}#cloud-app label{display:grid;gap:5px;min-width:0}#cloud-app input,#cloud-app select{width:100%;min-width:0;padding:11px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--tx);font:inherit}#cloud-app .cloud-row{padding:12px 0;border-bottom:1px solid var(--bd);overflow-wrap:anywhere}#cloud-app .kpi{min-width:0}#cloud-app .kpi .sub{font-size:22px}#cloud-app [hidden]{display:none!important}#cloud-app summary{cursor:pointer;font-weight:600}#cloud-app .kpis{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}#cloud-app button{white-space:normal}#cloud-app{max-width:100%;overflow-wrap:anywhere}@media(max-width:430px){#cloud-app .cloud-fields{grid-template-columns:1fr}}
@media(max-width:860px){nav.side{display:none!important}.app{display:block}}
</style></head>`);
page=page.replace('</head>','<link rel="stylesheet" href="professional.css"></head>');
for(const file of ['professional-ui.js','professional.css','theme.js'])fs.copyFileSync(path.join('integration','native-sync',file),path.join('www',file));
page=page.replace('</body>','<script type="module" src="cloud-app.js"></script></body>');
fs.writeFileSync('www/index.html',page);
fs.copyFileSync('integration/native-sync/cloud-app.js','www/cloud-app.js');
fs.copyFileSync('integration/financial-dashboard.mjs','www/financial-dashboard.js');

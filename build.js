
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


// O resumo autenticado já está integrado ao aplicativo Android.
// Não inserir um segundo atalho flutuante para um painel externo.
const htmlPath = path.join('www', 'index.html');

console.log("Arquivos do JM Financeiro preparados.");

// Etapa 9: adicionar interface autenticada somente leitura ao build.
fs.copyFileSync(path.join('integration','native-sync','android-summary-ui.js'),path.join('www','android-summary-ui.js'));
let page=fs.readFileSync(htmlPath,'utf8');
if(!page.includes('src="android-summary-ui.js"')){page=page.replace('</body>','<script src="android-summary-ui.js" defer></script></body>');fs.writeFileSync(htmlPath,page);}

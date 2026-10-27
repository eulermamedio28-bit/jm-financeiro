
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


// Ponte segura e reversível: abre o painel autenticado sem copiar dados para o localStorage.
// A integração nativa bidirecional será feita após validação do modelo de saldos.
const panelUrl = "https://jm-financeiro-ativacao-teste.onrender.com/ledger.html";
const htmlPath = path.join("www", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes('id="jm-online-panel-link"')) {
  const link = '<a id="jm-online-panel-link" href="' + panelUrl + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir painel financeiro sincronizado" style="position:fixed;right:14px;bottom:18px;z-index:2147483640;background:#d7ab5c;color:#250a10;padding:12px 15px;border-radius:14px;font:700 14px system-ui;text-decoration:none;box-shadow:0 3px 18px #0009">Painel online</a>';
  html = html.replace(/<\\/body>/i, link + '</body>');
  fs.writeFileSync(htmlPath, html);
}

console.log("Arquivos do JM Financeiro preparados.");

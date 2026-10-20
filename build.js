
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

console.log("Arquivos do JM Financeiro preparados.");

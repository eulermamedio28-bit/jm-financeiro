import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Ferramenta exclusivamente local/de desenvolvimento. Nunca publicar arquivos de backup.
const [action, source, target] = process.argv.slice(2);
if (!['backup', 'restore'].includes(action) || !source || !target || resolve(source) === resolve(target)) {
  console.error('Uso: node backup.js backup|restore origem.sqlite destino.sqlite');
  process.exit(2);
}
const from = resolve(source), to = resolve(target);
if (!existsSync(from)) throw Error('Banco de origem não encontrado');
if (existsSync(to)) throw Error('Destino já existe: operação recusada para evitar sobrescrita');
mkdirSync(dirname(to), { recursive: true });
if (action === 'backup') {
  const db = new DatabaseSync(from, { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Banco inválido');
    // Backup consistente mesmo com SQLite em WAL; VACUUM INTO cria snapshot separado.
    db.exec('VACUUM INTO ' + "'" + to.replaceAll("'", "''") + "'");
  } finally { db.close(); }
} else {
  const db = new DatabaseSync(from, { readOnly: true });
  try { if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Backup inválido'); }
  finally { db.close(); }
  const tmp = to + '.restore-tmp';
  if (existsSync(tmp)) throw Error('Arquivo temporário de restauração já existe');
  try { copyFileSync(from, tmp); renameSync(tmp, to); }
  catch (error) { rmSync(tmp, { force: true }); throw error; }
}
const check = new DatabaseSync(to, { readOnly: true });
try { if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Arquivo final inválido'); }
finally { check.close(); }
console.log(action === 'backup' ? 'Backup local verificado' : 'Restauração local verificada');

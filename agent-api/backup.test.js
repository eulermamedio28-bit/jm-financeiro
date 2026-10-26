import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('backup local preserva registros, restaura e impede sobrescrita',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jm-backup-'));
 try {
  const original=join(dir,'original.sqlite'),backup=join(dir,'snapshot.sqlite'),restored=join(dir,'restored.sqlite');
  const db=new DatabaseSync(original);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE lancamentos(valor_cents INTEGER NOT NULL); INSERT INTO lancamentos VALUES (12345);');
  const run=(...args)=>spawnSync(process.execPath,['backup.js',...args],{cwd:new URL('.',import.meta.url).pathname,encoding:'utf8'});
  assert.equal(run('backup',original,backup).status,0);
  assert.ok(existsSync(backup));
  db.exec('INSERT INTO lancamentos VALUES (67890)');
  assert.equal(run('restore',backup,restored).status,0);
  const check=new DatabaseSync(restored,{readOnly:true});
  try { assert.deepEqual(check.prepare('SELECT valor_cents FROM lancamentos').all().map(row=>Number(row.valor_cents)),[12345]); }
  finally {check.close();}
  assert.notEqual(run('restore',backup,restored).status,0,'Não sobrescrever banco existente');
  db.close();
 } finally {rmSync(dir,{recursive:true,force:true});}
});

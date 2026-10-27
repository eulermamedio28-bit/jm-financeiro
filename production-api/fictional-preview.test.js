import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('fictional mobile preview is isolated from real financial API',()=>{
 const page=readFileSync(new URL('../mcp-v2/mobile-preview.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('../mcp-v2/server.js',import.meta.url),'utf8');
 assert.match(page,/DEMONSTRAÇÃO FICTÍCIA/);
 assert.match(page,/Restaurante JM/);
 assert.match(page,/Açaí São Carlos/);
 assert.doesNotMatch(page,/fetch\s*\(/);
 assert.doesNotMatch(page,/localStorage|sessionStorage/);
 assert.match(server,/path==='\/preview'/);
 assert.match(server,/mobile-preview\.html/);
 assert.match(server,/frame-ancestors 'none'/);
});

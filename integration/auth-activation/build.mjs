// Build-only public configuration for the activation page.
// Only public Supabase project URL and publishable key are embedded in static assets.
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const url=process.env.SUPABASE_URL?.trim();
const key=process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('SUPABASE_URL ausente ou inválida');
if(!key||!key.startsWith('sb_publishable_')||key.length<30)throw new Error('SUPABASE_PUBLISHABLE_KEY ausente ou incompleta');
await mkdir('public',{recursive:true});
for(const file of ['index.html','activation.js','login.html','login.js'])await copyFile('integration/auth-activation/'+file,'public/'+file);
await copyFile('integration/supabase-auth-client.mjs','public/supabase-auth-client.mjs');
await writeFile('public/config.json',JSON.stringify({supabaseUrl:url,publishableKey:key}));
console.log('Public activation assets prepared; no secret keys embedded.');

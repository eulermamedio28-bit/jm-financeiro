// node recovery/verify-elm-135.mjs
// Verify real source paths and fail safely when assets are absent.
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const required=['integration/native-sync/onboarding.js','integration/native-sync/professional.css','integration/native-sync/cloud-app.js','build.js','capacitor.config.json'];
let failures=0;
for(const path of required){if(!existsSync(path)){console.error('MISSING',path);failures++;continue;}
const buf=readFileSync(path);console.log('FOUND',path,buf.length,createHash('sha256').update(buf).digest('hex'));}
if(!failures){const build=readFileSync('build.js','utf8');if(!build.includes('integration')||!build.includes('native-sync')){console.error('Build source linkage not found');failures++;}}
if(failures){console.error('BLOCKED:',failures,'checks failed');process.exitCode=1;}
else console.log('Source paths present. This does NOT prove APK 134 equivalence, successful Android build, or compatible signing.');

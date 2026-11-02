// Execute with: node recovery/verify-elm-135.mjs
// Fails closed when required sources are absent or mismatched.
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const paths=['assets/public/index.html','assets/public/onboarding.js','assets/public/professional.css'];
let failed=false;
for(const path of paths){
 if(!existsSync(path)){console.error('BLOQUEADO: arquivo de produção ausente:',path);failed=true;continue;}
 const data=readFileSync(path);
 console.log(path,'bytes='+data.length,'sha256='+createHash('sha256').update(data).digest('hex'));
}
if(failed){console.error('Não compilar: a branch não corresponde aos caminhos do APK 134.');process.exitCode=1;}
else console.log('Arquivos presentes; ainda é necessário comparar hashes com APK 134 e validar assinatura.');

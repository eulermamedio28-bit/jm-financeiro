import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStagingConfig} from './staging-preflight.js';

const approved={
 NODE_ENV:'production',JM_ENVIRONMENT:'staging',
 JM_PUBLIC_ORIGIN:'https://homologacao.example.com',
 JM_ALLOW_REAL_FINANCIAL_DATA:'false',
 JM_STAGING_ISOLATED_DB:'true',
 JM_TLS_PROXY_VERIFIED:'true',
 JM_SHARED_RATE_LIMIT_VERIFIED:'true',
 JM_ENCRYPTED_BACKUP_VERIFIED:'true',
 JM_RESTORE_TEST_VERIFIED:'true'
};
test('staging preflight rejects absent safety guarantees',()=>{
 const result=validateStagingConfig({});
 assert.equal(result.ready,false);
 assert.ok(result.errors.length>=8);
});
test('staging preflight requires HTTPS and forbids real data',()=>{
 assert.equal(validateStagingConfig({...approved,JM_PUBLIC_ORIGIN:'http://example.com'}).ready,false);
 assert.equal(validateStagingConfig({...approved,JM_ALLOW_REAL_FINANCIAL_DATA:'true'}).ready,false);
 assert.equal(validateStagingConfig({...approved,JM_RESTORE_TEST_VERIFIED:'false'}).ready,false);
});
test('staging preflight accepts explicit verified checklist',()=>{
 assert.deepEqual(validateStagingConfig(approved),{ready:true,errors:[]});
});

// Isolated integration test service. No financial API or public migration endpoints.
// Creates empty schema in the TEST database only; test transaction is rolled back.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
const port=Number(process.env.PORT||10000);
const testDbName='jm_financeiro_integracao_teste';
async function run(){
  let stage='initial';
  if(!process.env.DATABASE_URL)return 'not_configured';
  let url;
  try{url=new URL(process.env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol))return 'invalid_protocol';}
  catch{return 'invalid_url';}
  const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:8000});
  try{
    await client.connect();
    const identity=await client.query('SELECT current_database() AS db');
    if(identity.rows[0]?.db!==testDbName)return 'wrong_database_refused';
    console.log('Private database auth probe: authenticated_query_ok');
    const sql=await readFile(new URL('./postgres-schema.sql',import.meta.url),'utf8');
    await client.query(sql);
    const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('jm_accounts','jm_snapshots')");
    if(tables.rowCount!==2)return 'schema_verification_failed';
    console.log('Test database schema: created_and_verified');
    // Fictional UUID; the transaction is rolled back even on successful checks.
    stage='basic_transaction';
    const id='00000000-0000-4000-8000-000000000001';
    await client.query('BEGIN');
    try{
      await client.query('INSERT INTO jm_accounts(id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
      await client.query("INSERT INTO jm_snapshots(account_id,schema_version,payload,revision) VALUES($1,2,$2::jsonb,1) ON CONFLICT(account_id) DO UPDATE SET payload=EXCLUDED.payload,revision=EXCLUDED.revision",[id,JSON.stringify({app:'JM Financeiro',versao:2,dados:{receitas:[],despesas:[],contas:[],movimentos:[],categorias:[]}})]);
      const found=await client.query('SELECT revision,payload FROM jm_snapshots WHERE account_id=$1',[id]);
      if(found.rowCount!==1||Number(found.rows[0].revision)!==1)throw new Error('test_readback_failed');
      console.log('Test database fictional write/read: verified_rollback');
      // Validate the real repository's optimistic concurrency and tenant isolation
      // against PostgreSQL, within this rollback-only test transaction.
      const {criarRepositorioSnapshots}=await import('./postgres-repository.mjs');
      const repository=criarRepositorioSnapshots(client);
      const otherId='00000000-0000-4000-8000-000000000002';
      const snapshot={app:'JM Financeiro',versao:2,exportadoEm:new Date().toISOString(),dados:{receitas:[],despesas:[],contas:[],movimentos:[],categorias:[]}};
      stage='repository_first_save';
      const first=await repository.salvar(otherId,snapshot,0);
      if(first.conflict||Number(first.revision)!==1)throw new Error('first_save_failed');
      stage='repository_isolation';
      const isolated=await repository.consultar('00000000-0000-4000-8000-000000000003');
      if(isolated!==null)throw new Error('account_isolation_failed');
      stage='repository_stale_revision';
      const stale=await repository.salvar(otherId,snapshot,0);
      if(!stale.conflict)throw new Error('stale_revision_not_rejected');
      stage='repository_second_save';
      const second=await repository.salvar(otherId,snapshot,1);
      if(second.conflict||Number(second.revision)!==2)throw new Error('revision_increment_failed');
      console.log('Test repository isolation and revision conflict: verified_rollback');
      return 'schema_and_repository_tests_ok';
    }finally{await client.query('ROLLBACK');}
  }catch(e){
    console.error('Test database initialization failed:',stage,String(e.code||'error').replace(/[^a-zA-Z0-9_]/g,''));
    return 'database_setup_failed';
  }finally{await client.end().catch(()=>{});}
}
console.log('Test database setup:',await run());
http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/health'){
    res.writeHead(200);return res.end(JSON.stringify({service:'jm-financeiro-db-test',readyForFinancialData:false}));
  }
  res.writeHead(404);res.end(JSON.stringify({error:'not_found'}));
}).listen(port,'0.0.0.0');

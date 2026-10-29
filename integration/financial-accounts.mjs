// Etapa 10: contas financeiras por usuário e transferências atômicas e idempotentes.
// Não altera jm_lancamentos e não considera transferências como receita/despesa.
import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function prepararContasFinanceiras(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_contas_financeiras (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 nome text NOT NULL CHECK(length(nome) BETWEEN 1 AND 120),
 saldo_inicial_centavos bigint NOT NULL DEFAULT 0,
 criada_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,id))`);
 try { await pool.query('ALTER TABLE jm_lancamentos ADD CONSTRAINT jm_lancamentos_conta_id_fk FOREIGN KEY(account_id,conta_id) REFERENCES jm_contas_financeiras(account_id,id)'); } catch(e) { if(e.code!=='42710')throw e; }
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_transferencias (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 client_request_id uuid NOT NULL,
 origem_id uuid NOT NULL, destino_id uuid NOT NULL,
 valor_centavos bigint NOT NULL CHECK(valor_centavos>0),
 data date NOT NULL, criada_em timestamptz NOT NULL DEFAULT now(),
 CHECK(origem_id<>destino_id), UNIQUE(account_id,client_request_id),
 FOREIGN KEY(account_id,origem_id) REFERENCES jm_contas_financeiras(account_id,id),
 FOREIGN KEY(account_id,destino_id) REFERENCES jm_contas_financeiras(account_id,id))`);
}
export function criarContasFinanceiras(pool){
 return {
 async criar(accountId,{nome,saldo_inicial_centavos=0}={}){
  if(typeof nome!=='string'||!nome.trim()||nome.trim().length>120||!Number.isSafeInteger(saldo_inicial_centavos))throw Error('invalid_account');
  const client=await pool.connect();
  try{await client.query('BEGIN');await client.query('INSERT INTO jm_accounts(id) VALUES($1::uuid) ON CONFLICT DO NOTHING',[accountId]);
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))',[accountId]);
   const existing=await client.query('SELECT id FROM jm_contas_financeiras WHERE account_id=$1::uuid AND lower(nome)=lower($2) LIMIT 1',[accountId,nome.trim()]);
   if(existing.rows.length)throw Error('duplicate_account_name');
   const {rows}=await client.query('INSERT INTO jm_contas_financeiras(id,account_id,nome,saldo_inicial_centavos) VALUES($1::uuid,$2::uuid,$3,$4) RETURNING *',[randomUUID(),accountId,nome.trim(),saldo_inicial_centavos]);await client.query('COMMIT');return rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 },
 async listar(accountId){
  const {rows}=await pool.query('SELECT id,nome,saldo_inicial_centavos FROM jm_contas_financeiras WHERE account_id=$1::uuid ORDER BY criada_em,id',[accountId]);return rows;
 },
 async saldos(accountId){
  // Read-only snapshot. Entries are linked by exact account name until account_id
  // is introduced in the ledger; unmatched entries remain explicitly unallocated.
  const {rows}=await pool.query(`
   WITH movements AS (
    SELECT conta_id,conta AS nome,
      COALESCE(SUM(CASE WHEN tipo='receita' THEN valor_centavos ELSE -valor_centavos END),0) AS delta
    FROM jm_lancamentos WHERE account_id=$1::uuid GROUP BY conta_id,conta
   ), transfers_out AS (
    SELECT origem_id AS id,SUM(valor_centavos) AS total
    FROM jm_transferencias WHERE account_id=$1::uuid GROUP BY origem_id
   ), transfers_in AS (
    SELECT destino_id AS id,SUM(valor_centavos) AS total
    FROM jm_transferencias WHERE account_id=$1::uuid GROUP BY destino_id
   )
   SELECT c.id,c.nome,c.saldo_inicial_centavos::text,
    COALESCE(m.delta,0)::text AS movimentos_centavos,
    COALESCE(ti.total,0)::text AS entradas_transferencia_centavos,
    COALESCE(tu.total,0)::text AS saidas_transferencia_centavos,
    (c.saldo_inicial_centavos+COALESCE(m.delta,0)+COALESCE(ti.total,0)-COALESCE(tu.total,0))::text AS saldo_centavos
   FROM jm_contas_financeiras c
   LEFT JOIN LATERAL (SELECT COALESCE(SUM(delta),0) AS delta FROM movements x WHERE x.conta_id=c.id OR (x.conta_id IS NULL AND x.nome=c.nome)) m ON true
   LEFT JOIN transfers_out tu ON tu.id=c.id
   LEFT JOIN transfers_in ti ON ti.id=c.id
   WHERE c.account_id=$1::uuid ORDER BY c.criada_em,c.id
  `,[accountId]);
  const unmatched=await pool.query(`
   SELECT COALESCE(SUM(CASE WHEN l.tipo='receita' THEN l.valor_centavos ELSE -l.valor_centavos END),0)::text AS valor_centavos,
    COUNT(*)::integer AS quantidade
   FROM jm_lancamentos l
   WHERE l.account_id=$1::uuid AND NOT EXISTS (
    SELECT 1 FROM jm_contas_financeiras c WHERE c.account_id=l.account_id AND (c.id=l.conta_id OR (l.conta_id IS NULL AND c.nome=l.conta))
   )`,[accountId]);
  const naoAlocado=unmatched.rows[0];
  const saldo=rows.reduce((sum,c)=>sum+BigInt(c.saldo_centavos),0n);
  return {contas:rows,nao_alocado_centavos:naoAlocado.valor_centavos,
   quantidade_nao_alocados:naoAlocado.quantidade,
   saldo_contas_cadastradas_centavos:saldo.toString(),
   resultado_nao_alocado_centavos:naoAlocado.valor_centavos,
   saldo_consolidado_centavos:naoAlocado.quantidade===0?saldo.toString():null,
   resultado_provisorio_centavos:(saldo+BigInt(naoAlocado.valor_centavos)).toString(),
   conciliado:naoAlocado.quantidade===0};
 },
 async transferir(accountId,input){
  if(!uuid.test(input?.client_request_id||'')||!uuid.test(input?.origem_id||'')||!uuid.test(input?.destino_id||'')||input.origem_id===input.destino_id||!Number.isSafeInteger(input.valor_centavos)||input.valor_centavos<=0||input.valor_centavos>100000000000||typeof input.data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.data)||Number.isNaN(Date.parse(input.data+'T00:00:00Z')))throw Error('invalid_transfer');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const args=[randomUUID(),accountId,input.client_request_id,input.origem_id,input.destino_id,input.valor_centavos,input.data];
   const {rows}=await client.query(`INSERT INTO jm_transferencias(id,account_id,client_request_id,origem_id,destino_id,valor_centavos,data)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::date)
   ON CONFLICT(account_id,client_request_id) DO NOTHING RETURNING *`,args);
   let transfer=rows[0],created=!!transfer;
   if(!created){
    const old=await client.query('SELECT * FROM jm_transferencias WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,input.client_request_id]);transfer=old.rows[0];
    const storedDate=transfer?.data instanceof Date?transfer.data.toISOString().slice(0,10):String(transfer?.data||'').slice(0,10);
    if(!transfer||transfer.origem_id!==input.origem_id||transfer.destino_id!==input.destino_id||BigInt(transfer.valor_centavos)!==BigInt(input.valor_centavos)||storedDate!==input.data)throw Error('idempotency_conflict');
   }
   await client.query('COMMIT');return {created,transferencia:transfer};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 },
 async listarTransferencias(accountId){
  const {rows}=await pool.query('SELECT * FROM jm_transferencias WHERE account_id=$1::uuid ORDER BY data DESC,criada_em DESC LIMIT 100',[accountId]);return rows;
 }
 };
}

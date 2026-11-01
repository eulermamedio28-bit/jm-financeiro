import {randomUUID} from 'node:crypto';
import {validDate,dateOnly} from './financial-dashboard.mjs';
import {FORMS,LABELS,normalizeClosing,closingSummary} from './cash-closing-model.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export async function prepareClosings(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_fechamentos_caixa(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),data date NOT NULL,formas jsonb NOT NULL,abertura_centavos bigint NOT NULL,outras_entradas_centavos bigint NOT NULL,saidas_centavos bigint NOT NULL,contado_centavos bigint NOT NULL,versao integer NOT NULL DEFAULT 0,cancelado_em timestamptz,criado_em timestamptz NOT NULL DEFAULT now(),atualizado_em timestamptz NOT NULL DEFAULT now())`);
 await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS jm_fechamento_dia ON jm_fechamentos_caixa(account_id,data) WHERE cancelado_em IS NULL');
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_fechamento_recebimentos(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),fechamento_id uuid NOT NULL REFERENCES jm_fechamentos_caixa(id),forma text NOT NULL CHECK(forma IN ('dinheiro','pix','debito','credito','ifood')),valor_centavos bigint NOT NULL CHECK(valor_centavos>0),data_recebimento date NOT NULL,lancamento_id uuid NOT NULL REFERENCES jm_lancamentos(id),criado_pelo_fechamento boolean NOT NULL,estornado_em timestamptz,criado_em timestamptz NOT NULL DEFAULT now())`);
 await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS jm_recebimento_vinculo_ativo ON jm_fechamento_recebimentos(account_id,lancamento_id) WHERE estornado_em IS NULL');
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_fechamento_eventos(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES jm_accounts(id),client_request_id uuid NOT NULL,autor_id uuid NOT NULL,acao text NOT NULL,solicitacao jsonb NOT NULL,anterior jsonb,posterior jsonb NOT NULL,criado_em timestamptz NOT NULL DEFAULT now(),UNIQUE(account_id,client_request_id))`);
 await pool.query('ALTER TABLE jm_lancamentos ADD COLUMN IF NOT EXISTS fechamento_id uuid');
}
export function validateClosing(v){
 if(!v||!uuid(v.client_request_id)||!['criar','editar','receber','vincular','desfazer','cancelar'].includes(v.acao))throw Error('invalid_closing');
 const fields=['criar','editar'].includes(v.acao)?['data','formas','abertura_centavos','outras_entradas_centavos','saidas_centavos','contado_centavos']:v.acao==='receber'?['forma','valor_centavos','data_recebimento','conta_id']:v.acao==='vincular'?['forma','lancamento_id']:v.acao==='desfazer'?['recebimento_id','motivo']:['motivo'];
 const all=['acao','client_request_id',...(v.acao==='criar'?[]:['id','expected_version']),...fields];if(Object.keys(v).some(k=>!all.includes(k))||all.some(k=>!(k in v)))throw Error('invalid_closing');
 const p={acao:v.acao};if(v.acao!=='criar'){if(!uuid(v.id)||!Number.isSafeInteger(v.expected_version)||v.expected_version<0)throw Error('invalid_closing');Object.assign(p,{id:v.id,expected_version:v.expected_version});}
 if(['criar','editar'].includes(v.acao))Object.assign(p,normalizeClosing(v));else for(const k of fields)p[k]=v[k];
 if(['receber','vincular'].includes(v.acao)&&!FORMS.includes(v.forma))throw Error('invalid_closing');
 if(v.acao==='receber'&&(!Number.isSafeInteger(v.valor_centavos)||v.valor_centavos<=0||v.valor_centavos>100000000000||!validDate(v.data_recebimento)||!uuid(v.conta_id)))throw Error('invalid_closing');
 if(v.acao==='vincular'&&!uuid(v.lancamento_id)||v.acao==='desfazer'&&!uuid(v.recebimento_id))throw Error('invalid_closing');
 if(['desfazer','cancelar'].includes(v.acao)&&(typeof v.motivo!=='string'||!v.motivo.trim()||v.motivo.length>300))throw Error('invalid_closing');return p;
}
const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export async function mutateClosing(pool,actor,input){
 const p=validateClosing(input),c=await pool.connect();
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[actor+'|closing|'+input.client_request_id]);
  const prior=(await c.query('SELECT * FROM jm_fechamento_eventos WHERE account_id=$1 AND client_request_id=$2',[actor,input.client_request_id])).rows[0];if(prior){if(stable(prior.solicitacao)!==stable(p))throw Error('idempotency_conflict');await c.query('COMMIT');return {created:false,fechamento:prior.posterior};}
  let before=null,after;
  if(p.acao==='criar'){
   await c.query('INSERT INTO jm_accounts(id) VALUES($1) ON CONFLICT DO NOTHING',[actor]);after=(await c.query('INSERT INTO jm_fechamentos_caixa(id,account_id,data,formas,abertura_centavos,outras_entradas_centavos,saidas_centavos,contado_centavos) VALUES($1,$2,$3::date,$4::jsonb,$5,$6,$7,$8) RETURNING *',[randomUUID(),actor,p.data,JSON.stringify(p.formas),p.abertura_centavos,p.outras_entradas_centavos,p.saidas_centavos,p.contado_centavos])).rows[0];
  }else{
   const closure=(await c.query('SELECT * FROM jm_fechamentos_caixa WHERE account_id=$1 AND id=$2 FOR UPDATE',[actor,p.id])).rows[0];if(!closure)throw Error('closing_not_found');if(closure.versao!==p.expected_version)throw Error('stale_closing');if(closure.cancelado_em)throw Error('invalid_closing_state');
   const receipts=(await c.query('SELECT * FROM jm_fechamento_recebimentos WHERE account_id=$1 AND fechamento_id=$2 AND estornado_em IS NULL',[actor,closure.id])).rows;before={...closure,recebimentos:receipts};
   if(p.acao==='editar'){
    const summary=closingSummary({...closure,...p},receipts);if(summary.formas.some(f=>f.pendente_centavos<0)||receipts.some(r=>dateOnly(r.data_recebimento)<p.data))throw Error('closing_amount_conflict');
    await c.query('UPDATE jm_fechamentos_caixa SET data=$3::date,formas=$4::jsonb,abertura_centavos=$5,outras_entradas_centavos=$6,saidas_centavos=$7,contado_centavos=$8 WHERE account_id=$1 AND id=$2',[actor,closure.id,p.data,JSON.stringify(p.formas),p.abertura_centavos,p.outras_entradas_centavos,p.saidas_centavos,p.contado_centavos]);
   }
   if(p.acao==='cancelar'){if(receipts.length)throw Error('closing_has_receipts');await c.query('UPDATE jm_fechamentos_caixa SET cancelado_em=now() WHERE account_id=$1 AND id=$2',[actor,closure.id]);}
   if(['receber','vincular'].includes(p.acao)){
    const pending=closingSummary(closure,receipts).formas.find(f=>f.forma===p.forma).pendente_centavos;let entry;
    if(p.acao==='receber'){
     if(p.valor_centavos>pending||p.data_recebimento<dateOnly(closure.data))throw Error('closing_amount_conflict');const account=(await c.query('SELECT nome FROM jm_contas_financeiras WHERE account_id=$1 AND id=$2 FOR KEY SHARE',[actor,p.conta_id])).rows[0];if(!account)throw Error('invalid_account_reference');
     entry=(await c.query("INSERT INTO jm_lancamentos(id,account_id,client_request_id,tipo,descricao,valor_centavos,data,conta_id,conta,categoria,fechamento_id) VALUES($1,$2,$3,'receita',$4,$5,$6::date,$7,$8,'Vendas do fechamento',$9) RETURNING *",[randomUUID(),actor,randomUUID(),'Recebimento '+LABELS[p.forma]+' - vendas de '+dateOnly(closure.data),p.valor_centavos,p.data_recebimento,p.conta_id,account.nome,closure.id])).rows[0];
    }else{
     entry=(await c.query('SELECT * FROM jm_lancamentos WHERE account_id=$1 AND id=$2 FOR UPDATE',[actor,p.lancamento_id])).rows[0];if(!entry||entry.tipo!=='receita'||entry.excluido_em||entry.fechamento_id||!entry.conta_id||dateOnly(entry.data)<dateOnly(closure.data)||Number(entry.valor_centavos)>pending)throw Error('invalid_receipt_link');
     await c.query('UPDATE jm_lancamentos SET fechamento_id=$3,versao=versao+1 WHERE account_id=$1 AND id=$2',[actor,entry.id,closure.id]);
    }
    await c.query('INSERT INTO jm_fechamento_recebimentos(id,account_id,fechamento_id,forma,valor_centavos,data_recebimento,lancamento_id,criado_pelo_fechamento) VALUES($1,$2,$3,$4,$5,$6::date,$7,$8)',[randomUUID(),actor,closure.id,p.forma,entry.valor_centavos,dateOnly(entry.data),entry.id,p.acao==='receber']);
   }
   if(p.acao==='desfazer'){
    const receipt=receipts.find(r=>r.id===p.recebimento_id);if(!receipt)throw Error('invalid_closing_state');const entry=(await c.query('SELECT * FROM jm_lancamentos WHERE account_id=$1 AND id=$2 FOR UPDATE',[actor,receipt.lancamento_id])).rows[0];if(!entry||entry.excluido_em||entry.fechamento_id!==closure.id)throw Error('invalid_closing_state');
    if(receipt.criado_pelo_fechamento)await c.query('UPDATE jm_lancamentos SET excluido_em=now(),excluido_por=$1,versao=versao+1 WHERE account_id=$1 AND id=$2',[actor,entry.id]);else await c.query('UPDATE jm_lancamentos SET fechamento_id=NULL,versao=versao+1 WHERE account_id=$1 AND id=$2',[actor,entry.id]);
    await c.query('UPDATE jm_fechamento_recebimentos SET estornado_em=now() WHERE account_id=$1 AND id=$2',[actor,receipt.id]);
   }
   after=(await c.query('UPDATE jm_fechamentos_caixa SET versao=versao+1,atualizado_em=now() WHERE account_id=$1 AND id=$2 RETURNING *',[actor,closure.id])).rows[0];
  }
  const received=(await c.query('SELECT * FROM jm_fechamento_recebimentos WHERE account_id=$1 AND fechamento_id=$2 AND estornado_em IS NULL',[actor,after.id])).rows;after={...after,recebimentos:received};
  await c.query('INSERT INTO jm_fechamento_eventos(id,account_id,client_request_id,autor_id,acao,solicitacao,anterior,posterior) VALUES($1,$2,$3,$2,$4,$5::jsonb,$6::jsonb,$7::jsonb)',[randomUUID(),actor,input.client_request_id,p.acao,JSON.stringify(p),JSON.stringify(before),JSON.stringify(after)]);await c.query('COMMIT');return {created:true,fechamento:after};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

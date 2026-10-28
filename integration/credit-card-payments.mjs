// Pagamento integral de fatura: baixa de compras e saída bancária na mesma transação.
// A operação é idempotente por conta + client_request_id.
import {randomUUID} from 'node:crypto';
import {validarPagamentoFatura} from './credit-card-payment-validation.mjs';
export async function prepararPagamentosFatura(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_pagamentos_fatura (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 client_request_id uuid NOT NULL, cartao text NOT NULL, vencimento date NOT NULL,
 data_pagamento date NOT NULL, valor_centavos bigint NOT NULL CHECK(valor_centavos>0),
 conta text NOT NULL, lancamento_id uuid NOT NULL REFERENCES jm_lancamentos(id),
 criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,client_request_id), UNIQUE(account_id,cartao,vencimento)
 )`);
}
export function criarPagamentosFatura(pool){
 return {
  async pagar(accountId,input){
   const v=validarPagamentoFatura(input),client=await pool.connect();
   try{
    await client.query('BEGIN');
    // Serializa pagamentos concorrentes do mesmo cartão/fatura.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[accountId+'|'+v.cartao+'|'+v.vencimento]);
    const prior=await client.query('SELECT * FROM jm_pagamentos_fatura WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,v.client_request_id]);
    if(prior.rows.length){
     const p=prior.rows[0],iso=x=>x instanceof Date?x.toISOString().slice(0,10):String(x).slice(0,10);
     if(p.cartao!==v.cartao||iso(p.vencimento)!==v.vencimento||iso(p.data_pagamento)!==v.data_pagamento||Number(p.valor_centavos)!==v.valor_centavos||p.conta!==v.conta)throw Error('idempotency_conflict');
     await client.query('COMMIT');return {created:false,pagamento:p};
    }
    const purchases=await client.query(`SELECT id,valor_centavos,paga_em FROM jm_compras_cartao
      WHERE account_id=$1::uuid AND cartao=$2 AND vencimento=$3::date FOR UPDATE`,[accountId,v.cartao,v.vencimento]);
    if(!purchases.rows.length||purchases.rows.some(x=>x.paga_em))throw Error('invoice_not_open');
    const total=purchases.rows.reduce((n,x)=>n+BigInt(x.valor_centavos),0n);
    if(total!==BigInt(v.valor_centavos))throw Error('invoice_amount_mismatch');
    const lancamentoId=randomUUID(),pagamentoId=randomUUID();
    await client.query(`INSERT INTO jm_lancamentos(id,account_id,client_request_id,tipo,valor_centavos,descricao,categoria,conta,data)
      VALUES($1::uuid,$2::uuid,$3::uuid,'despesa',$4,$5,'Pagamento de fatura de cartão',$6,$7::date)`,
      [lancamentoId,accountId,v.client_request_id,v.valor_centavos,'Pagamento fatura '+v.cartao+' venc. '+v.vencimento,v.conta,v.data_pagamento]);
    await client.query(`UPDATE jm_compras_cartao SET paga_em=$4::date WHERE account_id=$1::uuid AND cartao=$2 AND vencimento=$3::date AND paga_em IS NULL`,
      [accountId,v.cartao,v.vencimento,v.data_pagamento]);
    const inserted=await client.query(`INSERT INTO jm_pagamentos_fatura(id,account_id,client_request_id,cartao,vencimento,data_pagamento,valor_centavos,conta,lancamento_id)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::date,$6::date,$7,$8,$9::uuid) RETURNING *`,
      [pagamentoId,accountId,v.client_request_id,v.cartao,v.vencimento,v.data_pagamento,v.valor_centavos,v.conta,lancamentoId]);
    await client.query('COMMIT');return {created:true,pagamento:inserted.rows[0]};
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
 };
}

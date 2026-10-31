// Credit card purchases are liabilities, not cash ledger movements.
import {prepararCadastroCartoes} from './credit-card-registry.mjs';
import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
function validDate(x){if(typeof x!=='string'||!date.test(x))return false;const d=new Date(x+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;}
export function validarCompraCartao(input){
 if(!uuid.test(input?.client_request_id||'')||typeof input?.cartao!=='string'||!input.cartao.trim()||input.cartao.length>120||typeof input?.descricao!=='string'||!input.descricao.trim()||input.descricao.length>500||!Number.isSafeInteger(input.valor_centavos)||input.valor_centavos<=0||input.valor_centavos>100000000000||!validDate(input.data_compra)||!validDate(input.vencimento)||input.vencimento<input.data_compra||!Number.isInteger(input.dia_fechamento)||input.dia_fechamento<1||input.dia_fechamento>28)throw Error('invalid_credit_purchase');
 return {client_request_id:input.client_request_id,cartao:input.cartao.trim(),descricao:input.descricao.trim(),valor_centavos:input.valor_centavos,data_compra:input.data_compra,vencimento:input.vencimento,dia_fechamento:input.dia_fechamento};
}
export async function prepararCartoes(pool){
 await prepararCadastroCartoes(pool);
 await pool.query(`CREATE TABLE IF NOT EXISTS jm_compras_cartao (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES jm_accounts(id),
 client_request_id uuid NOT NULL, cartao text NOT NULL, descricao text NOT NULL,
 valor_centavos bigint NOT NULL CHECK(valor_centavos>0),
 data_compra date NOT NULL, vencimento date NOT NULL,
 dia_fechamento integer NOT NULL CHECK(dia_fechamento BETWEEN 1 AND 28),
 paga_em date, criada_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,client_request_id), CHECK(paga_em IS NULL OR paga_em>=data_compra)
 )`);
}
export function resumirFaturas(compras){
 const faturas=new Map();
 for(const compra of compras){
  const cartao=String(compra.cartao||'').trim();
  const vencimento=compra.vencimento instanceof Date?compra.vencimento.toISOString().slice(0,10):String(compra.vencimento||'').slice(0,10);
  if(!cartao||!validDate(vencimento))throw Error('invalid_credit_invoice');
  const valor=Number(compra.valor_centavos);
  if(!Number.isSafeInteger(valor)||valor<=0)throw Error('invalid_credit_invoice');
  const chave=JSON.stringify([cartao,vencimento]);
  if(!faturas.has(chave))faturas.set(chave,{cartao,vencimento,total_centavos:0,pendente_centavos:0,quantidade_compras:0});
  const f=faturas.get(chave);
  f.total_centavos+=valor;
  if(!compra.paga_em)f.pendente_centavos+=valor;
  f.quantidade_compras++;
  if(!Number.isSafeInteger(f.total_centavos)||!Number.isSafeInteger(f.pendente_centavos))throw Error('invalid_credit_invoice');
 }
 return [...faturas.values()].sort((a,b)=>a.vencimento.localeCompare(b.vencimento)||a.cartao.localeCompare(b.cartao));
}
export function criarCartoes(pool){
 return {
  async registrar(accountId,input){
   const v=validarCompraCartao(input), client=await pool.connect();
   try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[accountId+'|'+v.cartao+'|'+v.vencimento]);
    const q=await client.query(`INSERT INTO jm_compras_cartao(id,account_id,client_request_id,cartao,descricao,valor_centavos,data_compra,vencimento,dia_fechamento)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::date,$8::date,$9)
    ON CONFLICT(account_id,client_request_id) DO NOTHING RETURNING *`,[randomUUID(),accountId,v.client_request_id,v.cartao,v.descricao,v.valor_centavos,v.data_compra,v.vencimento,v.dia_fechamento]);
    let compra=q.rows[0],created=!!compra;
    if(!created){
     const existing=await client.query('SELECT * FROM jm_compras_cartao WHERE account_id=$1::uuid AND client_request_id=$2::uuid',[accountId,v.client_request_id]);
     compra=existing.rows[0];
     const iso=x=>x instanceof Date?x.toISOString().slice(0,10):String(x).slice(0,10);
     if(!compra||compra.cartao!==v.cartao||compra.descricao!==v.descricao||BigInt(compra.valor_centavos)!==BigInt(v.valor_centavos)||iso(compra.data_compra)!==v.data_compra||iso(compra.vencimento)!==v.vencimento||compra.dia_fechamento!==v.dia_fechamento)throw Error('idempotency_conflict');
    }
    if(created){
     // Prevent a new liability on an invoice that has already been settled.
     // Same advisory lock as the payment operation protects against races.
     const settled=await client.query(
      'SELECT 1 FROM jm_pagamentos_fatura WHERE account_id=$1::uuid AND cartao=$2 AND vencimento=$3::date LIMIT 1',
      [accountId,v.cartao,v.vencimento]
     );
     if(settled.rows.length)throw Error('invoice_already_settled');
    }
    await client.query('COMMIT');return {created,compra};
   }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  },
  async listarFaturas(accountId){
   const {rows}=await pool.query('SELECT cartao,vencimento,valor_centavos,paga_em FROM jm_compras_cartao WHERE account_id=$1::uuid ORDER BY vencimento DESC LIMIT 1000',[accountId]);
   return resumirFaturas(rows);
  },
  async listar(accountId){
   const {rows}=await pool.query('SELECT * FROM jm_compras_cartao WHERE account_id=$1::uuid ORDER BY vencimento DESC,criada_em DESC LIMIT 100',[accountId]);return rows;
  }
 };
}

// Regras financeiras puras para futura API PostgreSQL. Não abre conexão nem grava dados.
export const validCents = value => Number.isSafeInteger(value) && value > 0 && value <= 100000000000;
export const validUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateEntry(input) {
 if (!input || !['income','expense'].includes(input.kind) || !validCents(input.amount_cents) ||
     !validUuid(input.establishment_id) || !validUuid(input.account_id) || !validUuid(input.category_id) ||
     typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 240)
   throw new Error('Lançamento inválido');
 return {kind:input.kind,amount_cents:input.amount_cents,establishment_id:input.establishment_id,
 account_id:input.account_id,category_id:input.category_id,description:input.description.trim()};
}
export function validateTransfer(input) {
 if (!input || !validCents(input.amount_cents) || !validUuid(input.establishment_id) ||
     !validUuid(input.from_account_id) || !validUuid(input.to_account_id) ||
     input.from_account_id === input.to_account_id ||
     typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 240)
   throw new Error('Transferência inválida');
 return {amount_cents:input.amount_cents,establishment_id:input.establishment_id,
 from_account_id:input.from_account_id,to_account_id:input.to_account_id,description:input.description.trim()};
}
export function consolidate({opening_cents=0,entries=[],transfers=[]}) {
 if (!Number.isSafeInteger(opening_cents)) throw new Error('Saldo inicial inválido');
 let income_cents=0,expense_cents=0;
 for (const entry of entries) {
  if (!validCents(entry.amount_cents) || !['income','expense'].includes(entry.kind)) throw new Error('Lançamento inválido');
  if (entry.kind === 'income') income_cents+=entry.amount_cents;
  else expense_cents+=entry.amount_cents;
  if (!Number.isSafeInteger(income_cents) || !Number.isSafeInteger(expense_cents)) throw new Error('Valor fora do limite');
 }
 // Transferências internas não alteram o resultado consolidado.
 for (const transfer of transfers) {
  if (!validCents(transfer.amount_cents)) throw new Error('Transferência inválida');
 }
 const balance_cents=opening_cents+income_cents-expense_cents;
 if (!Number.isSafeInteger(balance_cents)) throw new Error('Saldo fora do limite');
 return {opening_cents,income_cents,expense_cents,balance_cents};
}

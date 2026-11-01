// Validação isolada de solicitação de pagamento. Não executa movimentações.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function dataValida(x){if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;}
export function validarPagamentoFatura(input){
 if(!uuid.test(input?.client_request_id||'')||typeof input?.cartao!=='string'||!input.cartao.trim()||input.cartao.length>120||!dataValida(input.vencimento)||!dataValida(input.data_pagamento)||!Number.isSafeInteger(input.valor_centavos)||input.valor_centavos<=0||input.valor_centavos>100000000000||typeof input?.conta!=='string'||!input.conta.trim()||input.conta.length>120)throw Error('invalid_invoice_payment');
 return {client_request_id:input.client_request_id,cartao:input.cartao.trim(),vencimento:input.vencimento,data_pagamento:input.data_pagamento,valor_centavos:input.valor_centavos,conta:input.conta.trim()};
}

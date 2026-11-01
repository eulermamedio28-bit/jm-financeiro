// JM Financeiro — adaptador somente leitura para a futura integração nativa.
// Não grava dados, não persiste credenciais e não altera os cartões automaticamente.
export const FINANCIAL_API = 'https://jm-financeiro-db-private-test.onrender.com';
export async function consultarResumoRemoto(accessToken, {fetchImpl=fetch}={}) {
  if(typeof accessToken!=='string'||!accessToken.trim()) throw new Error('Autenticação necessária.');
  const response=await fetchImpl(FINANCIAL_API+'/v1/lancamentos',{
    method:'GET',
    headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},
    cache:'no-store'
  });
  if(!response.ok) throw new Error(response.status===401?'Sessão expirada. Entre novamente.':'Não foi possível consultar os lançamentos.');
  const payload=await response.json();
  if(!Array.isArray(payload.lancamentos)) throw new Error('Resposta financeira inválida.');
  // A API atual limita a listagem; não exibir total parcial como resultado completo.
  if(payload.lancamentos.length>=50) throw new Error('Há lançamentos demais para calcular um total confiável. Aguardando resumo agregado do servidor.');
  let receitas=0,despesas=0;
  for(const item of payload.lancamentos){
    const valor=Number(item.valor_centavos);
    if(!Number.isSafeInteger(valor)||valor<0||!['receita','despesa'].includes(item.tipo))throw new Error('Lançamento inválido recebido.');
    if(item.tipo==='receita')receitas+=valor;else despesas+=valor;
  }
  return Object.freeze({receitasCentavos:receitas,despesasCentavos:despesas,resultadoCentavos:receitas-despesas,origem:'servidor',saldoBancarioDisponivel:false});
}

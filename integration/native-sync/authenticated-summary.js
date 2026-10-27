// Adaptador da etapa 9: dados reais do servidor, sem localStorage nem credenciais embutidas.
// O aplicativo deve obter o token somente após login explícito do usuário.
// Este módulo NÃO altera saldos locais nem inventa saldo bancário.
const API = 'https://jm-financeiro-db-private-test.onrender.com';

function moneyCents(value) {
  if (!Number.isSafeInteger(value)) throw new Error('Valor financeiro inválido');
  return value;
}

function parseSummary(data) {
  const receitas = moneyCents(data?.receitas_centavos);
  const despesas = moneyCents(data?.despesas_centavos);
  const resultado = moneyCents(data?.resultado_centavos);
  if (resultado !== receitas - despesas) throw new Error('Resumo inconsistente');
  return Object.freeze({
    receitasCentavos: receitas,
    despesasCentavos: despesas,
    resultadoCentavos: resultado,
    // Saldo de conta e contas a receber NÃO estão disponíveis nesta API.
    saldoContasCentavos: null,
    contasReceberCentavos: null
  });
}

async function loadAuthenticatedSummary(accessToken, fetchImpl = fetch) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Autenticação necessária');
  }
  const response = await fetchImpl(API + '/v1/resumo', {
    headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Falha ao consultar resumo: HTTP ' + response.status);
  return parseSummary(await response.json());
}

module.exports = { parseSummary, loadAuthenticatedSummary };

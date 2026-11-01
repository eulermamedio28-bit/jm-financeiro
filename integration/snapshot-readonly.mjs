// JM Financeiro — contrato de leitura local, sem transmissão de dados.
// Este módulo não modifica o index.html nem acessa a rede.
// Recebe o objeto produzido por snap() do aplicativo original.
export function validarSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Backup inválido');
  if (snapshot.app !== 'JM Financeiro' || snapshot.versao !== 2) throw new Error('Formato de backup incompatível');
  const dados = snapshot.dados;
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Dados ausentes');
  for (const campo of ['receitas','despesas','contas','movimentos','categorias']) {
    if (!Array.isArray(dados[campo])) throw new Error('Campo inválido: '+campo);
  }
  return dados;
}

export function resumoLocal(snapshot) {
  const dados = validarSnapshot(snapshot);
  // Não presumir semântica de valor ou status: neste estágio, somente contagem.
  return Object.freeze({
    origem: 'aplicativo-local',
    modo: 'somente-leitura',
    quantidadeReceitas: dados.receitas.length,
    quantidadeDespesas: dados.despesas.length,
    quantidadeContas: dados.contas.length,
    quantidadeMovimentos: dados.movimentos.length,
    quantidadeCategorias: dados.categorias.length
  });
}

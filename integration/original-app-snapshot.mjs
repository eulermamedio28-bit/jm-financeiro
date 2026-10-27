// Adaptador isolado para o formato de exportação do JM Financeiro original.
// Não acessa localStorage, não faz requisições e não modifica o aplicativo.
export function inspectOriginalBackup(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) ||
      snapshot.app !== 'JM Financeiro' || ![1, 2].includes(snapshot.versao) ||
      !snapshot.dados || typeof snapshot.dados !== 'object') {
    throw new TypeError('Formato de backup JM Financeiro não reconhecido');
  }
  const keys = ['receitas', 'despesas', 'contas', 'movimentos'];
  for (const key of keys) {
    if (!Array.isArray(snapshot.dados[key])) {
      throw new TypeError('Campo obrigatório ausente ou inválido: ' + key);
    }
  }
  if (snapshot.dados.categorias !== undefined && !Array.isArray(snapshot.dados.categorias)) {
    throw new TypeError('Categorias inválidas');
  }
  // Inspeção estrutural, NÃO substitui vBackup() do aplicativo original.
  // Não exportar nem registrar detalhes dos lançamentos.
  return Object.freeze({
    app: 'JM Financeiro',
    version: snapshot.versao,
    recordCounts: Object.freeze(Object.fromEntries(keys.map(k => [k, snapshot.dados[k].length]))),
    categories: snapshot.dados.categorias?.length ?? 0,
    verifiedByOriginalApp: false,
    remoteSynchronizationEnabled: false
  });
}

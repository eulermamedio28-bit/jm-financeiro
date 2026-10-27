# Integração segura — JM Financeiro original

## Fonte oficial
- Branch base: main.
- Aplicativo: Capacitor Android, package br.com.restaurantejm.financeiro.
- Fonte: index.html original (blob 70d53cad31a8d763b1f2c7d886ded83d7debb13f).
- Backups históricos index-antigo*.html permanecem intocados.
- Sem dados financeiros reais cadastrados no aplicativo, conforme proprietário.

## Estado validado
- MCP de demonstração conectado ao ChatGPT e ferramenta consultar_resumo_ficticio executada com sucesso.
- Esse MCP é público, sem autenticação e **não deve** receber dados financeiros reais.
- O aplicativo atual guarda receitas, despesas, contas e movimentos no localStorage do WebView.
- Atualização de index.html no repositório exige rebuild/sync do Capacitor para chegar ao APK instalado.

## Arquitetura de implementação
1. Criar gateway separado autenticado para dados reais, sem afetar o endpoint público fictício.
2. Vincular instalação Android à conta autorizada por credencial curta de pareamento e tokens revogáveis; nunca colocar segredo fixo no HTML, APK ou GitHub.
3. Definir modelo versionado de sincronização, com HTTPS, validação de esquema, isolamento por usuário e logs sem valores sensíveis.
4. Incluir no aplicativo, apenas após gateway validado, tela de conexão/sincronização com opção de desligar; iniciar somente com leitura e consentimento explícito.
5. Preservar interface existente e manter exportação/restauração local de backup.
6. Validar ponta a ponta, gerar APK com mesma identidade de pacote e assinatura quando possível; se assinatura diferente, orientar reinstalação somente após verificação.

## Regras de segurança
- Não enviar lançamentos ao MCP fictício sem autenticação.
- Não fazer mudanças automáticas em receitas/despesas.
- Não afirmar que há sincronização real até teste completo.
- Não publicar APK como pronto antes de testes de build e instalação.

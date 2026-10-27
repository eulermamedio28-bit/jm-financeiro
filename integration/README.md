# Integração MCP com o JM Financeiro original

**Escopo:** somente Restaurante JM. Não recriar a interface ou o aplicativo instalado.

## Diagnóstico confirmado no código original

- A interface existente é `index.html`, com empacotamento Capacitor/Android.
- O estado financeiro é salvo no `localStorage` do próprio aplicativo (`R`, `D`, `C`, `M`).
- `snap()` exporta JSON `{app:'JM Financeiro', versao:2, exportadoEm, dados:{receitas,despesas,contas,movimentos,categorias}}`.
- `vBackup()` valida dados antes de importar; `applyData()` altera o estado.
- O MCP público atual `mcp-v2/server.js` responde apenas com dados fictícios; não lê o aparelho.

## Limite técnico

Um servidor MCP remoto não pode ler diretamente o `localStorage` isolado no Android.
Uma conexão funcional exige uma ponte consentida no aplicativo original e um backend seguro.
O arquivo `original-app-snapshot.mjs` apenas identifica o formato de exportação **offline**;
não faz sincronização, não autentica usuário e não valida cada registro.

## Sequência de implementação sem substituir o aplicativo

1. Fazer backup local pelo mecanismo já existente no aplicativo, antes de qualquer atualização.
2. Projetar endpoint autenticado de sincronização com controle de versão, idempotência e criptografia em trânsito; sem colocar segredos no HTML público.
3. Acrescentar ao aplicativo original somente um módulo de comunicação, após validação e teste em cópia de desenvolvimento.
4. Integrar MCP ao backend autenticado, inicialmente com consultas somente leitura; nunca apontar comandos para o servidor fictício.
5. Testar no Android instalado e só então habilitar operações com confirmação, auditoria e proteção contra conflitos.

**Não enviar backups reais para o servidor de demonstração.**

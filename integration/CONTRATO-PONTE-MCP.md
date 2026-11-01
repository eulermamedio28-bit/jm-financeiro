# Contrato da ponte Android ↔ gateway MCP

**Estado:** especificação, não implementado em produção.

## Aplicativo
O HTML original gera `snap()` com `app: "JM Financeiro"`, `versao: 2` e arrays `receitas`, `despesas`, `contas`, `movimentos`, `categorias`. Os valores monetários não devem ser inferidos como centavos sem verificar o campo de cada entidade. O próprio aplicativo tem `vBackup()` com validação de consistência; reutilizar essa lógica para importações.

## Fluxo seguro proposto
1. Usuário solicita conexão no aplicativo e autentica-se no serviço de sincronização.
2. Gateway emite credencial de curta duração vinculada à instalação, com revogação e escopos específicos.
3. Aplicativo envia apenas dados autorizados por HTTPS, com versão de esquema e identificador de revisão.
4. Gateway persiste dados criptografados em armazenamento durável isolado por proprietário; nunca usar memória de processo do Render como fonte permanente.
5. ChatGPT usa MCP com autenticação independente e escopo inicial `financeiro:ler`.
6. Cada consulta registra somente metadados operacionais; jamais registrar lançamentos ou tokens em logs.

## Contrato de API planejado
- `POST /v1/pair/start`: início de pareamento autenticado.
- `POST /v1/sync`: sincronização autenticada, com revisão e idempotência.
- `GET /v1/sync/status`: versão e última sincronização sem dados financeiros.
- `POST /v1/pair/revoke`: revogação da instalação.
- `POST /mcp`: MCP autenticado para ferramentas somente leitura.

## Bloqueios antes de publicar
- Definir provedor de autenticação e armazenamento persistente.
- Validar escopos e isolamento de conta.
- Testar reinstalação do APK, assinatura e permissões de rede.
- Garantir que o MCP fictício sem autenticação continue isolado.

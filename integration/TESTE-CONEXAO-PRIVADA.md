# Conexão privada Render — JM Financeiro

Estado: **não configurada**. O banco de testes `jm-financeiro-integracao-teste` está disponível na região Oregon. O conector Render oferece consultas SQL somente leitura e não consegue acessá-lo com a lista de IPs vazia. **Não abrir a allowlist pública.**

## Caminho de implantação

1. Usar um serviço Node na **mesma região Oregon** que o PostgreSQL; não alterar os serviços MCP existentes.
2. Configurar `DATABASE_URL` como variável secreta no Render, com a **Internal Database URL** do banco. Nunca colocar a URL em código, logs, GitHub ou mensagens.
3. Implantar um servidor de testes que, inicialmente, só execute `SELECT 1` e exponha no máximo um health check sem dados sensíveis.
4. Após autenticação e testes, executar a migração `integration/postgres-schema.sql` a partir da conexão privada; confirmar tabelas por `information_schema`.
5. Testar leitura e gravação apenas com dados fictícios, verificando conflitos e isolamento entre contas.
6. Manter sincronização desativada até aprovação da configuração de armazenamento durável e backups. O PostgreSQL gratuito expira em novembro de 2026.

## Limites de segurança

- O acesso privado ao banco não equivale a autenticação dos usuários. Tokens devem ser verificados por assinatura, emissor, público e expiração.
- Não habilitar a sincronização real nem migrar lançamentos do aplicativo original.
- Não utilizar o serviço MCP fictício atual como canal de dados reais.

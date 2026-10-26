# JM Financeiro — API de produção (em construção)

Este diretório é separado de `agent-api` e do MCP fictício público. **Não existe servidor de produção implantado ainda.**

## Migração 001
`migrations/001_initial.sql` define tabelas PostgreSQL de estabelecimentos, contas, categorias, lançamentos, transferências, idempotência e auditoria.

As chaves estrangeiras compostas `(id,establishment_id)` impedem associar lançamentos ou transferências a contas de outro estabelecimento. Transferências não são receitas ou despesas.

## Não executar em dados reais
Ainda faltam autenticação segura, autorização por estabelecimento, API transacional, HTTPS, backups criptografados automatizados, recuperação testada e testes de integração PostgreSQL. O SQL foi versionado, mas não aplicado em banco algum.

Não colocar senhas ou URLs de conexão no repositório. Não conectar ao MCP público de demonstração.

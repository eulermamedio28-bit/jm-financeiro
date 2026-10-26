# JM Financeiro 2.0 — critérios obrigatórios para produção

**Status:** projeto em desenvolvimento; nenhuma infraestrutura privada de produção foi implantada por este documento.

## Separação obrigatória
- Serviço MCP `jm-financeiro-mcp-v2-demo`: público, **somente dados fictícios**, leitura apenas; não adicionar ferramentas de escrita ou segredos financeiros.
- `agent-api/server.js`: API SQLite **exclusivamente local**, bloqueia `NODE_ENV=production`; não remover esse bloqueio para publicar.
- Produção: criar um serviço distinto, autenticação e banco próprios, sem reutilizar tokens do demo.

## Requisitos antes de permitir dados reais
1. HTTPS obrigatório, cookies `Secure`, `HttpOnly`, `SameSite`, proteção CSRF e cabeçalhos de segurança.
2. Login exclusivo de Euler; autenticação resistente a força bruta, sessões revogáveis e recuperação segura. Não criar conta para Silvia sem autorização.
3. Banco de dados persistente privado com acesso restrito, migrações versionadas e transações atômicas.
4. Backups **automáticos e criptografados**, armazenamento separado do servidor, retenção definida, alertas de falha e restauração testada periodicamente.
5. Segredos em gerenciador de variáveis de ambiente; jamais no GitHub, navegador ou logs. Rotação de credenciais.
6. Auditoria por usuário, data, operação e identificador, sem registrar senha, token ou dados sensíveis em logs.
7. API MCP real autenticada, escopos mínimos; toda operação financeira por ChatGPT exige confirmação explícita do usuário e chave de idempotência.
8. Testes de integração, segurança, recuperação e atualização sem perda de dados; acesso mobile em 320–430px.
9. Restrições de rede, limites de requisições, monitoramento, alertas e plano de resposta a incidentes.
10. Separação entre Restaurante JM e Açaí São Carlos por estabelecimento quando necessário; transferências internas não entram no consolidado como receita ou despesa.

## Critério de liberação
**Não publicar a API experimental, não inserir dados reais e não declarar o app pronto** até todos os requisitos terem sido implementados, testados e validados no ambiente de produção.

## Próximo incremento técnico
Construir a API de produção separada com Postgres e autenticação segura, migrar interface mobile para endpoints reais após validação, implantar em serviço privado e validar restauração de backup antes de conectar o MCP com escrita.

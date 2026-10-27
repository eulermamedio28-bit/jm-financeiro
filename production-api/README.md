# JM Financeiro — API financeira em preparação

**Status: piloto local e testes automatizados. Não há implantação de produção nem banco real.**

## Implementado e testado
- PostgreSQL: migrações 001 (razão financeiro) e 002 (autenticação).
- Isolamento de estabelecimentos por chaves estrangeiras compostas.
- Lançamentos e transferências transacionais, com auditoria e idempotência.
- Transferências internas excluídas das receitas/despesas consolidadas.
- Bloqueio de saldo insuficiente e teste de despesas concorrentes.
- Login exclusivo do usuário `euler`, senha derivada por scrypt, sessão revogável e bloqueio de credenciais após falhas.
- Adaptador HTTP **somente de desenvolvimento**, cliente mobile piloto e testes de integração.
- Limite de tentativas por endereço **em memória**: adequado ao piloto local, não ao ambiente distribuído.
- Cabeçalhos de segurança, CSP e respostas sem cache.

## Barreiras obrigatórias antes de produção
1. Provisionar PostgreSQL privado com TLS, usuário de privilégios mínimos e credenciais em gerenciador de segredos; aprovar custos antes.
2. Implantar API atrás de proxy HTTPS confiável, com HSTS, restrição de origem, limites de requisição e logs sem segredos.
3. Substituir limitador de login em memória por rate limiting compartilhado no proxy/armazenamento; considerar bloqueios por conta e origem.
4. Criar procedimento seguro de bootstrap de Euler e troca de senha, sem senhas em repositório, logs ou histórico.
5. Implantar backups automáticos criptografados, retenção, monitoramento e **restauração testada**.
6. Revisar controle de autorização por estabelecimento e conta, tratamento de erros, concorrência entre transferências e lançamentos.
7. Executar revisão de segurança e testes de ponta a ponta no celular com dados fictícios.
8. Somente após aceite explícito: habilitar dados reais e projetar MCP privado autenticado, separado da demonstração pública.

## Operação
Não executar este adaptador HTTP numa interface pública. Ele não implementa TLS, rate limiting distribuído nem bootstrap seguro de usuário. Não reutilizar o MCP fictício público para dados financeiros reais.

Testes: `cd production-api && npm install && npm test`. Integrações PostgreSQL exigem `JM_TEST_DATABASE_URL` apontando para banco **descartável**; migrações e testes alteram esse banco. Nunca utilizar a URL de produção.

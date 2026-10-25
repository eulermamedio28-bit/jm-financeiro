# JM Financeiro — critérios para liberar o piloto individual

**Estado:** planejamento de segurança; nenhuma autenticação individual está implementada ainda.

## Requisitos obrigatórios antes de conectar dados reais
1. Identidade individual: login próprio de Euler, sessão com expiração, revogação e autenticação forte. Um token compartilhado de desenvolvimento **não** comprova identidade.
2. Hospedagem privada com HTTPS, armazenamento protegido de segredos e autorização no servidor em todas as rotas. Não usar o repositório público como armazenamento financeiro.
3. Banco separado para produção, migrações versionadas, backups criptografados e restauração testada.
4. Auditoria com usuário autenticado, data e operação; não permitir que cliente informe livremente o autor.
5. Limites de requisição, validação de entradas, políticas de CORS explícitas e testes de segurança.
6. Integração gradual com a PWA: primeiro leitura, depois escrita com confirmações, sempre preservando backup do aplicativo atual.
7. Conferir lançamentos, transferências e saldo consolidado contra um conjunto de testes antes da migração.
8. Nunca armazenar credenciais, dados reais ou cópias de produção neste repositório público.

## Condições do piloto
- Usuário inicial previsto: Euler. Silvia não está cadastrada no piloto.
- Apenas dados fictícios até aprovação dos testes e da segurança.
- Não publicar o serviço experimental diretamente na internet.
- Não substituir nem importar por cima dos dados atuais do aplicativo.
- Alterações de desenvolvimento podem ser feitas na branch `dev/agente-financeiro-1`; implantação e movimentações reais exigem validação específica.

## Pendências verificáveis
- [ ] Execução de testes automatizados confirmada
- [ ] Autenticação individual implementada e testada
- [ ] Autorização por usuário em cada operação
- [ ] HTTPS e ambiente privado configurados
- [ ] Backup/restauração testados
- [ ] Integração de leitura da PWA testada
- [ ] Reconciliação de valores validada
- [ ] Liberação explícita de produção

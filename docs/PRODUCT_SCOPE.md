# JM Financeiro — demonstração de produto para restaurantes

O proprietário confirmou que todos os registros atuais são fictícios. O ambiente atual é demonstrativo; nenhum desses valores representa o caixa real do restaurante.

## Experiência implementada nesta revisão

- Início com indicadores, contas e últimas movimentações.
- Menu inferior com Início, Lançamentos, Relatórios e Gerenciar.
- Botão + e formulários em janelas dedicadas.
- Datas brasileiras, busca e filtro por tipo, navegação por mês e intervalo.
- Relatório de entradas/saídas e despesas por categoria, sempre calculado a partir da base.
- Cadastro de cartões com limite, fechamento e vencimento persistidos por usuário; disponível calculado pelas compras pendentes.
- Mesma identidade vinho/dourado e logo original, sem apagar dados ou recomeçar o projeto.

## Condições ainda necessárias antes de vender

Esta revisão não transforma automaticamente a instalação atual em um SaaS pronto para venda. O servidor ainda tem a autorização individual existente (e-mail permitido). O isolamento por usuário testado não substitui o modelo de organizações e membros por restaurante.

Antes de cadastrar clientes pagantes, implementar e validar:

1. Organizações/restaurantes, membros e papéis; autorização server-side por restaurante em todas as rotas e no MCP.
2. Ambiente real/demonstração determinado por restaurante, sem poder ser trocado pelo cliente em uma requisição.
3. Provisionamento e recuperação de acesso; sessões seguras no Android; trilha de auditoria e ajustes/estornos.
4. Banco durável com plano adequado, backups e teste de restauração (o banco atual informa expiração em 26/11/2026).
5. Chave permanente de assinatura Android e atualização sem reinstalação; validação no Galaxy S26 normal do proprietário.
6. Fechamento mensal, lançamentos previstos, conciliação e regras contábeis documentadas.
7. Condições de uso, privacidade, suporte, faturamento e implantação de clientes.

Não abrir o allowlist atual para todos os usuários como atalho para atender vários restaurantes. Não cadastrar dados reais no ambiente demonstrativo atual.

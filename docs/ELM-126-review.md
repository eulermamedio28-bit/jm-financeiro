# ELM Gestão 126 — edição, exclusão lógica e restauração

## Escopo

Lançamentos comuns podem ter descrição, valor, data, conta e categoria corrigidos. Tipo permanece fixo. Excluir exige motivo e confirmação explícita; preserva o registro no banco e retira seus efeitos de saldos, resultados, listas e CSV. Restaurar exige motivo e devolve os efeitos financeiros. Nenhum registro existente é alterado automaticamente.

O histórico registra antes/depois, ação, motivo, horário do servidor e autor obtido da sessão autenticada. O cliente não pode fornecer o autor ou mudar o usuário do registro. Reenvio usa o mesmo identificador e não repete a ação. Versão esperada e bloqueio de linha rejeitam alterações simultâneas ou desatualizadas.

Pagamentos de fatura, inclusive registros antigos identificáveis por categoria/descrição, são bloqueados nestas operações. Transferências e compras de cartão permanecem em seus próprios registros e não têm exclusão genérica. O estorno de fatura exige uma etapa posterior.

## Migração e compatibilidade

Migração aditiva em jm_lancamentos: excluido_em, excluido_por e versao (zero para registros existentes). Nova tabela jm_lancamentos_historico mantém os eventos; jm_lancamentos_correcoes continua preservada. Não há DELETE de movimentos nem alteração em valores existentes na inicialização.

As consultas do painel, resumo, listagem e saldos passam a selecionar movimentos ativos. As fórmulas de cálculo de dashboard permanecem iguais; a consulta de loadDashboard exclui movimentos marcados. O servidor anuncia entryManagementEnabled somente quando inicializado com o código novo.

Depois de efetuar exclusões, não restaurar versões antigas do backend que não filtram excluido_em: elas voltariam a contar movimentos excluídos. Para reversão, preservar as consultas novas ou restaurar explicitamente os movimentos de forma auditada. Aplicativo 125 continua compatível com o backend novo; funcionalidades novas exigem APK 126.

## Interface

Toque em uma movimentação, na tela inicial ou na lista, para ver os detalhes. Editar e Excluir aparecem quando o servidor anuncia suporte e o movimento não é um pagamento protegido. Gerenciar contém Lançamentos excluídos; nos detalhes de um excluído aparecem Restaurar e Ver histórico. O histórico mostra data, motivo e antes/depois.

## Validação prevista

- PostgreSQL isolado: edição muda corretamente o período e a conta; exclusão retira de todos os modelos de leitura; restauração recupera os efeitos; registro original e auditoria preservados.
- Isolamento por usuário, conta de outro usuário, rejeição de autor fornecido, idempotência concorrente, conflito de reenvio, edição concorrente e pagamentos protegidos.
- Navegador: editar, excluir, consultar histórico e restaurar, além dos testes anteriores de login, lançamentos, contas, transferências, cartões, pagamento, exportação e temas.
- Android: instalação, WebView, temas e CSV no seletor nativo.
- Assinatura final deve reutilizar a chave permanente da versão 125. O debug de CI é apenas evidência de teste, nunca distribuído como atualização compatível.

## Arquivos alterados

| Arquivo | Finalidade |
|---|---|
| integration/ledger-management.mjs | Validação, transações, histórico e operações reversíveis |
| integration/ledger-management.test.mjs | Regras, isolamento e integração PostgreSQL |
| integration/ledger-staging.mjs | Colunas aditivas e consultas somente de ativos |
| integration/financial-accounts.mjs | Saldos e não alocados desconsideram excluídos |
| integration/financial-dashboard.mjs | Leitura do painel somente de ativos |
| integration/ledger-reconciliation.mjs | Proteção de excluídos e incremento de versão |
| integration/staging-financial-api.mjs | Rotas autenticadas e capacidade anunciada |
| integration/native-sync/cloud-app.js | Formulários e consultas via fluxo existente |
| integration/native-sync/professional-ui.js | Detalhes, edição, confirmação e recuperação |
| integration/native-sync/professional.css | Apresentação das novas ações |
| scripts/cloud-ui.test.cjs | Fluxo completo de editar/excluir/restaurar |
| android-version.json, .github/workflows/android-debug-apk.yml | Identificação 126 e artefato sem assinatura |

Continuam pendentes a separação de ambiente real, hospedagem durável, restauração de backup e fechamento diário. Esta versão não implementa esses módulos nem muda plano de hospedagem.


## Resultado da execução de 31/10/2026

- Commit de implementação: 0dd787917418338df2884baf582a5cebd41ad24a.
- GitHub Actions: https://github.com/eulermamedio28-bit/jm-financeiro/actions/runs/41199080515. 53 testes aprovados, zero falhas; navegador e compilação aprovados; instalação do debug de teste, WebView, temas nativos e CSV no seletor Android aprovados.
- Deploy Render dep-dbithoo473hc73ajn6tg, estado live, mesmo commit. Migração aditiva inicializada; nenhuma operação financeira autenticada foi executada nesta entrega. A contagem direta de registros não pôde ser consultada porque o banco bloqueia conexões externas; nenhuma regra de rede foi alterada.
- APK final: ELM-Gestao-126.apk; SHA-256 d1fc79f8aa6e0494127a111177b43f00dfb93ef8e9df59891158bc7c3b50154f.
- Certificado SHA-256: f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05, igual ao APK 125. Verificação de assinatura, alinhamento e conteúdo comparado ao release testado aprovada. O arquivo final assinado localmente não foi instalado no emulador; não se alega teste de atualização no aparelho.
- Validação física da edição/exclusão/restauração da versão 126 no S26 ainda pendente.

Na versão 125, o proprietário já comprovou instalação e painel no S26 às 08:39. CSV exportado pelo aparelho e conferido: sete lançamentos, receitas R$ 100,00, despesas R$ 1.117,65, resultado -R$ 1.017,65; BOM, acentos, separador e categoria Embalagens corretos. Essas verificações superam as pendências físicas correspondentes da entrega anterior.

O histórico consultado na interface mostra os últimos 100 eventos por movimento; a lista de excluídos retorna até 500 movimentos mais recentes. A retenção no banco não é limitada por esses tamanhos de consulta. A exportação JSON existente não comprova restauração completa com o histórico; backup/restauração continuam pendentes antes de uso real.

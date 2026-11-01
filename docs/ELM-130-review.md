# ELM Gestão 130
 — fechamento diário e recebimentos (01/11/2026)

### Validação física da versão 129

O usuário confirmou cadastro de uma conta a pagar fictícia de R$ 10,00, pagamento, reversão e cancelamento. O pagamento gerou despesa de R$ 10,00 em novembro e saldo parcial de R$ 1.040,00. Ao desfazer, despesas e resultado voltaram a zero e o saldo voltou a R$ 1.050,00. Cancelar a conta aberta retirou a pendência sem alterar o saldo. A diferença em relação ao saldo anterior de R$ 1.030,00 decorre de duas contas financeiras de teste criadas no celular, cada uma com R$ 10,00 de saldo inicial; não foi receita de vendas. Essa confirmação substitui a pendência física nas seções históricas.

### Fechamento diário

Gerenciar → Fechamento diário → Novo fechamento. Um fechamento ativo por data de vendas. Dinheiro, Pix, débito, crédito e iFood são informados separadamente, com vendas brutas e taxas previstas (dinheiro não admite taxa). O resumo exibe bruto, taxas, líquido previsto, recebido e a receber por forma e no total. A lista usa o período selecionado no painel. Não há integração automática com adquirentes, iFood ou Cardápio Web nesta etapa.

Conferência do dinheiro físico: saldo inicial declarado + vendas em dinheiro + outras entradas declaradas - saídas/retiradas declaradas = dinheiro esperado. A diferença é o dinheiro contado menos o esperado; positiva indica sobra e negativa indica falta. São valores informados pelo usuário, não uma leitura automática das movimentações bancárias ou do caixa. Outras entradas e saídas não são lançadas automaticamente no financeiro pelo fechamento.

Salvar ou editar o fechamento registra vendas e conferência sem criar receitas. Os saldos e o relatório financeiro continuam baseados no dinheiro efetivamente registrado como recebido. Isso separa venda do dia e repasse posterior.

### Receber sem duplicar

Cada forma de pagamento possui duas opções quando houver saldo a receber:

- Registrar recebimento: usar somente se ainda não houver uma receita lançada. Escolher valor, data de recebimento e conta de entrada. A transação cria uma única receita pelo valor efetivamente recebido e registra o abatimento do saldo a receber. Aceita recebimentos parciais até o líquido previsto, inclusive para repasses de cartão/iFood em data posterior à venda.
- Vincular receita existente: escolher uma receita ativa já registrada, com conta vinculada, data igual ou posterior às vendas e valor compatível com o saldo a receber. Não cria outro lançamento nem muda o saldo. Uma receita não pode ficar vinculada ativamente a dois recebimentos.

Desfazer recebimento exige motivo. Se a entrada foi criada pelo fechamento, é marcada como excluída e deixa de contar nos saldos/relatórios; o original fica preservado. Se foi apenas vinculada, desfazer remove somente o vínculo e mantém a receita original no financeiro. O resumo volta a mostrar o valor a receber.

Edição não pode reduzir o líquido abaixo dos recebimentos já vinculados nem mover o dia das vendas para depois de um recebimento existente. Cancelar exige desfazer todos os recebimentos antes. Registros cancelados e eventos de antes/depois permanecem no banco. Pagamentos/recebimentos ligados ao fechamento ficam protegidos contra edição, exclusão, restauração e correção genéricas; usar o próprio módulo para desfazer primeiro.

As taxas do fechamento servem para apurar o líquido previsto. O lançamento de recebimento entra pelo líquido efetivamente recebido; não é criada uma segunda despesa automática de taxa. O resultado do painel continua sendo fluxo de entradas/saídas, não lucro contábil ou DRE.

### Persistência e compatibilidade

Tabelas aditivas jm_fechamentos_caixa, jm_fechamento_recebimentos e jm_fechamento_eventos, mais coluna opcional fechamento_id em jm_lancamentos. Índices únicos por usuário/data de fechamento ativo e por usuário/receita vinculada ativa. Identificador de reenvio, bloqueios e versão esperada impedem repetição e corrida entre alterações. Auditoria registra usuário autenticado, horário, solicitação, antes e depois. Novo GET/POST /v1/fechamentos, protegido pela sessão existente.

O painel lê os fechamentos e recebimentos na mesma consulta consistente dos dados financeiros. Fórmulas de saldos e resultados permanecem iguais. Aplicativos anteriores ignoram os campos novos. Não reverter o backend para versões anteriores à 130 após registrar vínculos sem preservar as proteções novas; rollback de código não desfaz dados ou migrações.

### Arquivos alterados

- integration/cash-closing-model.mjs: validação dos valores e cálculo compartilhado de vendas, taxas, recebido, pendente e conferência física.
- integration/cash-closing.mjs: esquema, cadastro/edição/cancelamento, recebimento/vínculo/reversão e auditoria em transações.
- integration/cash-closing.test.mjs: consistência, validação, isolamento, concorrência, idempotência, preservação da receita vinculada e reversão de entrada criada.
- integration/native-sync/closing-ui.js: tela, formulários, prévia da conferência e ações de recebimento.
- integration/native-sync/cloud-app.js: integração com leitura e gravação pendente existentes, mensagens e limpeza da sessão.
- integration/native-sync/professional-ui.js e professional.css: indicação de vínculo, proteção e apresentação do módulo.
- integration/financial-dashboard.mjs: leitura opcional e consistente do fechamento, sem alterar fórmulas financeiras.
- integration/ledger-management.mjs e ledger-reconciliation.mjs: proteção dos movimentos vinculados.
- integration/staging-financial-api.mjs: inicialização e endpoint autenticado.
- build.js e sw.js: empacotamento do modelo/módulo e cache público 130.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 130 / 1.3.0-preview.
- scripts/cloud-ui.test.cjs: fechamento, diferença de caixa, entrada, vínculo, reversões e cancelamento, com regressão dos fluxos anteriores.

Verificação: build:verify e testes locais do modelo passaram. A CI executou 61 testes com PostgreSQL isolado, todos aprovados, incluindo concorrência, idempotência, isolamento por usuário, proteção de receita vinculada, reversão e consistência de saldos. O teste de interface passou por conferência de caixa, salvamento sem gerar receita, recebimento novo, vínculo de receita existente, reversões e cancelamento; os fluxos de contas a pagar, cartões, faturas, transferências, edição, CSV e PDF também passaram. A tela foi inspecionada visualmente em formato de celular. Execução Android: 41276174371.

Servidor: implantação dep-dbjcmh6tlv9c73crmung ficou live com o commit abaixo; /health retornou 200 com readyForFinancialData=true e /v1/fechamentos respondeu 401 sem autenticação. Nenhuma gravação nos registros do usuário foi feita para testar a implantação.

APK final: ELM-Gestao-130.apk, SHA-256 21386f1c5ad5dbf82ff8ebe8422e1f37d5cd2d6ed09a9f6f338d69eece834017. Mesma assinatura permanente das versões anteriores (certificado SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05), esquemas v1/v2/v3 verificados. Conteúdo original preservado byte a byte após assinatura; entradas não comprimidas alinhadas em 4 bytes. Instalar por cima, sem desinstalar.

Teste físico sugerido: novo fechamento fictício com vendas em dinheiro de R$ 10,00, abertura zero, outras entradas/saídas zero e dinheiro contado R$ 10,00. Resultado da conferência esperado: diferença zero; salvar não altera o saldo. Registrar recebimento cria a receita somente se ela não existir; caso já exista, usar o vínculo. Desfazer antes de cancelar o fechamento de teste.

Código: 03275a229f4b86bab5a9e83a1ddf59e72c58ff5b. Nenhum registro financeiro do usuário foi alterado nos testes automatizados. Instalação e WebView no emulador Android, temas/barras nativas e salvamento CSV/PDF passaram. O emulador instalou o artefato debug da mesma compilação; o APK final distribuído foi assinado e verificado separadamente. Validação física da 130 pendente.


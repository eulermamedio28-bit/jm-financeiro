# ELM Gestão 129
 — contas a pagar e repetição mensal (01/11/2026)

### Validação física da versão 128 concluída

O usuário instalou a versão 128 e enviou dois PDFs exportados pelo celular. O primeiro, de 01/11/2026 a 01/11/2026, veio sem lançamentos e com totais zero. O segundo, de outubro completo, trouxe 7 lançamentos, receitas R$ 100,00, despesas R$ 1.117,65 e resultado -R$ 1.017,65, iguais ao painel. “Teste embalagens” e sua categoria foram exportados corretamente. Os arquivos foram lidos e renderizados, sem cortes na tabela. Exportação física validada.

### Escopo da versão 129

Gerenciar → Contas a pagar. Cadastro de descrição, valor previsto, vencimento, natureza fixa ou variável e categoria. Repetição mensal explícita de 1 a 12 vencimentos, criados em uma transação. Não há repetição infinita, agendamento de pagamento nem notificação automática nesta etapa. Mês sem o dia original usa seu último dia; o próximo mês retoma o dia original (31/01 → 28/02 → 31/03).

A lista mostra contas abertas, vencidas, pagas e canceladas, de todos os vencimentos, sem depender do período de receitas/despesas selecionado no painel. O total a pagar soma os valores previstos das contas abertas. A indicação de atraso usa a data de São Paulo.

Criar, editar ou cancelar uma conta em aberto não altera saldo nem resultado. Editar muda apenas o vencimento selecionado, preservando os demais meses da série. Registrar pagamento exige valor efetivamente pago, data e conta bancária/caixa do usuário. Uma transação insere uma única despesa na tabela já usada pelo painel, CSV e PDF e marca a conta como paga. Valor pago pode diferir do previsto, para ajustar água, luz e outros gastos.

Desfazer pagamento exige motivo, marca a despesa vinculada como excluída e reabre a conta em uma mesma transação. O lançamento original permanece no banco. O histórico de eventos registra usuário autenticado, horário, solicitação, antes e depois. Contas canceladas permanecem consultáveis; novo cadastro pode ser feito se necessário.

Pagamentos vinculados a contas a pagar são protegidos contra edição, exclusão, restauração ou correção genérica de conta/categoria. Devem ser desfeitos no módulo de contas a pagar e registrados novamente com os dados corretos. Isso evita que a conta fique paga enquanto a despesa correspondente é apagada por outro caminho.

### Persistência e compatibilidade

Nova tabela jm_contas_pagar e tabela de auditoria jm_contas_pagar_eventos. Colunas aditivas conta_pagar_id e natureza_despesa em jm_lancamentos; índice único impede mais de um pagamento ativo por conta a pagar. Nenhum lançamento pré-existente é alterado na migração. Todas as operações são limitadas ao usuário autenticado. Identificador de reenvio, bloqueio transacional e versão esperada protegem contra duplicidade e alterações simultâneas. O painel lê contas a pagar e movimentos na mesma consulta consistente; fórmulas financeiras permanecem iguais.

Endpoint GET/POST /v1/contas-pagar. Compatível com aplicativos antigos, que ignoram os novos dados. Depois de registrar pagamentos vinculados, não reverter o backend para código anterior à 129 sem preservar as proteções de vínculo e reversão. Uma reversão de código não desfaz migrações ou pagamentos.

### Arquivos alterados

- integration/accounts-payable.mjs: esquema, validação, vencimentos mensais, cadastro/edição/cancelamento, pagamento e reversão atômicos, auditoria e idempotência.
- integration/accounts-payable.test.mjs: datas, anos bissextos, validação, isolamento, concorrência, reversão, proteção de vínculo e saldos com PostgreSQL isolado.
- integration/staging-financial-api.mjs: inicialização, endpoint autenticado e sinalização de suporte no painel.
- integration/financial-dashboard.mjs: leitura opcional das contas a pagar na mesma transação do painel; cálculo financeiro preservado.
- integration/ledger-management.mjs e ledger-reconciliation.mjs: proteção dos pagamentos vinculados contra alterações genéricas.
- integration/native-sync/payables-ui.js: tela, filtros, formulários, seleção de conta, mensagens e ações.
- integration/native-sync/cloud-app.js: integração com consulta e gravação pendente já existentes, limpeza de sessão e mensagens de erro.
- integration/native-sync/professional-ui.js e professional.css: indicação de vínculo e apresentação dos formulários.
- build.js e sw.js: empacotamento do módulo e cache público 129.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 129 / 1.2.9-preview.
- scripts/cloud-ui.test.cjs: fluxo de criar recorrência, pagar com valor diferente, desfazer e cancelar, preservando os testes anteriores.

Verificação: build:verify local e testes de validação/calendário passaram. Na CI, 58 testes com PostgreSQL isolado passaram, zero falhas; o fluxo de interface criou recorrência sem mudar saldo, pagou com valor ajustado, desfez e cancelou, além de repetir os testes de login, painel, contas, transferências, cartões, faturas, edição/exclusão/restauração e exportações. A tela de celular foi inspecionada visualmente; a captura permanece somente como evidência interna.

Servidor: implantação dep-dbjcbdnlk1mc738rhqbg ficou live com o commit abaixo. /health retornou 200 e readyForFinancialData=true, após concluir a inicialização das tabelas. /v1/contas-pagar retornou 401 sem sessão, confirmando a proteção do endpoint novo. Não foi feita gravação autenticada nos dados do usuário durante a verificação de produção.

APK final: ELM-Gestao-129.apk, SHA-256 cb319b52f4618790c3264a3d6a1fd26e114e24e92e8685b4dcf6b35d50dc71e6. Assinatura permanente das versões anteriores verificada (certificado SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05), esquemas v1/v2/v3 válidos. Conteúdo original preservado byte a byte após assinatura e entradas não comprimidas alinhadas em 4 bytes. Instalar por cima, sem desinstalar.

Código: b3a280f1bb2feacdaed26dd00c4f23ae012a861d. Execução Android: 41274670412. Nenhum lançamento financeiro do usuário foi criado ou alterado nos testes automatizados. Instalação no emulador Android, WebView, temas, barras nativas, salvamento CSV e PDF passaram. O emulador instalou o APK debug da mesma compilação; o APK final distribuído foi assinado e verificado separadamente. A validação física da versão 129 permanece pendente.


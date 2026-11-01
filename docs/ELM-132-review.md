# ELM Gestão 132 — início compacto e comparação em Relatórios (01/11/2026)

## Mudanças

Atende aos itens 1 e 2 aprovados: a Visão geral apresenta resultado, saldo das contas, aviso de lançamentos sem conta quando necessário, últimas movimentações e, por último, um painel recolhido “Ver comparação”. O comparativo já não empurra o saldo e as movimentações para baixo. Ao abrir, mostra datas e diferenças curtas, como “Receitas: R$ 50,00 a mais” ou “Despesas: sem alteração”, com percentual quando aplicável. O botão “Ver comparação completa” abre Relatórios, onde aparecem os valores atual/anterior e suas diferenças.

Sem lançamentos em ambos os períodos, o comparativo mostra um único aviso em vez de três linhas zeradas. As datas continuam visíveis ao abrir. Selecionar um intervalo que cruza meses mantém a orientação para selecionar um único mês. O painel inicia recolhido e volta a esse estado ao encerrar a sessão. Atualizar os dados não fecha uma comparação que o usuário esteja lendo.

A comparação completa fica em Relatórios entre Entradas e saídas e Despesas por categoria. Mantém as mesmas regras de períodos da versão 131. Não houve alteração em financial-dashboard.mjs, month-comparison.mjs, login, endpoints, gravações, migrações ou saldos. Backend 130 permanece compatível, sem nova implantação. appId e URL do servidor preservados.

Os demais itens sugeridos (textos do fechamento, posicionamento do botão + e repetir lançamento) não fazem parte desta entrega.

## Validação da 131 no celular

O proprietário enviou capturas com o cabeçalho Versão 131 e comparativo de 01/11/2026 contra 01/10/2026, ambos sem lançamentos. Saldo parcial R$ 1.050,00, quatro lançamentos sem conta. As capturas confirmam instalação e exibição; não constituem validação física de diferenças não nulas ou percentuais. O tamanho excessivo do cartão motivou esta mudança de apresentação.

## Arquivos

- integration/native-sync/professional-ui.js: ordem da tela inicial, painel recolhido, textos resumidos, comparação completa em Relatórios, aviso único em período vazio e limpeza da sessão.
- integration/native-sync/professional.css: dimensões compactas e foco de teclado no controle de expansão.
- scripts/cloud-ui.test.cjs: ordem dos elementos, recolhimento/expansão, navegação para relatório, filtros, ausência de lançamentos em ambos os períodos e ausência de gravações.
- sw.js: cache público 132.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 132 / 1.3.2-preview.

## Verificações

Verificações locais de build, resumo autenticado, saldos, transferências, conciliação e faturas passaram. Três testes de calendário/comparativo passaram. Execução Android 41310478140, commit 2a7932b81bc60751989efa3050e914d71b4f12de: 64 testes com PostgreSQL isolado aprovados, zero falhas. O teste de interface verificou ordem da tela inicial, estado recolhido, expansão, navegação para Relatórios, datas dos períodos, aviso único sem lançamentos, ausência de novas gravações e ausência de rolagem horizontal em 320/430 px. As capturas do início e relatório foram inspecionadas visualmente e ficam como evidência interna. Regressões de login, edição/exclusão/restauração, contas, transferências, cartões/faturas, contas a pagar, fechamento, CSV e PDF também passaram.

Compilação e instalação em emulador Android aprovadas, incluindo abertura da WebView, marca, temas/barras nativas e salvamento CSV/PDF. O emulador instalou o artefato debug da mesma compilação. O APK final foi assinado e verificado separadamente com a chave permanente desde a versão 125: certificado SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05, esquemas v1/v2/v3 válidos. Todos os bytes originais foram preservados após assinatura, entradas não comprimidas alinhadas em 4 bytes, arquivos principais do pacote conferidos com o build local.

APK ELM-Gestao-132.apk, SHA-256 71eb569012fca02a1abe2de589390accc3304b90fd22925f6bca5fb6965869ec. Instalar por cima, sem desinstalar. Nenhum registro do usuário foi criado ou alterado nos testes. Backend permanece na implantação compatível 130; não houve mudança de plano, ambiente, variáveis ou URL. Aplicativo continua demonstrativo. Validação física da versão 132 no S26 permanece pendente; basta conferir a nova ordem e abrir Ver comparação ou Relatórios, sem cadastrar novos movimentos de teste.

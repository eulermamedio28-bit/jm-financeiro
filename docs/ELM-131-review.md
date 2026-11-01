# ELM Gestão 131 — comparativo com o mês anterior (01/11/2026)

## Comportamento

A Visão geral apresenta receitas, despesas e resultado do intervalo selecionado e do intervalo correspondente no mês anterior, com diferença em reais e percentual quando a base é positiva e o valor atual não é negativo. Não apresenta percentual para base zero ou negativa nem para resultado atual negativo; nesses casos, mostra somente a diferença em reais. “Aumentou” e “Diminuiu” descrevem o valor, sem classificar aumento de despesa como melhora.

Mês completo compara com mês anterior completo (novembro 1–30 contra outubro 1–31). Intervalo parcial mantém os números dos dias, limitando ao último dia existente (março 30–31 contra fevereiro 28–28, ou 29 em ano bissexto). As datas exatas aparecem no cartão. Intervalos que atravessam meses ou Todo o histórico mostram uma orientação para selecionar um único mês. Períodos sem lançamentos recebem aviso; ausência de dados registrados não é tratada como prova de ausência de movimento real.

Reutiliza a função dashboard existente e a mesma leitura de dados ativos da nuvem. Transferências e compras de cartão ainda não pagas não entram no resultado; pagamentos e recebimentos entram conforme as regras existentes. Fechamentos sem receita vinculada/registrada não viram receita automaticamente. Resultado continua sendo fluxo de entradas e saídas, não lucro ou DRE. financial-dashboard.mjs não foi alterado.

Não há migração, endpoint, login ou gravação financeira novos. O servidor da versão 130 é compatível; não é necessário implantar alteração de backend. Nenhum registro do usuário foi modificado para testar o comparativo.

## Arquivos

- integration/month-comparison.mjs: determina datas correspondentes e calcula diferenças usando dashboard.
- integration/month-comparison.test.mjs: mês completo/parcial, fevereiro, ano bissexto, janeiro, intervalo inválido, base zero/negativa, transferências/compras sem efeito e imutabilidade dos dados.
- integration/native-sync/cloud-app.js: fornece o comparativo atualizado ao renderizar.
- integration/native-sync/professional-ui.js: cartão com datas, três métricas, diferenças e avisos.
- integration/native-sync/professional.css: apresentação adaptável ao celular e aos temas existentes.
- build.js e sw.js: empacotamento do módulo local e cache público 131.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 131 / 1.3.1-preview.
- scripts/cloud-ui.test.cjs: atualização pelo filtro, intervalo completo, múltiplos meses, larguras 320/430 px e ausência de gravações.

## Continuidade do teste 130

O usuário enviou tela de fechamento com vendas em dinheiro de R$ 10,00, dinheiro contado R$ 10,00 e diferença zero. Depois informou que cancelou o teste. Não houve mensagem de erro visível nessa captura. Isso comprova a exibição do fechamento; não comprova no aparelho todas as etapas de recebimento e reversão. Não é necessário repetir o teste cancelado. Os fluxos de recebimento/vínculo/reversão têm a evidência automatizada da versão 130.

## Verificação

build:verify e três testes novos passaram localmente. Execução Android 41293544494, commit c58275940cfaf99190b7687b8d8a7b8488e53336 (implementação e2455432aad384a6bd0e3d67cd003e4af1d2c235). Todos os 64 testes com PostgreSQL isolado passaram, sem falhas. Teste de interface passou, incluindo atualização pelo filtro, datas correspondentes, intervalos de vários meses, ausência de novas gravações e larguras de 320/430 px; a captura foi inspecionada visualmente e permanece evidência interna. As regressões de login, painel, edição/exclusão/restauração, contas, transferências, cartões/faturas, contas a pagar, fechamento, CSV e PDF também passaram.

A primeira execução 41293365797 parou porque o teste tentou clicar Atualizar com o filtro fechado. O roteiro foi corrigido para abrir o filtro pela interface; não foi usada interação forçada nem removida a verificação. Compilação posterior concluída com sucesso. Instalação, WebView, temas/barras nativas e exportações CSV/PDF no emulador Android passaram. O teste instalou o artefato debug da mesma compilação; o APK final foi assinado e verificado separadamente.

APK ELM-Gestao-131.apk, SHA-256 91cb614296789156f3ea9b0b4fd0ada511c4a384e6a319b352f2fa2fa2f37ddb. Certificado permanente SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05, esquemas v1/v2/v3 válidos. Todos os bytes originais preservados após assinatura, entradas não comprimidas alinhadas em 4 bytes e fontes empacotados conferidos com o build local. Atualizar por cima sem desinstalar. appId e URL do servidor permanecem iguais.

O backend permanece no deploy 130 compatível; não houve nova implantação nem alteração de variáveis ou plano nesta etapa. A base continua demonstrativa. Validação física da versão 131 no S26 permanece pendente. Para conferir, basta abrir Visão geral, observar o cartão e as datas, e mudar o período; não é preciso cadastrar novos testes financeiros.

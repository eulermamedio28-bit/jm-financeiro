# ELM Gestão 125 — escopo e revisão

## Resultado preparado

A versão 125 adapta a proposta recebida ao código-fonte do build. Mantém appId br.com.restaurantejm.financeiro, URL existente, login, protocolo de gravação e financial-dashboard.mjs. Não altera servidor nem dados financeiros.

- Tela inicial: resultado do período, receitas/despesas, saldo clicável, aviso curto de movimentos sem conta e três movimentações. Sem atalhos/lista de contas redundantes.
- Movimentação recente abre detalhes acessíveis por teclado e toque; correção permanece disponível no detalhe e em Lançamentos.
- Conta padrão limitada ao usuário autenticado e validada contra contas existentes; descrição vazia recebe Receita/Despesa. Valor vem primeiro; categorias têm chips e Outra….
- Tema claro padrão; escuro/automático preservados. Fontes Inter 400/500/600/700 locais com licença OFL. Verde do claro foi escurecido para atender contraste de texto.
- Ícone B, garfo na moeda, aplicado às fontes web/Android. Ícones adaptativos e manifest PNG any/maskable.
- CSV somente do período selecionado, BOM, separador ponto e vírgula, centavos e datas brasileiras, escape de aspas e proteção contra fórmulas. No Android usa ACTION_CREATE_DOCUMENT, com confirmação apenas após gravar e cancelar sem alegar sucesso.
- Service worker limitado a lista de arquivos públicos, sem cache de API/autorização; não modifica autenticação.

## Arquivos por finalidade

| Arquivos | Mudança |
|---|---|
| integration/native-sync/professional-ui.js | Navegação compacta, detalhes, filtro sem conta, chips e foco |
| integration/native-sync/cloud-app.js | Apresentação dos totais, preferência de conta por usuário, textos, descrição padrão e exportação |
| integration/native-sync/professional.css | Hierarquia, temas, contraste, fonte local e adaptação de valores |
| integration/native-sync/csv-export.js | Serialização CSV sem fórmulas em campos de texto |
| integration/android-native/ELMExportPlugin.java | Seletor Android de destino e gravação UTF-8 |
| integration/android-native/MainActivity.java | Registro do plugin de exportação |
| fonts/* | Inter em quatro pesos e licença |
| brand/elm-mark.svg, brand/android-res/*, icons/*.png | Ícone B fornecido no pacote |
| build.js, scripts/android-icons.py, scripts/android-system-bars.py | Integração dos arquivos-fonte ao build |
| manifest.webmanifest, sw.js | Ícones e cache apenas de conteúdo público |
| android-version.json, .github/workflows/android-debug-apk.yml | VersionCode 125, release sem assinatura e certificado de teste |
| integration/csv-export.test.mjs, scripts/cloud-ui.test.cjs | Testes do CSV e fluxos atualizados, mantendo os anteriores |
| scripts/android-webview-smoke.cjs, scripts/android-export-smoke.cjs, scripts/android-install-smoke.sh | Validação do WebView, tema nativo e arquivo CSV salvo pelo seletor |

## Assinatura — bloqueio de atualização

Certificados SHA-256 extraídos dos APKs entregues:

- 122: 23578d8290cc124deb961828368b6eb65a27a5669b7be89cf8aeea96308a0050.
- 123: 0e1d17c6a0b3092258d096698055d0200effe3b13800153f362f130709f288f4.
- 124: 075c18d0005c948acc995e658df2ba90f6fdeeb154a21dd0e122a51885c8aaca.

Os certificados diferem. O workflow atual usa chave debug efêmera do runner; não há chave estável configurada no código revisado. O APK debug desta execução serve exclusivamente aos testes e não é apresentado como atualização compatível. A release sem assinatura fica pronta para assinar com a chave correta. É necessário o arquivo privado da chave do APK instalado; o certificado público não permite recuperar essa chave. Não orientar desinstalação nem alegar compatibilidade.

## Uso real por um mês — bloqueios verificados em 31/10/2026

- Última sessão física mostrada pelo proprietário: Demonstração · dados fictícios. Sem sessão autenticada disponível nesta revisão, o flag remoto não foi reconsultado; não se declara ambiente real. A API só informa real quando JM_DATA_ENVIRONMENT é real, e o código não foi alterado.
- Render confirmou o serviço atual no plano free. Serviço gratuito dorme após 15 minutos sem tráfego e pode levar aproximadamente um minuto para voltar (https://render.com/docs/free).
- Banco jm-financeiro-integracao-teste, free, disponível, expira em 26/11/2026 às 02:56 UTC (25/11 às 23:56 em São Paulo). Esta data é anterior a um piloto completo de um mês iniciado em 31/10.
- O plano gratuito do banco não oferece backup gerenciado. Não foi comprovada restauração independente. Exportação CSV ou JSON não comprova, por si só, recuperação completa e consistente.
- Antes do piloto: banco durável, backup/restauração testados, ambiente real separado e assinatura permanente. Nenhum gasto, exclusão ou migração foi executado.

## Plano separado: exclusão e edição financeira

Não implementado; exige aprovação específica após revisar riscos.

1. Definir exclusão lógica/estorno com identificação do usuário autenticado, momento e motivo; manter antes/depois em trilha imutável. Não aceitar autor fornecido pelo cliente.
2. Alterar consultas e relatórios de forma consistente para excluir movimentos cancelados do resultado e do saldo, preservando consulta ao histórico. Testar todas as telas e integrações que consomem o livro financeiro.
3. Operar em transação com bloqueio do movimento, verificação da versão anterior, escopo do usuário e chave idempotente. Repetições não criam múltiplos cancelamentos.
4. Pagamentos de fatura devem ser revertidos junto com o vínculo e a baixa da fatura; transferências e compras de cartão exigem operação própria. Impedir exclusão genérica desses vínculos.
5. Para editar valor/data, preferir estorno e substituição vinculados, ou revisão auditada transacional. Recalcular abertura, saldo e resultado de todos os períodos afetados. Risco alto em pagamentos vinculados; médio em lançamentos isolados.
6. Disponibilizar restauração/contralançamento auditado; não apagar trilha. Backup consistente e restauração ensaiada antes da migração.
7. Testes: centavos, datas e limites de período, duas contas, conta inicial, duplicidade, edição concorrente, isolamento entre usuários, pagamento/estorno, reconciliação e repetição após resposta perdida.

## Validação técnica até esta revisão

Execução inicial 41195570801, commit 11cf759e495bcf2e97e5e88453f3f3d19cb4cf62: 50 testes aprovados, zero falhas; teste de navegador aprovado; compilação debug e release sem assinatura aprovadas; instalação e WebView Android aprovados. A verificação CSV nativa encontrou ANR do launcher Quickstep cobrindo o botão Salvar. A captura comprovou que o seletor estava aberto e o botão estava disponível ao fundo; não foi declarada gravação bem-sucedida nessa execução.

O teste foi ajustado somente para fechar o diálogo de ANR explicitamente identificado como Quickstep, sem ignorar falhas do aplicativo nem pular a verificação dos bytes do arquivo. Commit do ajuste: 50838d9e6ba6baafe6e0988fbe606695b62aad1d. Nova execução 41196010052 concluída com sucesso: compilação, instalação, WebView, temas e gravação CSV nativa aprovados. O arquivo gerado no emulador teve BOM e conteúdo UTF-8 conferidos. O versionCode continua 125, independente do número da execução de CI.

Contrastes medidos em pares de texto/fundo principais: verde claro 6,11:1; vermelho claro 6,80:1; apoio claro 9,10:1; título claro 10,02:1; verde escuro 8,83:1; vermelho escuro 7,40:1; apoio escuro 12,10:1; botão branco/vinho 8,59:1. Isto não equivale a uma auditoria integral de acessibilidade.

Nenhum teste físico da nova versão no S26 foi executado. Na versão 124, o proprietário comprovou abertura do formulário de correção e categoria Embalagens mantida ao reabrir às 07:39 de 31/10/2026.


Release sem assinatura: ELM-Gestao-125-SEM-ASSINATURA.apk, SHA-256 c47bed18e53569164ec1320fa794a819fa4e519512f4959dde8bbc71af12cd21. Verificados dentro do APK: financial-dashboard.js idêntico ao fonte preservado e os quatro arquivos Inter locais. O certificado debug da segunda execução foi eebb5203268b62dd946e911571af6c17de1db11d09153c429efe7614fd4ae187, diferente do APK 124. Esse debug não é distribuído como atualização compatível.

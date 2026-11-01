# ELM Gestão 128
 — exportação de relatório em PDF (01/11/2026)

### Validação física concluída da versão 127

Euler confirmou no celular que a edição da descrição de “Compra embalagens” para “Teste embalagens” permaneceu salva ao reabrir. A despesa de R$ 20,00 foi excluída e restaurada pelo usuário. Exclusão: despesas R$ 1.097,65, resultado -R$ 997,65 e saldo parcial R$ 1.050,00. Restauração: despesas R$ 1.117,65, resultado -R$ 1.017,65 e saldo parcial R$ 1.030,00. Esses testes ocorreram em demonstração. Eles substituem a pendência física descrita nas seções históricas abaixo.

### Exportação em PDF

Gerenciar → Backup e exportação → Exportar relatório (PDF). O período vem dos campos de início/fim já utilizados pelo painel. O nome do estabelecimento pode ser informado no próprio painel de exportação; em demonstração, o padrão é JM Restaurante - demonstração. Em ambiente real, o nome é obrigatório. Não foi criado cadastro de empresa no servidor nesta etapa.

PDF A4 em paisagem, com fonte Inter incorporada, cabeçalho com estabelecimento, período, emissão no horário de São Paulo e identificação de dados fictícios quando aplicável. O resumo traz receitas, despesas e resultado. A tabela lista data, tipo, descrição, categoria, conta e valor dos lançamentos ativos do período, em ordem cronológica. Cabeçalhos e numeração repetem em páginas seguintes. Textos longos quebram entre linhas e páginas. Períodos vazios geram relatório com resumo zero e aviso de ausência de lançamentos.

O relatório utiliza o mesmo dashboard do aplicativo, não altera fórmulas financeiras e rejeita resumo divergente. Transferências não entram no resultado nem na tabela de lançamentos; compras de cartão entram como saída conforme o pagamento de fatura existente. O documento é um relatório gerencial de entradas/saídas para apoiar a contabilidade, não uma DRE nem substituto de documentos fiscais ou escrituração.

Geração local no aparelho, biblioteca jsPDF 4.2.1 fixada no package-lock, fontes e biblioteca incluídas no APK. Nenhum serviço externo de conversão ou envio à contabilidade. O Android abre o seletor de destino para salvar application/pdf; cancelamento é informado sem erro. No navegador, é solicitado download normal. CSV e backups anteriores permanecem disponíveis.

### Arquivos alterados

- integration/native-sync/pdf-export.js: geração do relatório, paginação, resumo consistente e carregamento local da biblioteca/fontes.
- integration/native-sync/cloud-app.js: botão PDF, nome do estabelecimento, mensagens e chamada de salvamento.
- integration/android-native/ELMExportPlugin.java: método savePdf, validação do conteúdo e gravação binária pelo seletor Android; CSV preservado.
- fonts/inter-pdf-400.ttf e inter-pdf-700.ttf: conversão sem alteração visual das fontes locais para incorporação em PDF, sob a licença Inter já incluída.
- build.js e sw.js: inclusão dos arquivos de PDF e atualização do cache público para 128; respostas autenticadas continuam fora do cache.
- package.json e package-lock.json: dependência jsPDF fixada.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 128 / 1.2.8-preview e testes/previews de PDF.
- .github/workflows/verify-online-panel.yml e test-bridge.yml: instalação das dependências antes das verificações.
- integration/pdf-export.test.mjs, scripts/cloud-ui.test.cjs, scripts/android-export-smoke.cjs e scripts/pdf-preview.mjs: consistência, período vazio, textos longos, limites de coluna, download no navegador e salvamento nativo com comparação exata dos bytes.

### Verificação

Build:verify e os dois testes de PDF passaram localmente. PDFs de exemplo, vazio e estresse de 34 páginas foram renderizados e inspecionados; extração confirmou acentos, resumo e ausência de texto fora dos limites das páginas. Um problema de quebra de linha encontrado na revisão visual foi corrigido antes da publicação, com teste de regressão de largura de coluna.

CI: 55 testes passaram com PostgreSQL isolado, zero falhas. Teste de interface passou incluindo exigência de nome em ambiente real, download do PDF com fontes locais e regressão dos fluxos anteriores. Compilação Android concluída. Instalação e WebView no emulador passaram; temas e barras nativas passaram; CSV salvo com BOM/UTF-8; PDF gerado no WebView e salvo pelo seletor Android foi comparado byte a byte ao original e passou. O emulador instalou o APK debug da mesma compilação; o APK final para distribuição teve assinatura e conteúdo verificados separadamente.

Código: 9c8f831f1a459e77087dd288e76410fa523fe897. Ajuste das verificações de dependência: 7f739d81e8c089dfc0bd3b4e8adad0aea83f453e. Teste da exigência de nome em ambiente real: 8f6dea34263a4e487bd80ddc8d629f10c11cee07. Nenhuma alteração de backend, appId, URL, login, fórmulas ou registros do usuário nesta versão.

APK 128 assinado com a chave permanente das versões 125/126/127. SHA-256 do arquivo final: e6530bd471ec1c2f4959e86b6b529ff25cf7954f41d60a0645a1557079282e00. Certificado: f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05. Assinaturas v1/v2/v3 verificadas, arquivos originais preservados byte a byte e entradas não comprimidas alinhadas em 4 bytes. A atualização deve ser instalada por cima, sem desinstalar. Execução Android: 41272864365. A validação física do PDF no celular do usuário permanece pendente.


# ELM Gestão 134 — apresentação para negócios de alimentação (01/11/2026)

## Escopo e continuidade

O usuário aprovou o personagem moreno de cabelo curto, em ilustração descontraída com acabamento detalhado, e as três cenas de abertura. Preferiu personagem inspirado de forma ampla em sua aparência, sem retrato fiel. Posicionamento ampliado para restaurantes, marmitarias, lanchonetes e outros negócios de alimentação. A proposta de PDV/cardápio digital completo é futura; esta entrega continua no aplicativo financeiro existente.

## Apresentação

Três telas: “Seu negócio, sob controle.”; “Saiba o que entra e o que sai.”; “Planeje os próximos passos.”. As descrições aprovadas abordam caixa, receitas/despesas, recebimentos por forma de pagamento, vencimentos e resultados. Não anunciam lucro garantido, integração bancária ou lembretes automáticos inexistentes.

Botões Próximo, Voltar, Pular, Já tenho conta · Entrar e Começar na última tela. Indicadores permitem selecionar cada etapa e informam a posição 1/2/3 de 3. Navegação por controles acessíveis e foco no título após mudar de etapa; não há avanço automático. Movimento reduzido respeitado. Ao concluir/pular, grava apenas um marcador local de apresentação vista, sem credenciais nem registros financeiros. Se armazenamento estiver indisponível, a apresentação ainda pode ser fechada e o login funciona; ela pode reaparecer na próxima abertura.

Aparece no primeiro acesso após a atualização, inclusive para usuários existentes que nunca viram a apresentação. Nas aberturas seguintes, vai ao login atual. Gerenciar → Rever apresentação permite abrir novamente e retornar à tela anterior sem sair da conta. Começar leva ao login existente: cadastro público de novas contas e assinaturas não fazem parte desta etapa. Sessão persistente/biometria seguem pendentes.

As ilustrações aprovadas foram codificadas em WebP para reduzir o pacote, sem recriar o personagem. O enquadramento em CSS mostra apenas a região da cena: a marca, os textos e os controles das prévias não são usados como botões ou texto rasterizado na interface. Textos e botões são elementos HTML responsivos, com os termos aprovados “negócio” e “negócios de alimentação”. São recursos públicos incluídos no APK e no cache público do service worker, sem fontes ou imagens externas.

Login, autorização, endpoints, cálculos financeiros e gravações permanecem. A apresentação não faz requisições nem cria dados fictícios no painel. Backend 130 compatível, sem nova migração, implantação, alteração de plano ou URL. appId e chave permanente preservados.

## Arquivos

- integration/native-sync/onboarding.js: três telas, controles, acessibilidade, marcador visto e reabertura em Gerenciar.
- brand/onboarding/scene-1.webp, scene-2.webp e scene-3.webp: ilustrações aprovadas, codificadas para empacotamento.
- integration/native-sync/cloud-app.js: instala apresentação e amplia a redação da entrada para negócios de alimentação.
- integration/native-sync/professional.css: enquadramento das cenas e apresentação responsiva, temas, foco e movimento reduzido.
- build.js: empacota módulo/imagens e atualiza descrição de metadados.
- sw.js: cache público 134 e recursos locais da apresentação.
- scripts/cloud-ui.test.cjs: sequência/voltar/concluir, persistência após recarregar, reabertura/pular sem logout, carregamento de imagem, 320/430 px e zero requisições antes de login.
- scripts/android-webview-smoke.cjs: passa pela opção Pular na WebView instalada antes de validar o login e os testes nativos.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 134 / 1.3.4-preview.

## Validação física da versão 133

O vídeo de 10 segundos enviado pelo proprietário confirmou abertura da entrada, preenchimento pelo Samsung Pass, autenticação e painel carregado com saldo parcial de R$ 1.050,00. Samsung Pass é recurso do celular, não biometria implementada pelo ELM. O breve quadro preto inicial e o painel parcialmente montado durante a consulta são observações para melhoria futura, não foram declarados corrigidos nesta entrega.

## Verificação

build:verify local passou. Execução Android 41322229662, commit final d976997f3ec3d48a87a528b7463f9db210f239ee (implementação inicial dab49f4e01237232422bf658be44dad8604617c0): 64 testes com PostgreSQL isolado passaram, zero falhas. O teste de interface passou por primeiro acesso, imagem carregada, avanço/voltar/concluir, marcador persistido após recarregar, reabertura/pular em Gerenciar sem logout, estado do login, cores claro/escuro, ausência de consultas privadas antes do login e ausência de rolagem horizontal em 320/430 px. As regressões existentes de edição/exclusão/restauração, contas, transferências, cartões/faturas, contas a pagar, fechamento, comparativo e CSV/PDF também passaram.

A inspeção visual da primeira execução revelou conflito com variáveis de cores do HTML histórico. O componente passou a definir suas próprias cores por tema; uma execução intermediária detectou ainda a prioridade de uma regra global de h2, corrigida antes da entrega. As capturas finais claro/escuro foram inspecionadas e confirmaram o contraste restaurado. As verificações de cores foram mantidas nos testes. Capturas são evidência interna, não arquivos de entrega.

Compilação e instalação no emulador Android passaram, incluindo Pular na apresentação, login na WebView real, marca ELM, temas/barras nativas e salvamento CSV/PDF. A instalação automatizada usa o artefato debug da mesma compilação; o APK final foi assinado e verificado separadamente. Certificado permanente SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05, esquemas v1/v2/v3 válidos. Conteúdo original preservado byte a byte após assinatura, entradas não comprimidas alinhadas em 4 bytes e módulos/imagens empacotados conferidos com o build local.

APK ELM-Gestao-134.apk, SHA-256 f7aae618d7bae08e46853c0fb74825922cea52463256efd5bd9d88cbed5016a2. Atualizar por cima, sem desinstalar. Nenhum registro financeiro do proprietário foi criado ou alterado. Backend permanece compatível na implantação 130; sem migração, alteração de variáveis/ambiente/plano ou nova implantação. A base permanece demonstrativa.

Validação física da versão 134 no S26 permanece pendente. Basta abrir a apresentação, avançar as três telas e entrar com as credenciais existentes. Depois de concluída, pode ser revista em Gerenciar → Rever apresentação. Não precisa cadastrar movimentos financeiros de teste.

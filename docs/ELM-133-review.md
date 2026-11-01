# ELM Gestão 133 — primeira etapa da experiência de entrada (01/11/2026)

## Escopo

Após analisar o vídeo do Organizze enviado pelo proprietário, foi aprovada evolução por partes. Esta entrega cobre apenas a apresentação da tela de entrada. Retorno persistente à sessão, biometria, recuperação de senha, cadastro de novos usuários e reorganização de Gerenciar ficam para etapas futuras. Não há botões sem função para essas capacidades.

A marca ELM aparece centralizada na entrada, com o ícone aprovado, versão e um cartão com o título “Seu restaurante, sob controle.”, descrição curta, campos identificados de e-mail/senha e botão Entrar. Usa a fonte Inter local e os temas existentes. No painel autenticado, o cabeçalho mantém o formato compacto anterior.

O campo de e-mail mantém autocomplete username e ganha teclado de e-mail, sem capitalização automática. O campo de senha mantém autocomplete current-password e permite Mostrar/Ocultar com botão acessível, aria-pressed e controle referenciado. O botão não submete o formulário nem faz requisições. A senha volta a ficar oculta no início da tentativa, ao terminar e ao encerrar a sessão; o valor continua sendo limpo ao terminar a tentativa conforme o comportamento anterior.

O botão de envio mostra “Entrando…” enquanto aguarda e o formulário sinaliza aria-busy. Feedback de login aparece dentro do cartão, próximo aos campos, em região de status. Fora da entrada, mensagens financeiras continuam no local anterior e nos formulários de edição. Um seletor específico identifica o botão submit para que o novo botão de visibilidade não interfira no bloqueio durante login.

Esta mudança não reduz por si só o tempo de resposta da nuvem nem cria sessão persistente. A apresentação local não depende de fontes externas. Autenticação continua usando a configuração pública e o mesmo endpoint Supabase existentes; regras de autorização, token em memória, consultas e gravações permanecem. Não há nova migração nem implantação necessária no backend 130 compatível. appId, URL e assinatura permanente preservados.

## Arquivos

- integration/native-sync/cloud-app.js: marcação da entrada, controle de visibilidade de senha, feedback local, estado visual ocupado e troca de apresentação ao entrar/sair; preserva o fluxo de autenticação existente.
- integration/native-sync/professional.css: marca/cartão/campos/botões responsivos e adaptação aos temas.
- scripts/cloud-ui.test.cjs: mostrar/ocultar sem requisição, falha de credenciais com feedback visível e limpeza, retorno após erro, logout seguro, larguras 320/430 e capturas claro/escuro, preservando regressões.
- sw.js: cache público 133.
- android-version.json e .github/workflows/android-debug-apk.yml: APK 133 / 1.3.3-preview.

## Verificação

build:verify local aprovado, incluindo resumo autenticado, saldos, transferências, conciliação e faturas. Execução Android 41312695312, commit 76b493baa96d63d6c554c684010196ad28867dd0: 64 testes com PostgreSQL isolado passaram, zero falhas. Testes de interface passaram por mostrar/ocultar sem requisição, erro de credenciais visível no cartão, senha limpa e oculta, botão reabilitado, nova tentativa bem-sucedida, logout, larguras de 320/430 px e temas claro/escuro. As capturas foram inspecionadas visualmente e permanecem evidência interna. Regressões de painel, edição/exclusão/restauração, contas, transferências, cartões/faturas, contas a pagar, fechamento e exportações também passaram.

Compilação e instalação no emulador Android passaram, incluindo a tela de entrada na WebView real, marca ELM, temas/barras nativas e salvamento CSV/PDF. A instalação automatizada usa o artefato debug da mesma compilação. O APK final foi assinado e verificado separadamente: certificado permanente SHA-256 f84d82173f78d80e5dd0abd95eeff37e174409f7340ca4f1c0ad0335649c4a05, esquemas v1/v2/v3 válidos. Conteúdo original preservado após assinatura, entradas não comprimidas alinhadas em 4 bytes e arquivos principais conferidos com o build local.

APK ELM-Gestao-133.apk, SHA-256 2144e28d0139f5721aa3f5ef140d8a9ec5a11ddf56f3b38823b92342c5111ed0. Atualizar por cima, sem desinstalar. Nenhum registro financeiro do proprietário foi criado ou alterado. Não houve implantação no backend nem alteração de variáveis, ambiente ou plano. A base permanece demonstrativa. Validação física da versão 133 no S26 permanece pendente; basta conferir a entrada com as mesmas credenciais, sem novos lançamentos de teste.

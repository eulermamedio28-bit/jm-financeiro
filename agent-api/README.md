# JM Financeiro — API experimental (não publicada)

Esta primeira etapa cria uma API **local**, separada do aplicativo em produção. Não há sincronização com o aplicativo, MCP de dados reais ou implantação desta API na nuvem. Existe login individual experimental, exclusivamente para Euler. **Não utilizar dados reais.**

## Executar em computador de desenvolvimento

Requisitos: Node.js 22+ e npm.

```bash
cd agent-api
npm install
export JM_API_TOKEN="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
export JM_PILOT_SESSION="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
export JM_PILOT_PASSWORD_HASH="$(node --input-type=module -e 'import {hashPassword} from "./pilot-auth.js"; console.log(hashPassword("senha-ficticia-de-teste-123"))')"
npm start
```

A API escuta somente em `127.0.0.1:8787`. Use cabeçalhos `Authorization: Bearer <JM_API_TOKEN>` e `X-JM-Pilot-Session: <JM_PILOT_SESSION>`. Esta segunda credencial é uma barreira adicional apenas para testes locais: **não é login individual nem autenticação segura de usuário**. Nunca a inclua no código do aplicativo ou em repositório público. Para toda requisição POST, envie `Idempotency-Key` com identificador único (mínimo 12 caracteres). O mesmo identificador retorna a mesma resposta sem duplicar lançamentos.

Rotas: `GET /health`, `GET /accounts`, `POST /accounts`, `GET /categories`, `POST /categories`, `GET /entries`, `POST /entries`, `GET /transfers`, `POST /transfers`, `GET /account-balances`, `GET /summary`, `GET /audit`.

Transferências internas movimentam valores entre contas, mas **não** entram como receitas ou despesas e não alteram o saldo consolidado. A API rejeita transferências quando o saldo de origem é insuficiente. **Somente testes fictícios**.

Exemplo de lançamento fictício: `POST /entries` com `{"kind":"expense","account_id":"UUID","category_id":"UUID","description":"Despesa teste","amount_cents":2500}`.

**Limitações importantes:** token único de desenvolvimento; sem HTTPS; sem contas de usuários, confirmação, backup remoto, controle de acesso individual ou sincronização PWA. Não expor à internet. Há testes automatizados no GitHub Actions para autenticação, lançamentos, transferências e backup local. Antes de conectar ao aplicativo ou MCP, faltam autenticação individual, HTTPS, backups, regras de autorização e validação de segurança.

## Origens de navegador

Por padrão, requisições com cabeçalho `Origin` são rejeitadas. Em um ambiente local de testes, `JM_ALLOWED_ORIGIN` pode definir uma única origem explícita. Isso **não** constitui autenticação e não habilita acesso remoto: a API continua restrita a `127.0.0.1`. O cabeçalho `Origin` pode ser omitido por clientes não navegador; por isso, não substitui controles de acesso.

## Módulo experimental de login individual (ainda não conectado à API)

O arquivo `pilot-auth.js` prepara autenticação de **um único usuário de teste**, identificado como `euler`. A senha é verificada por `scrypt` com salt aleatório; o módulo gera sessões temporárias de 30 minutos, permite revogação e aplica bloqueio de cinco minutos após cinco erros consecutivos. O token de sessão é guardado somente como hash na memória do processo, sem persistência.

Para executar apenas os testes locais do módulo: `node --test pilot-auth.test.js`. Não utilize senhas reais de Euler nem inclua hashes ou segredos no GitHub.

**Limitação fundamental:** este módulo ainda não foi conectado às rotas HTTP do servidor, não oferece login no celular, HTTPS, recuperação de conta ou proteção de produção. As rotas da API continuam com as credenciais experimentais anteriores. Nenhum acesso real foi liberado.

## Autenticação individual experimental integrada

Todas as rotas financeiras agora exigem, além das duas credenciais locais de desenvolvimento, `X-JM-User-Session` válido. `POST /auth/login` recebe `{ "username": "euler", "password": "..." }` e retorna token de sessão temporária. `GET /auth/me` confirma a identidade; `POST /auth/logout` revoga o token. Login e logout não exigem chave de idempotência. Auditoria registra `euler` em vez de autor genérico. Sem sessão, operações de leitura e escrita são rejeitadas.

A senha acima é **fictícia, apenas para desenvolvimento**. Não reutilize senhas pessoais. Sessões são armazenadas somente na memória e se perdem ao reiniciar. Esta integração continua local, sem HTTPS, sem login visual no celular e **não é adequada à produção**. O cabeçalho de sessão jamais deve ser embutido em código público.

## Tela de login local conectada (piloto, somente dados fictícios)

Com as variáveis de ambiente de teste configuradas e o servidor iniciado, abra `http://127.0.0.1:8787/pilot` **no mesmo computador onde o servidor roda**. A página permite entrar com `euler` e a senha fictícia configurada em `JM_PILOT_PASSWORD_HASH`. O servidor emite cookie `HttpOnly; SameSite=Strict`, protegido por sessão de 30 minutos, e permite apenas consultar o resumo fictício; o botão Sair revoga a sessão. A tela não armazena token ou senha em localStorage.

Rotas web: `GET /pilot`, `POST /pilot/login`, `GET /pilot/me`, `GET /pilot/summary`, `POST /pilot/logout`. As operações de escrita permanecem restritas à API de desenvolvimento com suas credenciais adicionais.

**Não está publicado nem acessível pelo celular remotamente.** Não utilizar dados reais. Ainda faltam testes completos, HTTPS, autenticação de produção, proteção adicional contra CSRF e integração com o app Android/PWA original.

## Fase 5: adaptador de ferramentas do agente (somente testes locais)

`agent-adapter.js` mapeia consultas e escritas da API experimental para nomes de ferramentas. Por padrão, aceita somente `http://127.0.0.1:8787`; rejeita endereços públicos e exige credenciais fictícias em memória. Não é um plugin ChatGPT, não oferece acesso remoto e não deve ser conectado a dados reais.

`read(nome)` executa consultas autenticadas. Para escritas, `prepareWrite(nome, dados)` **não envia requisição** e devolve um resumo e uma chave de operação. Somente `executeApproved(prepared, {confirmed:true,operationKey:prepared.idempotencyKey,summary:prepared.summary})` envia a escrita. A aprovação deve ser obtida de Euler em interação separada; **nunca gerar aprovação automaticamente**. O adaptador não substitui uma camada de autorização confiável no servidor; sua verificação de confirmação é somente uma proteção do fluxo de desenvolvimento.

Testes automatizados verificam que escritas sem aprovação são bloqueadas e que destinos externos são recusados. Falta hospedar serviço privado HTTPS, autenticação de serviço, autorização server-side por operação, integração real com o aplicativo e plugin privado. Não inserir segredos no GitHub.

## Política de acesso inicial — somente Euler

O único usuário autorizado nesta etapa é `euler`. Não criar credenciais ou permissões para Silvia agora. A inclusão de outro usuário será uma evolução futura, com autorização explícita. O módulo `pilot-auth.js` rejeita qualquer nome diferente de `euler`. Nenhuma senha real deve ser armazenada no repositório.

## Backup e restauração — desenvolvimento local

Com o servidor parado para restauração, use `node backup.js backup ./jm-dev.sqlite ./backups/copia.sqlite` para criar um snapshot consistente, inclusive quando o banco utiliza WAL. Para recuperar, use `node backup.js restore ./backups/copia.sqlite ./jm-restaurado.sqlite`. O destino da restauração deve estar ausente; o programa se recusa a sobrescrever um banco existente. Os dois comandos verificam a integridade SQLite. Os testes em `backup.test.js` validam a cópia e a recuperação com valores fictícios.

**Atenção:** o backup é manual e local. Ainda não há criptografia, retenção, backup remoto, testes de recuperação de desastres ou operação de produção. Os arquivos `.sqlite` e backups financeiros jamais devem ser publicados no GitHub.

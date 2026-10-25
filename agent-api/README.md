# JM Financeiro — API experimental (não publicada)

Esta primeira etapa cria uma API **local**, separada do aplicativo em produção. Não há sincronização, MCP, autenticação individual ou implantação na nuvem ainda. **Não utilizar dados reais.**

## Executar em computador de desenvolvimento

Requisitos: Node.js 22+ e npm.

```bash
cd agent-api
npm install
export JM_API_TOKEN="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
npm start
```

A API escuta somente em `127.0.0.1:8787`. Use cabeçalho `Authorization: Bearer <JM_API_TOKEN>`. Para toda requisição POST, envie `Idempotency-Key` com identificador único (mínimo 12 caracteres). O mesmo identificador retorna a mesma resposta sem duplicar lançamentos.

Rotas: `GET /health`, `GET /accounts`, `POST /accounts`, `GET /categories`, `POST /categories`, `GET /entries`, `POST /entries`, `GET /transfers`, `POST /transfers`, `GET /account-balances`, `GET /summary`, `GET /audit`.

Transferências internas movimentam valores entre contas, mas **não** entram como receitas ou despesas e não alteram o saldo consolidado. A API rejeita transferências quando o saldo de origem é insuficiente. **Somente testes fictícios**.

Exemplo de lançamento fictício: `POST /entries` com `{"kind":"expense","account_id":"UUID","category_id":"UUID","description":"Despesa teste","amount_cents":2500}`.

**Limitações importantes:** token único de desenvolvimento; sem HTTPS; sem contas de usuários, confirmação, backup remoto, controle de acesso individual ou sincronização PWA. Não expor à internet. Há testes automatizados configurados, mas sua aprovação na execução contínua ainda precisa ser verificada. Antes de conectar ao aplicativo ou MCP, faltam autenticação individual, HTTPS, backups, regras de autorização e validação de segurança.

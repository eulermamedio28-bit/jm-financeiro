# Contrato do futuro Agente JM Financeiro — piloto Euler

**Estado:** especificação para integração futura, NÃO é um plugin instalado, servidor publicado ou acesso ao aplicativo real. Somente ambiente local, dados fictícios e branch de desenvolvimento.

## Objetivo

Permitir que um agente autorizado consulte e, após confirmação explícita, registre operações financeiras via API do JM Financeiro. A API experimental existente é um protótipo independente do aplicativo original.

## Política de acesso

- Piloto: usuário `euler` exclusivamente; não criar acesso para Silvia nesta fase.
- Consultas: permitidas após autenticação válida.
- Escritas: **exigir aprovação explícita de Euler para cada operação** antes de enviar a requisição.
- Nunca inferir autorização de uma conversa anterior, nem executar operações em lote sem confirmação específica.
- Nunca transmitir senhas, tokens, cookies, dados reais ou chaves em logs, commits ou mensagens.
- Para integração real: exigir HTTPS, serviço privado autenticado, credenciais em gerenciador de segredos, permissões mínimas e auditoria.
- Não usar esta API experimental na internet ou com dados reais.

## Ferramentas previstas (não publicadas)

| Ferramenta | Rota experimental | Efeito |
|---|---|---|
| listar_contas | GET /accounts | Consulta contas |
| listar_categorias | GET /categories | Consulta categorias |
| consultar_resumo | GET /summary | Receitas, despesas e saldo consolidado |
| consultar_saldos | GET /account-balances | Saldos por conta |
| listar_lancamentos | GET /entries | Últimos 200 lançamentos |
| listar_transferencias | GET /transfers | Últimas 200 transferências |
| consultar_auditoria | GET /audit | Últimas 200 ações registradas |
| criar_conta | POST /accounts | **Escrita com confirmação** |
| criar_categoria | POST /categories | **Escrita com confirmação** |
| registrar_lancamento | POST /entries | **Escrita com confirmação** |
| transferir_entre_contas | POST /transfers | **Escrita com confirmação** |

O login web em `/pilot` é apenas para a interface local; não substitui a autenticação do futuro conector do agente.

## Regras para operações

- Valores monetários devem ser inteiros em centavos: R$ 28,50 = `2850`. Não usar float para dinheiro.
- `POST /entries`: `{kind:"income"|"expense",account_id,category_id,description,amount_cents}`.
- `POST /transfers`: `{from_account_id,to_account_id,description,amount_cents}`.
- `POST /accounts`: `{name,opening_cents}` (saldo inicial opcional).
- `POST /categories`: `{name}`.
- Cada escrita requer cabeçalho `Idempotency-Key` único (12 a 128 caracteres aceitos pela API), para impedir duplicação acidental.
- Transferência entre contas não altera receitas ou despesas consolidadas.
- A API experimental recusa transferência com saldo insuficiente.
- Antes da confirmação, mostrar valor, origem/destino, descrição, categoria e impacto esperado. Após a resposta, apresentar ID e resultado; não afirmar sucesso se houve erro.
- Nunca criar uma segunda operação após timeout sem verificar o resultado da chave de idempotência.
- Registrar auditoria do ator autenticado. O registro de auditoria atual cobre escritas da API; não supor que todas as leituras são auditadas.

## Exemplo de confirmação

Solicitação: "Registre despesa de R$ 350,00 com fornecedor, paga pelo caixa."

O agente primeiro consulta as contas e categorias disponíveis. Em seguida apresenta:
"Confirma registrar despesa de R$ 350,00, categoria Fornecedores, na conta Caixa, descrição [descrição informada]?"

Somente depois da aprovação envia `POST /entries` com `amount_cents:35000` e chave de idempotência.

## Pendências para integração real

1. Definir e testar um backend privado HTTPS acessível pelo conector.
2. Projetar autenticação de serviço e autorização por operação; nunca expor `JM_API_TOKEN` ao navegador.
3. Criar plugin/conector privado com as ferramentas acima e revisão de permissões.
4. Integrar o app original à mesma fonte de dados com migração, backups e reconciliação.
5. Testar operações com dados fictícios ponta a ponta, inclusive repetição de requisições, falhas de rede e restauração.
6. Somente então planejar piloto com dados reais, mediante aprovação específica.

**Importante:** o repositório e os testes atuais não constituem acesso do ChatGPT ao JM Financeiro real.

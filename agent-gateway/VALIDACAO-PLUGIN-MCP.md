# JM Financeiro — validação da integração privada MCP

## Estado confirmado (25/10/2026)
- Servidor de demonstração na Render: https://jm-financeiro-agent-gateway-test.onrender.com/mcp
- Plugin privado: JM Financeiro — Testes, versão 0.2.1.
- Ferramentas de somente leitura: `consultar_resumo_ficticio`, `consultar_mes_ficticio`, `consultar_categorias_ficticias`, `comparar_meses_ficticios`.
- Dados inteiramente fictícios; nenhuma conexão com o banco financeiro real.
- Branch de desenvolvimento: `dev/agente-financeiro-1`. Não alterar `main` para esta validação.

## O que NÃO está confirmado
- Autenticação do plugin no cliente ChatGPT.
- Invocação ponta a ponta de ferramenta MCP pelo ChatGPT.
- Compatibilidade do cliente ChatGPT com a autenticação `api_key`/Bearer configurada.

## Etapas de ativação em interface compatível
1. Abrir o plugin privado **JM Financeiro — Testes** na interface que permitir conexão MCP.
2. Selecionar o servidor `jm_financeiro_demo` e configurar a autenticação Bearer no formulário seguro, **nunca em conversa ou captura de tela**.
3. Não copiar tokens para GitHub, ZIP do plugin, logs, mensagens ou documentação.
4. Confirmar que o cliente lista exatamente as quatro ferramentas fictícias.
5. Executar `consultar_resumo_ficticio` e conferir `source: fictional-demo`.
6. Executar `consultar_categorias_ficticias` com `mes: 2026-10`; confirmar que receitas e despesas somam os totais.
7. Executar `comparar_meses_ficticios` com `mes_inicial: 2026-09`, `mes_final: 2026-10`.
8. Testar mês inválido e ferramenta desconhecida; ambos devem falhar sem expor dados reais.

## Critérios para aprovação
- As quatro ferramentas funcionam apenas após autenticação.
- Requisições sem token são recusadas.
- Nenhuma ferramenta de criação, edição, exclusão, transferência ou pagamento está disponível.
- Respostas indicam claramente que são fictícias.
- Sem credenciais em arquivos ou prints.
- **Não habilitar dados reais** sem novo projeto de segurança, autorização explícita e revisão de acesso.

## Observações
A interface móvel mostrou o botão “Usar no computador” e não permitiu abrir a configuração do servidor MCP. Isso é uma limitação observada da interface, não prova de falha do gateway. Os testes automatizados locais e de HTTPS não substituem a validação autenticada ponta a ponta do cliente ChatGPT.

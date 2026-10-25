# Integração privada MCP — pendências de autenticação

## Estado confirmado
- Gateway HTTPS na Render implantado, servidor MCP inicializado.
- Endpoint: https://jm-financeiro-agent-gateway-test.onrender.com/mcp
- Ferramenta MCP única: consultar_resumo_ficticio.
- O gateway exige Authorization: Bearer <segredo> e não permite operações financeiras reais.
- Plugin privado JM Financeiro — Testes criado, ainda sem conexão MCP.

## Não fazer
- Nunca inserir o token do gateway no repositório, ZIP de plugin, instruções ou conversa.
- Não remover a exigência de token para facilitar a conexão.
- Não afirmar que o plugin está integrado sem validar a chamada autenticada.
- Não conectar dados financeiros reais nesta fase.

## Próxima implementação
1. Selecionar um fluxo de autenticação suportado pela plataforma de plugins para servidor MCP remoto (preferencialmente OAuth 2.1, com autorização individual).
2. Configurar as credenciais exclusivamente no mecanismo seguro de conexão, não em arquivos do plugin.
3. Testar initialize, tools/list, tools/call com usuário autorizado e sem autorização.
4. Confirmar que só consultar_resumo_ficticio está disponível e que retornos são fictícios.
5. Somente então habilitar a conexão do plugin privado.

## Atenção
O gateway atual é um protótipo de MCP Streamable HTTP JSON. É necessário verificar compatibilidade com a plataforma e os requisitos de autenticação antes de considerá-lo pronto para produção.

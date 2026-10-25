# Fase de teste — somente Euler

## Escopo autorizado
- Único operador previsto nesta fase: Euler.
- Silvia não será cadastrada nem convidada durante o piloto.
- Não usar dados reais, contas bancárias, senhas ou comprovantes.
- A API experimental usa um token local de desenvolvimento; **isso ainda não identifica Euler individualmente**.
- O JM Financeiro instalado no celular não foi conectado à API.
- Nenhuma publicação na branch `main` sem aprovação expressa.

## Critérios para liberar um piloto no celular
1. Suíte automatizada concluída com sucesso no GitHub Actions.
2. Autenticação de usuário individual, sessão segura e revogação de acesso.
3. HTTPS, armazenamento privado e segregação por usuário.
4. Testes de autorização para impedir acesso não autorizado.
5. Backup e recuperação validados com dados fictícios.
6. Integração isolada em ambiente de homologação sem alterar `localStorage` real.
7. Aprovação explícita de Euler antes de instalar ou migrar dados.

## Atenção
A branch de desenvolvimento é pública. Não inserir credenciais ou dados financeiros pessoais no repositório.

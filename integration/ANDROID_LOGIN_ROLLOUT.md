# Integração do login ao JM Financeiro — plano de implantação segura

Estado: EM DESENVOLVIMENTO. Não publicado no APK nem no site financeiro principal.

## Já validado
- Conta Supabase confirmada e senha definida.
- Login real com e-mail/senha na página isolada de teste.
- Módulo isolado `integration/supabase-auth-client.mjs`.

## Restrições obrigatórias
1. Nunca modificar a branch `main`, os APKs originais ou backups históricos.
2. Não migrar, limpar, substituir ou sincronizar automaticamente o localStorage.
3. Não aceitar credenciais administrativas do Supabase no cliente.
4. Não expor o painel financeiro antes de autenticar na versão de desenvolvimento.
5. Não usar apenas uma sobreposição visual: o conteúdo financeiro deve ser carregado somente após login válido.
6. Uma página pública antiga não passa a ser protegida só por adicionar uma tela de login. A publicação de produção exige remover o acesso público à versão não protegida e controlar acesso aos dados no servidor.
7. Em Android Capacitor, confirmar persistência segura da sessão e comportamento offline antes de exigir login no APK.

## Próximas alterações na branch de desenvolvimento
1. Criar uma entrada protegida para a versão de teste, mantendo o app original em arquivo separado e intacto.
2. Garantir que scripts do painel não sejam executados antes da autenticação.
3. Validar saída, expiração de sessão, reconexão, retorno do app e falha de rede.
4. Testar visual, saldos, transferências, relatórios e persistência de dados locais com dados fictícios.
5. Gerar APK de teste com identificador distinto, sem sobrescrever o aplicativo original.
6. Só após aprovação, planejar migração voluntária e reversível.

## Sincronização
Desativada. O banco PostgreSQL de teste não deve receber dados reais antes de haver autorização específica, controles de tenant e testes de recuperação.

## Observação de arquitetura
O `index.html` atual é um aplicativo monolítico. Não inserir um bloqueio CSS ou overlay como controle de acesso: isso seria contornável. A integração deve separar a inicialização do painel da autenticação antes de ser publicada.

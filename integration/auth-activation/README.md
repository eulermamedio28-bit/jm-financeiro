# JM Financeiro — ativação por convite (ambiente de testes)
Esta página estática não está publicada. Não mudar Site URL do Supabase até haver HTTPS real e página testada.

1. Hospedar os arquivos estáticos em HTTPS com domínio próprio do teste. Não usar o servidor financeiro de produção.
2. Criar `config.json` na implantação a partir do exemplo com URL do projeto Supabase e chave **publishable/anon**, nunca service_role ou segredo.
3. Configurar Site URL e redirect URLs no Supabase com o endereço exato da página publicada.
4. Testar convite real por fluxo de código PKCE (`?code=`) ou token hash (`?token_hash=...&type=invite`). O modelo de e-mail padrão pode usar fragmento `#access_token`; nesse caso configurar template de convite para `{{ .ConfirmationURL }}` e um fluxo suportado ou adaptar o template para token_hash, com revisão antes de enviar.
5. Testar expiração, reuso, senha fraca, senha diferente, recuperação, dispositivos móveis e sessão finalizada.
6. Não divulgar links de convite ou capturas que contenham tokens.
7. A página não altera o APK nem ativa sincronização.

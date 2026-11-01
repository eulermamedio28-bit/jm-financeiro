# Ativação segura de login — JM Financeiro

Conta inicial autorizada: `euler.mamedio28@gmail.com` (e-mail fornecido pelo proprietário). **Isso não cria uma conta nem define senha.**

## Estado atual
- O aplicativo original abre sem login e deve permanecer intacto até existir versão de testes validada.
- A API de sincronização continua desativada. O serviço público de testes só expõe health.
- O verificador OIDC agora exige token assinado, emissor, público, validade, subject, e-mail verificado e e-mail permitido.
- O endereço de JWKS deve vir da configuração oficial do provedor, nunca ser presumido.
- Não guardar senha, token de sessão ou DATABASE_URL no GitHub, no chat ou no APK.

## Próximas condições para ativação
1. Escolher e provisionar um provedor de identidade com suporte OIDC/JWKS e verificação de e-mail. A conta inicial deve ser criada no provedor por fluxo seguro.
2. Configurar issuer, audience, JWKS URI e lista de e-mails permitidos no servidor, por variáveis de ambiente.
3. Testar tokens válidos, expirados, adulterados, de outro emissor/público e e-mail não verificado/não permitido.
4. Integrar login no aplicativo de testes com sessão protegida e recuperação de acesso; preservar o original e os backups.
5. Validar o armazenamento durável com backups antes de qualquer dado financeiro real. O PostgreSQL gratuito atual é apenas para testes e tem vencimento.
6. Somente então montar rotas autenticadas e ativar sincronização com consentimento explícito do usuário.

Nunca considerar o e-mail isoladamente uma prova de identidade.

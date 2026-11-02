# ELM Gestão 135 — verificação do pacote recuperado

Comparação realizada com o APK 134 fornecido pelo proprietário e o pacote de fontes 135:

- `assets/public/index.html`: idêntico (528540 bytes), não necessita substituição.
- `assets/public/onboarding.js`: alterado somente na apresentação (4017 bytes no APK; 4367 bytes no pacote).
- `assets/public/professional.css`: alterado para animação (25771 bytes no APK; 26977 bytes no pacote).
- `assets/public/icons/elm-mark.svg` e `assets/public/onboarding/scene-1.webp` existem no APK.
- A página carrega `professional.css` diretamente. A integração de `onboarding.js` deve ser verificada no código que o importa, não presumida.
- O pacote de animação passou por verificação de sintaxe com Node.js; isso não equivale a teste no Android.

## Bloqueios antes de publicar APK

1. Encontrar o código-fonte correspondente exatamente ao APK 134. O workflow legado pode compilar versão diferente.
2. Incorporar as duas alterações aos caminhos de produção e conferir os assets das três telas.
3. Executar teste funcional, compilação e assinatura com a mesma chave do APK 134; sem a chave não é possível instalar por cima sem risco de perda de dados locais.

Não sobrescrever dados financeiros, não distribuir APK não testado e não misturar código legado com o APK 134 sem conferência.
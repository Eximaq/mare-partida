# Akuma no Mi — Lote 1 Rank E

## Uso

Personagem → Akuma no Mi mostra Kuku-Kuku e Beri-Beri como silhuetas com aura colorida até o registro. Registrar fruta adiciona uma unidade à bolsa e ao Compêndio. É uma concessão de demonstração, pois este lote não define uma fonte de drop. O slot exclusivo aceita ambas. Kuku usa 1 e Beri usa 2; equipar a fruta substitui temporariamente a habilidade da classe naquela tecla.

| Fruta | Bônus ao equipar | Habilidade | Recarga |
|---|---|---|---|
| Kuku-Kuku no Mi | +5% cura recebida, +3% HP máximo | Banquete Relâmpago: cadáver mais próximo da área vira Comida, que cura 15% do HP máximo | 15 s |
| Beri-Beri no Mi | +15% resistência a impacto físico | Divisão Esférica: 1,5 s invulnerável, seis esferas VFX e impulso nos inimigos até 130 px | 18 s |

Cada ID registrado concede permanentemente +0,1% de HP máximo e +0,1% de Força base. Registros repetidos não acumulam. Comida e cadáveres expiram em 20 s e 12 s, respectivamente. A redução da Beri só afeta dano físico comum.

## Persistência e arquitetura

O catálogo em akuma-system.js é anexado ao fim de itemDefs, conservando índices antigos. Os registros têm type = akuma_no_mi e rank = E. A prévia Pages mantém save em localStorage. server/akuma.py usa SQLite para validar equipamento, Compêndio, recarga, cadáver, comida, invulnerabilidade e knockback. Execute python server/app.py para servir jogo e API em http://127.0.0.1:8123/. O banco padrão fica em ~/.mare-partida/akuma.sqlite3, fora do Git, e MARE_AKUMA_DB permite escolher outro caminho.

O cliente detecta a API e sincroniza registro, equipamento, abates e habilidades. O protótipo JS ainda informa os abates e posições dos inimigos ao serviço; portanto, a API local não é adequada à exposição pública sem autenticação e combate autoritativo em Python. O preview Pages usa as mesmas regras localmente.

## Arte

Ícones, auras e VFX ativos foram gerados no PixelLab Pro Flash a partir das duas referências do proprietário, sem incluir as imagens originais no Git. Todos os quadros são 48×48, transparentes, com o estilo `HD 16-bit pixel art, crisp pixels, perfectly clean outlines, high contrast, vivid color palette, professional game-ready VFX asset, sharp detail, 100% transparent background` e negativos `--no blur, anti-aliasing, muddy colors, gradients, noisy pixels, low resolution`. Os prompts das auras pedem vapor dourado e três esferas em órbita; os bursts pedem carne assada e seis esferas magenta. Os jobs finais são Kuku ícone e7db97fb-644b-4378-8509-e7ecbacd253f, aura 952e868e-738c-4c56-a4c1-df175cddb183, animação bc065df3-3ff7-45e4-a133-9525e9735775, burst a9071bd2-dd7d-41ce-9db1-de7ad635b441; Beri ícone 6c59038f-64f6-4fd4-a949-ea86a9c17ece, aura a5be62fb-4c32-41e2-858f-82bd51eb2abe, animação d27d1848-eaea-4328-bf2b-6144b9e4d6e2 e burst 4e90ab84-53d9-46f8-b7a8-70d2330a673b. As folhas de aura têm cinco quadros e o mesmo relógio do `requestAnimationFrame` atualiza mapa, retrato, preview do Inventário, aba Personagem e Compêndio. A silhueta usa `brightness(0)` sobre o ícone, com aura colorida atrás.
## Validação

- node tests/akuma-system.test.cjs e regressões de personagem, forja e Haki.
- python tests/akuma_backend_test.py: persistência, contagem única, bônus, recarga, cadáver, coleta e invulnerabilidade.
- python tools/build_pages.py: assets e caminhos relativos.
- Navegador: silhuetas, registro, bolsa, slot, HP, HUD e Canvas.

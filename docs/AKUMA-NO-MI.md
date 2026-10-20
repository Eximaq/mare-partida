# Akuma no Mi — Lote 1 Rank E

## Uso

Personagem → Akuma no Mi abre abas E–S com cinco espaços iniciais por rank. O Rank E mostra Kuku-Kuku e Beri-Beri como silhuetas com aura colorida até o registro. Registrar fruta adiciona uma unidade à bolsa e ao Compêndio. É uma concessão de demonstração, pois este lote não define uma fonte de drop. O slot exclusivo aceita ambas. Kuku usa 1 e Beri usa 2; equipar a fruta substitui temporariamente a habilidade da classe naquela tecla.

| Fruta | Bônus ao equipar | Habilidade | Recarga |
|---|---|---|---|
| Kuku-Kuku no Mi | +5% cura recebida, +3% HP máximo | Banquete Relâmpago: cadáver mais próximo da área vira Comida, que cura 15% do HP máximo | 15 s |
| Beri-Beri no Mi | +15% resistência a impacto físico | Divisão Esférica: 1,5 s invulnerável, seis esferas VFX e impulso nos inimigos até 130 px | 18 s |

Cada ID registrado concede permanentemente +0,1% de HP máximo e +0,1% de Força base. Registros repetidos não acumulam. Comida e cadáveres expiram em 20 s e 12 s, respectivamente. A redução da Beri só afeta dano físico comum.

## Persistência e arquitetura

O catálogo em akuma-system.js é anexado ao fim de itemDefs, conservando índices antigos. Os registros têm type = akuma_no_mi e rank = E. A prévia Pages mantém save em localStorage. server/akuma.py usa SQLite para validar equipamento, Compêndio, recarga, cadáver, comida, invulnerabilidade e knockback. Execute python server/app.py para servir jogo e API em http://127.0.0.1:8123/. O banco padrão fica em ~/.mare-partida/akuma.sqlite3, fora do Git, e MARE_AKUMA_DB permite escolher outro caminho.

O cliente detecta a API e sincroniza registro, equipamento, abates e habilidades. O protótipo JS ainda informa os abates e posições dos inimigos ao serviço; portanto, a API local não é adequada à exposição pública sem autenticação e combate autoritativo em Python. O preview Pages usa as mesmas regras localmente.

## Arte e animação

O lote original estabeleceu fruta 48×48, auras animadas e o mesmo relógio `requestAnimationFrame` para mapa, retrato e menus. O rework adiciona ícones temáticos de habilidade 32×32, folhas de VFX 48×48 a 12 FPS e a máscara circular de cooldown. Kuku anima corte, fumaça dourada e comida. Beri captura o sprite 48×48 atual, compõe seis esferas detalhadas com fragmentos do personagem, separa e reagrupa as esferas por 1,5 s, ocultando e restaurando o sprite base. As referências originais permanecem fora do Git. Prompts, negativos, ciclo de produção e critérios de revisão estão em [Modo de criação de Akuma no Mi](AKUMA-CREATION-MODE.md).

## Validação

- node tests/akuma-system.test.cjs e regressões de personagem, forja e Haki.
- python tests/akuma_backend_test.py: persistência, contagem única, bônus, recarga, cadáver, coleta e invulnerabilidade.
- python tools/build_pages.py: assets e caminhos relativos.
- Navegador: silhuetas, registro, bolsa, slot, HP, HUD e Canvas.

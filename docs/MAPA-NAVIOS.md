# Mapa de viagens e menu por ícones

A opção **Mapa** reúne a escolha de caçadas numa janela náutica com água animada. O fluxo atual, atualizado em 19/10/2026, está documentado em [Regiões e detalhes do Arquipélago](ARQUIPELAGO-REGIOES.md).

**East Blue** abre por padrão e apresenta oito ilhas de Nv. 1–10 a Nv. 71–80. **Alabasta** permanece bloqueada. Clicar em uma ilha abre seus detalhes; a viagem exige o botão próprio. Ilha Dawn (`beach`, entrada Nv. 1) e Cidade das Conchas (`swamp`, entrada Nv. 8) usam os dois cenários existentes. As seis demais ilhas são inspecionáveis, com viagem bloqueada. Os nomes antigos eram Ruínas de Brasas e Fenda da Névoa; IDs e saves continuam compatíveis.

O ícone, tecla M, botão de viagem e NPC de expedição convergem para a mesma janela. Referências internas antigas a `hunts` são normalizadas para `map`. A água é parte da interface, sem personagem caminhando nela. A lista substitui a disposição anterior de seis navios em círculo para acomodar regiões e detalhes.

O menu mantém **seis botões por ícone**: Inventário, Forja, Personagem, Mapa, Contratos e Ajuda. Os nomes aparecem por hover/foco, com nomes acessíveis e atalhos. Não há hambúrguer ou botão de expansão nesta etapa. A preferência antiga `menuExpanded` pode permanecer no save, sem alterar a HUD atual.

## Fontes

- `archipelago.js`: catálogo de regiões e ilhas, faixas, área real, requisitos e previews.
- `game.js`, `index.html`, `ui-nautical.css`: integração, foco e apresentação responsiva.
- Navios: duas células superiores de `pixellab-pip-generations/porto-compacto-20261018/harbor-props.png`.
- Mar: `assets/ruinas-brasas/water.png`, deslocado por CSS. Movimento reduzido desativa o fluxo.
- Artes existentes preservadas, sem gerações pagas. Economia, mapas e combate não mudaram.

## Verificação

`tests/voyage_browser.py` cobre cinco resoluções, abas, detalhes das oito ilhas, fallback de preview, viagens reais, requisitos, teclado/foco, persistência e animação. `tests/archipelago.test.cjs` verifica o catálogo e suas regras. Os testes de ilha, personagens, combate, inventário/forja e Pages foram adaptados ao passo de inspeção anterior à viagem. Capturas locais ficam fora do Git.

O build `python tools/build_pages.py` inclui o catálogo e mantém scripts/CSS com hash para atualização de cache. Histórico anterior desta janela: `docs/CHANGELOG_DEV.md`.

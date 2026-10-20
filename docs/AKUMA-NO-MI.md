# Akuma no Mi — prévia e infraestrutura

## Estado atual

O menu Personagem preserva Personagem, Talentos, Conquistas e HAKI e acrescenta Akuma no Mi. O compêndio mostra os seis ranks E, D, C, B, A e S, sem botões de desbloqueio. O catálogo está vazio até a chegada dos lotes de 3 a 5 frutas. Nenhuma fruta entra no loot comum, no loot especial da prisão ou nas receitas da Forja por esta atualização.

## Dados e save

`akuma-system.js` define `AkumaNoMiData(id, name, rank, icon_path, bonus_stats, vfx_sprite_sheet)` e o catálogo append-only. Novos registros devem ser anexados ao catálogo em lotes de 3 a 5, com ID estável, rank válido e caminhos relativos para ícone e VFX. O `itemDefs` do jogo inclui esses registros **ao fim** do catálogo de itens para conservar os índices já gravados nos saves. Objetos de inventário de fruta usam `type: 'akuma_no_mi'` e `fruitId`.

O save inclui `akumaCompendium`, lista de IDs únicos registrados. A migração conserva IDs ainda não presentes na versão atual do catálogo para permitir atualização futura; o bônus só considera IDs conhecidos pelo catálogo carregado. `MareAkuma.register` valida o ID e adiciona o registro uma vez. Não há ação de registro na UI nesta prévia. O jogo continua local em `localStorage`, sem servidor autoritativo.

## Atributos e equipamento

Cada ID registrado concede permanentemente +0,1% cumulativo de Vida Máxima e +0,1% de Força base. A contagem é feita no cálculo central de atributos, independente da fruta equipada. O slot `akuma_no_mi` aceita frutas de todos os ranks e de qualquer classe, via botão Equipar ou arraste da mochila. Os bônus `bonus_attack`, `bonus_defense`, `bonus_hp`, `bonus_max_hp`, `bonus_energy`, `bonus_crit` e `bonus_strength/dexterity/vitality/intelligence/spirit` entram no cálculo de equipamento; campos inválidos não são aplicados. Frutas ficam fora de fusão, refino, imbuimento e reforja.

Ao equipar, `current_fruit_vfx` passa a apontar para `vfx_sprite_sheet`. `vfx_aura` desenha a camada sobre o sprite e os retratos; se a folha ainda não tiver carregado, exibe uma aura leve. O contrato de folha atual é horizontal, com frames de 48×48. Ao retirar a fruta, a camada é desligada.

## Validação

- `node tests/akuma-system.test.cjs`: ranks, bônus, registro único, migração e exclusão da Forja.
- `node tests/character-system.test.cjs`, `node tests/forge-system.test.cjs`, `node tests/haki-system.test.cjs`: regressões de atributos, equipamento e HAKI.
- `python tools/build_pages.py`: inclui `akuma-system.js` no preview com caminho relativo e hash de cache.
- Navegador real: criação de personagem, seis ranks e aviso visíveis, sem ação de desbloqueio; slot Akuma no Mi presente no inventário.

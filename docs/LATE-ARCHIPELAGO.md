# Thriller Bark, Sabaody, Marineford e chefes 120–180

Integração solicitada em 26/11/2026, sobre a estrutura de Enies Lobby do PR #381, com os monstros e chefes aprovados do PR #380. As três abas acrescentam 14 destinos ao Arquipélago; os 23 destinos anteriores mantêm seus IDs e sua ordem.

## Destinos

| Área persistida | Faixa recomendada | Adversário | Nível do monstro |
|---|---|---|---:|
| `thriller-bark-01` | 114–117 | Absalom | 114 |
| `thriller-bark-02` | 118–121 | Perona | 118 |
| `thriller-bark-03` | 122–126 | Ryuma | 122 |
| `thriller-bark-04` | 127–130 | Oars | 127 |
| `sabaody-01` | 131–135 | Pacifista | 131 |
| `sabaody-02` | 136–140 | Urouge | 136 |
| `sabaody-03` | 141–145 | Basil Hawkins | 141 |
| `sabaody-04` | 146–150 | X Drake | 146 |
| `marineford-01` | 151–155 | Squard | 151 |
| `marineford-02` | 156–160 | Onigumo | 156 |
| `marineford-03` | 161–165 | Little Oars Jr. | 161 |
| `marineford-04` | 166–170 | Izo | 166 |
| `marineford-05` | 171–175 | Vista | 171 |
| `marineford-06` | 176–180 | Jozu | 176 |

A entrada exige o nível mínimo; o máximo é uma recomendação de progressão. Cada destino possui seis encontros, progresso e respawns próprios. Os monstros usam os atributos e o XP preparados em seus registros e permanecem fora do conjunto de inimigos de Impel Down. X Drake preserva a transformação após o primeiro dano positivo durante o combate e retorna à forma humana ao desligar do encontro.

## Mapas e Marineford semanal

Thriller Bark usa o pacote aprovado `Thriller_Bark_HD_Mapa_e_Teste.zip`: composição de 3840 × 4992 px, 123 colocações e entrada/retorno em `(1896,4822)`. Sabaody usa `Sabaody_Uso_No_Jogo.zip`: composição de 3072 × 3072 px, 62 colocações e entrada/retorno em `(2531,2788)`. Os exports preservam a geometria de navegação, cobertura e objetos de profundidade fornecidos. Os arquivos `provenance.json` junto às imagens registram as origens e a integridade dos recursos.

Os seis destinos de Marineford reutilizam a composição de 7168 × 5248 px e os objetos do boss semanal. O ID simples **`marineford` continua pertencendo à arena semanal**; os IDs `marineford-01` a `marineford-06` mantêm encontros separados. A integração não modifica a geometria, as regras, a rotação ou as recompensas do Akainu semanal.

## Masmorras de Chefes

| ID | Chefe | Nível de entrada |
|---|---|---:|
| `kuma` | Bartholomew Kuma | 120 |
| `kizaru` | Kizaru | 130 |
| `hancock` | Boa Hancock | 140 |
| `magellan` | Magellan | 150 |
| `ace` | Ace | 160 |
| `aokiji` | Aokiji | 170 |
| `akainu` | Akainu | 180 |

Os sete chefes usam a arena de masmorras existente, com seus sprites aprovados, ataque básico e um único impacto lógico por ataque. As vitórias persistem como **pendentes, com recompensa `null`**, seguindo Lucci e Moria: reabrir uma vitória não recria o chefe nem concede XP, Berry ou itens. As habilidades especiais e os VFX preparados no PR #380 continuam como recursos de arte; esta integração não acrescenta uma mecânica automática de especiais.

## Código e persistência

- `late-archipelago-map-data.js` reúne os dados importados; `late-archipelago-world.js` define os 14 destinos, setores, pontos de encontro e retorno.
- `world-map-exports.js`, `world-system.js` e `world-catalog.cjs` compartilham os mapas entre cliente e servidor; `archipelago.js` e `voyage-ui.js` registram as abas e suas grades.
- `hunt-system.js`, `monster-behavior.js`, os registros regionais e `game.js` conectam viagem, perseguição, combate e respawn. `world-battle.cjs` acrescenta somente os registros de caça que faltam nos saves anteriores.
- `boss-dungeon-system.js`, `sabaody-dungeon-art.js` e `dungeon-timing.cjs` compartilham os sete chefes e os impactos com o servidor. Os IDs também constam no schema de masmorras.
- **`0063_late_archipelago.sql` deve ser aplicada ao backend antes de servir esta versão.** Ela estende os registros de visitas e vitórias e promove somente os hashes conhecidos de Enies Lobby. Posição, caminho, HP, relógios, inventário e recibos anteriores são preservados. O schema de conquistas admite as 37 visitas sem exceder o limite antigo de 32.

## Verificação focal

`tests/late-archipelago.test.cjs`, `tests/late-world-combat.test.cjs` e `tests/late-dungeon-bosses.test.cjs` verificam destinos, navegação, perfis, limites de nível, impactos e retomada. Os testes de schema e da cadeia de migrações ficam em `tests/foundation/late-archipelago-schema.test.mts` e `tests/foundation/enies-lobby-migration.test.mts`.

`tests/integration/server-late-archipelago.test.mts` usa PostgreSQL real para verificar preservação dos saves, idempotência, rejeição de hashes desconhecidos, 37 visitas e sete vitórias sem recompensas. `tests/late-archipelago-browser.cjs` cobre viagens, encontros e interface em computador e celular. O workflow `late-archipelago.yml` executa esse conjunto e o build estático quando arquivos relevantes mudam.

Uma reversão de disponibilidade deve preservar a migração aditiva e os registros já persistidos. Não remover IDs enquanto houver personagens ou encontros vinculados a eles.

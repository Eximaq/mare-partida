# Enies Lobby: mapas, CP9 e masmorras 100/110

Integração solicitada em 26/11/2026, a partir dos recursos CP9 do PR #379, do primeiro lote Thriller Bark do PR #380 e do pacote aprovado `Enies_Lobby_V2_Mapa_e_Teste.zip` atualizado com a versão nítida.

## Destinos

| Área persistida | Faixa recomendada | Adversário | Nível do monstro |
|---|---|---|---|
| `enies-lobby-01` | 95–100 | Fukurou | 97 |
| `enies-lobby-02` | 101–104 | Kalifa | 101 |
| `enies-lobby-03` | 104–106 | Jabra | 104 |
| `enies-lobby-04` | 107–109 | Blueno | 107 |
| `enies-lobby-05` | 110–114 | Kaku | 110 |

O nível 104 aparece nas duas faixas conforme o pedido. A faixa orienta a progressão; a entrada exige o nível mínimo e não impõe nível máximo.

Os cinco destinos compartilham a composição aprovada de **3072 × 4736 px**; cada destino mantém encontros, progresso e respawns independentes. O mapa preserva seus 87 objetos, 94 colisores, 13 destinos de navegação e ponto de entrada/retorno `(1533, 4590)`. São seis pontos de encontro por destino, fora da zona segura. O WebP sem perdas é armazenado uma única vez; seu SHA-256 é `7f2f094c13043bed5fda091cf18168f27a50470233b1f084364dedf0abc017c9`.

## Chefes

`rob-lucci` libera a masmorra de nível 100 e `gecko-moria` a de nível 110. Ambos usam as animações e os atributos já preparados, com um impacto lógico por ataque. Lucci, Jabra e Kaku preservam a transformação após o primeiro dano positivo e retornam à forma inicial quando o encontro é encerrado.

As recompensas de Lucci/Moria permanecem sem configuração. A vitória é registrada como pendente e pode ser reaberta sem recriar o chefe; não concede XP, Berry ou itens. Absalom, Perona, Ryuma e Oars continuam sem encontros. Os lotes posteriores de Sabaody, Marineford e espadachins do PR #380 não fazem parte desta integração.

## Pontos de extensão e persistência

- `enies-lobby-map-data.js` contém os dados aprovados; `enies-lobby-world.js` define as cinco instâncias.
- `archipelago.js`, `hunt-system.js`, `monster-behavior.js` e `game.js` ligam seleção, viagem, encontros e retorno.
- `enies-dungeon-art.js` conecta os clips existentes às identidades das masmorras; `dungeon-timing.cjs` compartilha seus impactos com o servidor.
- `0062_enies_lobby.sql` expande os registros de visitas e vitórias e promove somente os hashes predecessores conhecidos. Posição, caminho, HP, relógios de combate, progresso, inventário e recibos anteriores são preservados.
- O backend existente precisa receber a migração 0062 antes de servir esta versão. Esta alteração não configura hospedagem ou credenciais de produção.

## Verificação focal

`tests/enies-lobby.test.cjs` cobre acesso, navegação, encontros e progresso; `tests/enies-bosses.test.cjs` cobre chefes, impacto, transformação e retomada. Os testes `tests/foundation/enies-lobby-*.test.mts` verificam contratos e hashes. `tests/integration/server-enies-lobby.test.mts` exige PostgreSQL e valida viagens, vitórias sem duplicação e repetição da migração sobre saves existentes. `tests/enies-lobby-browser.cjs` verifica a interface e os encontros em computador e celular.

Para reverter a disponibilização, usar um commit de reversão e preservar os registros de visitas/vitórias e a migração aditiva. Não remover as novas chaves de persistência enquanto houver personagens ou combates vinculados a elas.

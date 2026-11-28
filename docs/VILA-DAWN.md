# Vila Dawn — Foosha em HD

Novo cenário do destino `dawn`, integrado ao PR #394. A área persistida continua
`beach` e o mapa de runtime continua `dawn`. O PR permanece em rascunho, sem merge
nem publicação em Pages por esta entrega.

## Arte e referências

A vila foi criada a partir da identidade de Foosha, na Ilha Dawn: três moinhos,
casas rústicas, PARTYS BAR, mata nas bordas, caminhos de terra e um píer central.
A disposição jogável é uma adaptação original, não uma planta canônica.

- [Windmill Village — site oficial](https://live-action.onepiece-base.com/location/windmill-village/): vila portuária pequena com moinhos.
- [Makino — ONE PIECE oficial](https://one-piece.com/character/Makino/index.html): referência do PARTYS BAR em Foosha.
- [Foosha Village — One Piece Wiki](https://onepiece.fandom.com/wiki/Foosha_Village): contexto geográfico da vila na Ilha Dawn.

`assets/dawn-village/foosha/scene-hd.png` é o PNG original gerado, copiado byte a
byte: **1448 × 1086 pixels**, **4.035.964 bytes**, SHA-256
`b074ddb95c296c077e66f0feb85df81468ff265c05a9bfd1a96e24828b592f54`.
O pedido de geração foi 3072 × 2304, mas o retorno real foi 1448 × 1086; não houve
ampliação artificial, redução ou recompressão. O mundo mede 3072 × 2304 **unidades
de jogo**, na mesma proporção 4:3. Essas unidades não são pixels nativos da fonte.

O renderer usa recortes da fonte integral e nearest-neighbor. O prompt exato,
as referências, a origem e o hash acompanham o PNG. Imagens externas de referência
não são distribuídas. As imagens antigas `assets/dawn-manual/map.png`,
`assets/exported-maps/dawn/map.png` e `assets/ui/voyage-hd/dawn.png`, além dos
objetos e fontes manuais, permanecem intactas.

## Integração e navegação

- Dados: `dawn-village-map-data.js`; renderer: `dawn-village-world.js`.
- Cinco polígonos de piso, 29 silhuetas e 39 bases físicas seguem a pintura.
- Mar, faces da costa, raízes e fundações bloqueiam movimento; os caminhos e
  os acessos dos três moinhos permanecem conectados.
- Chegada: **(1536, 1808)**. Retorno: **(1536, 2112)**, raio 48. O retorno usa as
  coordenadas do mapa instalado, separado da chegada e da área de segurança.
- Os sete IDs de setor permanecem `cais`, `corsarios`, `estaleiro`, `mercado`,
  `ancoras`, `farol` e `caldeira`. Os nomes visuais acompanham a nova composição.
- Preservados os 14 encontros César Nv. 5 e o chefe Nv. 5, os IDs dos pontos,
  atributos, loot, requisitos do chefe, respawns e recompensa inicial de 300.
- Navegador e servidor consomem a mesma geometria; build estático, Docker,
  auditor de mapas e workflow `dawn-village.yml` incluem os módulos novos.

Uma revisão independente encontrou dois casos de navegação: o nó final junto à
cerca da casa verde norte e a curva da trilha nordeste. A base da cerca passou de
y347/altura12 para y351/altura8 em pixels da fonte, mantendo sua borda inferior.
A curva foi alargada sobre estrada e grama seca. Ambos têm regressão com ida e
volta usando o movimento real de cliente e servidor, sem modificar a pintura.

## Saves e grupos

A migração aditiva **0072** reconhece a assinatura anterior
`b1c2e63f0aa604c4e30ffdffdd765c461450f1752eb2bf2a5ae2c639e8d2dca9` e promove para
`f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b`.
Somente posições de `dawn` são recolocadas na chegada; outros mapas conservam
posição, direção, rota, velocidade e relógios. Assinaturas desconhecidas não
são promovidas e repetir a migração não reposiciona o jogador novamente.

A compatibilidade de combate reconhece a versão anterior
`0dfdc472b3ec8f7213d274bff111ed2c152d27e76dcbed3e587255713cec8bbd` e as cadeias
anteriores já suportadas. Os encontros são reancorados pelos IDs, incluindo o
chefe e os extras de grupo. HP, energia, mortos, cadáveres, respawns, progresso,
recibos e recompensa já recebida são preservados. Ações ligadas à posição antiga
são encerradas apenas em `beach`. A projeção individual, as leituras em lote e o
worker usam o alias correto `beach` → `dawn`.

## Verificação

- Layout Dawn, export manual preservado, compatibilidade e profundidade:
  **11/11 testes aprovados**.
- Auditor do mapa: **66/66 rotas**, um componente caminhável, sem collider
  inválido ou duplicado.
- Compatibilidade dos sete mapas: **22/22 testes aprovados**.
- PostgreSQL e consumidores da cadeia: **27 testes aprovados**, mais o teste
  foundation da cadeia de assinaturas.
- Navegador real: **1366 × 768 / DPR 1** e **393 × 852 / DPR 2**, com viagem pela
  UI, sete setores, combate, save/reload, retorno clicado e profundidade.
- PNG servido com os bytes originais; três recortes da câmera com diferença de
  pixels zero. A árvore cobre 2638 pixels do personagem atrás e zero à frente.
- Build estático, build TypeScript e typecheck aprovados.

O HUD móvel existente ocupa parte relevante da tela. O teste aproxima o jogador
pelo próprio píer para expor o marcador e clicar no canvas, sem alterar HUD,
zoom, colisões ou câmera para passar. As falhas já conhecidas de preparação das
poses attack/skill south do avatar padrão permanecem registradas pelo harness;
as poses desenhadas na caminhada e nas capturas estão prontas.

A suíte geral mantém quatro falhas anteriores a esta entrega: catálogo em
`current-game-catalog.test.mts`, dois casos de contexto Docker em
`docker-context.test.mts` e um caso de Visual Completo em
`visual-completo.test.mts`. O comando para na etapa foundation; não representa
aprovação da bateria legada inteira. Os testes focados acima são a evidência
desta integração. O merge/deploy não foi executado.

Rollback: reverter o commit desta integração no PR, preservando os arquivos
históricos. Saves não devem ser apagados e migrações já aplicadas não devem ser
reescritas em um ambiente compartilhado.

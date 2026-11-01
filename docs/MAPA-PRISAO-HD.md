# Mapa do Arquipélago e Impel Down — HUDs HD

Sprint de 01/11/2026. Referências de composição: East Blue, Alabasta e Impel Down fornecidas pelo proprietário. A arte organiza a apresentação; `archipelago.js`, `prison-system.js` e o controlador de combate continuam determinando os dados.

## Interfaces entregues

- Cabeçalho náutico, madeira e metal escuro, molduras e botões HD aprovados; textos reais com Alegreya SC e Alegreya Sans.
- Mapa regional dominante, destinos com paisagens individuais, rota ilustrativa pontilhada e painel de detalhes. Selecionar não viaja nem prepara os mapas completos.
- O botão de viagem permanece na base do painel; requisitos são conferidos novamente pelo controlador. Cliques repetidos após fechar a tela não iniciam outra viagem.
- East Blue oceânico; Alabasta desértica com os cinco setores de Alubarna; Skypiea com ilhas celestes e estado honesto sem destinos. Nenhum Oásis Yuba foi acrescentado.
- Impel Down: lista dos 100 andares, seleção e estados de bloqueio/conclusão/chefe, cela central com adversário real, informações, ação de entrada/continuação e quatro painéis inferiores.
- Marcos mostram a caixa oficial, quantidade e estado recebido/pendente/a conquistar. Andares sem prêmio não exibem caixa de recompensa.
- Desktop usa listas e detalhes com rolagem própria. Mobile organiza os painéis verticalmente, preservando tamanho legível, fechamento, retorno e foco. Abas regionais aceitam setas, Home e End.

## Catálogo preservado

| Região | Destino | Área/ID de viagem | Recomendado | Entrada |
|---|---|---|---|---|
| East Blue | Ilha Dawn | beach | 1–5 | 1+ |
| East Blue | Cidade das Conchas | swamp | 8 | 8+ |
| East Blue | Orange Town | orange | 11–15 | 11+ |
| East Blue | Ilha dos Animais Raros | rare | 16–20 | 16+ |
| East Blue | Vila Syrup | syrup | 21–25 | 21+ |
| East Blue | Baratie | baratie | 26–30 | 26+ |
| East Blue | Parque Arlong | arlong | 31–35 | 31+ |
| East Blue | Loguetown | loguetown | 36–40 | 36+ |
| Alabasta | Deserto de Alabasta | alabasta | 40–50 | 40+ |
| Alabasta | Alubarna 01 | alubarna-01 | 50–55 | 50+ |
| Alabasta | Alubarna 02 | alubarna-02 | 55–60 | 55+ |
| Alabasta | Alubarna 03 | alubarna-03 | 60–65 | 60+ |
| Alabasta | Alubarna 04 | alubarna-04 | 65–70 | 65+ |
| Alabasta | Alubarna 05 | alubarna-05 | 70–75 | 70+ |

Fonte única: `MareArchipelago.islands`. Níveis não foram copiados das imagens de referência. Skypiea tem zero destinos. Nomes, IDs, áreas, requisitos, descrições e drops continuam no catálogo atual. A rota gráfica não concede desbloqueio nem cria custo ou encontro.

## Adversário da prévia e da batalha

`MarePrison.prepareEncounter` utiliza o mesmo sorteio e pool de `createRun`. Prepara somente `cleared + 1` e guarda `{floor,type,token}` em `impelDown.encounter`. Não armazena estatísticas duplicadas: `resolveEncounter` as resolve pelo catálogo vigente e pela escala oficial do andar.

O controlador salva essa identidade antes de disponibilizar a entrada. `createRun({prepared})` e `prepareFloor` reutilizam a mesma identidade, sem novo sorteio. Fechar/reabrir e recarregar preservam o inimigo. A preparação não inicia a partida nem consome recursos ou concede recompensas.

Se o armazenamento falhar, a entrada fica bloqueada; uma tentativa pendente em memória preserva o mesmo sorteio para salvar novamente, aplicando somente sua identidade ao estado mais recente. No avanço automático, o próximo encontro também é salvo antes de iniciar o combate. Falha nessa etapa pausa a partida e oferece nova tentativa de salvamento.

A vitória move a identidade para `lastEncounter` junto da progressão/recompensa, na mesma transação. Mantemos apenas o próximo encontro e o último concluído. Andares antigos sem registro são exibidos como adversário desconhecido; não recebem um monstro arbitrário.

Chefes continuam provisórios, a cada cinco andares. Sua arte e seus atributos vêm da definição atual. O nome “Guardião Provisório” é explícito.

## Sprites e carregamento

- `drawExpeditionMonster` chama o resolvedor e o cache atual de `MareSpriteCombatV2` para monstros com conjunto atual. Solicita apenas Idle South do adversário relevante.
- César usa `MareEmberRenderer` e o cache de seus recursos oficiais; seu enquadramento de menu considera o contorno alfa visível. A mesma arte agora é chamada no combate da prisão, onde a restrição antiga ao mapa de Dawn/Ember deixava César sem arte.
- Tipos que só possuem a representação atual estática (`crab`, `bandit`, `spirit` e o chefe provisório) usam o mesmo bitmap oficial já carregado pelo combate. Não são fallback de um conjunto v2 ausente.
- Falhas de um sprite v2 mostram indisponibilidade; nenhum sprite de geração anterior é carregado para disfarçar a falha.
- Prévia estática, canvas limitado a 480×320, consultas de prontidão interrompidas ao fechar/trocar a tela; sem novo loop permanente de animação.
- Imagens dos destinos só são requisitadas para a região exibida. Card e detalhe compartilham a mesma URL/cache. Retorno tardio de uma seleção não substitui a seleção atual.

## Arte PixelLab AI

`assets/ui/voyage-hd/manifest.json` registra os 20 arquivos, jobs, dimensões, SHA-256 e cobranças efetivas:

- 3 mapas regionais, 600×448.
- 14 paisagens de destinos, 320×180.
- Cela, 688×384.
- Cabeçalho náutico, 792×168.
- Atlas de três símbolos regionais com alfa real, 192×64.

São saídas nativas PixelLab Pro e Pro Flash, solicitadas como Masterpiece Ultra HD refined pixel art, preservadas sem reamostragem dos arquivos. A direção e a organização seguem as referências; a arte nova possui desenho próprio e não é uma reprodução literal dos mockups.

Custo efetivo: **16 gerações da assinatura + US$ 1,79 em créditos**. Não foram gerados novos monstros, moeda ou itens de recompensa. Madeira, pergaminho, molduras, botões, ícones oficiais, Berry e caixa de pérolas foram reutilizados.

## Regras preservadas

100 andares; um adversário por andar; chefe a cada cinco; escala existente de 1,30 por andar; vitória sequencial; avanço automático inclusive antes dos chefes; restauração de HP e manutenção da energia/recargas; derrota no mesmo andar/inimigo; marcos 5–50 únicos; mochila cheia mantém prêmio pendente; falha ao salvar não concede vitória ou caixa duplicadas; acima do 50 não há prêmio adicional definido.

Nenhuma modificação de mapas de combate, economia, atributos de monstros, classes, equipamentos ou saves de jogadores foi realizada.

## Arquivos principais

- `voyage-ui.js` / `voyage-hd.css`: composição compartilhada e estados visuais.
- `game.js`: ligação com navegação, resolvedores atuais e transações.
- `prison-system.js`: identidade persistente e resolução de encontros.
- `assets/ui/voyage-hd/`: 20 componentes e manifesto.
- `index.html`, `ui-preview.html`, `tools/build_pages.py`: pacote estático e versionamento.
- Testes: `voyage-ui.test.cjs`, `prison-encounter.test.cjs`, `voyage_hd_browser.cjs` e `voyage_failures_browser.cjs`, além das suítes existentes pertinentes.

## Validação

- Node: catálogo do arquipélago e Alubarna, geometria da prisão, progressão/recompensas/caixas, preparação persistente, apresentação, menu Modos, componentes de UI e preparação/carregamento seletivo.
- Navegador real: todos os 14 destinos e suas viagens, bloqueio por nível, três regiões, troca de seleção, teclado, ausência de comandos no mundo, sprites oficiais e falhas de arte sem fallback antigo.
- Layouts: 1920×1080, 1672×990, 1366×768, 1280×720 e 393×851. Verificação geométrica de sobreposição dos cards, título, largura da janela e encaixe dos botões.
- Prisão real: combate, seis andares, chefe, derrota/nova tentativa, vitória/avanço, token da prévia igual ao da batalha, fechar/reabrir/recarregar, falhas de persistência, mochila cheia, prêmio único e conclusão do andar 100.
- `python tools/build_pages.py` e repetição da validação principal sobre `dist/`.
- Capturas produzidas em diretório local ignorado; nenhuma evidência em massa ou save foi versionado.

## Limites do conteúdo atual

Skypiea ainda não possui destinos; chefes específicos da prisão e recompensas acima do andar 50 continuam a definir. Andares concluídos em saves antigos não têm histórico de inimigos. Não foi inventado conteúdo para preencher essas lacunas.

Resultado local: 44 verificações Node aprovadas; os três ensaios de navegador (combate, falhas de arte e aceite do pacote estático) passaram. O workflow `.github/workflows/voyage-hd.yml` repete essas verificações no PR e publica as capturas como artefato, fora do histórico Git.

A regressão completa `tests/conchas_browser.py` também passou em cinco resoluções (incluindo 320×568), com os 105 objetos, entrada ao sul, sprites de Helmeppo, percurso dos setores e compatibilidade do save. Sua espera pelos recursos completos foi movida para depois da confirmação da viagem; a inspeção permanece leve e possui uma asserção específica contra pré-carregamento do mapa completo.

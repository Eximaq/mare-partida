# Performance, sprites e cache — relatório de 30/10/2026

A preparação dos equipamentos passou de p99 de 83,3 para 16,8 ms na rodada fria, com frames acima de 50 ms caindo de 118 para 0. A transferência inicial caiu 61,4%. O ganho se concentra no carregamento/composição; lobby inicial, memória e combate não melhoraram uniformemente em todas as métricas. As tabelas abaixo incluem também esses resultados.

Base: PR158, commit 7b14fa7. Amostra final de desempenho: implementação 2c327c1; a guarda adicional de retenção só protege aparências ainda não compiladas, sem mudar o roteiro medido. Branch: feature/performance-sprite-cache. Implementação em worktree isolada, preservando o trabalho local da sprint de equipamentos. Artes, número de frames, pivots, tempos de combate, colisões e saves foram preservados.

## Método e limites

- Chrome 156.0.8078.74 no Windows, viewport 1366×768, escala 1, CPU limitada a 2× via DevTools, rede local sem limitação de banda.
- Servidor HTTP local instrumenta as respostas sem alterar os arquivos de produção e sem interceptação de rotas do Playwright, que desativaria o cache HTTP. Cache-Control do ensaio: max-age=3600; manifests que exigem revalidação continuam revalidados.
- Cache vazio seguido de recarga com cache preenchido. A rodada quente restaura a aparência inicial depois do pagehide. Itens e sorteio do combate usam sementes fixas. Os atributos derivados foram idênticos antes/depois em todas as etapas.
- Roteiro: criar personagem feminino, cabelo topknot violeta, pele escura; mostrar o primeiro sprite; mover no lobby; equipar cabeça 19, capa 24 e Ame 70; ocultar capacete; abrir inventário; entrar em Dawn e retornar.
- Evidências finais privadas: release-before e final-metrics. Perfis de CPU foram coletados separadamente, sem incluí-los nos números comparativos finais. Capturas, perfis e saves sintéticos ficaram fora do Git.
- Valores pontuais de um roteiro controlado, sujeitos a variações do navegador/SO. Não representam garantia de FPS em outro hardware nem um teste de memória prolongado. GPU não foi medida diretamente.
- O tempo navegação → sprite inclui os cliques automatizados de criação; confirmação → sprite isola melhor a preparação visual. O marcador de interatividade é o fim da inicialização do jogo, não uma medição Lighthouse de TTI.

Reprodução: executar tests/performance_sprite_browser.cjs com Playwright, Chrome e --evidence apontando para uma pasta externa. --source-ref=7b14fa7 reproduz os arquivos de base; omitir essa opção mede a versão atual. O servidor de teste mantém cache real e registra falhas. O mesmo ensaio e configuração foram usados nas duas versões.

## Causas confirmadas e alterações

1. A composição repetia cópias de strips e recoloração da pele por pose. Superfícies de leitura de pixels agora usam contexto apropriado para leitura frequente; strips de pele são preenchidos por frame e reutilizados, com chave de arquivo/dimensões/paleta e limite de 12 entradas/16 MiB. Na repetição da mesma pose, recolorações caíram de 5 para 1.
2. O primeiro personagem aguardava todos os clips. Agora o primeiro clip exato pode ser exibido enquanto as demais direções/ações essenciais são preparadas. A visibilidade não solicitada do capacete deixa de ser composta antecipadamente. Nenhum clip de outra ação/aparência é usado como substituto. Cancelamento e descarte de respostas obsoletas foram preservados.
3. Eram solicitadas faixas animadas de cabeça, rosto, cabelo e roupa já substituídas pelos recursos canônicos/equipados. O carregador usa apenas as camadas necessárias. Cabelos cobertos por capacetes também deixam de ser processados. As bancadas conservam os recursos para ocultar camadas manualmente.
4. O cache por apenas 48 imagens causava decodificações repetidas. Agora tem LRU, limite de 192 entradas e 64 MiB estimados de RGBA durante a preparação, mantendo concorrência máxima 6. Durante a caçada, com poses compiladas e sem composição pendente, fontes grandes são descartadas até restarem no máximo 8 MiB, preservando pequenos encaixes. As duas aparências e oito prévias compiladas continuam disponíveis; canvas descartados são esvaziados.
5. Mapas grandes, monstros distantes e 117 máscaras de profundidade eram iniciados indiscriminadamente. Alabasta, Alubarna, NewIslands e PixelWorldMaps passam a preparar seus recursos pela região usada/selecionada. A seleção de viagem antecipa o destino permitido pelo nível; não muda as regras de entrada. Máscaras são solicitadas por região.
6. Ember também fornece as animações de César usadas em Dawn. O aquecimento desses atores foi separado do terreno e é compartilhado/idempotente. Falha do manifesto não rejeita a inicialização nem gera pedidos por frame. Monstros já pertencentes a SpriteCombatV2 são preparados pelo registro atual, evitando suas folhas antigas.
7. Dawn guardava 20 chunks, menos que a área visível possível em telas maiores, e seus acertos não atualizavam a ordem de uso. O limite agora acompanha a grade finita do mapa: 35 chunks de 512 px, cerca de 35 MiB RGBA. A segunda passagem de um mapa inteiro aquecido passou de 35 novas alocações de canvas para zero. Os pixels e o método de desenho dos chunks foram preservados.
8. O helper classCombatAsset não tinha chamadores. Foi removido depois da busca de referências em JS/CJS/Python/HTML/JSON versionados. Não participa da persistência.

Depois dos equipamentos, as tentativas de decodificação nativa caíram de 503 para 89 na rodada fria. Acertos do cache passaram de 69,6% para 88,5%. A contagem acumulada de composições até essa etapa caiu de 604 para 428. Esses contadores incluem a prévia e a preparação, não reconstruções por frame de uma aparência pronta.

## Carregamento e recursos

| Métrica | Antes | Depois | Variação |
|---|---:|---:|---:|
| Interatividade (marcador no fim da inicialização), cache vazio | 1.650,9 ms | 1.332,3 ms | -19,3% |
| Navegação → primeiro sprite, cache vazio | 8.965,1 ms | 2.806,6 ms | -68,7% |
| Confirmação → primeiro sprite, cache vazio | 5.309,1 ms | 521,5 ms | -90,2% |
| Navegação → primeiro sprite, cache preenchido | 6.368,7 ms | 1.287,3 ms | -79,8% |
| Recursos até o primeiro sprite, cache vazio | 588 | 284 | -51,7% |
| Transferência até o primeiro sprite, cache vazio | 39,76 MiB | 15,35 MiB | -61,4% |
| Entradas de recursos no roteiro completo, cache vazio | 958 | 365 | -61,9% |
| Transferência no roteiro completo, cache vazio | 43,24 MiB | 19,30 MiB | -55,4% |
| Entradas repetidas de URL, cache vazio | 357 | 2 | -99,4% |
| Entradas repetidas de URL, cache preenchido | 348 | 1 | -99,7% |
| Preparação de equipamentos (inclui espera final de 1 s), cache vazio | 27.462,0 ms | 7.853,0 ms | -71,4% |
| Preparação de equipamentos, cache preenchido | 26.490,0 ms | 9.262,0 ms | -65,0% |

Entradas de recursos e URLs repetidas são Resource Timing, incluindo leituras do cache; não equivalem a transferências repetidas pela rede. A soma de transferSize informa os bytes efetivamente registrados. A contagem inicial termina no primeiro sprite, que aparece antes; a medição do roteiro completo confirma que a redução não é apenas uma mudança desse ponto de corte.

## Frames — valores antes → depois

| Cache | Etapa | FPS médio | Média ms | p95 ms | p99 ms | Máximo ms | Frames >50 ms |
|---|---|---:|---:|---:|---:|---:|---:|
| Vazio | Lobby inicial / movimento | 60,0 → 58,1 | 16,7 → 17,2 | 16,8 → 16,8 | 16,8 → 33,4 | 16,9 → 50,0 | 0 → 0 |
| Vazio | Equipamentos | 32,4 → 59,6 | 30,8 → 16,8 | 66,6 → 16,8 | 83,3 → 16,8 | 116,8 → 33,4 | 118 → 0 |
| Vazio | Inventário | 53,7 → 54,4 | 18,6 → 18,4 | 16,8 → 16,9 | 66,6 → 83,3 | 183,4 → 116,7 | 2 → 2 |
| Vazio | Dawn / retorno | 42,4 → 39,0 | 23,6 → 25,7 | 33,4 → 33,6 | 50,1 → 66,7 | 183,4 → 200,1 | 4 → 5 |
| Preenchido | Lobby inicial / movimento | 59,8 → 56,9 | 16,7 → 17,6 | 16,8 → 16,9 | 16,8 → 33,4 | 33,3 → 66,7 | 0 → 1 |
| Preenchido | Equipamentos | 33,4 → 56,7 | 30,0 → 17,7 | 66,6 → 33,2 | 66,9 → 33,5 | 100,0 → 50,0 | 90 → 0 |
| Preenchido | Inventário | 58,5 → 58,6 | 17,1 → 17,1 | 16,9 → 16,9 | 33,2 → 16,9 | 50,1 → 66,6 | 1 → 1 |
| Preenchido | Dawn / retorno | 41,7 → 42,3 | 24,0 → 23,6 | 33,5 → 33,6 | 50,2 → 50,1 | 183,4 → 183,2 | 3 → 5 |

A fase de lobby começa no primeiro sprite: na versão nova ainda existe preparação em segundo plano, enquanto a antiga só o exibia após a preparação completa. O p99 inicial do lobby aumentou. Os equipamentos apresentam o ganho mais consistente. O primeiro inventário ainda tem um pico e o combate de Dawn não atingiu 60 FPS neste ensaio com CPU 2×; a rodada fria teve p99 maior, apesar de a política de cache corrigir as reconstruções contínuas em viewports maiores. O relatório não declara eliminadas todas as travadas.

## Memória e cache

| Cache | Etapa | Heap JS antes (MiB) | Heap JS depois (MiB) |
|---|---|---:|---:|
| Vazio | Lobby inicial / movimento | 25,95 | 21,43 |
| Vazio | Equipamentos | 33,42 | 31,25 |
| Vazio | Inventário | 32,51 | 34,60 |
| Vazio | Dawn / retorno | 23,71 | 22,94 |
| Preenchido | Lobby inicial / movimento | 32,02 | 22,32 |
| Preenchido | Equipamentos | 40,60 | 54,90 |
| Preenchido | Inventário | 27,01 | 54,67 |
| Preenchido | Dawn / retorno | 30,29 | 29,95 |

São snapshots de usedJSHeapSize, sem GC forçado. Não medem toda a memória de imagens/canvas/GPU nem constituem pico absoluto. Houve aumento temporário do heap na rodada quente; não há evidência de redução uniforme de memória total. Os limites de cache são explícitos e verificáveis, mas a memória interna do navegador pode ser maior que os valores controlados pelo jogo.

No cenário final, o cache controlado de fontes caiu de 52,06 MiB após equipar para 5,75 MiB após o combate na rodada fria; na quente, de 48,75 para 7,95 MiB. Isso não remove as poses compiladas. A resolução das artes foi mantida.

## Classificação e limpeza estrutural

| Grupo | Classificação | Decisão |
|---|---|---|
| Native96, catálogo, rigs, ownership, aparência e armas atuais | ATIVO | Preservados e usados pelo jogador padrão |
| SpriteCombatV2 e efeitos Zoan | ATIVO | Preservados; o aquecimento segue esse registro quando aplicável |
| Mapas, NPCs, máscaras e animações compartilhadas de César | ATIVO | Preservados, com carregamento seletivo |
| Renderizadores de terrenos Ember/Orange/Conchas | LEGADO NECESSÁRIO / ATIVO conforme consumidor | Preservado boot explícito; Ember ainda atende atores de Dawn |
| PaperDoll anterior, folhas de referência e artes originais | LEGADO NECESSÁRIO | Bancadas históricas, geração, referências, NPCs e proveniência |
| classCombatAsset em game.js | OBSOLETO CONFIRMADO | Função removida; nenhuma referência ativa encontrada |
| Arquivos sem dependência comprovada em ambos os sentidos | INDETERMINADO | Preservados; ausência de importação estática não justifica exclusão |

Arquivos inteiros versionados excluídos: nenhum. Não foram encontrados .bak/.tmp/.orig/.pyc/.old/Thumbs.db/.DS_Store versionados. Nenhuma exclusão artística em massa foi justificada. Todos os PNGs permanecem inalterados; 7.285 frames nativos de 26 personagens foram verificados. A limpeza de código tem commit próprio, posterior aos checkpoints das otimizações.

## Validações

- Suíte completa Node: 191 testes aprovados. Inclui criação/persistência, atributos, equipamentos, animações, combate, colisões, mapas e novos contratos de carregamento/cache.
- Python: 8 testes aprovados de release, frames e publicação. python tools/build_pages.py executado com sucesso e revisão atual verificada antes da geração.
- Comparação visual de 144 poses: zero diferenças RGBA em relação à base. Cache da pele observado em 9,375 MiB nesse ensaio, abaixo do limite de 16 MiB.
- Carregamento nativo real: masculino/feminino, 24 poses; zero pedidos de heads animadas substituídas; zero recargas da aparência inalterada; limites de imagens, bytes, bundles, prévias e concorrência respeitados, incluindo retenção de até 8 MiB durante a caçada.
- Capacetes: 480 poses; independência do cabelo, restauração ao ocultar/desequipar, 40 alternâncias rápidas, reload e rollback de storage.
- Aparência: criação, quatro direções, navegação do rascunho, confirmação, persistência, rollback e seis viewports.
- Ownership: imagem ausente, dimensão inválida, solicitação atrasada, resposta obsoleta e flags antigas; zero pedidos de jogador antigo e nenhuma repetição infinita.
- Alabasta: viagem, 80 máscaras de profundidade, 24 paredes, combate, XP e persistência, aguardando o ator do registro atual. Alubarna: cinco regiões, 20 vistas de monstros e estados walk/attack/hurt, combate e save.
- Dawn: 12 combinações de câmera/zoom comparadas byte a byte; zero diferenças. Segunda passagem aquecida sem novas alocações de chunks.

Na primeira execução sem a instalação local do Playwright configurada, somente o teste de navegador Supa não encontrou a dependência. A suíte completa passou depois de configurar NODE_PATH/CHROME_PATH e o servidor local. O teste antigo de Alubarna também foi ajustado para comparar pathname e aceitar a revisão no URL. Falhas de pré-carregamento e a dependência compartilhada de Dawn ganharam regressões próprias.

## Alternativas descartadas e limites restantes

Um protótipo de Worker/OffscreenCanvas preservou pixels e melhorou a preparação, mas piorou o comportamento de Dawn neste ambiente; foi retirado da entrega. Tentar substituir chunks por recortes diretos alterou pixels em zoom e também foi rejeitado. O compositor atual e os pixels originais foram mantidos; a correção aceita em Dawn é somente a política de cache.

Ainda merecem trabalho medido: primeiro inventário, primeiro desenho de Dawn, custo do chão por frame, inicialização das grades de navegação e retenção de mapas já visitados. Auras não equipadas e outros pequenos carregamentos existentes têm prioridade menor que os gargalos confirmados. Não foi feita uma refatoração ampla sem medição, nem são anunciadas ausência de vazamentos ou fluidez constante em todo hardware.

## Arquivos da alteração

- `alabasta-world.js` — modificado
- `alubarna-world.js` — modificado
- `conchas-renderer.js` — modificado
- `dawn-renderer.js` — modificado
- `docs/PERFORMANCE-SPRITES.md` — criado
- `ember-renderer.js` — modificado
- `game.js` — modificado
- `new-islands-art.js` — modificado
- `new-islands.js` — modificado
- `orange-renderer.js` — modificado
- `paper-doll-96-lobby.js` — modificado
- `pixellab-world-maps.js` — modificado
- `tests/alabasta_browser.cjs` — modificado
- `tests/alubarna_browser.cjs` — modificado
- `tests/paper-doll-96-lobby.test.cjs` — modificado
- `tests/performance-map-loading.test.cjs` — criado
- `tests/performance-preparation.test.cjs` — criado
- `tests/performance_composition_browser.cjs` — criado
- `tests/performance_dawn_cache_browser.cjs` — criado
- `tests/performance_native_loading_browser.cjs` — criado
- `tests/performance_server.cjs` — criado
- `tests/performance_sprite_browser.cjs` — criado
- `tools/paper-doll-96-v3/player-pack.json` — modificado
- `tools/paper-doll-96-v3/preview.js` — modificado
- `tools/paper-doll-96-v3/wardrobe.js` — modificado
- `world-depth.js` — modificado

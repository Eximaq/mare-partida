# Cidade das Conchas — reconstrução do mapa 11–20

Branch `fix/cidade-conchas-rework`, base `93ca616` (main com o PR31 do colaborador). Revisão de 20/10/2026. Entrega por PR; publicação depende de aprovação.

## Resumo para o colaborador

Conchas deixou de usar o cenário legado de lava repetido no mapa genérico de 3200×2200. Agora tem uma ilha própria de **32×32 células de 64px**, mundo 2048×2048, com cais de chegada, praça de vigília, mercados, docas, bairro antigo e acesso ao bastião por um arco aberto. Sete construções têm entradas e acessos explícitos. Barcos ficam no mar, carga nas docas e colunas no bairro antigo. Não há pontes decorativas nem lava nesta cidade.

`conchas-world.js` define terrenos, ruas, praças, fachadas, colisões, pontos de chegada/retorno e os quatro setores existentes. `conchas-renderer.js` usa os tilesets compartilhados e o compositor de terreno já validado em Orange Town. O nome compartilhado `MareHarborTerrain` é um alias do mesmo objeto de `MareOrangeTerrain`; a API antiga continua funcionando.

O ID persistido continua **`swamp`**, a ilha continua `conchas` no Arquipélago e o novo mapa de runtime é `conchas`. Não renomear os IDs de contratos, setores ou histórico de caçada. Coordenadas de setores mudaram, mas níveis, perfis de combate, drops e recompensas não. Incorporar esta branch por PR, sem substituir arquivos do colaborador por versões antigas.

## Composição e navegação

| Setor preservado | Níveis | Centro no novo mundo |
|---|---|---|
| Pátio da Vigília | 11–13 | 736, 1312 |
| Docas Veladas | 14–16 | 1440, 1504 |
| Catacumbas da Névoa | 17–19 | 1504, 928 |
| Bastião das Conchas | 19–20 | 1120, 544 |

A avenida principal liga chegada, vigília e bastião. A rua das docas conecta o setor costeiro ao bairro antigo; uma travessa fecha o circuito. Acessos de prédios usam segmentos ortogonais, evitando fragmentos de calçamento conectados apenas pela diagonal. A rede de pedra renderizada é verificada como um único componente conectado.

As colisões acompanham as bases dos objetos, com margens conservadoras alinhadas à grade de navegação existente de24px. As duas bases do arco têm colisão e o centro fica aberto. Os testes simulam movimento real entre todos os pares de setores, chegada e retorno, além dos acessos dos sete prédios. Não houve mudança no algoritmo compartilhado de navegação/câmera.

O retorno pode ser acionado tanto pelo botão da HUD quanto clicando no anel do cais; neste caso o jogador caminha até ele. A chegada e o anel têm zonas seguras. Os spawns usam os setores novos e continuam sujeitos às regras existentes de distância, terreno, LOS e quantidade.

## Arte, terreno e custo

**Zero novas gerações PixelLab. Nenhum PNG foi editado ou substituído nesta sprint.** Reutilizados:

- `assets/terrain/harbor-v2/`: seis conjuntos Wang16 nativos32, bases compatíveis e variantes grama/areia já aprovadas; escala inteira2× para células64. Apenas pares compatíveis, sprites completos, sem polígonos recortados ou texturas espelhadas. O planejamento de solo específico de Orange não é copiado para Conchas.
- `pixellab-pip-generations/ilha-porto-20261018/port-buildings.png`: taverna, mercado azul, oficina e escritório do porto, células256. Prédios em escala1×, originais preservados.
- `pixellab-pip-generations/porto-compacto-20261018/harbor-props.png`: navios, carga e palmeiras. Composição com recortes nas células256 existentes e nearest-neighbor.
- `assets/ruinas-brasas/ruin-props.png`: somente o arco e as colunas de pedra, células128. Nada de fogo, magma ou casas queimadas nesta ilha.

Cache de chunks512, máximo20; água animada por fase inteira global, estacionária com movimento reduzido. Sem gradientes borrados no terreno. A água ampliada também desliga interpolação na criação do padrão, não apenas no Canvas final.

Limites: os sprites e animações dos monstros são os legados desta região e não foram refeitos nesta etapa. Não há novos NPCs ou lojas funcionais; os estabelecimentos são cenário. O calçamento usa a textura-base conectada aprovada; grama e areia possuem detalhes discretos determinísticos. Não anunciar novas artes exclusivas ou sistemas de cidade que não foram implementados.

## Compatibilidade e integração

- Nível de entrada11, chefe Guardião Nv.20, requisito12 abates, respawn90s, primeira recompensa épica tier4/+900 dobrões preservados.
- Saves antigos não armazenam posição persistente de mundo; carregar/entrar continua usando a chegada da área. Sem reset ou migração de inventário, moeda, atributos, talentos, Haki, frutas ou progresso de caçadas.
- Diário da HUD agora prioriza contratos de Conchas enquanto estiver nesta caçada, em vez de mostrar primeiro o contrato legado de magma. Catálogo e recompensas dos contratos permanecem iguais.
- Preservadas as Zoans do PR31. O teste do pacote identificou que `zoan-art.js` estava fora da lista pública do build anterior; sua inclusão foi corrigida. Build passa a versionar 46 recursos JS/CSS, incluindo os dois módulos novos de Conchas.
- Dawn, Orange Town e o lobby mantêm geometria e arte. O mapa genérico legado continua disponível como fallback interno.

## Validação e evidências

- 24 suítes `tests/*.test.cjs`, sintaxe dos scripts raiz e build Pages.
- `tests/conchas-world.test.cjs`: dimensões, ruas renderizadas conectadas, acesso dos prédios, passagem do arco, cais ligados à terra/mar, caminhada de ida/volta e clamp da câmera.
- `tests/conchas_browser.py`: Chromium em1920×1080,1366×768,1280×720,393×852 e320×568; gate11, chegada, UI de quatro setores e persistência de save antigo. Caminhada real pelos quatro setores em DEV isolado, aviso/vitória do chefe, falha de storage no resgate, resgate único e reload; save normal preservado. Executado também sobre `dist/`.
- Comparação de recortes da câmera nas bordas511/512 e1023/1024: zero diferenças e zero pixels sem cobertura; cache16/20. Água muda com o tempo e permanece idêntica com movimento reduzido.
- `tests/pages_cache_browser.py`:46 recursos versionados, save preservado e nenhum script antigo sem hash carregado.

Capturas locais em `docs/evidence-conchas/`, ignoradas pelo Git. `before/` preserva a cidade legada; `after/` contém os mesmos setores, nas suas novas posições, chegadas nas cinco resoluções, mapa completo, ampliações2× e aviso real do chefe. Como as dimensões e os setores foram reconstruídos, a comparação é por local de jogo e não por coordenada antiga idêntica. A galeria local descreve essa diferença.

Workflow `Conchas — jogo e capturas` valida o pacote estático e exporta as imagens como artefato de revisão por14 dias. Não incluir saves ou evidências em massa no repositório. Capturas e aprovação humana complementam os testes; CI verde não equivale à aprovação visual do proprietário.

Rollback: reverter o PR retorna a geometria/renderer antigos, sem alterar os IDs persistidos nem apagar progresso. Próximo passo: revisão das capturas e aprovação antes de merge/publicação.

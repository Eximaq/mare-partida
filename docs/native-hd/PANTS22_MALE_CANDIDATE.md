# Calça 22 masculina — candidata independente, ainda não liberada

PR #322, branch fix/rework-map-user-flows. Checkout usado: 387a038ea6ff3fd414c10c7b0dc69cfaa33a6e8c. Build local publicável gerada com python tools/build_pages.py; a identificação SHA-256 de dist/game.js e do pacote candidato está em [runtime.json](evidence/pants22-candidate/runtime.json). Não é uma prova da produção.

## Estado da primeira entrega

**Incompleta.** Há uma candidata independente exercitada no mapa, mas ainda não há vínculo definitivo com o item 22. A revisão de todos os encaixes, outras famílias de ataque e combinações de equipamentos permanece aberta. Não se avançou para adaptações em lote.

| Cobertura | Resultado nesta execução |
|---|---|
| Fontes originais recebidas | Seis PNGs SOUTH/NORTH conferidos por SHA-256 e preservados byte a byte |
| Camada independente masculina | Produzida como candidata; corpo/peitoral/botas não fazem parte do PNG da calça |
| Idle SOUTH/NORTH/EAST/WEST | Desenhado no mapa, frame 0 |
| Walk SOUTH/NORTH/EAST/WEST | 16 quadros distintos desenhados por direção; movimento por teclado e deslocamento real verificado |
| Ataque desarmado SOUTH/NORTH/EAST/WEST | Oito quadros distintos desenhados por direção, exigindo estado rendered |
| Retorno ao repouso | Testado após clicar no chão e terminar o deslocamento; não comprova idle mantendo a mesma direção após matar um alvo |
| Equipar / retirar | Inventário real; fixture fornece apenas a instância inicial |
| Recarregar equipada | Item 22 persistido e candidata desenhada novamente |
| Estrutura dos 100 quadros | Composição/decodificação bem-sucedidas; canvas, pivôs, poses, timing e demais camadas preservados |
| Encaixes visuais finais | Pendentes; não confundir o teste estrutural com aprovação artística |
| Espada, adagas, arma de fogo, foco e tecnologia | Ainda não adaptados/testados com esta candidata |
| Peitoral, botas, luvas e demais combinações | Ainda não testados com esta candidata |
| Registro definitivo nos índices publicados | Não realizado |

## Recuperação e adaptação

- Entrada: Kaizoku_22_camadas_originais.zip, pacote recebido pelo proprietário. Procedência e hashes em tools/pants22-native/MANIFEST.json.
- SOUTH/NORTH: cintura e duas pernas femininas separadas. Retarget por âncoras de cintura/joelho/barra e amostragem nearest-neighbor dos pixels existentes. A anatomia masculina é referência geométrica; os pixels da calça 133 não são usados como aparência da 22.
- EAST/WEST: recuperação limitada à região da roupa da composição histórica frozen-female-pants22-east-walk-source-v47. Essa fonte histórica também possui status de candidata; não foi promovida a fonte aprovada. O protótipo recupera textura azul e precisa de revisão de contornos, detalhes e regiões antes ocultas.
- A primeira tentativa lateral cobria pés levantados. Foram acrescentadas exclusões de barra por quadro, vinculadas aos hashes exatos da camada masculina lower-redrawn, em profile-hem-masks.json. São ajustes candidatos, não calibragem aprovada.
- WEST usa o espelhamento previsto para sua base; a roupa é espelhada uma única vez quando esse contrato se aplica.
- Não houve geração por IA, uso de ícone, alteração de PNG aprovado, alteração de escala no mundo ou mudança em combate/inventário persistido.

## Evidências

- [Camada isolada SOUTH, com transparência](evidence/pants22-candidate/south-isolated.png)
- [Candidata SOUTH no mapa](evidence/pants22-candidate/south-map.png)
- [Candidata EAST no mapa](evidence/pants22-candidate/east-map.png)
- [16 quadros laterais no compositor real](evidence/pants22-candidate/east-walk-frames.png)
- [Gravação da execução no mapa](evidence/pants22-candidate/map-candidate.webm)
- [Fontes efetivamente desenhadas e quadros registrados](evidence/pants22-candidate/runtime.json)

A gravação inclui preparação e interfaces reais. O teste usa save descartável, item 22 fornecido por fixture e alvos imóveis de teste. As ações de equipar, andar, atacar, retirar e recarregar são realizadas pela interface/teclado. A fixture de combate posiciona o encontro e o alvo em uma passagem livre; não injeta direção, frame ou ação do personagem. Os índices candidatos são interceptados apenas no contexto de teste do navegador. O diagnóstico é injetado apenas na resposta de game.js desse teste; não existe log novo ligado na produção.

## Reprodução

Ver tools/pants22-native/README.md. Foram executados os dois testes Node de importação/retarget, o validador de 100 quadros, a build publicável e o teste de navegador reforçado. O primeiro teste de ataque aceitava holding-native-while-loading; essa asserção foi corrigida e a rodada anexada exige rendered e todos os oito quadros, sem aproveitar aquele resultado inicial como prova.

## Próximos bloqueios concretos

1. Conferir e ajustar contornos, dobras, virilha e barras em todos os quadros, especialmente as regiões laterais recuperadas de composição fechada. A revisão automática não valida esses encaixes.
2. Adaptar cada família de ataque restante à sua própria camada inferior. As fontes masculinas de espada/foco/firearm/daggers têm hashes e contratos diferentes; não reutilizar a máscara do ataque desarmado nem relaxar compatibilidade.
3. Validar peitoral + calça e calça + bota pelo inventário; produzir as adaptações exigidas antes de ampliar a combinação.
4. Só então publicar o vínculo canônico def 22 → legs → pants, repetir o fluxo sem interceptação de índice e obter a primeira entrega completa solicitada.
5. Demais itens/aparências continuam no relatório geral. Capas seguem fora do escopo visual.

# Entrega funcional da Sprint 1 — 18/10/2026

Implementação e testes funcionais desta etapa entregues. **Comparação com vídeo e homologação visual da referência pendentes:** o arquivo MP4 solicitado ainda não foi fornecido. Sprints 2–6 não foram marcadas como concluídas.

## Alterações realizadas

- Mundo independente do viewport: porto 3000 × 2000 e caçadas 3200 × 2200. O centro original foi preservado na sua escala; a área adicional reutiliza tiles do próprio cenário, sem esticar uma imagem sobre todo o mapa.
- `world-system.js` concentra mapas, origem local do núcleo antigo, pontos de entrada, regiões de spawn, pontos de interação, colisores, câmera e navegação. O módulo funciona sem importações de rede ou engine nova, inclusive por `file://`.
- Câmera suavizada exponencialmente, com posição limitada ao mapa. A mesma transformação é aplicada ao terreno, sprites, NPCs, projéteis e efeitos. Cliques usam a transformação inversa, alinhada à posição inteira realmente renderizada.
- Canvas acompanha as dimensões do viewport; escala uniforme, sem recorte por `object-fit:cover` ou distorção. `imageSmoothingEnabled` segue desativado e `image-rendering:pixelated` preservado.
- Caminhada por clique, WASD e setas; A* em grid de 24 unidades, sem cortar cantos, com suavização de rota e checagem de segmentos. Passos de colisão de até 5 unidades evitam atravessar obstáculos em um frame. Destinos sólidos próximos são ajustados para solo livre; rotas impossíveis retornam uma mensagem.
- NPCs conservam nomes, artes, funções e posições relativas ao centro original. A interação ocorre após a aproximação, em coordenadas de mundo.
- Navegação também acompanha o auto combate. Ataques têm checagem de alcance e linha de visão; alvo sem rota é temporariamente descartado. Inimigos nascem em pontos navegáveis das zonas cadastradas. Clique no chão ou teclado permite movimento manual na caçada; clicar em monstro ou ativar Auto-caçada retoma o combate.
- Cenário estático expandido fica em cache. Código antigo inacessível de `drawBackground` foi removido. A regra efetiva do canvas foi editada no próprio lugar, sem acrescentar outra camada de overrides CSS.
- Preview local com recarga automática: `http://127.0.0.1:8123/`. Autosave existente é acionado ao recarregar; a cena reinicia no porto. Não depende de serviço externo.

## Preservação

Backup integral anterior a qualquer edição do jogo: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-sprint1-20261018`.

Os 52 arquivos em `assets/` foram comparados por SHA-256 com o backup: **zero diferenças**. Equipamentos, inventário, forja, facções, seis classes, atributos e chave de save foram mantidos. O preview foi testado em contexto separado: nenhum save do Opera foi lido, removido ou substituído.

## Arquivos

Modificados: `game.js`, `index.html`, `styles.css`, `README.md`.

Criados: `world-system.js`, `tools/dev_server.py`, `tests/world-system.test.cjs`, `tests/sprint1_browser.py`, esta entrega, auditoria e `docs/evidence-sprint1/`.

## Verificação executada

| Verificação | Resultado |
|---|---|
| Sintaxe de `game.js` e `world-system.js` | Passou |
| 41 verificações de módulo | Passaram: spawns livres, sólidos, rotas longas, caminho ao redor de barreira, caminho impossível, limites e inversão câmera/tela |
| Exploração por clique | Passou: posição intermediária confirma caminhada gradual; câmera deslocou mais de 150 unidades |
| Limites e água | Passou: movimento por teclado até extremos leste/norte; costa bloqueia água profunda; câmera dentro do mapa |
| Edifício | Passou: parede do edifício norte impede atravessamento |
| A* integrado à UI | Passou: clique atrás da banca oriental chegou ao destino desviando do sólido |
| NPC após câmera | Passou: clique no sprite de Ryuma, aproximação e abertura da forja correta |
| Entrada e atributos | Passou: mapa de caçada 3200 × 2200; atributos derivados da classe/equipamentos inalterados |
| Auto combate | Passou: 21 derrotas consecutivas, deslocamento, dano e até 11 inimigos vivos, em 41 segundos de tempo de jogo no último teste |
| Retorno e save | Passou: nível, XP, moedas, itens, equipamentos e estatísticas conservados após retorno e recarga |
| Resoluções | Capturadas e inspecionadas: 1920 × 1080, 1366 × 768, 1280 × 720; escala de canvas uniforme |
| Erros JavaScript | Nenhum erro não tratado observado na execução isolada |

O navegador de testes usa relógio virtual do Playwright para avançar o loop real do jogo; não são 41 segundos de espera humana e não foram injetadas mortes ou recompensas. O teste usa a interface do jogo e diagnósticos somente leitura. Esses testes não comprovam todas as combinações de classe/facção, duração de horas ou uma sessão real do Opera.

Resultados legíveis por máquina: [results.json](evidence-sprint1/results.json).

## Capturas reais desta implementação

As capturas abaixo foram produzidas na execução de testes após as alterações. Não são imagens conceituais nem capturas do jogo de referência.

### Porto, 1920 × 1080

![Porto 1920 × 1080](evidence-sprint1/lobby-1920x1080.png)

### Porto, 1366 × 768

![Porto 1366 × 768](evidence-sprint1/lobby-1366x768.png)

### Porto, 1280 × 720

![Porto 1280 × 720](evidence-sprint1/lobby-1280x720.png)

### Deslocamento da câmera e interação

![Câmera após caminhar](evidence-sprint1/camera-after-walk.png)

![Forja após interação com câmera deslocada](evidence-sprint1/npc-after-camera.png)

![Destino alcançado com desvio da banca](evidence-sprint1/obstacle-detour.png)

### Caçada após pelo menos vinte derrotas

![Auto-caçada após vinte derrotas](evidence-sprint1/hunt-20-kills.png)

## Comparação com a referência

**Observado no projeto:** mapa fixo de 960 × 570, cenário acoplado à tela, caminhada direta, retângulos fixos de movimento e ausência de câmera/navegação no estado anterior. Há quatro facções com PNGs individuais e quatro NPCs com arte personalizada.

**Observado no vídeo:** nenhuma observação foi feita; o vídeo não está disponível. Não há timestamps legítimos para informar.

**Proposta implementada a partir do texto:** mapas maiores, câmera, coordenadas separadas e colisão/A*. Não é apresentada como reprodução visual confirmada da gravação.

## Limitações e próximas prioridades

1. Receber e assistir integralmente ao vídeo; registrar timestamps, evidências e diferenças antes de homologar a referência ou seguir a direção artística das próximas sprints.
2. Sprint 2: a área adicional ainda é terreno base, não uma cidade totalmente decorada. Expandir distritos, edifícios e habitantes sem retirar o núcleo existente; ajustar colisores à arte final. As geometrias de lava/obstáculos atuais são aproximações retangulares conservadoras.
3. Sprint 3: seleção dedicada de caçadas, transições, retorno por portal físico e diferenciação visual da Fenda da Névoa ainda pendentes. O comportamento anterior de mudar regiões foi mantido.
4. Sprint 4: revisão completa de combate, momento do impacto, morte e telegraphs permanece pendente; a alteração atual integra alcance/linha de visão e navegação para compatibilidade com o novo mundo.
5. Sprint 5: os arquivos `back` e `side` existentes são usados nas respectivas direções; o ciclo `walk1–3` permanece frontal. Não existem ciclos completos por direção para apresentar como animações finais. Animações laterais/costas, reação, morte e recuperação continuam pendentes; PixelLab não foi chamado para gerar assets nem consumiu créditos.
6. Sprint 6: consolidação completa das camadas de CSS, nova organização da HUD e análise de desempenho prolongada continuam pendentes. Não se afirma FPS mínimo nem qualidade equivalente ao vídeo sem medição e referência.

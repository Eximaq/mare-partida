# Zoom do mapa e XP/h de caçada

## Escopo
- Zoom visual do mundo entre 80% e 180% (passos de 10%), independentemente da física e dos mapas. Roda do mouse sobre o canvas ou botões +/-; botão 100 restaura o padrão.
- **Ctrl/Meta + scroll nunca é interceptado** pelo zoom do jogo: o navegador conserva seu zoom de página. A ação de zoom de jogo ocorre somente quando a roda é usada diretamente sobre o canvas sem Ctrl/Meta.
- O clique continua convertido pela razão real `W/rect.width` e `H/rect.height`; a câmera mantém follow, limites e colisões.
- Indicador de XP/h é exibido **acima de Expedição**, apenas na cena de caça, mesmo com o painel recolhido. Mostra XP/h estimado, tempo efetivo simulado desde entrada na ilha, XP recebido na sessão e barra de XP para o próximo nível.
- Cálculo: `XP recebido nesta caçada / segundos efetivos nesta caçada × 3600`. Até completar 20 segundos, exibe *Calculando…* para evitar projeção enganosa. Inclui XP de monstros e recompensas efetivamente concedidas.
- Ao sair para o porto e iniciar uma nova caçada, os contadores reiniciam pelo fluxo `initializeSession` já existente. Não persiste dados nem muda saves.
- O aviso pop-up mantém dobrões/itens de caça, mas a soma de XP fica concentrada no indicador permanente durante a caça.
- Em abas ocultas, o contador segue o relógio efetivo de simulação do jogo, que já limita a recuperação ao retornar. Portanto não é um cronômetro de tempo real enquanto o navegador estiver suspenso.

## QA
- `node tests/hud-zoom-xph.test.cjs`: limites, Ctrl+roda, cálculo XP/h, mapeamento de cliques e inclusão no Pages.
- Rodar testes essenciais, navegadores Dawn/Conchas, build Pages e inspeção visual do zoom/XP/h em desktop e mobile antes do merge.

## Colaboração
As alterações são limitadas à HUD, à câmera visual, ao aviso de recompensa e aos novos arquivos `hud-telemetry.js` e `hud-zoom-expedition.css`. O sistema de personagem modular e as artes em trabalho por outro colaborador não foram tocados.

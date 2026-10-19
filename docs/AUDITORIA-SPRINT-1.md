# Auditoria — Sprint 1 (18/10/2026)

Atualização posterior: a nova gravação `Gravação de Tela 2026-10-18 105414.mp4` foi recebida e analisada para a entrega de ilha/HUD. Veja [referência e timestamps](REFERENCIA-E-DIRECAO-ILHA.md) e [entrega atual](ENTREGA-ILHA-HUD.md). O texto abaixo conserva as condições da auditoria inicial, quando nenhum MP4 tinha sido recebido.

## Fonte e preservação

Workspace: `C:/Users/Marcos/Desktop/MARE/mare-partida-v12`. README identifica V12 / 1.2.0. A pasta MARE contém esta única versão; não foi usada outra fonte. Não existe repositório Git. Não foram encontrados AGENTS.md no projeto ou em MARE. Backup integral anterior às edições: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-sprint1-20261018`.

Sem histórico, não é possível atribuir mudanças a edições manuais específicas. O estado integral recebido, incluindo CSS de inventário modificado às 03:14 e sprites personalizados, foi considerado autoritativo e preservado no backup.

## Sistemas auditados

- `index.html`: HUD e criação de personagem, canvas 960 × 570, menus DOM.
- `game.js`: IIFE única com dados, renderização, movimento, combate, inventário, forja, NPCs e salvamento. Canvas de cenários em cache; sprites PNG individuais de quatro facções, quatro NPCs e quatro monstros. Seis classes com equipamentos independentes da facção.
- Persistência: `mare-partida-save-v1`, autosave a cada sete segundos, ao sair/ocultar e em eventos de recompensa; importação/exportação JSON. Origem HTTP é diferente do arquivo aberto no Opera: o preview não tem acesso ao save do Opera. Importar/exportar pelo próprio jogo quando necessário; nunca apagar nem substituir o save original.
- Movimento: porto limitado ao retângulo 202–807 / 107–501; caminhada direta atravessa decoração. Caçada também usa limites fixos da tela e deslocamento sem colisão. Não há coordenadas de câmera nem navegação.
- Combate: seleção pelo alvo mais próximo, alcance básico, habilidades e cooldowns, respawn e remoção dos derrotados. Inimigos e herói usam coordenadas da tela; não há linha de visão. Mudança de área cura totalmente o personagem. Estes pontos precisam de integração com mundo e revisão posterior no Sprint 4.
- NPCs: dados e artes existentes serão mantidos. Clique usa correção de `object-fit:cover` com tamanho fixo do canvas; precisará converter da tela para o mundo após câmera.
- CSS: várias gerações de regras sobrepostas (layout inicial, HUD, inventário e HUD V12). `.game-frame canvas` passa por `fill` e depois `cover`; diversos `!important` no inventário. Sprint 1 altera a declaração efetiva do canvas; consolidação ampla de HUD/inventário fica no Sprint 6 para preservar as alterações recebidas.
- Código morto: `drawBackground` retorna antes de uma implementação antiga completa de cenário. Remover trecho inacessível durante a integração, conservando helpers ainda referenciados.

## Referência de vídeo

O único anexo recebido nesta solicitação foi `Texto colado.txt`. `Gravação de Tela 2026-10-17 205402.mp4` não foi recebido nem encontrado no workspace. Comparação visual, observações e timestamps ficam pendentes até o envio. Nenhuma característica do vídeo foi presumida. Dimensões e câmera propostas abaixo vêm das instruções escritas do usuário.

## Plano de implementação da Sprint 1

Separar definições de mapa, navegação por grid/A*, colisões e câmera em módulo sem dependências, compatível com abertura direta por arquivo. Expandir mundo mantendo o núcleo visual e artes existentes em escala nativa. Usar uma transformação comum para terreno, herói, NPCs, monstros e efeitos; converter entrada pela transformação inversa. Caminhada manual por clique/teclado, limites físicos e rotas de interação; integrar navegação básica do auto combate. Câmera suavizada com limites e escala uniforme sem `cover`.

Preview local em `http://127.0.0.1:8123`, com recarga automática ao editar HTML, CSS ou JS. O servidor só escuta no próprio computador. Assets pagos PixelLab não serão gerados nesta sprint.

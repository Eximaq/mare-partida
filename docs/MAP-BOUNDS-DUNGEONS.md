# Limites finitos dos mapas e Masmorra de Chefes

## Fase 1 — câmera e carregamento

A inspeção confirmou renderização de imagens completas e caches locais de canvases (Dawn/Ember), sem fila de downloads de chunks inexistentes. Não foi confirmada a hipótese de busca infinita. A câmera anterior usava apenas o retângulo declarado, sem verificar lacunas nativas. A navegação dos 18 mapas era criada sincronamente na abertura: 1.380 ms no ensaio Node local; esse valor não representa tempo de frame em outros dispositivos.

A cobertura visual usa as grades nativas, incluindo água, muros e terrenos escuros. Não usa a máscara de caminhada como existência. Dawn conserva a água original que já completava o interior da exportação; Ember e o cenário procedural legado têm superfície finita própria. Coordenadas negativas são válidas. Novos mapas podem declarar visualCoverage com rows, tile, x, y e version; alterar a versão invalida o índice e as respostas de ausência.

Um índice de soma por região permite consultas constantes; linhas de conteúdo são preparadas uma vez, sem varrer pixels por frame. A câmera procura posições válidas de forma limitada, preserva o jogador no enquadramento e não interpola por buracos. Zoom efetivo respeita o tamanho da tela e da cobertura, até 1,8. Quando um corredor, buraco ou mapa muito pequeno impede enquadramento completo, recorta-se a área existente sobre acabamento escuro finito; não há piso adicional nem alteração de colisões. Nenhum bloco colocado pelo proprietário foi removido.

O mapa e a navegação precisam estar prontos antes da simulação e da revelação. Navegação é preparada apenas quando utilizada, por linhas com orçamento aproximado de 2 ms por frame; o passo indivisível de uma linha pode ultrapassar esse orçamento. Grades prontas são preservadas, e mapas anteriores não continuam sendo preparados após uma troca. Falhas de imagem permanecem explícitas, sem repetição por frame; recarregar tenta novamente usando o cache HTTP normal. Não existe uma fila nova de chunks.

Mapas auditados: lobby, hunt legado, alabasta, alubarna-01 a 05, impel-down, embers, orange, conchas, dawn, rare, syrup, baratie, arlong e loguetown. Skypiea não possui mapa registrado e não foi habilitada.

Validação: testes Node de cobertura/zoom/navegação/carregamento; navegador real visitando os 18 mapas, zoom 0,8/1/1,8, telas móvel/desktop/ultrawide, cache frio/quente, conexão retardada e imagem indisponível sem novas solicitações repetidas. A câmera não deslocou o personagem. No ensaio Chromium, maior atualização de câmera 0,1 ms e maior linha de navegação 1,7 ms; caches Dawn 8/35 e Ember 6/32; zero erros de página/requisições no percurso normal. Capturas e relatórios de ensaio ficam fora do Git.

## Fase 2

Em implementação após validação da fase 1. A exportação nativa Quest Dungeons foi fornecida pelo proprietário. Recompensas e progressão permanecem locais no jogo estático; não alterar a autoridade do servidor alpha.

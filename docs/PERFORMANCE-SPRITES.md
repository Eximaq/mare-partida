# Auditoria de performance — 30/10/2026

Base: PR158, commit 7b14fa7. Branch isolada: feature/performance-sprite-cache.

## Método

Chrome local, viewport 1366×768, escala 1, CPU limitada a 2× pelo DevTools, sem limitar a rede. Duas navegações no mesmo contexto: cache vazio e cache HTTP preenchido. Servidor local instrumenta respostas, sem interceptação do Playwright (que desativa o cache HTTP). A rodada quente restaura a mesma aparência após o pagehide. Perfil de CPU é uma execução separada dos números finais. Evidências, perfis, saves sintéticos e capturas ficam fora do repositório.

Sondas: tests/performance_sprite_browser.cjs e tests/performance_server.cjs. Passar --evidence com pasta externa ao repositório; --profile opcional. Mede criação, lobby, troca de equipamentos, inventário e caçada, incluindo p95/p99/máximo, tarefas longas, heap JS, transferências e composição. Heap JS não inclui toda a memória de texturas/GPU; ausência de vazamentos não pode ser inferida só desse número.

## Diagnóstico confirmado

- Perfil: draw de wardrobe domina CPU durante composição; cópias de strips e readbacks por pose, além de coleta de lixo. Recoloração repetida da mesma pose reproduzida em teste.
- O lobby estável mantém cerca de 16,7 ms/frame. Na preparação dos equipamentos, p95 cerca de 50 ms e p99 cerca de 67 ms na linha de base.
- Mapas e monstros distantes são solicitados durante o boot. Carregadores de Orange/Conchas repetem fontes de terreno; new-islands carrega todas as ações de todos os monstros.
- Dawn ground consome CPU relevante no combate; cria pattern e desenha chão completo por frame. Investigar separadamente da composição.
- Imagens atuais já usam revisão no URL, validação dimensional, concorrência 6 e cache limitado a 48 entradas. Composições atuais são limitadas a 2 aparências e 8 prévias; nenhuma reconstrução contínua depois de prontas. O limite pequeno de imagens gera recargas ao preparar todas as ações.

## Classificação estrutural inicial

| Grupo | Classificação | Justificativa |
|---|---|---|
| Native96, catálogo, rigs, ownership e armas atuais | ATIVO | Jogador padrão e personalização |
| SpriteCombatV2 e efeitos Zoan | ATIVO | Transformações atuais e seus efeitos |
| Renderizadores de mapas, NPCs e classes de inspeção | ATIVO | Regiões e bancadas específicas; carregar quando necessário |
| PaperDoll antigo e fontes artísticas de gerações anteriores | LEGADO NECESSÁRIO | Bancadas históricas, ferramentas, testes e proveniência |
| classCombatAsset em game.js | OBSOLETO CONFIRMADO | Apenas definição, sem chamadores estáticos ou dinâmicos encontrados |
| Outros arquivos sem prova suficiente de uso | INDETERMINADO | Preservar até rastrear também caminhos dinâmicos |

Não foram encontrados arquivos versionados .bak/.tmp/.orig/.pyc/.old/Thumbs.db/.DS_Store. Nenhuma exclusão em massa é justificada. As otimizações e a limpeza terão commits distintos.

## Composição e cache de pele

Superfícies temporárias com leitura frequente usam canvas de CPU, evitando readbacks GPU por máscara. Faixas recoloridas são preenchidas por pose sob demanda e reutilizadas, com chave de arquivo/dimensões/paleta e limites de 12 faixas/16 MiB. Teste no navegador: 144 poses, RGBA idêntico à versão de base; repetição da pose passou de 5 recolorações para 1, cache observado 9.830.400 bytes.

## Preparação seletiva

O jogador publica o primeiro clip exato assim que pronto, mantendo as demais direções/ações em preparação serial. Não usa pose de outra aparência nem de outra ação como substituta. Prepara somente a visibilidade solicitada do capacete; alternar a preferência prepara sua própria composição. Sem capacete, ambas as chaves apontam para os mesmos pixels. Um tile por clip é reutilizado. Teste de escalonamento passou; navegador validou carregamento atrasado, recurso ausente, dimensão inválida, troca obsoleta e flags antigas, sem pedidos de sprite antigo.

## Cache de imagens

O ensaio encontrou 148 recursos atuais únicos (cerca de 81 MiB decodificados ao longo das trocas), mas camadas pequenas chegaram a ser decodificadas dez vezes. O cache agora usa LRU com limite de 192 entradas e 64 MiB estimados por largura×altura×4; o limite de concorrência continua em 6. A revisão de recursos e a validação dimensional permanecem. O conjunto inteiro não fica retido indiscriminadamente; composições e prévias mantêm seus limites anteriores. Snapshot informa imageBytes.

## Carregamento por região

Alabasta, Alubarna, mapas NewIslands e projeções PixelWorldMaps deixam de carregar no boot. A seleção de viagem antecipa somente o destino e os monstros associados; a entrada direta também prepara seus recursos. Máscaras de profundidade são solicitadas por região. As bancadas Ember/Orange/Conchas preservam o contrato boot (Promise idempotente), agora acionado explicitamente ou ao desenhar. Fontes e dados de colisão foram preservados. Alabasta foi validada no navegador com viagem, 80 máscaras, 24 paredes, combate e persistência.

Uma tentativa de eliminar os chunks intermediários de Dawn foi rejeitada: preservou os pixels em escala 1:1, mas mudou a amostragem em zoom. O desenho original foi restaurado integralmente. Esse custo segue como oportunidade, sem sacrificar consistência visual.

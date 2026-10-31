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

## Limpeza confirmada e preservação

Removida a função sem chamadores classCombatAsset de game.js, após procurar referências em todos os JS/CJS/Python/HTML/JSON versionados. Não há dependência de saves. Nenhum arquivo artístico foi excluído: os candidatos antigos rastreados continuam necessários às bancadas, NPCs, efeitos ou à proveniência. A ausência de importação estática isolada não prova obsolescência. Lista de arquivos excluídos: nenhuma; a limpeza desta fase remove código morto, sem inventar justificativas para apagar fontes.

## Validações funcionais e visuais

- Suíte completa Node: 188 testes, 188 aprovados. A primeira execução sem NODE_PATH falhou somente ao localizar Playwright; a execução com as dependências locais passou integralmente.
- Python: 8 testes de release atual, 7.285 frames imutáveis de 26 personagens e publicação estática aprovados. Build Pages executado.
- Navegador: 144 poses comparadas byte a byte, criação/aparência em seis viewports, 480 poses de capacetes, 40 alternâncias rápidas, restauração do cabelo, persistência e rollback.
- Ownership atual: ausência/corrupção de imagens, solicitação atrasada e resposta obsoleta, sem fallback antigo ou loop de requisições.
- Alabasta: viagem, paredes, profundidade, combate e save. Alubarna: cinco regiões, 20 vistas de monstros, caminhada/ataque/hurt, mortes/XP e save.
- Corrigida a verificação antiga de Alubarna: compara pathname, preservando a revisão no URL. Nenhuma mudança artística ou de combate foi necessária para esse ajuste.

## Dependências verificadas após a medição

Ember não é inteiramente legado: as animações de César também atendem Dawn. O aquecimento desses atores foi separado do terreno e é solicitado após a preparação do jogador atual, além da seleção da viagem. A requisição do manifesto é compartilhada e falhas ficam limitadas, sem rejeitar o início do jogo ou gerar novas tentativas por frame.

## Camadas realmente necessárias

A composição atual deixa de solicitar as faixas de cabeça/rosto/cabelo substituídas pelos recursos canônicos, além de roupa base coberta e cabelo oculto pelo capacete. As bancadas mantêm as dependências necessárias para ocultar camadas manualmente. Os resultados de composições descartadas têm seus canvas esvaziados; ficam no máximo duas aparências e oito prévias. O teste no navegador reproduziu carregamentos desnecessários na versão anterior e passou com os dois corpos/24 poses, sem recarregar aparência inalterada. A comparação de 144 poses manteve RGBA idêntico à base.

## Alternativas rejeitadas

Também foi medido um protótipo com Worker/OffscreenCanvas, usando exatamente o mesmo compositor. Preservou os pixels e reduziu os picos nos equipamentos, mas piorou o comportamento de Dawn neste ambiente, inclusive depois de ajustar superfícies e pré-carregamento. Foi retirado da alteração entregue. Seu código experimental e as evidências ficaram somente na pasta privada externa; nenhum novo sistema paralelo foi deixado no jogo. Espaçar a composição por requestAnimationFrame também não superou o caminho mantido.

## Retenção durante a caçada

Quando as animações já estão compiladas e não há composição pendente, o cache de imagens de origem é reduzido para até 8 MiB durante a caçada. Pequenos encaixes têm preferência de retenção; as duas aparências compiladas continuam disponíveis para desenhar sem recarregar fontes. Na preparação e nas trocas rápidas do lobby, o limite continua sendo 64 MiB/192 entradas. O navegador confirmou a liberação sem perder as 24 poses nem recarregar uma aparência inalterada. Esses limites descrevem o cache controlado pelo jogo, não toda a memória interna do navegador.

O aquecimento de monstros segue o registro instalado: quando o ator já pertence a SpriteCombatV2, prepara suas imagens atuais e não as folhas antigas de NewIslandArt. As fontes antigas continuam disponíveis apenas para dependências legítimas e bancadas. A validação de Alabasta passou a aguardar os estados do ator atual.

## Cache de cenário de Dawn

O cache de 20 chunks podia ser menor que a área visível em telas maiores/zoom reduzido. Seus acertos também não atualizavam a ordem de uso. O limite agora corresponde à grade finita do mapa (35 chunks de 512 px, aproximadamente 35 MiB de RGBA), com atualização LRU nos acertos. No ensaio do mapa inteiro aquecido, a segunda passagem passou de 35 novas alocações de canvas para zero. Comparação com a base em 12 câmeras/zooms: zero diferenças RGBA. O desenho original dos chunks foi preservado.

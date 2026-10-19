# Auditoria — UI e atributos, 18/10/2026

Antes de editar: JavaScript/Canvas sem bundler, persistência LocalStorage; sete classes e onze slots. Guia local `AGENT.md` lido (não existe `AGENTS.md`). README, documentação recente e testes de atributos/combate consultados. Sem repositório Git nesta cópia.

- Atributos: base fixa 5×5, investimentos independentes, migração v1 idempotente. Manter investimentos; substituir apenas a camada base por tabela de classe totalizando 50. Migração v2 com cópia do save original.
- Distribuição: rascunho transacional já existente, limitado a incrementos unitários. Acrescentar seletor de quantidade, cancelamento explícito e mensagem de insuficiência.
- HUD: sete rotas funcionais, símbolos Unicode. `icones_menu_pirata` contém sete SVGs e PNGs em vários tamanhos; preview inspecionada. Reutilizar PNG64 sem modificar os originais.
- Inventário: onze slots, mochila, filtros, venda, trava, equipar melhores e consumíveis funcionais. Preview usa imagem antiga inteira. Substituir por Canvas com renderer atual, incluindo guarda armada do Espadachim Pirata quando disponível.
- Itens: 33 equipamentos e dois recursos reais (poção/ferro). Nenhum possui arte própria: todos usam símbolos, considerados placeholders; nenhum ícone bom ou imagem fora de estilo a preservar. Criar 35 SVGs próprios, geometria em grade de pixels, documentados por índice estável. Não criar tipos inexistentes só para preencher catálogo.
- Janelas: criação/facção/classe, inventário, personagem, forja, contratos, ajuda, mapa/caçadas, mercador, confirmações e tooltips. CSS possui camadas históricas conflitantes; novo arquivo compartilhado carregado por último concentra tokens e componentes desta atualização. Loot existe como lista na HUD, sem baú/modal próprio.

## Plano visual revisado

Madeira de convés #49301f, sombra #241b15, latão envelhecido #b58b4b, pergaminho #e1cd9f, azul de porto #152d34, marfim #f6e6bf. Bahnschrift/Trebuchet para títulos e controles, Segoe UI para leitura. Molduras duplas de latão, cabeçalhos de madeira e painéis de conteúdo legíveis. Vermelho reservado à ação destrutiva; verde à prévia confirmável. Menu horizontal de sete ícones, personagem/equipamento à esquerda, mochila central e detalhes à direita. Evitar excesso de cordas ornamentais e texturas sobre texto.

Checkpoint criado antes das edições em `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-ui-attributes-20261018`. Nenhum save do navegador será editado nos testes: contextos isolados. Sem novas gerações pagas. Mapas, câmera e frames de sprites fora do escopo.

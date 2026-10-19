# Interface náutica, atributos e ícones — 18/10/2026

## Comportamento entregue

O menu utiliza os sete PNGs de `icones_menu_pirata/png/48/`, sem modificar os arquivos fornecidos. Ícones centralizados, legendas abaixo, moldura de madeira/latão e indicação da janela aberta. As rotas e os atalhos existentes continuam nos mesmos handlers.

`ui-nautical.css` concentra o sistema visual compartilhado: madeira #49301f, sombra #241b15, latão #b58b4b, pergaminho #e1cd9f, azul #152d34 e marfim #f6e6bf. Títulos/controles usam Bahnschrift/Trebuchet, leitura usa Segoe UI. Moldura dupla de 3px, cantos de 3px, espaçamentos de 8/12/16/22px, foco visível e estados de seleção/indisponibilidade. Nenhuma fonte externa ou nova dependência.

Foram revistas criação/facção/classe, inventário, personagem, forja, contratos, ajuda, mapa/caçadas/seleção de região, mercador, tooltip do NPC, notificações e lista de loot. A confirmação de recomeço é agora um diálogo temático com retorno seguro, foco inicial em Voltar e teclado. A seleção de personagem existente é a tela de identidade de um único save; não foi inventado um sistema de múltiplos personagens. Não existe baú funcional neste protótipo.

## Atributos de nascimento

| Classe | FOR | DES | VIT | INT | ESP | Total |
|---|---:|---:|---:|---:|---:|---:|
| Lutador |14|9|13|5|9|50|
| Espadachim |15|14|9|6|6|50|
| Atirador |9|15|8|10|8|50|
| Gatuno |10|16|9|7|8|50|
| Ciborgue |11|6|17|8|8|50|
| Estrategista |5|8|8|17|12|50|
| Curandeiro |5|8|10|12|15|50|

A tabela imutável `MareCharacters.birth` define a base. `game.attributes` continua guardando **apenas investimentos**. Equipamentos e multiplicadores da facção permanecem camadas independentes. Trocar a classe seleciona a base correspondente e preserva os investimentos; não oferece pontos de nascimento para distribuir. Não foram alterados coeficientes de combate: a base antes era 25, portanto poder/vida/energia iniciais aumentam conforme a tabela pedida. Isso altera o ritmo de progressão e merece playtest posterior, sem ser tratado como balanceamento final.

O orçamento é sempre `5 × (nível − 1) − investimentos`, nunca um crédito somado no carregamento. Migração v2 aceita os investimentos de v1 e v2, valida inteiros não negativos e limita gastos ao orçamento legítimo. Saves anteriores sem atributos recebem seu orçamento livre por nível. A base não entra nesse cálculo.

Antes de migrar, o navegador preserva o JSON em `mare-partida-save-v1-before-attributes-v2`, sem substituir backup existente. O backup anterior v1 também permanece. Nome, nível, XP, equipamentos, inventário, ouro, facção e progresso são mantidos; HP/energia obedecem aos máximos derivados como antes. Importação também preserva os dados de origem.

## Distribuição

Escolha +1, +5, +10, +25 ou MÁX antes de usar o botão do atributo. O seletor fica destacado; MÁX utiliza o saldo restante do rascunho. Uma quantidade maior que o saldo mostra mensagem de insuficiência sem alterar valores. Menos remove somente o investimento pendente naquele atributo, respeitando a quantidade escolhida. A interface mostra base, investimento confirmado, total previsto e derivados atuais → previstos.

Confirmar é a única operação que grava investimentos. Limpar distribuição pendente zera o rascunho; Cancelar alterações e fechar descartam o rascunho, sem consumir saldo. Confirmação repetida sem pontos pendentes não faz nada.

## Inventário e arte

A prévia é Canvas usando o mesmo renderer e metadata dos sprites atuais, com nearest-neighbor e âncora dos pés. Pirata/Espadachim usa a guarda armada aprovada; demais combinações usam a base atual de facção. Imagens que terminam de carregar redesenham a prévia. Não há composição de roupas por equipamento no jogo: a interface não finge que existe um paperdoll. Equipamentos e mudanças de classe continuam reais nas estatísticas.

Os onze slots usam células de dimensões iguais e linhas alinhadas, rótulo separado, refinamento no canto superior e score no inferior. Mochila e detalhes usam as mesmas artes. Forja, loja e loot reutilizam os ícones dos itens.

Auditoria inicial: os 33 equipamentos e os dois recursos reais tinham apenas símbolos, sem arte adequada. Criados **35 SVGs originais em grade 32px**, com contorno, silhuetas de tipo e variantes de cor/detalhe, em `assets/ui/items/`. `manifest.json` lista cada item, índice estável, tipo, arquivo e procedência. Os índices numéricos antigos dos itens foram preservados. Não existem madeira/tecido/lendários como itens reais nesta versão; não foram adicionados itens fictícios. Os SVGs são arte geométrica escrita no projeto, sem geração PixelLab ou custo de assinatura. `tools/create_item_icons.py` reproduz o catálogo sem tocar nos ícones do usuário.

## Arquivos

- Alterados: `character-system.js`, `game.js`, `index.html`, `README.md`, `tests/character-system.test.cjs`.
- Adicionados: `ui-nautical.css`, `assets/ui/items/0.svg` a `32.svg`, `potion.svg`, `material.svg`, `manifest.json`, `tools/create_item_icons.py`, `tests/ui_nautical_browser.py`, auditoria, este relatório e evidências.
- Originais preservados: pasta `icones_menu_pirata`, mapas, câmera, sprites jogáveis, animações e seus metadados.

## Verificação e evidências

Resultados detalhados em `evidence-ui-nautical/results.json`; capturas reais, não mockups, nas resoluções 1920×1080, 1366×768 e 1280×720. Incluem menu, inventário, personagem, forja, contratos, ajuda, mapa, caçadas, mercador, confirmação, facções e classes, além do catálogo de 35 itens.

Regressões e resultados finais são registrados no README e no changelog após a execução. Todos os testes de navegador usam contextos Chromium isolados. O save do navegador do usuário não é editado nem removido pelo teste.

## Recuperação e limites

Checkpoint anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-ui-attributes-20261018`. Para desfazer, fechar a prévia e restaurar os arquivos correspondentes desse checkpoint; não substituir trabalho manual posterior. Backup de código não é cópia de LocalStorage. O JSON anterior à migração fica na chave de backup v2 do próprio navegador e pode ser exportado pelas ferramentas do navegador antes de qualquer restauração deliberada.

Mercado e cofre continuam indisponíveis, como já estavam; os botões não simulam funcionamento. Nenhum sprite novo de classe/facção foi gerado. A interface tem rolagem vertical para conteúdo extenso e para telas pequenas; os três tamanhos desktop pedidos têm inventário em três colunas. Não houve alteração do mapa ou da câmera, backend, multiplayer ou execução offline com a página fechada.

Ajuste posterior solicitado: menu compacto com arquivos 48×48 (segundo menor tamanho disponível), exibidos em 32×32 no desktop, e botões 64×59. Verificado em 1920×1080, 1366×768 e 1280×720, com as sete rotas funcionando. Capturas em `evidence-menu-compact/`.

Ajuste posterior solicitado: removidos do menu Personagem o botão de inspeção de sprites, o bloco Sua identidade/reconfiguração e a lista Equipamentos do perfil. O painel principal de atributos e o inventário continuam funcionais.

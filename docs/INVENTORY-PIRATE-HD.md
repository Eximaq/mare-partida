# Inventário pirata HD — 31/10/2026

Branch feature/inventory-pirate-hd, base 93368fd. HTML/CSS e JavaScript nativos; mundo Canvas 2D. Não há framework de interface.

## Auditoria inicial

Inventário em game.js (renderInventory/inventoryDetail), primitivas DOM em ui-system.js e tokens/componentes/layout em ui-*.css. 12 slots reais: cabeça, colar, torso, perneiras, pés, arma, capa, mãos, anel, cinto, acessório e Akuma no Mi. Abas Equipamento/Visual/Estilo, visibilidade de capacete e itens, busca, raridade, ordem, sete categorias, paginação responsiva e capacidade persistida de 120. Equipar melhores, equipar/retirar, bloquear/desbloquear, venda, poção, caixas, pérolas e livro têm regras existentes. Comparação de atributos já é automática; Favoritar não existe. Mercado/cofre aparecem desativados. Preservar os controles reais.

Captura antes: tmp/inventory-qa/before.png (fora do Git), 1672×941. HUD aprovada e inventário confirmados na mesma sessão isolada. A apresentação atual deixa a Akuma no Mi no fim da coluna direita; detalhes das frutas repetem nomes de skills. A prévia depende de carregamento assíncrono e precisa de redesenho após readiness. Assets HD da HUD (madeira, pergaminho, moldura), emblemas e slots de raridade são reutilizáveis.

## Plano de entrega

1. Auditoria e captura atual.
2. Amostra de componentes PixelLab e base compartilhada opt-in, sem recolorir outras janelas.
3. Três painéis funcionais, Akuma separada, atributos abaixo da prévia, detalhes estruturados e seleção incremental.
4. Ensaios funcionais/visuais desktop e móvel, HUD, build e publicação em PR.

Nenhum save de usuário ou evidência em massa será incluído. Trabalho local não commitado na pasta original permanece preservado; a sprint usa worktree limpo da main publicada.

## Base artística validada

PixelLab AI Pro gerou uma folha 600×448 com quatro peças isoladas (job a9fd678d-ce76-4aba-bb5f-a7bbe726299c, custo 25 gerações): moldura, slot, botão e aba. Fonte preservado em assets/ui/inventory-hd/source-kit.png; recortes exatos com alfa, sem interpolação ou repintura, verificados pixel a pixel. Dimensões, regiões e SHA256 no manifesto da pasta. Madeira/pergaminho da HUD e quatro emblemas oficiais reaproveitados. Não foram gerados itens nem personagens.

Novos parâmetros --rpg-hd-* estendem ui-tokens.css; componentes opt-in .ui-hd (hd-frame, hd-control, hd-panel-heading, linhas de skill) ficam em ui-components.css e reaproveitam MareUI.upgrade. Nenhum token existente foi redefinido. O inventário aplica pirate-hd no modal; ui-navigator.css conserva o visual anterior somente fora dessa composição, sem modificar a HUD.

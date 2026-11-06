# Potencial, drops, síntese e recompensas

## Regras entregues

- Equipamentos novos usam geração v1: nível, origem, raridade nativa/atual, potencial inteiro 0–100 e orçamento real de atributos persistidos. Refinamento e pérolas permanecem separados. O nome exibe `LV. N` com a raridade da peça. Rótulos visuais: Peitoral e Calça; slots internos preservados.
- Crescimento obrigatório: cada ponto de potencial aumenta as bases em 1,5%, além dos extras e de uma reserva de Vida de `5 × potencial × multiplicador de raridade`, eliminando empates por arredondamento. Pisos por slot/classe ficam 60% acima do teto de bases da raridade anterior; todas as cinco bases de atributos acompanham a qualidade. Básicos fundidos usam o piso intermediário de 20% e continuam abaixo dos nativos equivalentes. Atributos numéricos da geração atual são sempre inteiros, arredondados para cima. A fórmula oficial de Poder permanece intacta. Itens legados sem potencial não são recalculados.
- Potencial inicial revisável: peso `exp(-0,06 × potencial)` entre 0 e 100. Probabilidades teóricas: ≥80 = 0,5909%; ≥90 = 0,2187%; ≥95 = 0,1014%; 100 = 0,01447%. Sem reroll de migração ou reforja.
- Drop normal: uma única chance de 20%, seguida de 60/25/10/5 para Comum/Incomum/Raro/Épico. Chances finais: 12/5/2/1%. Sem filtro de classe, Lendários ou Supremos. Nível do jogador limitado à faixa real do mapa. Recursos, caixas e poções mantêm regras próprias.
- Fusão de básicos mantém o modelo e a origem Comum, inclusive ao mudar a raridade. Orçamento de extras continua proporcional ao modelo básico. As bases obedecem ao piso intermediário de 20% acima do teto da raridade anterior, abaixo do piso nativo de 50% nas mesmas condições. Custos e restrições preservados; Lendário não vira Supremo.
- Buggy (30) e Kuro (40): dez fragmentos de arma Épica vinculados por baú. Vinte formam uma arma Épica nativa negociável, no nível do personagem (1–100), sem equipar automaticamente. Sorteio uniforme entre os IDs 68, 71, 109, 113, 117, 121 e 125: sete classes reais, 1/7 por arma. Consumo e entrega são atômicos e protegidos contra repetição.
- Don Krieg (50): um Livro da Vontade do catálogo existente. Vitória ainda pendente recebe a configuração; resgates concluídos não são reabertos. Alvida/Morgan preservam seus prêmios. Arlong/Smoker/Wapol/Crocodile seguem com recompensa indefinida e vitória preservada.
- Todo baú configurado retorna ao porto somente após entregar e salvar o prêmio. Mochila cheia, interação distante e falha de persistência mantêm a recompensa pendente. No servidor, entrega, registro do resgate e deslocamento pertencem à mesma transação.
- Forja: apresentação curta configurável (400 ms + 1.000 ms), pulável e sem animação em movimento reduzido. O resultado é persistido antes da revelação; não há um segundo sorteio. Erros de conexão/persistência não aparecem como falha aleatória da receita.
- Akumas ofensivas: base independente maior + 35% da menor entre físico e elemental; `attack` não é somado como terceiro atributo. Piso inicial de 110% do ataque normal por conjuração antes das defesas, sem aplicá-lo inteiro a cada projétil/tick. Multiplicadores superiores e mecânicas existentes preservados.

## Compatibilidade e revisão

Itens legados recebem apenas identificação de geração v0, sem potencial inventado ou alteração dos valores efetivos. IDs antigos 0–184 permanecem; o fragmento foi acrescentado em 185. A migração 0039 aceita estados de masmorra v1/v2/v3 e promove somente a assinatura anterior auditada de combate, preservando ações e estados. Não editar migrações históricas nem restaurar um binário anterior sobre esses dados sem conciliar sua assinatura/schema.

As diferenças reais de poder estão em [EQUIPMENT-POTENTIAL-COMPARISON.md](EQUIPMENT-POTENTIAL-COMPARISON.md): seis raridades, cinco gaps por raridade, amostra controlada reproduzível. A inversão anterior entre Incomum e Raro foi corrigida pelos pisos compartilhados. Testes percorrem todos os 101 potenciais e comparam raridades/modelos nas sete classes, nos níveis 1, 50 e 100.

### Resgate e síntese no modo online

Ao abrir o baú em Party, somente o personagem que resgatou o prêmio volta ao porto. Ele continua no grupo. Os demais podem abrir seus próprios baús enquanto a sala segue ativa. A migração `0040_detach_claimed_dungeon_members.sql` corrige vínculos antigos quando a posição no porto, o resgate individual e a morte do chefe naquela instância comprovam que o jogador já saiu. A correção altera somente a referência à sala.

Na mochila online, o botão de síntese envia `forge.execute` com `type=formEpicWeapon` e a sequência esperada da forja. O servidor confere os fragmentos do personagem, sorteia a arma e seu potencial e grava a entrega e o consumo na mesma transação. Repetir o mesmo pedido recupera o recibo original.

## Arte

Fragmento de arma Épica: PNG 128 × 128 RGBA com alfa, gerado no PixelLab AI. Job `5f08dc8c-0a5e-49dc-9027-6d92cd13890a`, candidato 3, asset `37916e8f-0496-54ff-ab01-8afd3b4f2338`. Custo registrado: 10 gerações. Nenhuma recriação dos equipamentos ou animações aprovados.

## Verificação

Build TypeScript, checagem de tipos, testes foundation/Node e build estático executados. Testes específicos cobrem persistência de potencial, orçamento da reforja, teto de básicos em sete classes, probabilidades em dois milhões de amostras, receita e resgates únicos. No navegador: comparação, forja, síntese, versão móvel, cinco baús, retorno ao porto, recarga, segunda aba somente leitura e oito painéis existentes; sem erros de JavaScript.

Os testes PostgreSQL exigem banco isolado e são executados pelo workflow `Authoritative server foundation`; este computador não possui PostgreSQL local. Não usar o banco do colaborador para esses testes. Evidências e saves temporários ficam fora do repositório.

## Arquivos principais

- Regras: `forge-system.js`, `hunt-system.js`, `talent-combat.js`, `character-system.js`, `akuma-system.js`, `fruit-runtime.cjs`, `boss-dungeon-system.js`.
- Interface: `game.js`, `game-tooltips.js/css`, `forge-ui.js`, `operation-summary.js`, `boss-dungeon-ui.js`, `player-hub.js`, `ui-components.css`.
- Catálogo/arte: `item-catalog.js`, `item-art.js`, `assets/ui/items-hd/manifest.json` e `epic-weapon-fragment.png`.
- Servidor: inventário, perfil, masmorras, schemas compartilhados e migração 0039; expectativas dos testes/workflow atualizadas para o catálogo acrescido.
- Comparações: `tools/report_equipment_potential.cjs`; validações novas em `tests/equipment-*`, `tests/epic-weapon-fragments.test.cjs`, `tests/fruit-offense.test.cjs` e integração de masmorras.

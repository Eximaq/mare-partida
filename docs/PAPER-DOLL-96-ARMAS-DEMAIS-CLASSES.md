# Armas das demais classes — PixelLab96

Sprint de 30/10/2026. Base 47f68fe (PR153), branch feature/weapons-other-classes-96. Complementa a [sprint das lâminas](PAPER-DOLL-96-ARMAS.md).

## Escopo e uso

Dez itens existentes, cinco classes. Os 22 itens cobrem as sete classes no ensaio96, acessível por ?paperDoll96=1, e na bancada tools/paper-doll-96-v3/. Sem lançamento geral, migração de save, mudança de atributos/IDs/drops ou substituição dos ícones atuais.

| Classe | IDs e equipamentos | Uso e movimento |
| --- | --- | --- |
| Lutador/Pugilista |2 Punhos de Bronze;3 Luvas de Marfim|Par de punhos vestidos; Attack-unarmed existente|
| Atirador |4 Mosquete de Convés;5 Mosquete dos Faróis|Rifle longo e pistola curta, conforme os ícones; Attack-firearm existente|
| Ciborgue |14 Manopla de Aço;15 Canhão de Pulso|Manopla usa Attack-unarmed; canhão de dois tubos usa Attack-tech existente|
| Estrategista/Elemental |16 Compasso de Tempestade;17 Orbe das Correntes|Focos portáteis presos à mão de canalização; Attack-focus existente|
| Suporte/Curandeiro |31 Cajado do Farol;32 Relicário da Maré Viva|Cajado de madeira/bronze e relicário metálico; Attack-focus existente|

Os 12 materiais de espada/adagas da sprint anterior permanecem byte a byte. Nenhum PNG de corpo, rosto, cabelo ou roupa foi refeito. Os seis gestos corrigidos, Idle, Walk, tempos e pivôs permanecem os mesmos. Facção não duplica arte ou animação.

## Arte e origem

Todas as dez fontes equipadas e seis vistas adicionais são geradas/refinadas no PixelLab AI Pro. HD Pixel Art Masterpiece é direção artística do prompt, não nome de preset do serviço. Referências originais 32×32 e seus hashes são preservados. O suporte 128 recebe margem transparente: o importador não redimensiona, quantiza ou reconstrói desenhos.

Amostras de punhos, rifle, manopla e compasso foram compostas nos dois corpos antes do restante do lote. A lateral do rifle não passou como vista frontal: rifle, pistola e canhão receberam desenhos Pro próprios South/North; West espelha East.

O primeiro compasso tinha alça que fragmentava em quatro rotações. Foi reprovado. Novo design Pro dourado/azul, seguido de sprite nativo gerado desse design. Um lote intermediário 20×20 com recortes/partes irregulares também foi descartado.

O primeiro relicário virou um livro de papel simples e foi reprovado. Novo design Pro de caixa/folio bronze, gravuras e fecho verde-azulado, seguido de sprite final gerado desse design. Não usar as alternativas rejeitadas como material equipado.

A ponta de madeira do cajado terminava no limite do canvas. O PixelLab Workbench 1333277e-88ce-4797-8562-c9591b92d33e fechou somente 14 pixels da extremidade, sem alterar cabeça ou parte superior da haste. Edição gratuita, sem nova geração de corpo.

Custo confirmado: 190 gerações PixelLab (15 Create Pro e 4 Edit Pro), saldo 1805,36→1615,36. Inclui amostras/designs reprovados; Workbench gratuito. Fontes finais 16×16,24×24,32×24,64×32 e24×80; vistas 32×32. Resultados da auditoria executada ficam no changelog. Prompts, recibos, novas propostas e capturas ficam fora do Git. O catálogo registra job/galeria, variante, design de origem, canvas e hashes, sem tokens ou URLs assinadas.

## Encaixe e oclusão

Reutiliza weapons.js, wardrobe.js, rigs e máscaras96 da sprint anterior. Tipos adicionais indicam punho vestido, canhão de pulso, rifle, pistola, foco, cajado e relicário. O eixo nativo, contatos de palma, pivôs, margem e cache permanecem compartilhados.

- Punhos e manoplas acompanham o eixo do antebraço e cobrem a palma; não são desenhados como objetos soltos dentro da mão. Armadura de arma sobrepõe a luva cosmética, sem apagar seu suporte.
- A peça distante respeita a silhueta efetivamente vestida, incluindo cabelo, capacete, peitoral e capa. Palmas nativas levantadas junto à cabeça são recuperadas pela coincidência exata entre os pixels do membro e a superfície visível, dentro da área local da empunhadura: o atlas do peitoral sozinho excluía essa região e deixava uma mão nua. O corpo neutro sozinho não basta: esse erro foi reproduzido e corrigido durante a auditoria.
- Compasso, orbe e relicário acompanham a mão autoral de canalização: masculino South/East usa LEFT, masculino North e feminino usam RIGHT. O cajado usa a mão livre no frontal e a mão distante no perfil, com inclinação estável: a tentativa de seguir o foco central cobria o rosto e foi rejeitada. A auditoria inclui contraprova desse erro.
- Manopla 14 usa o soco existente, sem obrigá-la a imitar a empunhadura do rifle. O canhão 15 conserva o gesto tecnológico existente.
- Mãos e dedos continuam à frente do cabo nos objetos segurados; o punho fechado da sprint anterior continua disponível. Na inspeção, só o slot cosmético de luvas é ocultado: as armas de punho permanecem visíveis.
- A margem cobre o objeto completo, incluindo peças vestidas além da célula nativa. Não ampliar ou reposicionar corpo/pés para caber a arma.

Efeitos equipados continuam restritos à Ame 70 e Trevas 74. Brilhos de metal, vidro ciano, bronze e gemas são pixels físicos da arte; não criam partículas, dano ou VFX novos.

## Disparo e combate

O compositor devolve o emissor calculado pelo mesmo material, contato e orientação efetivamente desenhados. paper-doll-96-lobby.js guarda esse ponto por quadro e transforma pelo pivô/East-West até o mundo. Arma de fogo, tecnologia e foco usam seu ponto de emissão no frame 4, sincronizado à liberação do relógio atual.

A alteração em game.js escolhe essa origem quando a base96 está ativa; o caminho anterior permanece como fallback. Dano de projétil/feixe continua ocorrendo na chegada/aquecimento do sistema existente. Nada de antecipar HP para coincidir com a liberação. Velocidade, custo, alcance, colisões, habilidades, recompensas e saves continuam do jogo atual.

As animações de habilidade sem gesto específico conservam a política de ensaio anterior. Hurt/guard/death usam Idle; não são novas animações autorais. Zoans mantêm seus renderizadores. Equipamento não mapeado continua com fallback, sem arma genérica.

## Validação e reutilização

- Contrato Node das dez armas: 1200 poses,1440 contatos,240 casos de vista direcional e proteção dos 12 hashes anteriores e do catálogo de equipamentos.
- Navegador: materiais/vistas, alpha, conexões, rotações de 15° e ângulos reais, dois corpos, quatro direções, Idle/Walk/Attack, pele clara/escura, luvas e capa, preservação fora da arma/punho e espelhamento.
- Combate instrumentado equipa/retira os dez IDs por transações reais, diferencia emissão 4 de dano na chegada e confere o emissor contra a peça composta. Os inimigos controlados dessa etapa são fixtures.
- Auto-caçada adicional usa spawns e IA do mapa, sem criar inimigos nem reduzir HP; simulação acelerada com Date.now avançando junto dos passos físicos, para 20 abates consecutivos por classe, com XP, vida e cache observados. Registrar o resultado executado no changelog.
- Regressões das lâminas, lobby, roupas v10, personagem normal e Pages complementam a auditoria. Evidências ficam fora do Git; CI publica artifacts e tem resultado independente.

Para itens futuros, primeiro avaliar o desenho na escala da mão. Se a referência for insuficiente, gerar novo design Pro e depois o sprite nativo a partir dele. Não reduzir automaticamente a proposta maior. Reusar gesto/máscaras, registrar attachment/attackAction, grip/tip/eixo e vistas quando necessárias. Importar por tools/paper_doll_96_weapon_materials.cjs, com view=south/north opcional. --refresh recompõe a revisão a partir de pixels, encaixes, bindings e fitRevision, invalidando cache também após ajustes de contato, e repetir a auditoria da família inteira.

Retirar paperDoll96=1 reverte o uso. Reverter somente esta sprint e reconstruir Pages reverte o código, preservando a sprint das lâminas. Não há migração a desfazer.

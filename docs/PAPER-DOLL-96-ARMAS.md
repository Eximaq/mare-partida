# Sprint1 — armas PixelLab na base96

30/10/2026. Base `be2bad9` (merge PR152), branch `feature/weapons-96-integration`.

## Escopo

Oito armas especiais fornecidas pelo proprietário e quatro iniciais de Espadachim/Gatuno. Integração nos dois corpos, quatro direções, repouso, caminhada e ataque, usando o equipamento real. Continua no opt-in `?paperDoll96=1`; não há lançamento96 geral, nova personalização ou migração de save.

| ID existente | Arma | Canvas nativo PixelLab | Efeito equipado |
| --- | --- | --- | --- |
|0|Espada de Ferro Salgado|64×64|Nenhum|
|1|Sabre de Coral|64×64|Nenhum|
|12|Adagas da Bruma|32×32|Nenhum|
|13|Lâminas Acrobáticas|32×32|Nenhum|
|67|Katana da Maelstrom|64×64|Nenhum; sem vórtice|
|68|Nodachi de Kairouseki|80×80|Nenhum|
|69|Nodachi de Fogo|80×80|Nenhum; metal rubro, sem chamas|
|70|Meito: Ame no Habakiri|96×96|Reflexo dourado em quatro fases|
|71|Adaga de Cristal|40×40|Nenhum; facetas físicas|
|72|Punhal de Netuno|40×40|Nenhum; três pontas físicas|
|73|Punhal Flamejante|40×40|Nenhum; metal quente, sem chamas|
|74|Lâmina das Trevas|40×40|Pulso violeta em quatro fases|

As adagas usam uma matriz individual em cada mão do gesto existente; nenhum dano/atributo/ataque é duplicado. Efeitos70/74 só recolorem pixels da arma em quatro fases, sem partículas externas, rastros, explosões ou dano novo. Qualquer efeito em outro ID é rejeitado.

Ícones e animações de slot do inventário permanecem originais. A retirada dos efeitos aplica-se à arma **equipada**. IDs, nomes, raridades, atributos, descrições, drops e fórmulas não mudam. Referências originais e hashes estão em `weapons.json`.

## Origem artística final

**Todas as12 armas finais vêm da IA PixelLab, modelo Pro.** “Ultra HD Masterpiece PixelArt” foi a direção de acabamento nos prompts; não é um preset documentado do serviço. O resultado é pixel art na resolução nativa do jogo, preservando clusters, detalhes e paleta do Pro.

Os14 estudos imagegen anteriores e a reconstrução geométrica intermediária foram rejeitados na revisão artística e não são os materiais finais. Não reduzir um mestre HD para fabricar uma lâmina fina: escolher o tamanho nativo adequado, preservar o desenho PixelLab e adaptar o contato depois.

Foram14 chamadas Create Image Pro e duas Edit Image Pro, incluindo pilotos e revisão da Adaga da Bruma: **190 gerações PixelLab**, conferidas por saldo1995,36→1805,36. Edições exatas no PixelLab Workbench foram gratuitas. Recibos, prompts completos e alternativas ficam fora do Git; o catálogo contém IDs de job/galeria, variante selecionada, canvas/hash nativo, hash final e adaptações relevantes. Não guardar URLs assinadas ou dados de conta no repositório.

### Ame escolhida pelo proprietário

A fonte final é a **2ª variante (índice1)** de `gallery:2823533c-c099-5562-8779-c2bb98eae0d8`, com guarda circular. A escolha posterior substitui o piloto diagonal previamente mostrado.

O Workbench `54017810-499f-401d-b86d-d99bcdc2bdbd` ajustou somente127 pixels do cabo: largura útil de cinco pixels e um segmento de amarração a menos. **Lâmina e guarda circular foram preservadas pixel a pixel.** A galeria original não foi sobrescrita. O PNG final e a proveniência ficam no pacote do jogo.

### Preservação do desenho

As fontes32/40/64/80/96 recebem apenas margem transparente para o suporte128×128. Sem redimensionar, reduzir cores ou reconstruir a geometria da lâmina no importador. As armas diagonais conservam sua orientação nativa; `axisAngle` permite encaixá-las sem exigir um redesenho vertical. O cabo tem `grip` próprio, ocupado e medido; `tip`, limites e fio são explícitos.

A Adaga da Bruma foi gerada a partir do ícone de par e depois editada no próprio Pro para isolar **uma** adaga inteira. O compositor usa essa peça nas duas mãos. Não anexar o ícone de par duas vezes.

## Empunhadura, fio e profundidade

A anatomia96 fornece18 pontos por pose. O contato parte de ARM (pulso), avança dois pixels pelo antebraço e procura pele ocupada no máximo quatro pixels ao redor. Não empresta o contato de outro membro. Uma variante de punho fechado de cinco pixels envolve o cabo, com dedos à frente e guarda/pomo fora da palma; mantém o antebraço nativo e usa a pele/material de luva escolhido.

O gesto masculino North de espada usa LEFT em toda a família porque é a mão elevada na arte original; outras espadas usam RIGHT. Adagas usam ambos os lados. A orientação acompanha o antebraço, preparação, impacto e recuperação, com pose de repouso diagonal de45°. Não presumir os mesmos pulsos para os dois corpos.

**Fio sempre para fora:** `edgeSide` identifica o bisel da fonte em relação ao eixo da lâmina. Cada pose compara sua normal com o vetor externo ao tronco; no perfil privilegia a frente. A reflexão acontece no eixo próprio da arma, ao redor do cabo. Duplo fio/tridente têm indicação múltipla. West espelha **a composição inteira** de East, com a compensação inteira já aprovada.

Passagens: arma/punho distante → corpo/roupa/capa/cabeça → arma próxima → mãos/luvas/punho próximo. North permanece atrás de dorso/capa. East usa LEFT distante e RIGHT próximo. Nenhum PNG de corpo, rosto, cabelo ou roupa foi alterado. Fora da região explícita do punho, os pixels nativos das mãos/antebraços continuam preservados.

O envelope de todos os quadros acrescenta margem somente ao resultado. Corpo/pivôs128/160 e apoio dos pés ficam iguais; uma lâmina erguida não precisa ser cortada para caber. Cache de encaixes usa body/action/direction. URLs incluem a revisão das armas para evitar compositor antigo com material novo.

## Prévia sem luvas

A bancada tem seletor **Arma** e opção **Inspecionar empunhadura sem luvas**, ligada por padrão quando há arma. A opção desativa a peça de luvas somente naquela composição e recolore as antigas mitenes marrons nas palmas, preservando pose/contorno. Não remove equipamento, propriedade ou suporte a luvas do jogo. Comparações artísticas usam esse modo; a auditoria também cobre luvas e capas.

## Combate real

- Equipar/retirar usa as transações originais. Nenhum item é concedido pelo modo96.
- Espadachim/Gatuno com um dos12 itens, ou desarmados, usam os movimentos preparados no ensaio da caçada.
- O frame4 coincide com `hitFrameRatio` do relógio existente. Dano, alcance, velocidade, cooldown e alvo permanecem do combate original.
- Retirar a arma seleciona ataque desarmado. Hurt/guard/death conservam a política Idle documentada; não foram criados novos gestos autorais desses estados.
- Outras classes, armas sem matriz e Zoans mantêm o caminho existente. Não há arma genérica substituta.
- Sem o parâmetro opt-in, o fluxo publicado permanece igual, sem requisições96.

## Base reutilizável

- `tools/paper-doll-96-v3/weapons.json`: fontes e contratos por ID.
- `assets/weapon-item-{ID}.png`: doze materiais PixelLab finais.
- `weapons.js`: eixo nativo, contato, fio, punho, profundidade, raster inteiro e margem; cache limitado a256 orientações.
- `wardrobe.js`: passagens opcionais; sem arma selecionada conserva a composição anterior.
- `paper-doll-96-lobby.js`/`game.js`: ponte de equipamento/relógio, sem persistência própria.
- `node tools/paper_doll_96_weapon_materials.cjs`: verifica hashes instalados/originais sem geração.
- `--input=<JSON privado>`: importa seleções Pro com `itemId,file,grip,tip,axisAngle?,edgeSide,generation`. Requer Sharp. Adiciona margem; não escala.

Para um novo item: gerar no PixelLab Pro com a arte original como referência, pedir uma única arma física sem efeitos externos, escolher a silhueta, medir cabo contra a mão nativa, registrar eixo/fio e só então importar. Reutilizar as poses/máscaras atuais. Não repetir gerações de corpo/cabelo/rosto ou animar o personagem inteiro para cada arma.

Prompt-base: “Ultra HD Masterpiece PixelArt, premium native JRPG equipment sprite; faithfully preserve the supplied weapon's physical silhouette, materials and craftsmanship; broad flat blade face visible; one connected physical weapon; transparent padding; no character, text, scabbard, duplicate weapon, aura or loose particles.” Acrescentar os detalhes específicos do item e seu canvas nativo. Referências de par precisam ser explicitamente isoladas antes do encaixe.

## Validação e limites

Node confere fontes Pro, galeria/variante da Ame, hashes originais,1440 poses canônicas e2160 contatos, profundidade, limites e fio. Navegador confere materiais conectados, rotações de15° e os ângulos exatos das poses,2880 composições,960 espelhamentos, mãos/luvas fora do punho, dorso/capa e recortes. Depois equipa os12 IDs nos dois corpos pelo fluxo real, mede impacto/dano do motor e retirada da arma. Os24 combates e20 mortes usam inimigos de teste inseridos por instrumentação do navegador, mantendo as transações reais; não representam uma sessão natural de auto-caçada.

Resultados executados e limites ficam no changelog. As comparações **ícone → sprite → masculino/feminino**, direções e ataques ficam fora do Git; o CI publica suas evidências quando executado. Uma auditoria técnica não substitui novas avaliações artísticas do proprietário nem prova todas as combinações futuras.

Reversão de uso: retirar `paperDoll96=1`. De código: reverter somente esta sprint e reconstruir Pages. Sem migração de save. Próximo escopo mínimo: avaliar as armas em jogo e depois cobrir punhos/disparo/tecnologia/focos com referências adequadas.

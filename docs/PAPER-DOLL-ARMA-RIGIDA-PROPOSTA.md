# Proposta — arma rígida presa à mão animada

Estado: **aguardando autorização específica**. Nenhum sprite novo, composição com arma reutilizada ou alteração no renderizador de produção foi executado nesta proposta. O lote anterior de gerações continua encerrado após a reprovação artística.

## Motivo

As duas abordagens anteriores preservaram o contato, mas não o modelo da arma. O schema atual de `inpaint_image_pro_flash` tem máscara, contexto e seed; não oferece controle de consistência por frame. O suporte PixelLab confirmou essa limitação em consulta gratuita. Uma máscara mais estreita pode limitar o espaço disponível, mas não garante que o modelo preencha a mesma lâmina com as mesmas cores. Outra tentativa de geração seria uma hipótese, não uma correção garantida.

Para uma arma rígida, a alternativa recomendada é manter os pixels de uma peça e usar sockets da mão definidos em cada pose real do corpo. Isso altera o contrato anterior, que exigia frames próprios e rejeitava simples sobreposição estática como prova de animação completa. A exceção proposta vale apenas para peças explicitamente rígidas, começando por Idle/sul. Não dispensa frames próprios de corpo, cabelo e roupa, nem valida Walk/Attack sem sockets e oclusão revisados nessas ações.

## Plano concreto sem consumo

Candidata: `paper-doll-layer-batch-20261021/weapon/frame-01.png`, espada PixelLab já existente e ainda sem aprovação artística. A peça tem79 pixels visíveis, canvas64×64 e referência de encaixe20/36. O arquivo original fica preservado. Somente translações inteiras, sem escala, rotação interpolada ou pintura, seriam utilizadas no primeiro ensaio.

| Frame real do corpo | Âncora da mão | Translação da peça |
|---|---|---|
|1|20/36|0/0|
|2|18/35|−2/−1|
|3|20/36|0/0|
|4|19/35|−1/−1|

`check_attachment_plan.py` verifica conjuntos de coordenadas e emite somente JSON, sem desenhar ou exportar novos sprites. O preflight nas quatro poses encontrou zero pixels fora do canvas, zero interseção com o corpo e contato com a mão em todos os frames. Isso demonstra viabilidade geométrica, não aprovação visual. Hashes das fontes, offsets e resultados estão em `attachment-plan-audit.json`.

## Implementação condicionada à resposta

Se autorizada, a primeira entrega será uma prévia de inspeção com a mesma peça seguindo a mão nos quatro frames originais a4FPS. A identidade da arma será testada por igualdade dos pixels em coordenadas locais. Depois, um contrato opcional de peça rígida poderá referenciar uma única imagem e declarar sockets por animação/direção/frame, mantendo o caminho atual de folhas animadas. Não duplicar PNGs para fingir frames gerados; declarar honestamente que a peça é reutilizada.

O conjunto continua incompleto sem cabelo e roupa aceitos. O protótipo permanece fora do jogo até validação suficiente; `human-v1` continua exigindo as peças obrigatórias. Saves, classes, facções, Haki, Zoan, hitboxes, clocks e impactos não mudam. O próximo custo PixelLab dependerá das peças restantes e será apresentado antes de qualquer nova chamada paga.

# Corpo HD independente no mapa: primeiro recorte

O problema é a seleção do visual HD como conjunto inteiro. Quando a seleção exata recusa uma peça, a preparação do mapa encaminha a pose inteira ao compositor modular de 96 px. Isso é uma troca do desenho, não uma alteração do save.

## Regra e alcance deste rascunho

1. A arte HD exata do conjunto ainda tem prioridade.
2. Quando ela não existir, a preparação do mapa pode selecionar uma rota HD independente registrada para a mesma ação e direção. O corpo e a aparência não são substituídos; os equipamentos comprovados permanecem em seus slots. Registrar um encaixe exige a fonte correta, camadas independentes, escala, âncora e todas as fases compatíveis.
3. Uma peça sem encaixe registrado fica pendente naquele slot. Arte antiga só é candidata se for uma camada isolada com encaixe demonstrado para a mesma fase; este PR não conecta nenhum doador antigo. Nenhum renderizador de corpo antigo foi adicionado.

O primeiro registro é o soco desarmado masculino para Sul (oito quadros), com Calça 133 HD, ao equipar o Peitoral 6. Usa os mesmos pixels e a mesma aparência da rota HD da Calça 133 sozinha. Preserva a cabeça e o cabelo originais com as paletas já compatíveis. Não corrige a diferença anterior entre a íris baked Original e a seleção azul padrão; não ativa outros cortes ou estilos de olhos sem fonte comprovada. A omissão de peitoral é apenas visual e não altera o equipamento ou os bônus.

Idle, caminhada, outros ataques, direções, cosméticos que não têm fonte compatível e o feminino não recebem novos encaixes. Nesses casos o roteamento anterior continua até a auditoria se converter em encaixes verificados. A mudança não inclui nova arte, não altera skins completas e não muda o timing de combate, transformação ou save.

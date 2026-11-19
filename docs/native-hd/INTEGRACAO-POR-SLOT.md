# Corpo HD independente no mapa: primeiro recorte

O problema é a seleção do visual HD como conjunto inteiro. Quando a seleção exata recusa uma peça, a preparação do mapa encaminha a pose inteira ao compositor modular de 96 px. Isso é uma troca do desenho, não uma alteração do save.

## Regra e alcance deste rascunho

1. A arte HD exata do conjunto ainda tem prioridade.
2. Quando ela não existir, a preparação do mapa pode selecionar uma rota HD independente registrada para a mesma ação e direção. O corpo e a aparência não são substituídos; os equipamentos comprovados permanecem em seus slots. Registrar um encaixe exige a fonte correta, camadas independentes, escala, âncora e todas as fases compatíveis.
3. Uma peça sem encaixe registrado fica pendente naquele slot. Arte antiga só é candidata se for uma camada isolada com encaixe demonstrado para a mesma fase; este PR não conecta nenhum doador antigo. Nenhum renderizador de corpo antigo foi adicionado.

O primeiro registro é o soco desarmado masculino para Sul (oito quadros), com Calça 133 HD, ao equipar o Peitoral 6. Usa os mesmos pixels e a mesma aparência da rota HD da Calça 133 sozinha. Preserva a cabeça e o cabelo originais com as paletas já compatíveis. Não corrige a diferença anterior entre a íris baked Original e a seleção azul padrão; não ativa outros cortes ou estilos de olhos sem fonte comprovada. A omissão de peitoral é apenas visual e não altera o equipamento ou os bônus.

Idle, caminhada, outros ataques, direções, cosméticos que não têm fonte compatível e o feminino não recebem novos encaixes. Nesses casos o roteamento anterior continua até a auditoria se converter em encaixes verificados. A mudança não inclui nova arte, não altera skins completas e não muda o timing de combate, transformação ou save.

## Segunda etapa: troca e retirada independentes

O resolvedor de slots é comum aos dois corpos. O jogo ainda dá prioridade ao visual HD exato quando ele existe. Nas famílias registradas, a composição reaproveita arquivos existentes e verifica o corpo-base, as camadas que não mudam, o relógio, o pivô, a direção e os dados de paleta antes de combinar peças. A saída limpa sem a peça só é permitida quando existe por baixo da camada. Se não houver prova, não se recorta anatomia nem se promove uma prévia.

| Registro | Abrangência e limites |
| --- | --- |
| Botas do kit masculino C151/P133/G152 | Repouso e caminhada, aparência Original de cada fonte. Dez botas no Leste/Oeste, incluindo 155. Norte/Sul: nove botas na base da 9; a 155 mantém a rota exata anterior, pois o mesmo registro muda a calça/anatomia inferior. |
| Luvas | Kit C151/P133/B155 no masculino e C151/P154/B155 no feminino, Original, repouso, caminhada e soco. Excluídas da nova composição as vistas candidatas de G131 Sul e G180 Sul/Leste/Oeste no feminino. |
| Bota e luva juntas | Kit masculino C151/P133 no Leste/Oeste, repouso/caminhada. As máscaras não se cruzam nos controles; não aplicar automaticamente ao Norte/Sul. |
| Caminhada feminina Sul | Calça 21 com armas 0, 5 ou 17 ou desarmada; calças 133/147/161/168/175/182 desarmadas. Caso o encaixe HD da bota falte, a bota fica pendente com o corpo/cosméticos/roupas/arma compatíveis preservados. Não declara as botas ajustadas. |
| Cetros 123–127 e Canhão 15 | Leste/Oeste, contratos de aparência originais do acervo. Arma permanece; peitorais 151/158/165/179 registrados com o Canhão 15 permanecem. Outros slots podem ficar pendentes no recorte, sem introduzir uma textura antiga sem encaixe. |
| Compositor modular existente | Uma roupa sem mapeamento não derruba mais o visual inteiro dos dois corpos. A falta de arma ou de fonte de aparência continua diagnosticada; não troca a ação nem a paleta para mascarar a lacuna. |

Não há novos sprites, mudança da arma/roupa salva, das regras de classe, dos bônus ou da cadência. Não são afetadas skins completas nem formas Zoan. Onde ainda não existe o contrato HD correto, pode permanecer o compositor modular atual. Esta mudança não certifica todos os trajes, paletas e armas.

### Reauditoria

136.224 consultas de seleção: 105.264 de equipamentos individuais e 30.960 de conjuntos com perfis de aparência. 38.719 mantiveram fonte HD exata, 36 passaram por composição HD de slots e 119 mantiveram HD com pelo menos um slot pendente. 97.350 não selecionaram fonte HD nessas amostras; isso não significa 97.350 artes faltantes. As consultas contam combinações, incluem controles repetidos e não demonstram que o compositor de 96 px falhou.

Próximas lacunas distintas: roupa e bota ainda fundidas nos ataques; B155 Norte/Sul depende da calça diferente; mãos e botas em conjunto fora do Leste/Oeste precisam de âncora comum; as paletas de fontes fundidas não podem ser generalizadas; a revisão final da espada feminina e o tiro atual de oito fases pedem fonte editável exata. Não redesenhar o corpo inteiro para nenhuma dessas lacunas.

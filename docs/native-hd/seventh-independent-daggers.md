# Sétimo lote: seis adagas independentes

Base de integração: sexto lote 77dc5d740e927feefe01699e074f634686b93378. IDs 12, 13, 71, 72, 73 e 74, masculino EAST/WEST. O ID 13 já tinha poses planas E/W: este lote acrescenta modularidade, não conta direção nova.

## Contrato limitado
Classe canônica `rogue`, corpo masculino, aparência original (cabelo e olhos castanhos, pele clara), variante original da arma, sem outros equipamentos. A negativa cai no caminho anterior, não promove imagens parciais. Nenhuma alteração no controlador de combate, ataques de rede, attackSpeed, JSONs de cabeça ou peitorais do sexto lote.

As camadas são far-gear, anatomia original, near-gear e restauração anatômica original sob máscara. Reparo da mão em repouso é anatomia separada, nunca parte da arma. WEST é espelho literal aprovado de cada camada EAST. Nenhuma geração de arte ou extração de roupa de imagem composta.

## Proveniência e raster
`tools/rework-weapon-layers-hd/six-daggers-source-proof.json` contém SHAs dos três pacotes autorais, coorte aprovada, membros e camadas por item/fase. Arquivo de componentes: 100135d466c2bbb4a9bea12434aa7f816bde296810797a65af04be3b1dc983af. Referências independentes: 399babd7e80577f8d95cebfb93ef09a46fe2257904b30a34f366e51b83085cf5.

96 recomposições Pillow exatas às referências. No Canvas final, alpha exato e RGB opaco <= 1; baseline congela máximo RGB, canais acima de 1 e pixels alterados por quadro. 12/71/73 <= 1; 13 tem quatro canais semitransparentes com delta 2; 72 tem 46 canais acima de 1 (máximo 4); 74 tem seis (máximo 4). Não há tolerância genérica ampliada.

## Relógio
Fonte histórica `daggers-east-modular8-historical-v2.json`, SHA 1d056e34822097c32f32670f840a5c21fe1671aa48b1733542c08beb92ec294d: oito poses, 12 fps nominal, contato 4, one-shot. Apresentações 8 fps ou hold adicional não substituem relógio de gameplay. O remapeamento visual existente ancora o contato ao timing real; não se promete 12 fps literal sob toda velocidade de ataque.

## Verificação e limites
Teste de seletor e 96 rasters em `rework-six-daggers-ordered.test.cjs`; consumidor real headless em `rework-seventh-world-bundle.test.cjs` para troca da arma no mesmo objeto, render EAST/WEST, item extra e remoção. Este teste não é navegador, input real ou captura no mapa. Roupas adicionais, outras aparências e outras direções permanecem fora deste contrato. Resultados da suíte agregada devem ser reportados separadamente; não há declaração de suíte ampla verde neste documento.

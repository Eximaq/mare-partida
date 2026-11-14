# PR #331 — Pranchas recuperadas do lote local

Os quadros abaixo saíram do renderizador do mapa na build local preparada após `1b4cdfe4`. Este commit preserva as capturas e seus resultados. O commit inicial de recuperação publicou somente documentação e imagens de evidência. O lote seguinte inclui os vínculos das armas e os ZIPs usados pelo jogo.

| Peça | Configuração exercitada | Comparação com a fonte | Evidência |
| --- | --- | --- | --- |
| Cajado 128 NORTH BASE127 | Masculino com peitorais 151, 158, 165 e 179 isolados, cabelo Original castanho, olhos castanhos e pele clara | Nove quadros por traje, 36 no total, iguais em alfa e pixels opacos na rodada local. | [Acervo e mapa](evidence/approved-poses/recuperacao-128-base127-masculino.png) |
| Cajado 128 NORTH BASE127 | Feminino com os quatro peitorais, chapéu 150, calça 147 e botas 155, cabelo Original castanho, olhos castanhos e pele clara | Nove quadros por traje, 36 no total, iguais em alfa e pixels opacos na rodada local. Pivô local em [384, 576] físicos no canvas 768×768. | [Acervo e mapa](evidence/approved-poses/recuperacao-128-base127-feminino.png) |
| Orbe 122 feminina | EAST e WEST com peitorais 151, 158, 165 e 179, calça 154, botas 155, cabelo Original castanho, olhos castanhos e pele clara | Oito quadros por traje e lado. A recuperação repetiu a comparação de todos os 64 quadros com o ZIP aprovado, com zero diferenças no alfa e nos pixels opacos. A prancha mostra a fase de índice 4. | [Acervo à esquerda, mapa à direita](evidence/approved-poses/recuperacao-122-laterais-feminino.png) |
| Manopla 109 feminina | 151 EAST, com a mesma configuração feminina da Orbe | Fase de índice 4 com zero diferenças de alfa e pixels opacos em relação à extração local do pacote aprovado. As oito combinações EAST/WEST foram observadas na rodada local. A comparação integral ainda está aberta. | [Acervo à esquerda, mapa à direita](evidence/approved-poses/recuperacao-109-lateral-feminino-151-east-fase4.png) |
| Braço 117 feminino | 151 EAST, com a mesma configuração feminina da Orbe | Fase de índice 4 com zero diferenças de alfa e pixels opacos em relação à extração local do pacote aprovado. As oito combinações EAST/WEST foram observadas na rodada local. A comparação integral ainda está aberta. | [Acervo à esquerda, mapa à direita](evidence/approved-poses/recuperacao-117-lateral-feminino-151-east-fase4.png) |

Na prancha da Orbe, os peitorais 151, 158, 165 e 179 ocupam as linhas nessa ordem. Cada linha começa com o par EAST e termina com o par WEST. A prova compara o raster nativo com um recorte compartilhado, sem redimensionar a pose.

Fontes [Cajado 128 BASE127](https://github.com/Eximaq/mare-partida/blob/2801902fa2dad8e83069815faeaa3f53f90bc1b6/art-approved/weapons/staff128-north-base127-approved/MANIFEST.json), [Orbes femininas](https://github.com/Eximaq/mare-partida/blob/2801902fa2dad8e83069815faeaa3f53f90bc1b6/art-approved/weapons/female17-122-four-torsos-ew/parts/MANIFEST.json) e [matriz de cobertura do PR](approved-pose-runtime-matrix.csv).

## Bloqueios confirmados na recuperação

- Os seis ZIPs de 133 r15, 161 r27 e 21 r3 EAST/WEST contêm cada um 12 PNGs 512×512 opacos, além de `METADATA.json` e `SHA256.json`. A inspeção confirmou que os 72 quadros têm fundo opaco. A busca pelos identificadores dessas revisões na árvore do acervo e nos snapshots históricos dos PRs #307 e #322 localizou apenas as composições finais do acervo. As camadas transparentes exatas continuam pendentes. [Pacotes das calças](https://github.com/Eximaq/mare-partida/blob/2801902fa2dad8e83069815faeaa3f53f90bc1b6/art-approved/clothing/female-historical-cycles)
- O processo PowerShell fornecido pelo ambiente termina na inicialização com `Your Windows doesn't fully support CET. Please install all available Windows updates.`. A execução direta do Git permitiu inspecionar o diff e recuperar os ZIPs de produção.
- O levantamento das variantes de armas, do peitoral 130 por fase e das combinações de roupa, cabelo e capacete continua aberto na matriz.

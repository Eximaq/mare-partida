# César na Ilha Dawn

Os encontros comuns de todos os setores de Dawn agora usam somente **César, nível 5**. O encontro final também usa César, preservando a regra atual de liberação e recompensa do chefe. Os antigos corsários, carapaças, sentinelas e o Capitão da Caldeira deixam de surgir em Dawn; seus tipos permanecem nos outros mapas que os utilizam.

A arte vem do personagem existente no PixelLab (`da9c0817-8ea5-425f-a164-7e2362bd46bc`). As animações existentes de corrida e golpe foram apenas alinhadas em folhas transparentes, sem gerar novos pixels.

Os quadros de ataque foram alinhados pelo contato dos pés com o solo da pose idle em cada direção, evitando que César flutue durante o soco.

O Canvas agora desenha chão, entidades ordenadas pelo eixo Y (com o herói primeiro em empates) e, por último, os topos de objetos. Dawn reutiliza suas máscaras originais de oclusão. Mapas exportados como uma imagem única não recebem recortes de primeiro plano, pois eles também contêm o chão e apagariam o personagem. Objetos desenhados separadamente usam a ordenação por Y e seus próprios sprites para a oclusão.

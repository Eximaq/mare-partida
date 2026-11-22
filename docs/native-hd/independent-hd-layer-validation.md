# Camadas HD independentes: validação local
     
O jogador é renderizado com camadas HD próprias por peça, versão do corpo, ação e direção. A falta de uma peça compatível não deve apagar as outras nem voltar ao visual legado. O fallback visual usa HD do próprio personagem; não altera o que está equipado nem atributos. O espelhamento só reaproveita uma camada quando pose, pixels, âncora e fases correspondem.

## Validação desta proposta
     
- Rotas do mapa e modo de carregamento sem recurso legado: `node tests/world-hd-only-routing.test.cjs`, `node tests/rework-world-hd-only.cjs`.
- Independência da escolha, prova de autoria e remoção isolada: `node tests/rework-independent-pose-plan.cjs` e `node tests/rework-explicit-owned-layer-groups.cjs`.
- Manopla 14: reversão sobre a mão e microajuste só nas fases 1 a 4 da caminhada Sul; contraste Claro/Ébano e controle byte a byte do Norte. `node --expose-gc tests/rework-female-walk-south-w14-palm-flip.cjs`.
- Peitorais 158, 165 e 172: alterações aprovadas só na fase 05 do soco Norte. O gzip e o manifesto são as fontes do índice restaurado pelo build.
- Manoplas 111/112: quatro direções por item, oito posições ao todo, conferidas em 64 quadros do jogo em relação às posições aprovadas. O Oeste do ataque da 111 espelha só a arma do Leste.
- Canhão 15: teste dedicado de equipar, desequipar e reequipar no Leste/Oeste. `node --expose-gc tests/rework-w15-detached-side-equip.cjs`.
     
## Cobertura e pendências
     
O censo local registra **1.579 de 2.208** posições únicas confirmadas neste ponto. Não é contagem de todas as combinações de itens. O rascunho não declara cobertura universal: ainda há casos que exigem verificação de encaixe, recuperação de fonte ou correção de composição. A correção dos dedos do Orbe 17 não faz parte deste envio. Algumas artes reaproveitadas de armas contêm pele desenhada na camada; o tom e o encaixe em movimento são pendências separadas da orientação já aprovada.

Sem merge ou implantação nesta entrega.

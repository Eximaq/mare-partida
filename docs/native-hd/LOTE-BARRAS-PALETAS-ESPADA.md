# Barras, paletas e Espada 0
Base: PR #348, `41c1e7d`. Nenhum sprite ou animação foi redesenhado. Estas mudanças não afetam combate, save, escala nem relógio das poses.

## Encaixes validados

- **Feminino, caminhada Sul:** a Calça 168 aceita B9 e B176 com C151 e G152 opcional. Nos 40 quadros por configuração, os pixels alterados ficam nas próprias camadas da bota. B155 e o estado descalço preservam o quadro histórico. A diferença residual de antialias na borda é isolada: até 4 níveis em 255 e grupos máximos de 3 pixels para B9 e 5 para B176. Teste com Porcelana/Ébano, cabelo loiro e olhos âmbar. Os quatro pares candidatos de B9/B176 com P147/P182 ficaram de fora por diferença contínua no material da barra.
- **Masculino, caminhada Sul:** sete calças do lote anterior (140/147/154/161/168/175/182) aceitam o perfil padrão e cores escolhidas de pele, cabelo e íris no kit C151/G152, com B155 ou sem bota. A base usa as máscaras do rig P133 isolado quando fontes e poses são idênticas. Sete calças × 16 quadros renderizados; 14 clipes preparados no renderizador do mapa. O censo de 6.720 combinações foi no seletor, não uma prova de render de todas as paletas. Continua limitado ao penteado e formato de olho Original; B9 não foi liberada.
- **Masculino, soco Norte:** ampliação de 18 para 81 combinações usando a aparência padrão (nove luvas × nove botas estáticas), com 648 quadros padrão e 224 com duas paletas de contraste. As próprias luvas permanecem com as cores do equipamento. G25 não mudou porque sua ponta requer prova de propriedade. B9 e o estado sem bota não foram incluídos.
- **Masculino, Sul:** passam a nove os peitorais com P21 no repouso, caminhada e soco, usando as mesmas máscaras verificadas de íris e pele. Comparação de 450 quadros, em dois perfis, retirando peças sem afetar as outras. P22 e P133 usam outro mapa de material em suas rotas exatas com a calça isolada; 50 trocas verificadas e 100 comparações da área da íris. A combinação dessas duas calças com outros peitorais não foi habilitada por extrapolação.
- **Diagnóstico de cabelo feminino:** os rigs Norte e laterais já desenhavam o material correto. Agora o relatório do renderizador informa a mesma identidade que o material realmente usado. Os testes de preservação das 12 famílias voltaram a passar sem alteração dos pixels.

## Espada 0 feminina: revisão isolada

A recuperação aproveita o pacote editável existente e exporta os 1.503 PNGs validados de forma temporária, sem duplicá-los no Git. Na compilação de revisão, o renderizador validou 96 casos novos de equipamento, 24 rotas anteriores idênticas e 96 quadros representativos. A candidata só entra quando nenhuma rota exata ou em camadas responde. **Desativada por padrão**; ainda falta validação no navegador e em outras aparências. [Como reproduzir a revisão](SWORD0-REVIEW.md).

## Reauditoria

Comparação de 135.552 solicitações deduplicadas ao seletor de mundo (perfis Original e padrão, catálogo e kits amostrados): **99 novos casos com HD completo** e nenhuma rota completa perdida. São casos de seleção automatizada, não revisões manuais nem sprites novos. A revisão opcional da Espada 0 usa um perfil específico que não faz parte desse total. Este lote fica no PR rascunho, sem merge nem publicação.

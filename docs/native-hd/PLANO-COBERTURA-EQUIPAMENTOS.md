# Cobertura de equipamentos: execução em lotes

O critério para terminar não é ter um PNG, nem passar no seletor com um perfil literal que o jogo não usa. Cada equipamento corporal deve ser rastreado por peça, corpo, ação e direção. Em jogo, a troca deve preservar o resto do personagem e da ação. O acervo é consultado antes de criar uma fonte.

## Inventário ativo

- São **92 equipamentos nos seis slots do seletor corporal HD**: 42 armas, dez peitorais, dez calças, dez botas, dez luvas e dez itens de cabeça.
- **Capas equipáveis** (slot `cloak`, 10 itens) não contam como pendências visuais: o escopo registrado em `387a038e` exclui a renderização desse slot, e o compositor desativa `cloak` e `cloakFront` sem alterar itens ou atributos. Capa que faz parte do desenho de um **peitoral** continua no escopo do peitoral: preservar profundidade e cobertura por pose.
- **Um Visual Completo** tem renderizador e contrato próprios. Frutas, cintos, anéis, colares e amuletos também são registrados à parte; não entram como peças corporais desse seletor. Não declarar ausência de arte ou falha só por não pertencerem ao recorte.

## Como localizar e fechar pendências

`python tools/build_pages.py` e `node tools/audit-equip-visual-progress.cjs /tmp/cobertura-equipamentos.json` recriam a linha de base. São **4.920 consultas**: peça isolada, dois corpos, perfil Original e perfil salvo, em repouso, caminhada e ataque adequado à classe; há um perfil adicional feminino de referência com Peitoral 151 para armas. Item 0 é uma espada, não o estado sem arma.

O relatório só mede a escolha de uma fonte pelo seletor HD. Ausência nessa amostra não é ausência de arte; a bota pode já estar correta em uma família registrada e o renderizador modular pode cobrir a configuração. Um roteiro só fica completo após verificar as fontes da pose e renderizar a troca no consumidor, inclusive contatos e offsets, sem comprometer a aparência ou o save.

- **Armas:** manter o movimento, oito fases quando previsto, empunhadura e PNGs próprios. Priorizar Adagas (separação explícita de pele/roupa) e as fases/fontes das armas de fogo antes de revisar as demais classes. Não remapear 30 ticks pra oito só para encaixar uma peça.
- **Luvas e botas:** priorizar as famílias que compartilham mãos/pernas comprovadas. Checar a borda frente/trás e a cor de pele com tons de contraste. Tratar as laterais do soco em separado: a máscara de íris existe, mas a base inferior ainda mistura roupa e pele.
- **Calças e peitorais:** aprovar pares só com todas as fases e costura comprovadas. Manter Calça 147/182 + Botas 9/176 fora enquanto persistir uma faixa de pele nova.
- **Cabeça e cosmética:** não substituir estilo nem paleta que já estão em uso. A largura/silhueta e a ordem de desenho importam mesmo quando o pivô coincide. Verificar a visibilidade de capacete e cabelo junto às ações.
- Empilhar apenas lotes coerentes no PR #348. O PR #349 publicou o perfil de referência das seis espadas isoladamente; paletas e outros lotes continuam separados. Não misturar os escopos nem contornar CI.

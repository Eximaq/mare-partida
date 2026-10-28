# O que gerar manualmente no PixelLab

Este guia continua disponível como alternativa de produção manual. Em 28/10,
o proprietário retomou a execução automática do lote anteriormente detalhado,
com teto de 840 gerações e sem retries. O resultado e os bloqueios da primeira
rodada estão em [Produção de equipamentos](PAPER-DOLL-PRODUCAO-EQUIPAMENTOS.md).
Não é necessário gerar personagens ou movimentos novos: corpo, cabelo,
camisa/colete e armas existentes serão reaproveitados. Este documento não
autoriza repetir gerações.

## Arquivos de referência

Na pasta `referencias`, o pacote manual contém os **240 frames reais do corpo atual**, em PNG transparente
64×64, sem escala. Só as margens transparentes do canvas 84×84 foram retiradas.
`input-manifest.json` registra animação, direção, frame, hashes e padding para
restaurar o canvas original. Os nomes já seguem a ordem do jogo.

- Direções: `south` (frente), `north` (costas), `west` (esquerda), `east` (direita).
- Pivô das referências 64×64: **32,52**. Canvas final do jogo: **84×84**, pivô **42,65**.
- Não redimensionar, espelhar, girar o corpo ou reconstruir a animação.
- Se uma peça ficar cortada em 64×64, não encolher o personagem. Use canvas 84×84,
  acrescentando somente margens de 10 px à esquerda, 13 acima, 10 à direita e
  7 abaixo; o pivô volta a 42,65. Informe que o arquivo já está em 84×84 para
  evitar aplicar essas margens duas vezes na integração.
- Escolher o corpo como referência de pose/anatomia. O ícone do item pode orientar
  o desenho da peça, mas não deve ser ampliado para virar roupa de personagem.

## Peças a produzir

Os números abaixo são os `def` já existentes no jogo; não criar/renumerar itens.
São candidatos para o primeiro visual de cada categoria, não novos bindings ativos.

| Peça | Item existente sugerido | Entrega inicial |
|---|---|---|
| Calça | Calças da Maré Alta, `def:22` | 240 poses de camada de calça |
| Calçado | Botas de Navegante, `def:8` | 4 referências ajustadas, com ambos os pés |
| Luvas | Luvas de Cordame, `def:25` | 4 referências ajustadas, com ambas as mãos |
| Capa | Manto do Faroleiro, `def:23` | 240 poses de camada de capa |
| Cabeça | Bandana das Correntes `18` ou Capacete do Corsário `19` | 4 vistas ajustadas à cabeça |
| Óculos | Componente de um item de Cabeça | 4 vistas; não existe item de óculos separado |
| Colar | Colar das Marés, `def:20` | 4 vistas ajustadas ao pescoço |
| Cinto | Cinto do Grumete, `def:29` | 4 vistas ajustadas à cintura |
| Anel | Anel de Coral Cinzento, `def:27` | 4 vistas ajustadas à mão |
| Acessório | Amuleto das Correntes, `def:10` | 4 vistas ajustadas ao corpo |

Camisa/colete atuais e armas já aprovadas **não precisam ser refeitos**. Caso
queira uma camisa nova, produza-a no slot do torso seguindo as mesmas 240 poses,
independentemente da calça, sapato e demais equipamentos.

As peças pequenas podem usar imagens direcionais com encaixes medidos por pose.
Isso só vale se a forma realmente permanecer compatível durante o movimento.
Botas e luvas podem exigir fontes diferentes por ação ou **240 frames próprios**
se mudarem de forma/ângulo. Não simular uma sequência completa duplicando PNGs.
Uma vista estática ainda não é uma animação aprovada. Óculos podem ficar
totalmente ocultos de costas; a ocultação precisa ser declarada no manifesto.

## Quantidade de frames das peças animadas

| Ação | Por direção | Total nas quatro direções |
|---|---:|---:|
| `idle` | 4 | 16 |
| `walk` | 8 | 32 |
| `attack-sword` | 8 | 32 |
| `attack-unarmed` | 8 | 32 |
| `attack-firearm` | 8 | 32 |
| `attack-daggers` | 8 | 32 |
| `attack-tech` | 8 | 32 |
| `attack-focus` | 8 | 32 |
| **Total por peça** | **60** | **240** |

`attack-focus` é compartilhado por Estrategista e Suporte. As facções reutilizam
o mesmo corpo; não multiplicar esses números por facção ou criar sete corpos.

## Como trabalhar no PixelLab

1. Começar com `body-idle-south-00.png`. Editar **uma peça por vez**, sempre a
   partir do corpo original, sem acrescentar outra peça sobre uma geração anterior.
2. Usar canvas 64×64 e transparência. Adicionar somente a peça na região correta.
   No editor, preferir uma camada separada que contenha somente a roupa/acessório.
3. Conferir frente e depois costas/lados. Preservar rosto, membros, proporções,
   posição das mãos/pés, iluminação e escala do pixel. Descartar resultados que
   redesenhem o corpo ou soltem a peça longe dele.
4. Para calça/capa, transferir a peça aos **frames existentes**, sem gerar outra
   caminhada ou golpe. O manifesto organiza 16 lotes de até 15 frames: quatro
  lotes por direção. Usar a referência da mesma direção para cada lote. `LOTES.txt`
  lista os arquivos na ordem correta; não reorganizar alfabeticamente as ações.
5. Exportar os originais e as camadas transparentes. Se a ferramenta retornar
   somente personagem completo, guardar esse resultado e o corpo-base: ele é uma
   composição intermediária, não uma camada pronta. A separação precisa ser
   inspecionada; não apagar partes da anatomia para forçar o encaixe.

## Prompts para copiar

Primeiro substituir `[PEÇA]` e `[REGIÃO]` pelos valores da tabela abaixo:

> Add only [PEÇA] fitted to [REGIÃO] of this human in the supplied facing.
> Preserve every other body, face, pose, pixel and transparent background.
> Match the existing crisp nautical pixel art. No detached objects or extra anatomy.

Tradução: adicionar apenas a peça à região indicada, preservando direção, corpo,
rosto, pose, demais pixels e transparência. Mesmo pixel art náutico, sem partes
soltas ou anatomia extra. Adapte o desenho ao ícone do item escolhido.

| Peça | `[PEÇA]` | `[REGIÃO]` |
|---|---|---|
| Calça | `plain navy sailor trousers` | `both legs and waist` |
| Botas | `brown leather sailor boots with small brass buckles` | `both existing feet` |
| Luvas | `brown fingerless leather gloves` | `both existing hands` |
| Capa | `a short burgundy sailing cape with a worn hem` | `shoulders and back` |
| Bandana | `a plain navy sailor headband` | `the forehead and scalp` |
| Capacete | `a compact weathered steel sailor helmet` | `the scalp` |
| Óculos | `small round brass goggles with clear lenses` | `the eyes and temples` |
| Colar | `a small bronze medallion on a short cord` | `the neck and upper chest` |
| Cinto | `a brown leather belt with a plain brass buckle` | `the waist` |
| Anel | `a small brass ring with a muted turquoise stone` | `one existing hand` |
| Acessório | `a small brass compass charm` | `the belt at the right hip` |

Para transferir a peça às poses, usar o corpo de cada frame como entrada:

> Fit only the reference garment to each supplied body pose. Preserve the existing
> anatomy, facing, motion, foot positions and frame order. Keep all unrelated pixels
> unchanged, the same crisp pixel scale and transparent background. No other
> clothes, props or extra anatomy.

Tradução: ajustar somente a peça de referência às poses fornecidas, preservando
anatomia, direção, movimento, pés, ordem, demais pixels e transparência.

## Exportação para entregar

- PNG transparente, preservando os originais. Sem fundo xadrez/branco incorporado.
- Um diretório por peça, com nomes como `pants-walk-south-00.png` até `07.png`.
- Frames na ordem original. Não usar ping-pong, inversão, espelhamento ou repetição.
- PNGs por frame são suficientes; folhas também servem, com largura/altura do
  frame e ordem de linhas/colunas informadas. Evitar GIF como único original.
- Para peças rígidas, enviar a referência vestida e a peça isolada, por direção;
  guardar as duas mãos/pés separadamente quando houver diferença de geometria.
- Se algum frame estiver realmente encoberto, informar a pose, sem inventar pixels.

A integração restaurará somente as margens, validará encaixes e cobertura e usará
um pacote de revisão antes de ativar itens. Roupas incompletas continuam em
fallback; os saves e os atributos não dependem da geração dessas imagens.

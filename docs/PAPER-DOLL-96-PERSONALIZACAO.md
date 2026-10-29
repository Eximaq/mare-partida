# Personalização de 96 px — modelos e correção de encaixes

29/10/2026, continuação do PR #144. **Bancada de avaliação, sem ativação na
aventura normal.** A criação de modelos não homologa automaticamente a arte.

## Conteúdo

- Seis cabelos: curto rente, espetado, lateral, chanel, ondulado e tranças
  presas; quatro direções por corpo, masculino e feminino.
- Dez paletas de cabelo e oito tons de pele, sem gerações por cor. A função
  de remapeamento aceita outras rampas de cinco tons.
- Os estudos de rosto generativos foram rejeitados pelo proprietário. Os
  quatro seletores preservam a geometria e os pixels dos traços originais,
  variando discretamente as íris azul, castanha, verde e cinza. **Não são
  quatro novas fisionomias nem cabeças redesenhadas.**
- Dez equipamentos dos cinco slots visuais combinados:

| ID existente | Nome | Camada |
| --- | --- | --- |
| 8 | Botas de Navegante | boots |
| 9 | Botas do Recifal | boots |
| 18 | Bandana das Correntes | head |
| 19 | Capacete do Corsário | head |
| 21 | Grevas de Navegante | pants |
| 22 | Calças da Maré Alta | pants |
| 23 | Manto do Faroleiro | cloak |
| 24 | Capa do Horizonte | cloak |
| 25 | Luvas de Cordame | gloves |
| 26 | Luvas do Vigia | gloves |

Nomes conferidos no PDF enviado e no código corrente. Índices, atributos e
saves preservados. O item22 mantém o contrato de
[HANDOFF-CALCAS-PAPER-DOLL.md](HANDOFF-CALCAS-PAPER-DOLL.md); os estudos84 e seus
bindings não foram substituídos. Armas, torso e outros acessórios não foram
acrescentados nesta produção.

## Prioridade de desenho

1. Capa posterior no sul/laterais.
2. Corpo neutro e braços posteriores.
3. Luvas posteriores, ocultas pelo tronco/cabeça.
4. Calças, calçados e roupa superior.
5. Capa anterior no norte; somente seu colar no sul/laterais.
6. Cabeça neutra, **rosto, cabelo e equipamento de cabeça**, nessa ordem.
7. Antebraços/mãos anteriores e suas luvas.

Cada superfície é desenhada uma vez. Um rosto novo não pode pintar por cima
do cabelo original nem trazer cabelo embutido. No norte a capa cobre as costas;
nas laterais a profundidade das articulações determina o braço próximo.

O couro cabeludo frontal está cerca de um pixel à esquerda do eixo dos olhos.
`south.hairX=1`, para os dois corpos, corrige o encaixe sem deslocar o rosto,
alterar a largura do corpo ou apagar assimetrias intencionais dos penteados.

## Encaixe

Foram medidos os contatos em **336 frames neutros das sprites novas**:
320 ataques distintos e16 frames de caminhada. Tecnologia compartilha disparo.
O rig antigo segue como origem do movimento; suas mãos, quadris e tornozelos
não são presumidos idênticos aos pontos desenhados no corpo novo.

- Cabeça, cabelo e rosto usam o mesmo socket por frame.
- Luvas/calçados são peças pareadas ligadas a punhos/tornozelos.
- Calças amostram a textura nativa por quadril, coxa e canela, cobrindo a
  superfície real das pernas. A antiga malha contínua que dobrava sobre si
  mesma nas laterais não é o caminho usado para vestir essa peça.
- Braços próximos ficam acima do tecido; luvas distantes são ocultas pelo
  tronco/cabeça. Botas não carregam pixels de perna da referência.
- A roupa superior feminina fecha pequenas lacunas da base neutra com seus
  próprios pixels. Capas não carregam rosto, peito ou pernas na abertura.

Os20 inpaints preservaram zero diferenças fora das máscaras. Separação pelo
Workbench com RGBA nativo, sem reduzir imagens ou repetir frames. Fontes,
máscaras, recibos e capturas ficam no pacote local `Personalizacao-96-v4`, fora
do Git. O repositório contém160 texturas referenciadas, catálogo, rigs,
compositor, controles e testes; não contém requests/base64 ou credenciais.

## Biblioteca, custo e desempenho

`appearance-catalog.json` registra modelos, paletas, IDs e origem;
`appearance-rig.json` registra os contatos. As20 folhas finais estão na pasta
**Jade Dragon** do PixelLab, com IDs no catálogo:512×256, células128, colunas
sul/norte/oeste/leste, linhas masculino/feminino. Os rostos dessas folhas são
os originais limpos. Não promover os estudos generativos de face rejeitados.

Lote inicial de20 jobs simultâneos:180 gerações. Atlas de correção do estudo
de rosto:9. Medição dos336 frames:33,6. Total confirmado desta etapa:
**222,6 gerações**. Os estudos de face foram posteriormente descartados conforme
a revisão do proprietário. Cópia dos traços originais, extrações, paletas,
montagem, calibração e20 exportações finais não consumiram gerações.

Não há uma geração por classe, facção, cor ou combinação. Caches limitados a
32 imagens,32 materiais e64 composições. Build com allowlist e caminhos relativos.

## Validação e pendências

O navegador percorre6.880 combinações individuais e688 poses com conjuntos
completos. Verifica bordas, prioridade rosto/cabelo, geometria facial, caches,
mobile, erros e save intocado. Isso não substitui a avaliação artística nem
comprova ausência de toda interpenetração entre combinações.

**Faltam Idle nas quatro direções e caminhada norte/oeste/leste dos corpos
novos.** As opções aparecem como pendentes, sem simulação por pose estática.
O contrato de célula/pivô/escala e os materiais permanecem compatíveis: completar
os movimentos não exige refazer roupas/cabelos, mas exige medir e revisar os
frames novos. Essas faltas impedem a migração completa na aventura normal.
Conforme o proprietário, estabilizar/aprovar esta composição antes de avançar
para os movimentos restantes.

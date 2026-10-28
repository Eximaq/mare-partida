# Continuidade — Paper Doll e calças

Estado de 28/10/2026, PR #134. **A calça completa não está pronta nem ativada no
jogo normal.** Esta entrega consolida a infraestrutura validada e deixa fontes,
prévia parcial e falhas identificadas para o próximo desenvolvedor.

## O que está funcional

- Um corpo compartilhado entre sete classes e quatro facções; as classes
  escolhem movimentos/armas. Personagem, inventário e saves v1 são preservados.
- Catálogo por IDs, 15 slots, bindings por equipamento, bundles atômicos,
  profundidade por direção, cache e fallback de peças opcionais.
- `legs` mapeia para `pants`. Item existente **22: Calças da Maré Alta**;
  não criar outro item nem alterar índices ou atributos.
- Na bancada, equipar/remover o item 22 seleciona/remove a camada candidata
  imediatamente. Isso não escreve no save nem habilita a peça em produção.

## Arte entregue e limites

Pasta `pixellab-pip-generations/paper-doll-trousers-20261028/`:

| Arte | Cobertura | Estado |
| --- | --- | --- |
| `references/` | Quatro vistas estáticas | PNGs nativos de calça e composições; sem aprovação de animação |
| `trousers-idle.png` | 4 frames × oeste/leste | Candidatas de inspeção |
| `trousers-walk.png` | 8 frames × oeste/leste | Candidatas de inspeção |
| `layers/`, `layer-masks/` | 24 células nativas | Pixels extraídos dos retornos, sem pintura ou deformação |
| `transfers/` | 105 retornos brutos | Preservados; não equivalem a 105 frames aprovados |

São **24 candidatas de locomoção**, não uma peça aprovada. Faltam ou não foram
aprovados **216 dos 240 frames** necessários: sul/norte e ataques completos.
Os primeiros três frames de ataques em alguns lotes não completam um clipe;
não foram duplicados nem usados para simular os oito frames exigidos.

Contrato: entrada 64×64, pivô 32/52; restaurar 84×84 somente com padding
esquerda 10, topo 13, direita 10, baixo 7; pivô final 42/65. As folhas novas
têm **duas linhas, nesta ordem: west, east**. FPS/loop/rootOffsets vêm do rig
existente. A calça usa profundidade 30, acima do corpo 20 e abaixo do torso.

## Por que a produção parou

`inpaint_image_pro_flash` manteve os pixels protegidos nas quatro referências.
O `transfer_outfit` não foi consistente ao vestir os movimentos:

| Lote | Direção / conteúdo | Resultado |
| --- | --- | --- |
| 0 | Sul, Idle/Walk/início da espada | Corte mais largo e acabamento variável; estudo, não aprovação |
| 1 | Sul, espada/socos/início do disparo | Vários frames mantiveram a bermuda original |
| 4 | Norte, Idle/Walk/início da espada | Bermuda original, sem cobertura longa das pernas |
| 8 | Oeste, Idle/Walk/início da espada | Locomoção aproveitada para estudo regional |
| 9 | Oeste, espada/socos/início do disparo | A postura das pernas foi alterada |
| 12 | Leste, Idle/Walk/início da espada | Locomoção aproveitada para estudo regional |
| 13 | Leste, espada/socos/início do disparo | Alguns ataques ficaram frontais ou mudaram a postura |

As fontes de referência e de transferência são os mesmos corpos, conferidos
pixel a pixel. O problema não foi troca de personagem. Restaram **nove lotes
não enviados**: 2, 3, 5, 6, 7, 10, 11, 14, 15. Não houve retry nem reparo pintado.

`material-coverage.json` mostra a verificação de tecido onde as referências
exigem cobertura. `audit_material_coverage` em `tools/paper_doll_fit_audit.py`
reprova pele/bermuda devolvida como se fosse calça. Essa métrica **não aprova
postura, movimento ou qualidade artística**; a inspeção visual continua obrigatória.

## Custos e rastreabilidade

- Esta rodada: 4 referências × 5 + 7 transferências × 10 = **90 gerações confirmadas**.
- Acumulado destas etapas: **136 confirmadas**, mais reserva de 1 da antiga
  submissão óculos/oeste sem job ou recibo: comprometimento conservador **137**.
- Teto geral 840, teto da rodada 420; valores não consumidos não autorizam
  repetir chamadas, mudar de rota ou gerar as peças restantes automaticamente.
- `result-summary.json`: recibos por job, resultados e lotes não enviados.
- `source-contract.json`: hashes, recorte, ordem de poses e mapa dos inputs.
- `trousers-production.blueprint.json`: argumentos literais, prompts e fontes.
  É receita de auditoria, **não** autorização de replay. Há retornos reprovados.

Ledgers privados, requests com base64 e capturas de teste não entram no Git.
Os originais e arquivos de montagem locais foram preservados.

## Como conferir

1. `python tools/build_pages.py`; servir o `dist` por HTTP.
2. Abrir `tools/paper-doll-inspector/index.html?pack=trousers`.
3. Selecionar oeste/leste e Idle/Walk; em **Calças**, escolher a candidata do
   item 22. Remover em **Sem equipamento** para comparar.
4. Testar classes, facções, reprodução, frame e visibilidade da camada. Sul,
   norte e ataque não representam cobertura modular entregue.

`review-pack.json` é um estudo parcial com `productionEnabled:false`,
`full_character_artwork_approved:false`, peças `approved:false`. Não há registro
desse pacote nos overrides de combate. O build exporta somente o manifesto e
os PNGs que ele referencia; não exporta raw transfers, máscaras ou ledgers.

## Próximos passos para o colaborador

1. Avaliar as 24 candidatas; não presumir aprovação por terem passado no
   compositor. Conferir especialmente cuffs/tornozelos, cintura e paleta.
2. Escolher uma produção que preserve os corpos existentes. Edição mascarada
   de atlas nativo é uma hipótese a testar em lote pequeno, não foi executada.
   Não repetir `transfer_outfit` em massa sem resolver as falhas observadas.
3. Completar as quatro direções e as seis categorias de ataque reutilizadas.
   Estrategista/Suporte compartilham foco; não gerar personagens por facção.
4. Após aprovação visual, acrescentar a peça completa ao catálogo de produção
   e o binding `legs.items[22]`, mantendo o fallback para os demais itens.
   Não ativar esta folha parcial nem contornar `compatible`/flags de aprovação.
5. Validar combate real, sete classes, equipar/retirar, Zoan/retorno humano,
   save/reload, desktop/mobile e carregamento/cache antes de lançar a arte.

## Testes e CI

- `paper-doll-trousers-review.test.cjs`: sete classes, 24 poses, equipar/remover,
  item diferente, bloqueio de produção/Zoan e estado imutável.
- `paper_doll_trousers_art_test.py`: PNGs reais, pixels gerados preservados,
  transparência, padding e ausência explícita de ações/direções não produzidas.
- `paper_doll_material_coverage_test.py`: pele e pequenos repaints não passam
  como tecido; região exigida vazia não pode passar.
- Dois testes de navegador antigos precisavam adaptação aos monstros fixos e
  neutros da main: Dawn agora seleciona o chefe antes de esperar o aviso; a
  fixture Paper Doll revive e ancora seu alvo antes de cada caso. Não foi
  alterada a lógica de combate do jogo nem removida a asserção de telegraph.
  `paper-doll-combat-fixture.test.cjs` exercita a fixture real com um alvo morto.

Consultar o resultado do CI no PR/commit de integração; testes locais não
substituem a execução dos checks remotos nem a aprovação artística da calça.

Verificação local desta entrega: 103 suites Node sem falhas; 29 testes Python
aprovados; build estático aprovado. Na bancada real, 168 verificações de frame
(24 poses × sete classes), equipar/remover e viewport de 390×844 sem overflow
horizontal. Essa cobertura técnica não aprova artisticamente a peça parcial.

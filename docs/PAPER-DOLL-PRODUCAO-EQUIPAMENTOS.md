# Produção de equipamentos — referências de 28/10/2026

O proprietário retomou a execução automática do plano de dez peças, com teto
de 840 gerações e sem tentativas extras. A inspeção das referências bloqueou os
lotes de animação. **O conjunto visual completo ainda não está pronto.**

## Rodada inicial de referências

- 36 imagens entregues por `edit_image_pixen`, com recibos de 1 geração cada:
  **36 gerações confirmadas**.
- Uma submissão de óculos/oeste retornou erro de banco no serviço, sem job ID
  ou recibo. Cobrança desconhecida; reserva conservadora de 1 geração.
- Comprometimento contabilizado: 37, dos quais 36 confirmados. O erro não é
  prova de gratuidade ou reembolso. Não houve retry.
- O anel foi reprovado no primeiro sul; suas outras três direções não foram
  solicitadas. Nenhuma das 32 transferências propostas foi enviada.
- Nove extrações **estáticas e não aprovadas**, somente do sul. Não são
  animações nem peças prontas para equipar. Nas calças e botas, cinco pixels
  que a edição apagaria foram mantidos do corpo original; isso é exposto na
  prévia e exige revisão artística.

## Inspeção da rodada inicial por peça

| Peça | Bloqueio do conjunto direcional |
| --- | --- |
| Calças | Oeste e leste viraram para a frente. Boné adicional no sul foi excluído da extração. |
| Botas | Oeste virou para a frente; pares ainda precisam de encaixes por pose. |
| Luvas | Oeste virou para a frente; extensão no antebraço diverge da luva sem dedos proposta. |
| Capa | Sul e laterais aproveitáveis como estudos; norte deixou o centro das costas aberto e não manteve a construção esperada. |
| Boné | Oeste frontal; norte manteve aba/emblema frontais. |
| Óculos | Oeste sem resultado; norte desenhou lentes através da cabeça, onde deveriam ficar ocluídas. |
| Medalhão | Aparece nas costas no norte; laterais viraram para a frente. |
| Cinto | Laterais frontais e fivela visível nas costas. |
| Anel | Argola grande fora da mão; caminho dependente interrompido. |
| Bússola | Oeste frontal e muito maior; leste também mudou a escala. |

O defeito está nos resultados das edições, comparados com as entradas corretas
de perfil. Não foi encontrada necessidade de mudar o compositor ou os movimentos
do personagem para contornar essas referências.

## Piloto de correção com máscara — autorizado e executado

O proprietário autorizou duas chamadas `inpaint_image_pro_flash`, teto de 10
gerações, oeste primeiro e leste condicionada ao encaixe da primeira. Ambas
foram entregues e cobradas em 5 gerações cada: **10 nesta etapa, 46 confirmadas
no acumulado**, mais a reserva desconhecida de 1 da submissão anterior.
Comprometimento conservador acumulado: **47**, dentro do teto geral de 840.

As máscaras aprovadas tinham 91 pixels no oeste e 104 no leste. As saídas
nativas 64×64 contêm somente a calça, com transparência fora da máscara.
Compostas sobre as entradas originais, preservaram o perfil, a anatomia e a
pose. Nenhum pixel protegido foi alterado; nenhuma escala, pintura corretiva,
mudança de animação ou nova geração foi aplicada depois do retorno.

| Vista | Pixels visíveis da camada | Fora da máscara | Corpo protegido alterado | Cobrança |
| --- | ---: | ---: | ---: | ---: |
| Oeste | 91 | 0 | 0 | 5 |
| Leste | 96 | 0 | 0 | 5 |

As duas referências passaram no encaixe **estático**. Não demonstram movimento,
continuidade de tecido, harmonia de paleta com sul/norte ou cobertura das sete
classes. Permanecem `approved:false` e fora do runtime. A prévia agora mostra
o bruto Pixen reprovado no centro e a correção mascarada à direita.

Fontes, máscaras, originais, auditorias e receita literal ficam em
`pixellab-pip-generations/paper-doll-wardrobe-masked-20261028/`.
`result-summary.json` registra escopo, recibos e limites. A receita
`masked-trousers.blueprint.json` contém os prompts exatos em inglês, fontes,
máscaras, seed e parâmetros efetivamente usados; não autoriza replay.
O prompt pede somente calças náuticas na região mascarada, mantendo o perfil
esquerdo/direito, silhueta das pernas, pés descalços e mãos à frente do tecido,
sem acessórios, pose nova ou anatomia adicional.

Verificação do piloto: 101 suítes Node e 25 testes Python passaram, incluindo
os dois testes novos dos arquivos reais. A comparação oeste/leste e o isolamento
da camada foram conferidos no navegador, sem erros no console; largura mobile
390×844 sem overflow da página. Build e diff check passaram, com as duas pastas
de drafts excluídas do `dist`. Não houve alteração do runtime ou dos saves.

## Arquivos de revisão

Pasta: `pixellab-pip-generations/paper-doll-wardrobe-auto-20261028/`.

- `preview.html`: comparação interativa do corpo, retorno bruto e extração;
  direção, ampliação inteira, pivô e isolamento da camada. Servir por HTTP a
  partir da raiz do projeto; o guia não depende de uma sessão PixelLab.
- `review-data.json`: cobertura, defeitos, custos informados e flags obrigatórias
  `approved:false`, `productionEnabled:false`, `complete:false`.
- `originals/`: os 36 PNGs entregues, preservados sem modificações.
- `source/`: quatro corpos nativos recortados das margens, sem escala.
- `masks/` e `candidates/`: máscaras e derivações de inspeção; originais preservados.
- `wardrobe-references.blueprint.json`: argumentos literais usados, incluindo
  prompts em inglês, fontes e seed. Possuir o arquivo não autoriza replay.
  A submissão sem identificador está explicitamente identificada na receita.

As descrições seguem o molde aprovado: adicionar somente a peça na região
indicada, preservando corpo, pose, pixels restantes, transparência e estilo.
O guia manual contém a tradução e a lista de peças. Os resultados mostram que
"supplied facing" não bastou para preservar os perfis em várias edições.

`tools/paper_doll_fit_audit.py` reaproveita a extração existente por máscara;
agora também recusa saídas já existentes ou caminhos iguais e grava flags
explícitas de não aprovação. A auditoria estrita da edição bruta continua
reprovando mudanças fora da região. Um rascunho recomposto não aprova o bruto.

## Continuação necessária

1. Comparar material, cintura e recorte das quatro vistas da calça. O piloto
   mascarado resolveu a virada dos perfis nesta pose; isso não libera as
   transferências nem autoriza corrigir outras peças.
2. Corrigir as demais referências de geometria, escala e oclusão em lotes
   pequenos com autorização correspondente. Não promover as vistas sul como
   conjuntos completos. O piloto de 10 gerações foi integralmente consumido.
3. Somente com referências coerentes, transferir calça/capa para as 240 poses
   existentes; medir sockets e oclusões das peças rígidas.
4. Inspecionar Idle/Walk/Attack nas quatro direções e sete classes, então integrar
   bindings dos itens existentes e testar equipar/retirar, Zoan e save/reload.

O jogo mantém os assets, equipamentos, saves e animações aprovados anteriormente.
Não foram criados itens nem alteradas regras de combate. Esta galeria de drafts
fica fora do build de produção; não houve merge nem publicação no Pages.

## Verificação da rodada inicial

- 101 suítes Node autônomas, zero falhas; `supa-browser.test.cjs` depende de
  ambiente E2E próprio e não faz parte dessa execução.
- 23 testes Python: auditoria de encaixe, extração regional, lotes, preparação
  de entradas e dependências Pages. O novo teste observou as falhas antes da
  implementação da proteção de arquivos e das flags explícitas de draft.
- `python tools/build_pages.py` e `git diff --check` passaram. Confirmada a
  ausência desta pasta de drafts no `dist`.
- As nove camadas iniciais foram verificadas pixel a pixel: somente pixels originais gerados
  dentro da máscara, corpo preservado fora dela e padding 84×84 sem escala.
- Navegador real: comparação sul/oeste, isolamento de boné, pivô, seleção de
  capa/norte e estado sem job dos óculos/oeste; sem erros de console. Mobile
  390×844 sem overflow horizontal da página, navegação de peças com scroll próprio.

Essa verificação aprova a ferramenta de inspeção e a preservação dos arquivos,
**não** a qualidade final do guarda-roupa nem sua cobertura animada.

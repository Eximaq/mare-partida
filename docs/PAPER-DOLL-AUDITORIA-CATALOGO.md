# Paper Doll — auditoria de catálogo e expansão

Auditoria de 27/10/2026. Base: `origin/main` em `68533046e8ddf104c24c896d06ce15015a89af0d`, merge do [PR #131](https://github.com/Eximaq/mare-partida/pull/131). Branch de trabalho: `feature/paper-doll-catalog-audit`.

**Conclusão:** o personagem modular já está integrado à aventura normal; o catálogo cosmético ainda não é expansível por dados. Existe um cabelo e uma roupa efetivos. É possível ampliar o catálogo sem substituir o compositor, reconstruir o corpo ou migrar o schema de aparência. As três opções propostas abaixo precisam de arte adaptada: os arquivos históricos não entregam três alternativas prontas e compatíveis.

Esta entrega contém somente o relatório. Nenhum arquivo de runtime, sprite, item, save ou atributo foi alterado. Nenhuma chamada de geração, edição, transferência ou animação PixelLab foi executada. Não há autorização implícita de produção artística ou merge neste documento.

## 1. Estado atual, confirmado no código

| Área | Estado no PR #131 | Limite encontrado |
| --- | --- | --- |
| Aventura normal | Carrega `player-pack.json`; compositor com `allowDraft:false` | Pacote precisa estar integralmente aprovado e disponível |
| Identidade | Mesmo corpo/cabelo/roupa entre sete classes e quatro facções | Não existem quatro conjuntos de roupas de facção publicados |
| Criação e editor | Escolhas persistentes e prévia Idle/Walk/Attack nas quatro direções | Criação repete as opções fixas em HTML |
| Cabelo | `short-black` usa a peça atual; `bald` a oculta | Uma aparência real, mais ausência de cabelo |
| Roupa | `navy` usa a roupa atual; `base` a oculta quando não há torso equipado | Uma aparência real, mais ausência de roupa |
| Equipamentos | Bindings exatos conhecidos; demais itens usam representação disponível da categoria | Aparência genérica não significa arte exclusiva do item |
| Sabre de Coral, `def:1` | Usa a espada padrão da categoria | Não possui binding no manifesto de produção |
| Transformações | Zoan impede composição humana no mundo; editor mostra cópia humana | Nova aparência não deve modificar a transformação |
| Saves | `paperDollLook: {version:1, hair, outfit}`; saves sem campo usam padrões | IDs desconhecidos são apresentados como padrão pelo leitor atual |
| Habilidades/reação | Reutilizam gestos existentes; estados sem sequência própria podem usar repouso da mesma identidade | Não são novas animações autorais de cada habilidade, hurt ou death |

Fontes: [`paper-doll-look.js`](../paper-doll-look.js), especialmente `defaults`, `choices`, `read`, `apply`, `hidden`; [`paper-doll-review.js`](../paper-doll-review.js), `playerAppearance`, carregamento e `draw`; [`game.js`](../game.js), criação, editor e persistência; [`index.html`](../index.html), seletores da criação. O comportamento de lançamento está descrito em [`PAPER-DOLL-JOGO-NORMAL.md`](PAPER-DOLL-JOGO-NORMAL.md); as notas antigas de protótipo não substituem esse estado.

### Peças efetivas do lançamento

O manifesto [`player-pack.json`](../pixellab-pip-generations/paper-doll-complete-20261026/player-pack.json) contém **nove peças aprovadas**:

| ID | Uso e reaproveitamento seguro |
| --- | --- |
| `complete-body` | Corpo comum; conservar todos os pixels, tempos e pivôs |
| `complete-hair` | Cabelo preto atual; referências de encaixe, máscaras e sockets |
| `complete-outfit` | Colete azul/linho; referências de cobertura, mangas e profundidade |
| `complete-sword` | Espada padrão; quatro vistas rígidas de locomoção e ataque em atlas |
| `complete-firearm` | Mosquete; arma rígida, sockets e emissão existentes |
| `complete-daggers` | Adagas; attachments por mão e sockets secundários |
| `complete-tech` | Arma tecnológica; attachment e emissão |
| `complete-compass` | Foco do Estrategista; attachment e emissão |
| `complete-staff` | Foco do Suporte; attachment e emissão |

Bindings de produção: armas `0`, `4`, `12`, `14`, `16`, `31` para as seis armas acima; torso `6` para `complete-outfit`. Não há bindings reais de produção para Sabre `1`, Casaco da Bruma `7`, cabeça, botas, pernas, capa ou luvas. Os IDs `prototype-sabre`, `human-weapon-1` e semelhantes de [`paper-doll-assets.js`](../paper-doll-assets.js) / manifestos antigos são declarações de catálogo, não PNGs utilizáveis.

O resolvedor possui uma exceção específica de classe para escolher `complete-staff` no Suporte. Uma expansão por dados deve mover essa preferência para o perfil da classe; não acrescentar novas exceções por item.

## 2. Geometria e cobertura verificadas

Contrato preservado: `human-v1`, canvas **84×84**, pivô **42/65**, escala atual `70/46`, quatro direções. Existem fontes nativas 64×64, com padding transparente 10/13. A medição de alpha confirmou que todos os frames de corpo, cabelo em atlas e roupa do lançamento cabem nessa janela 64×64. Retirar apenas essas margens e restaurá-las depois não requer escala. Uma peça nova que ultrapasse a janela precisa de orçamento e validação próprios; não poderá ser cortada para caber.

| Animação | Frames por direção | Poses nas quatro direções |
| --- | ---: | ---: |
| Idle | 4 | 16 |
| Walk | 8 | 32 |
| Attack por categoria | 8 | 32 |
| Seis categorias de ataque | 8 cada | 192 |
| Total comum às sete classes | — | **240** |

Um Espadachim isolado exige **80 poses**; o conjunto comum às sete classes exige 240. As facções não multiplicam essas contagens. Estrategista e Suporte compartilham `attack-focus`.

**Reutilização comprovada por RGBA:** `attack-tech` e `attack-firearm` têm corpo e roupa idênticos nas quatro direções. Há **208 imagens distintas de corpo** nas 240 posições lógicas; os 32 frames de tecnologia podem compartilhar a roupa correspondente ao disparo, sem nova geração.

**Cabelo:** Idle, Walk e espada usam atlas; os outros cinco ataques usam attachments. As 16 URLs de fontes rígidas representam apenas quatro imagens RGBA diferentes, uma por direção. Porém, retirando apenas a translação, o cabelo atual apresenta **12 desenhos RGBA normalizados distintos por direção**: quatro de Idle e oito de Walk. Essa contagem inclui diferenças de contorno e/ou cor, não demonstra 12 geometrias anatômicas diferentes. O desenho normalizado do ataque de espada coincide com Idle/frame 0. Isso demonstra reaproveitamento no cabelo atual, mas não prova que um topete novo encaixe em todos esses frames. Não é correto prometer uma nova opção completa com apenas quatro imagens estáticas.

**Espada:** Idle e Walk usam attachments rígidos. O ataque usa atlas de oito frames por direção, ajustes por pose nos lados e profundidade traseira ao norte. Os frames norte **1–5, índices a partir de zero**, estão declarados como totalmente ocultos. Das 32 células do ataque, 27 contêm pixels; há 26 conteúdos RGBA distintos. Para orçamento conservador, considerar 27 imagens visíveis, preservando as cinco células transparentes e seus tempos. Não tornar essas células visíveis para “completar” a espada.

Essas verificações usam pixels existentes, metadados e inspeção visual; não foram produzidos novos sprites. Uma folha de contato que omite attachments não representa o personagem final: a conferência de composição foi feita também no renderizador real.

## 3. Inventário dos estudos existentes

Foram inspecionados os 22 `review-pack.json` locais abaixo, suas fontes e a relação com o lançamento. Seus estados de revisão permanecem sem aprovação. Arquivos idênticos reutilizados no lançamento não tornam o pacote histórico inteiro aprovado.

| Família / diretórios sob `pixellab-pip-generations/` | O que pode ser aproveitado | O que não é alternativa pronta |
| --- | --- | --- |
| `paper-doll-complete-20261026` | Nove peças e contrato do lançamento | Seu `review-pack.json` continua separado de produção |
| `paper-doll-navy-starter-20261023` | Fontes de cabelo/roupa e espada usadas no conjunto atual | Mesmo visual azul/preto, não segunda roupa/cabelo |
| `paper-doll-gunner-20261025`, `paper-doll-rogue-20261025`, `paper-doll-unarmed-combat-20261024` | Gestos, roupas ajustadas, armas e sockets incorporados ao conjunto | Variações de ação do mesmo personagem |
| `paper-doll-category-attacks-20261023` | Referência de ataque e cabelo rígido | Cobertura histórica parcial; não opção nova |
| `paper-doll-hair-continuity-20261022` | Atlas Idle/Walk/espada já presentes no lançamento | Mesmo cabelo; não novo penteado |
| `paper-doll-body-continuity-20261022` | Corpo e geometria de referência | Não contém cabelo ou roupa novos |
| `paper-doll-basic-sword-20261021`, `paper-doll-expansion-20261021` | Locomoção e referências do visual azul | Ataque/encaixes antigos não substituem correções posteriores |
| `paper-doll-north-finish-20261021`, `paper-doll-walk-fit-20261021`, `paper-doll-walk-north-20261021`, `paper-doll-walk-profiles-20261021` | Fontes de locomoção; vários atlas são exatamente os atuais | Não são quatro novos estilos de roupa/cabelo |
| `paper-doll-human-idle-south-20261021`, `paper-doll-hair-outfit-20261021` | Estudos frontais, espada e referências estáticas | Cobertura insuficiente para uma alternativa utilizável |
| `paper-doll-bento-directions-20261021`, `paper-doll-bento-motion-20261021`, `paper-doll-bento-skeleton-20261021`, `paper-doll-bento-repair-20261022`, `paper-doll-east-fit-20261022`, `paper-doll-exact-retouch-20261022` | Colete vermelho, bandana, calças/botas e espada antigos como referências de desenho; espada lateral já incorporada onde compatível | Corpo vestido, silhueta e geometria de Bento diferentes. Calças/botas/cabelo/roupa não encaixam automaticamente no humano atual |

Também foram verificados o diretório de fontes `paper-doll-final-categories-20261026`, os manifestos de catálogo e o ícone [`assets/ui/items-pixellab/1.png`](../assets/ui/items-pixellab/1.png). O ícone do Sabre é referência de identidade, não uma arma animada para segurar na mão. Sprites completos de facções, retratos, ícones e VFX não contam como camadas modulares.

Na galeria PixelLab, a consulta de metadados percorreu todos os 58 resultados de `hair` e 40 de `coat`; as buscas se sobrepõem e incluem prompts negativos, ícones e personagens completos. A busca `sabre` não retornou imagem. Essa classificação complementa o inventário local; não afirma inspeção visual integral dos 402 registros da conta. Nenhum resultado adicional foi identificado como conjunto alternativo completo e aprovado. Não há justificativa para regenerar o corpo ou as animações-base.

## 4. Achados a resolver antes da expansão

| Prioridade | Evidência | Consequência e ação proposta |
| --- | --- | --- |
| Alta | `paper-doll-look.js:4–20`; `paper-doll-review.js:24–43` | IDs atuais só controlam ocultação. Resolver IDs de opções para IDs de peças reais antes de ampliar a lista |
| Alta | Torso equipado tem prioridade; criação equipa `def:6` | Uma roupa nova apenas como padrão ficaria escondida para grande parte dos jogadores. Definir a política cosmética sem retirar equipamento nem alterar atributos |
| Alta | `tools/build_pages.py:473–487` usa arquivos do manifesto de revisão para exportar também o lançamento | Uma peça adicionada somente ao manifesto de produção pode faltar no Pages. Exportar por allowlist explícita das dependências aprovadas e testar igualdade local/dist |
| Alta | Validação inicial resolve a aparência padrão e armas por categoria | Novas peças alternativas precisam de verificação de cobertura própria. Apenas `approved:true` não prova que todos os frames encaixam |
| Média | Opções repetidas em `index.html:232` e `paper-doll-look.js` | Criação/editor podem divergir. Ambos devem consumir o mesmo registro |
| Média | `read` troca IDs não reconhecidos por padrões; `apply` grava a seleção normalizada | Preservar escolhas conhecidas temporariamente indisponíveis e evitar regravação silenciosa por falha de imagem |
| Média | Loader decodifica o pacote inteiro, seis imagens simultâneas; cache global de imagens mantém referências | Catálogo maior aumenta memória e primeira carga mesmo sem selecionar as novas peças |
| Média | Ataque da espada possui offsets e oclusões por pose | Nova lâmina não pode receber uma rotação genérica para todas as poses |
| Baixa | Editor mobile empilha prévia antes dos seletores | No viewport 390×844, controles inferiores exigem rolagem. Antes de muitas opções, prever lista compacta, amostras e resumo da seleção, mantendo o tema náutico |

O pacote atual referencia **59 PNGs**, somando **217.350 bytes** de arquivos e aproximadamente **14,85 MiB RGBA decodificados**. É uma estimativa por dimensões, sem overhead/GPU, não uma medição de heap. O cache de composições de 4 MiB/96 entradas em `paper-doll.js` não limita esse conjunto de imagens decodificadas.

## 5. Arquitetura recomendada — proposta, não implementada

1. Criar um registro único de opções, com `id`, rótulo, slot, `pieceId`, `rigId`, revisão, estado de aprovação, cobertura exigida e fallback. Criador, editor, prévia, inventário, retrato e mundo consultam o mesmo resolvedor de aparência. Não há `if` novo para cada penteado/item.
2. Separar definição da opção de prontidão da imagem. A opção é conhecida pelo catálogo, mas somente fica selecionável após aprovação e verificação de cobertura. Drafts continuam fora do registro de produção.
3. Resolver na ordem: perfil humano → aparência cosmética conhecida → política de equipamento por dados → pose/camadas. Preservar corpo, animação, relógio de impacto, `rootOffsets`, pivôs e compositor existentes. Mover preferências de arma da classe para dados, incluindo o foco do Suporte.
4. Guardar apenas IDs: manter `{version:1, hair:'...', outfit:'...'}`. Adicionar valores permitidos não muda a estrutura e não exige migração de schema, chave de save ou reset. IDs antigos `short-black`, `bald`, `navy`, `base` permanecem com seus significados.
5. Validar estrutura/IDs sem aceitar URLs, caminho de arquivo ou flags de aprovação vindos do save. Save antigo sem campo continua usando os padrões por leitura. ID conhecido cuja imagem falhou permanece guardado; renderizar uma aparência aprovada de segurança e informar a falha sem sobrescrever a escolha. Para IDs inválidos, continuar fallback seguro; não aceitar conteúdo arbitrário para “compatibilidade”. Cliente antigo não terá como exibir um ID que desconhece: esse limite deve ser testado, não tratado como migração automática.
6. Para o piloto, propor por dados que a nova roupa seja permitida sem torso e como variante cosmética do torso inicial `def:6`; demais equipamentos mantêm a política atual. Essa decisão precisa da avaliação do proprietário antes da implementação. Alternativa conservadora: manter toda roupa como base sob equipamento, deixando a limitação explícita na UI. Nenhuma opção deve desequipar o jogador para ficar visível.
7. Sabre: adicionar binding exato `weapon.items[1] → peça aprovada do Sabre`. A aparência decorre do item existente; não exige item, atributo ou campo de skin de arma no save nesta fase.
8. Ampliar carregamento por dependências da seleção, mantendo imagem compartilhada/cache, seis decodes concorrentes e fallback atômico. Troca cosmética só é aplicada após a peça estar pronta; não publicar opção parcialmente carregada. Cada combinação de ID/revisão/pose precisa conservar a separação do cache atual.
9. Validar cada opção em todas as suas poses antes de liberá-la; gerar allowlist do build a partir dos manifests aprovados. O limite atual de 64 peças é uma barreira de segurança, não um mecanismo de paginação: o piloto cabe nele sem removê-lo.

## 6. Três opções propostas

São conceitos para avaliação, **sem imagens novas produzidas**.

| Opção | Direção artística | Reutilizar | Necessidade real |
| --- | --- | --- | --- |
| Cabelo `copper-quiff` — Topete Cobre | Topete curto penteado para trás, laterais baixas, cobre escuro; silhueta diferente do cabelo preto atual. Sem bandana, sem esconder olhos | Corpo, referência de couro cabeludo, trilhas de sockets e profundidade | Novo cabelo ajustado a Idle/Walk/espada. Quatro fontes rígidas podem atender os demais ataques apenas após inspeção; não servem automaticamente para toda locomoção |
| Roupa `deck-rust` — Colete de Convés | Colete curto ferrugem, camisa de linho marfim com mangas dobradas, alça diagonal discreta e fecho de latão; calças e anatomia atuais | Movimento, corpo, máscaras de torso/braços, profundidade e referência vermelha de Bento | Novos frames articulados. Não usar attachment rígido para simular mangas/torso. A referência de Bento orienta o desenho, não fornece a geometria final |
| Arma `coral-sabre` — Sabre de Coral | Lâmina recurva clara, detalhes coral alaranjados/vermelhos e guarda de latão coerentes com o ícone existente | Item `def:1`, ícone, quatro sockets de locomoção, pivôs/offsets e oclusão do ataque | Quatro vistas de arma para Idle/Walk; nova lâmina nos 27 frames visíveis do ataque. Manter cinco células norte transparentes. Não redesenhar braços |

As outras cinco armas do conjunto permanecem intactas. O Sabre só se aplica ao equipamento compatível do Espadachim; cabelo e roupa devem cobrir as sete classes antes de entrar na aventura normal.

### Quantidades de produção e dependências

| Peça | Cobertura funcional | Imagens a produzir, plano conservador | Arquivos de runtime estimados |
| --- | --- | ---: | ---: |
| Cabelo | 240 poses lógicas | 80 células de atlas (Idle 16 + Walk 32 + espada 32) + 4 fontes rígidas = **84** | 3 atlas + 4 fontes = **7** |
| Roupa | 240 poses lógicas | **208** frames ajustados; compartilhar os 32 de tecnologia/disparo já comprovadamente iguais | **7** atlas; tecnologia referencia o de disparo |
| Sabre | 80 poses do Espadachim | 4 vistas rígidas + 27 células de ataque = **31** | 4 fontes + 1 atlas = **5** |
| Total | Sem multiplicação por facção | **323 imagens/células de trabalho** | Até **19 PNGs** novos |

Os 323 não são 323 arquivos finais nem 323 animações novas. É uma contagem conservadora de saídas de edição individual, antes de deduplicação aprovada. Os três primeiros testes de encaixe já fazem parte dela; não somar novamente.

Possível economia de cabelo: as 48 formas normalizadas existentes sugerem reduzir de 84 para **48 desenhos ajustados**, reaproveitando a vista inicial nos ataques onde encaixar. Isso reduziria a previsão total para 287 saídas. É uma hipótese de produção condicionada à geometria do novo topete, não um desconto garantido. Não reaproveitar por semelhança de nome ou apenas por direção.

Sockets de cabelo devem seguir a cabeça; da espada, a mão. O pivô do corpo não substitui medição de cabeça/mão quando o desenho muda. Preservar todas as coordenadas, âncoras, offsets por pose e `rootOffsets` aplicáveis; ajustar somente o encaixe da nova peça após inspeção. Não espelhar sprites, deformar anatomia ou inventar frames intermediários. Sobreposição com antebraço, nuca, orelha, guarda e roupa precisa ser conferida individualmente. A alça não pode cobrir mão/cabelo; a espada não pode reaparecer atravessando o torso ao norte.

O orçamento acima não inclui cabelo comprido, capa, novo corpo, capacete ou animações extras. Essas escolhas mudariam oclusões e cobertura. O contrato de 84×84 permanece; eventual arte que exceda o espaço exige nova análise.

## 7. Estimativa PixelLab, sem consumo

Valores consultados nos metadados atuais do MCP PixelLab em 27/10/2026. “Gerações” são unidades da assinatura; não há conversão confirmada para um preço em reais/dólares. A [especificação oficial da API](https://api.pixellab.ai/v2/openapi.json) é referência de integração; os limites do MCP foram conferidos separadamente.

| Rota | Valor unitário consultado | Aplicação e limite da estimativa |
| --- | --- | --- |
| `edit_image_pixen` | **1 geração por chamada**, documentado | Uma imagem por edição. Preservação de corpo e continuidade ainda exigem inspeção; resultado composto não é uma camada garantida |
| `transfer_outfit` | **10–25 por chamada/grid**, faixa documentada | Em 64×64 aceita até 15 frames + referência; em 84×84, apenas 3 frames. Precisa do mesmo corpo vestido como referência e devolve composição |
| `inpaint_image_pro_flash` em 64×64 | **5 por imagem**, cotação retornada como **provisória** | Máscara binária e saída de mudanças em camada. Recotar antes de eventual uso; não apresentar como preço fixo |

**Previsão econômica, não autorização:** pela edição Pixen individual, até 323 chamadas do plano conservador correspondem nominalmente a **323 gerações**, sem retries. A opção reduzida de cabelo levaria a 287 somente se o teste demonstrar o reaproveitamento. Esses totais não garantem que todas as imagens serão aprovadas na primeira tentativa.

Como comparação: para a roupa completa, 208 frames divididos por direção resultam em 52 por direção. Com uma referência específica por direção e grupos de até 15, seriam 16 transferências, mais quatro referências de roupa: **164–404 gerações** pela combinação Pixen + transferência. Pode melhorar continuidade entre frames, mas não é a rota mais barata assegurada e ainda pode alterar anatomia. Se a peça não couber em 64×64, essa conta deixa de valer. Não executar uma rota alternativa automaticamente após falha.

**Sequência de pequenos lotes recomendada:**

1. Após aprovar conceito e orçamento do teste: apenas **3 edições frontais de encaixe** (cabelo, roupa, Sabre), previsão Pixen **3 gerações**, sem retries. Comparar separadamente com o corpo e peças atuais. Sem exposição na aventura normal.
2. Após avaliação visual: completar as outras vistas e um pequeno ciclo de roupa/cabelo; revalidar o orçamento com a geometria entregue. Parar na primeira alteração indevida do corpo ou falha de encaixe.
3. Completar primeiro a prova técnica do Espadachim em ambiente de inspeção: 80 poses de cabelo, 80 de roupa e 31 saídas de arma no plano conservador = **191 saídas nominais**, incluindo os testes já aceitos, não 191 adicionais.
4. Somente após esse encaixe ser aceito, cobrir os outros gestos: quatro fontes de cabelo e mais 128 poses de roupa = **132 saídas nominais** restantes. Reaproveitar tecnologia/disparo; sem gerar personagens de facções.
5. Aprovar o conjunto visual nas sete classes antes da promoção ao manifesto de produção. Falhas, mudança de ferramenta e tentativas extras recebem orçamento específico.

**Gasto efetivo desta auditoria: zero.** Nenhum dos valores acima é um lote iniciado ou aprovado. Risco principal da rota barata: variação de contorno, manga, rosto ou forma da lâmina entre edições independentes. Se a rota econômica não preservar geometria, registrar a falha e reapresentar alternativas; não consumir o saldo tentando indefinidamente.

## 8. Plano de validação da próxima implementação

| Cenário | Verificação e aceite |
| --- | --- |
| Catálogo | IDs únicos, sem paths vindos do save; dois cabelos/duas roupas realmente selecionam peças diferentes; `bald`/`base` continuam opções de ausência |
| Criação | Mesmos IDs/rótulos do editor; facção/classe independentes; equipamento inicial e aparência condizentes com a política aprovada |
| Editor | Aplicar/cancelar, carregamento, erro de storage, opção indisponível e troca imediata no mundo/retrato/inventário sem mudar atributos |
| Frame e direção | Idle 4, Walk 8 e cada Attack 8; percorrer todos os frames nas quatro direções, com pivôs/sockets visíveis, tamanho normal e ampliado sem interpolação |
| Sete classes | 28 perfis de classe/facção; 240 poses lógicas por roupa/cabelo; arma correspondente, inclusive foco próprio do Suporte e mãos livres do Lutador |
| Equipamento | Sabre `def:1` com binding próprio; retirar/equipar e trocar para `def:0`; torso `6`, torso não mapeado e vazio; não perder/duplicar itens nem alterar bônus |
| Combate | Mesmo tempo/evento de impacto, emissão/projétil e dano anteriores; nenhuma troca momentânea para a skin antiga entre frames; overlay Haki e habilidades preservados |
| Zoan | Editor humano sem desfazer transformação; mundo mantém forma animal; ao retornar, restaurar os IDs escolhidos e equipamento, inclusive após reload |
| Saves | Save sem aparência, v1 com IDs antigos, novos IDs conhecidos, ID inválido, falha de imagem, save DEV isolado e armazenamento sem espaço; sem reset de progresso |
| Fallback | PNG 404, atlas errado, alpha vazio não declarado, peça sem direção, draft, revisão divergente; manter aparência aprovada de segurança e informar erro |
| Desktop/mobile | 1366×768, 390×844 e paisagem; toque/teclado, rolagem interna, foco, rótulos e área dos controles; pausar prévia/reduzir movimento conforme preferência |
| Carregamento | Nenhuma requisição por frame; no máximo seis decodes concorrentes; seleção carrega só dependências necessárias; medir cold/warm load e cache durante combate |
| Pages | `python tools/build_pages.py`; arquivos aprovados presentes no `dist`, paths relativos e revisão correta; nenhum draft ou arquivo privado incluído |

Com o empacotamento sugerido, as novas imagens representariam aproximadamente **8,74 MiB RGBA adicionais** (atlas/canvas atuais), além dos cerca de 14,85 MiB atuais. É projeção de dimensões, não benchmark. Antes da liberação, comparar tempo de primeira composição, frame time, cache hit/miss e memória num celular real; navegador desktop com viewport mobile não mede memória/desempenho de Android.

Testes Node existentes a reaproveitar: `paper-doll-player`, `paper-doll-look`, `paper-doll-equipment`, `paper-doll-complete`, `paper-doll-attachment`, `paper-doll-occlusion`, além das regressões de movimento/emissão. Acrescentar casos de seleção por catálogo e cobertura de todas as alternativas; os testes atuais comprovam o conjunto padrão, não futuras peças.

## 9. O que foi executado nesta auditoria

- Estado atual do GitHub/PR #131 conferido; os cinco checks do PR estavam aprovados. Trabalho isolado a partir do commit de merge; alterações locais históricas preservadas.
- Leitura dirigida dos módulos solicitados, equipamento, criação/editor, build e documentos pertinentes. Inspeção de 22 pacotes históricos, fontes finais, catálogo e metadados da galeria PixelLab.
- Medição de dimensões, alpha, arquivos, cobertura, igualdade RGBA, sources/sockets e oclusões; folhas de contato de pixels existentes usadas apenas para análise.
- **Seis arquivos de teste Node passaram**, zero falhas:

  ```text
  node --test tests/paper-doll-player.test.cjs tests/paper-doll-look.test.cjs tests/paper-doll-equipment.test.cjs tests/paper-doll-attachment.test.cjs tests/paper-doll-occlusion.test.cjs tests/paper-doll-complete.test.cjs
  ```

- **Build Pages passou:** `python tools/build_pages.py`.
- Navegador real, origem local isolada, sem usar save pessoal: criação → aventura normal → Personagem → Personalizar aparência; combinação dos três movimentos com as quatro direções; comparação de ocultação; casaco preservado ao selecionar corpo-base com torso equipado; aplicação e persistência de cabelo após reload. Inspeção desktop e viewport 390×844, com rolagem alcançando os botões.
- Capturas recentes e resultados locais estão em `docs/evidence-paper-doll/catalog-audit/`, ignorados pelo Git. Evidências válidas: `04-creation-ready.png`, `05-editor-default.png`, `06-editor-hidden-layers.png`, `07-editor-attack-north.png`, `08-editor-walk-west.png`, `09-editor-mobile.png`, `10-editor-mobile-applied.png`, `11-mobile-reload.png`. As primeiras capturas de criação sem prévia ocorreram enquanto o servidor local estava interrompido e não foram tratadas como defeito do produto.

Não foram executados novos combates visuais nas sete classes, ensaio de performance em aparelho físico ou validação de peças novas, que ainda não existem. Os testes e capturas desta etapa auditam a integração atual; o quadro anterior é o plano de aceite para a expansão. Consulta de saldo no início/fim permaneceu igual; não houve geração paga.

## 10. Ordem de execução após aprovação

1. Aprovar os três conceitos e a política de roupa equipada; não produzir arte em massa.
2. Implementar o registro e resolvedor por dados mantendo somente as opções existentes, schema v1 e comportamento atual; validar catálogo/build/fallback.
3. Aprovar orçamento explícito do teste de três imagens, gerar e apresentar comparação visual antes de ampliar o lote.
4. Produzir em pequenos grupos condicionados ao encaixe; usar referências/pivôs existentes, sem regenerar corpo/movimento.
5. Validar Espadachim, depois cobertura compartilhada nas sete classes, equipamentos, Zoan, saves e aparelho mobile.
6. Promover somente peças aprovadas, commit/push e PR; sem merge automático. O relatório atual não publica novas opções no jogo.

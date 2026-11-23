# Continuação dos 114 contextos

## Fechamento da fila de seleção

A fila inicial de 114 ataques masculinos chegou a **114/114**. Para cada ataque, o seletor recebeu as 50 peças isoladas, os 1.000 pares entre slots e os 100.000 conjuntos completos. Nos lotes de correção, as **11.400.000 configurações completas** passaram pela seleção direta. Cada registro identifica o build correspondente. [Produto direto dos 114 contextos](produto-direto-114.json.gz)

Os últimos 23 contextos completaram **2.300.000/2.300.000** seleções. No mapa, esses grupos somaram 73 ataques observados e 14 ciclos completos. As capturas mostram exemplos de conjuntos completos. As comparações de pixels e as trocas por slot têm registros separados. [Quadros, retiradas de peças, trocas e carregamento](desenho-e-cache-lote-final.json.gz) · [Lâminas e disparos no mapa](laminas-e-disparos-finais-no-mapa.jpg) · [Seis cajados no mapa](seis-cajados-norte-no-mapa.webp)

| Movimento masculino | Seleção direta | Prova de desenho | Ciclos capturados no mapa |
|---|---:|---|---:|
| 12 espadas e adagas Sul | 1.200.000 | Calças e botas da própria peça acompanham os apoios e o deslocamento de cada perna. Casaco, luvas e capacete conservam mãos, lâmina e a ordem da cabeça. | 4 |
| Seis cajados Norte, 123–128 | 600.000 | Comparação de 270 retiradas de peças em 54 fases. As roupas preservam os pixels da haste. | 6 |
| Disparo Sul, 114 e 116 | 200.000 | Troncos e mangas têm camadas separadas do corpo doador, das mãos e da arma. | 1 |
| Pistola 114 Norte, Leste e Oeste | 300.000 | 432 comparações de calças e botas adaptadas, 480 de peitorais e luvas. O peitoral 151 preserva as camadas inferiores. | 3 |

Os vínculos das fontes podem ser reproduzidos pelos módulos `tools/register_south_blade_{legs,coats,gloves}.py`, `tools/register_north_staff_wardrobe.py`, `tools/register_south_fused_clothes.py`, `tools/register_pistol_{legs,recoil_clothes}.py` e pelo exportador `tools/export_combat_wardrobe.py`. Os registros conservam as partes e as coordenadas das peças. A tabela do censo identifica a origem selecionada por ID, corpo, arma, ação e direção. [Tabela dos 50 IDs](README.md) · [Fontes por peça e contexto](detalhes.tsv.gz)

Na aparência masculina Sul, 14 cabelos × 5 expressões × 18 armas passaram com o conjunto vestido. Foram 232 verificações de desenho e três ciclos no mapa com capacete equipado e retirado. O navegador também reteve de propósito a textura do peitoral 130 enquanto o personagem disparava um ataque com o cajado 123 Norte. Ele andou, causou dano e equipou o 137 antes de a textura antiga chegar. Os dois ataques seguintes mantiveram os seis IDs e as cores salvas. [Prova de aparência](../aparencias-ataque-sul/resumo.json) · [Ciclos da aparência no mapa](../aparencias-ataque-sul/ciclos-no-mapa.webp)

O build estático do commit `14505bc0be618c0a1d5cacde16008d1a69d0d896` tem a assinatura `478afa2805b71aa09613e1cb55e44f411b9b9e14b36f7a2740178429fea8782a`. Para repetir os ensaios de mapa, use `tests/rework-independent-world-browser.cjs` com `--pistol-complete-wardrobe`, `--wardrobe-load-race` ou `--south-saved-head-shapes`. Sirva o build gerado por `python tools/build_pages.py --static-demo` e aponte `MARE_TEST_URL` para ele. Para o censo de seleção, use `HD_PUBLISHED_ROOT` e o modo `sample` ou `direct` em `tools/audit-hd-wardrobe-product.cjs`.

## Os 114 contextos no mapa

Cada um dos **114 contextos** tem um ciclo completo de ataque observado na caçada, com arma e cinco roupas equipadas. O índice reúne **904 fases desenhadas**. Foram reaproveitados 31 ciclos com fontes e fases verificáveis. Os outros 83 foram capturados no build de `14505bc`. Nesses 83, a captura exige que o quadro efetivamente pintado use a fonte selecionada e os seis IDs equipados. Juntos, os lotes adicionais vestiram todos os 50 IDs do catálogo. O índice registra o conjunto usado, o total de fases e a impressão digital dos pixels de cada quadro. Um conjunto por contexto foi usado para esta contagem de desenho. [Ciclos, IDs e medidas por quadro](ciclos-no-mapa-114.json.gz)

| Ataque | Contextos com ciclo completo | Fases desenhadas | Todos os quadros |
|---|---:|---:|---|
| Espadas | 24 | 198 | [Prancha de espadas](ciclos-114-attack-sword.webp) |
| Adagas | 24 | 198 | [Prancha de adagas](ciclos-114-attack-daggers.webp) |
| Armas de fogo | 24 | 166 | [Prancha de disparos](ciclos-114-attack-firearm.webp) |
| Cajados, orbes e focos | 42 | 342 | [Prancha de foco](ciclos-114-attack-focus.webp) |

Para reproduzir todos os ciclos com o servidor e a pasta de evidências configurados, execute `node tests/rework-independent-world-browser.cjs --wardrobe-map-batch`. O teste lê os conjuntos documentados. `MARE_MAP_ROLE` permite selecionar uma classe, `MARE_MAP_BATCH` aceita uma lista JSON explícita e `MARE_MAP_BUILD` permite retomar a mesma revisão em uma pasta de evidências existente. Cada caso concluído escreve sua imagem e resultado. A retomada verifica a versão, os IDs e o SHA-256 da captura.

## Regressões da revisão anterior

| Falha observada na CI | Correção e verificação dirigida |
|---|---|
| Adagas laterais exigiam a contagem antiga de quatro peitorais | O teste obtém os dez IDs do catálogo. As seis adagas passaram pelos dois perfis, totalizando 120 rotas e 960 quadros comparados com a arte de referência. |
| Peitoral 151 e luva na pistola Norte | O compositor preserva a camada inferior. A regressão localiza o único grupo assinado do peitoral, inclusive sob a luva, e compara os 64 quadros por pixel. |
| Elmos na nodachi Norte, mosquete Sul e bússola lateral | A referência aplica uma vez o espelho assinado da nodachi e usa o crânio da própria bússola. A cobertura inclui o mosquete. Foram comparados 1.520 quadros completos nesses recortes. |
| Mangas laterais de espada exigiam contato com a mão em cada fase | A manga curta do peitoral 6 deixa o punho livre na primeira fase e toca a mão em outra. O teste compara os pixels de tecido com a fonte própria em cada quadro e confere as oclusões de mão, arma e cabeça. Os dez peitorais passaram nas seis espadas, em Leste e Oeste, totalizando 960 quadros. |
| Agressão do inimigo no primeiro andar de Impel Down, intermitente | O teste esperava deslocamento antes de o navegador construir a rota ao redor do obstáculo. A nova sincronização conserva os critérios de aproximação, engajamento, ataque, dano e personagem parado. Os 19 inimigos possíveis avançaram e causaram dano. A progressão dos andares, as recompensas e a reconexão passaram no Chromium até o andar 100. |

No porto compartilhado, reproduzimos 0 px de deslocamento quando a tecla era solta antes do fim de um comando em trânsito. Mantendo-a pressionada até o outro cliente observar o mesmo personagem, o deslocamento foi de 68,24 px. O teste conserva a exigência de mais de 20 px e solta a tecla mesmo se o prazo expirar. O fluxo de duas contas, HTTPS e PostgreSQL 18.6 passou localmente, incluindo viagem, retorno e reconexão. As duas execuções anteriores da CI registraram um timeout sem a linha original. O teste agora preserva essa linha e o estado das duas páginas.

A CI interrompeu o job de cajados aos 35 minutos quando ele também executava os casos de armas de fogo e orbes. As 49 verificações dessa etapa foram mantidas e distribuídas pelos três jobs de classe já existentes.

Os cinco comandos de independência que vinham após a interrupção também passaram no build publicado. Eles exercitam casacos registrados, peças assinadas da pistola, empunhadura, contato com a arma e propriedade das roupas Sul. Entre eles estão 192 quadros de casacos registrados, 838 ticks da pistola, 104 ticks de contato e 48 quadros de propriedade das roupas. A execução de Chromium com textura atrasada faz parte do job de mapa da CI.

## Histórico dos lotes anteriores
## Mais dez contextos selecionados

As seis armas de foco 123–128 para Sul completaram **600.000/600.000** seleções diretas. Os quatro disparos para Sul de 4, 5, 113 e 115 completaram **400.000/400.000**. Com os lotes anteriores, 91 dos 114 contextos iniciais passaram na seleção. Restam 23 nessa etapa. O teste de textura das empunhaduras comparou 112 quadros e o mapa registrou seis ciclos de foco. O teste de tronco e cabeça nos quatro rifles comparou 312 quadros. A arma 5 conserva a nona postura própria e o retorno à primeira. Para as armas 114 e 116, os arquivos registram as pernas e os capacetes que já passaram, com a ação e a direção de cada caso. [Seleções e observações no mapa](empunhaduras-e-disparos-sul.json.gz)

Em `72b92a547efcb34994cf8ede06ef56482d8b7a61`, mais 30 dos 63 contextos pendentes no último censo completo passaram pela seleção direta. Isso fecha 81 dos 114 contextos originais na etapa de seleção, com 33 ainda na fila nessa revisão. O relatório do censo anterior identifica os 50 IDs individualmente. [Censo anterior](README.md) · [Resultados dos 30 contextos, assinaturas, peças, pares e observações do mapa](trinta-contextos-72b92a5.json.gz)

| Ataque masculino | Armas e direções | Conjuntos selecionados diretamente | Observações de ataque no mapa | Ciclos completos no mapa |
|---|---|---:|---:|---:|
| Espada e adagas | 0, 1, 67–70, 12, 13, 71–74 Norte | 1.200.000/1.200.000 | 36 | 4 |
| Disparo | 4, 5, 113, 115, 116 Leste/Oeste | 1.000.000/1.000.000 | 8 | 2 |
| Foco | 16, 17, 31, 32, 121, 122 Sul | 600.000/600.000 | 8 | 4 |
| Cetro 121 | Leste/Oeste | 200.000/200.000 | 10 | 4 |

As calças, mangas e luvas das lâminas usam a anatomia de cada fase. Na nodachi, a roupa acompanha o espelhamento, incluindo o punho corrigido. Os disparos laterais usam as duas mãos, o recuo e as camadas próprias de cada peça. A ponta do cetro 121 cruza a luva em posições diferentes das outras armas de foco. Sua montagem usa a máscara assinada do próprio cetro e preserva o cabelo salvo.

O produto direto enumera os 100.000 conjuntos de cinco slots em cada contexto. A evidência contém também as fontes dos 50 itens e os 1.000 pares de cada contexto. As observações no mapa incluem trocas pelo inventário e registram a arma e a fonte de cada slot. Os quatro ciclos do cetro usaram a correção final de cabelo. Os produtos diretos identificam a assinatura do build em que a seleção ocorreu. O utilitário de confirmação da HUD passou nos oito tamanhos de tela após resolver a troca de botão durante o redesenho.

Para reproduzir o produto, execute `tools/audit-hd-wardrobe-product.cjs` com `HD_PUBLISHED_ROOT` apontando ao build, `PRODUCT_MODE=direct` e filtro de corpo, arma, ação e direção conforme as linhas. O arquivo de resultados conserva as direções canônicas e o nome exato de cada ação.

[Capturas dos 14 ciclos do lote de 30 contextos](trinta-contextos-mapa.jpg)

## Aparências salvas fora do censo original

O censo de 1.176 contextos usou pele ebony, cabelo azul e olhos verdes com o formato original do cabelo e dos olhos. As capturas dos 114 ataques documentam esse recorte. Repetir as mesmas 114 configurações com o identificador salvo `hair-cropped` revelou 74 falhas de seleção adicionais no build de assinatura `478afa2805b71aa09613e1cb55e44f411b9b9e14b36f7a2740178429fea8782a`. As roupas desapareceram junto com o receptor em 12 perfis de adagas, quatro ataques de espada Norte, 23 disparos e 35 ataques de foco.

O repouso masculino Sul sem arma passou a usar a base atual, as camadas do cabelo salvo e o ajuste próprio de cada elmo. A comparação exige o mesmo pivô, relógio, âncoras e sete camadas de tronco, braços, mãos, cabeça e rosto dos registros. Na prova isolada, as 50 peças carregaram e produziram diferenças de pixels com cabelo curto nas duas paletas testadas (100/100). O inventário real gerou 58 capturas e comprovou a alternância da calça 133 com o capacete 129. O teste permanente repete a retirada e compara as identidades e os pixels recuperados.

Os ensaios históricos de movimento e da arma 115 voltaram a acompanhar o desenho real durante o carregamento. No mapa, caminhada e repouso passaram nos dois corpos, com e sem o kit inicial, e o disparo mostrou cinco fases e dano. O ensaio separado de clique revelou uma falha de montagem ao retirar o capacete 157 com cabelo espetado, arma 115 e peitoral 151; integra a fila de disparos. Para encurtar a espera da CI, as 1.518 observações originais de armas e roupas foram distribuídas em dois grupos de 719 e 799. Cada grupo verifica sua contagem e mantém um relatório incremental.

### Lâminas e armas de foco com cabelo curto

As 16 poses de lâminas e 35 poses de foco que falharam na seleção com `hair-cropped` voltaram a selecionar o conjunto usado em cada reprodução. As adagas reutilizam o crânio e o ponto do pescoço de cada fase de perfil. As espadas Norte usam seu próprio corpo articulado. No mapa, quatro ciclos de oito fases preservaram a calça, o peitoral, as luvas, as botas, a arma e o rosto durante a retirada e a reposição do elmo. No compositor foram 128 fases de 16 ataques equipados, além de 1.120 seleções com os formatos de cabelo e olhos. [Provas por direção](../aparencias-laminas-norte-perfil/resumo.json) · [Quatro ciclos no mapa](../aparencias-laminas-norte-perfil/ciclos-no-mapa.webp)

Os cajados de empunhadura fechada e os focos de empunhadura aberta usam seus próprios vínculos. Nos 42 contextos de foco do lote, passaram as 420 seleções com os dez elmos e 42 sem elmo. Dezessete ciclos totalizaram 168 posições de animação e 504 imagens comparadas. As 3.912 amostras visíveis de íris mantiveram os mesmos valores de cor e transparência. O inventário real foi exercitado com as armas 16, 122, 128 e 31, nas quatro direções ao todo, com oito ciclos e 66 quadros. [Seleção e pixels](../aparencias-foco-quatro-direcoes/selecao-e-pixels.json.gz) · [Observações no mapa](../aparencias-foco-quatro-direcoes/observacoes-do-mapa.json.gz) · [Ciclos com e sem elmo](../aparencias-foco-quatro-direcoes/ciclos-no-mapa.webp)

### Repetição dos 114 ataques com cabelo curto

Os 114 conjuntos que têm ciclos de mapa publicados passaram de **40/114 para 114/114 na seleção com cabelo curto**, sem trocar arma, ação, direção ou os cinco IDs de roupa. A prova registra o antes e o depois de cada configuração. Para repetir, aponte `HD_PUBLISHED_ROOT` para o jogo exportado e execute `node tools/audit-hd-saved-hair.cjs`. [Resultados caso a caso](cabelo-curto-114-antes-depois.json.gz)

Nos disparos, os 24 contextos resolveram o corpo e as 50 peças individuais, totalizando 1.224 verificações. A comparação de 48 ciclos e 332 posições conferiu a remoção dos pixels do cabelo anterior e o desenho das camadas aprovadas. No mapa foram oito ciclos com e sem capacete nas quatro direções. O rifle 115 conservou as cinco posturas do V5 com peitoral 151 e capacete 157, causou 122 de dano no alvo do ensaio e continuou a atacar quando o inventário retirou o capacete. [Contagens e condições dos ensaios](../aparencias-disparo-masculino/resumo.json) · [Disparos no mapa](../aparencias-disparo-masculino/disparos-no-mapa.webp) · [Rifle 115](../aparencias-disparo-masculino/rifle-115-v5.webp)

### Outras lacunas identificadas no mesmo catálogo

- **Porte armado.** As 42 armas em repouso e caminhada nas quatro direções, com os dez elmos ou a cabeça descoberta, passaram em **3.696/3.696 seleções**. Em cinco ciclos, 65 fases compararam o elmo vestido, retirado e oculto, além da expressão facial. No mapa foram quatro ciclos de caminhada de 16 fases, com arma e cinco roupas. [Fontes e trocas no inventário](../porte-com-cabelo-salvo/resumo.json.gz) · [Caminhada no mapa](../porte-com-cabelo-salvo/caminhada-quatro-direcoes.webp)
- **Desarmado.** Com cabelo curto, 4.200/4.200 peças isoladas e 84/84 conjuntos mistos passaram nas sete classes. O teste comparou 300 imagens de 12 poses e preservou 5.654 amostras visíveis de íris. O mapa confirmou 48 fases de caminhada e soco mais repouso, para Oeste e Norte. [Seleção e pixels](../desarmado-com-cabelo-salvo/selecao-e-pixels.json.gz) · [Ciclos no mapa](../desarmado-com-cabelo-salvo/ciclos-no-mapa.webp)
- **Outras 18 poses de lâmina.** As seis espadas laterais e seis adagas Norte aceitaram 900/900 trocas de uma peça dentro do conjunto. Foram 240 quadros desenhados e 24 quadros de mapa para as armas 0, 69 e 73. Os elmos iniciais 18 e 19 reutilizam as artes separadas nas direções que as fornecem, com o recorte correspondente de cabelo. [Lâminas com roupa](../aparencias-laminas-norte-perfil/ataques-com-roupa.json) · [Elmos e recortes](../aparencias-laminas-norte-perfil/elmos-iniciais.webp)
- **Outros seis focos Norte.** As armas 16, 17, 31, 32, 121 e 122 usam a cabeça do corpo articulado que já carregava os braços. Cada uma desenhou suas oito fases com cabelo original, curto e curto sob capacete. As doze armas de foco passaram com cada um dos dez elmos para Norte. O mapa repetiu a troca com as armas 17 e 121. [Comparação das fases](../aparencias-foco-quatro-direcoes/foco-norte-doze-armas.json.gz) · [Focos Norte no mapa](../aparencias-foco-quatro-direcoes/foco-norte-no-mapa.webp)

### Aparências salvas nos punhos, focos e disparos

| Família masculina | Lacuna reproduzida | Resultado no compositor | Resultado no mapa |
|---|---|---|---|
| Punho e tecnologia, 12 armas em quatro direções | 44 corpos armados sem seleção e quatro conjuntos que perdiam roupas | 48/48 corpos, 2.400/2.400 peças isoladas e 3.360 conjuntos com as combinações de cabelo e olhos. Em 415 posições dos 48 ciclos, nenhum pixel abaixo da cabeça mudou entre cabelo original e curto. | Oito ciclos, 72 posições e quatro retiradas de capacete. [Medições e IDs](../aparencias-punhos-masculinos/resumo.json) · [Mapa](../aparencias-punhos-masculinos/punhos-no-mapa.webp) |
| Foco, 12 armas para Leste, Oeste e Norte | O vínculo com o crânio exigia olhos de formato original e uma camada de cabelo | 972 seleções e 228 quadros completos comparados. A expressão só alterou a área registrada dos olhos nos perfis. Ao Norte, a imagem permaneceu idêntica. | Seis ciclos, 50 posições e nove observações com troca de capacete. [Pixels](../aparencias-foco-quatro-direcoes/foco-expressoes-36-contextos.json.gz) · [Fontes no mapa](../aparencias-foco-quatro-direcoes/expressoes-observadas-no-mapa.json.gz) · [Capturas](../aparencias-foco-quatro-direcoes/foco-expressoes-tres-armas-mapa.webp) |
| Armas de fogo, seis armas em quatro direções | Cabelo curto e rosto calmo selecionavam 1/24 conjuntos. A opção sem cabelo selecionava 0/24 com os olhos originais. | 24/24 nas duas aparências. Em 166 fases mudaram 38.942 pixels dentro das regiões de olhos. A vista de costas foi idêntica. | 32 quadros. Ocultar e retirar o elmo 19 produziu os mesmos oito quadros com a pistola 114. O rifle 115 reteve as cinco posturas do V5. [Medidas](../aparencias-disparo-masculino/expressoes-e-cranio.json) · [Capturas](../aparencias-disparo-masculino/expressoes-e-cranio.webp) |

O porte e a caminhada ganharam mais 336 seleções com cabelo longo e rosto calmo. O mapa confirmou dois ciclos de 16 posições com as armas 110 e 124, incluindo retirada e reposição pelo inventário. A exportação estática e o ensaio da janela de personagem passaram nos oito tamanhos de tela e nas sete classes. [Verificações de porte](../porte-com-cabelo-salvo/resumo.json.gz)

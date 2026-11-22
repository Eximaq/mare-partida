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

## Continuação no PR #374

O head investigado é `dbd8197f6b728358b292379c3d210ba91b1e3f6f`. Ele contém o merge `f9ff2cb779aa7751d38e1b2732a33ad815a1e9cf` do PR #373 e o head daquele PR, `6d52c9dacc2967f1a51a07d26654eab1cd9950c9`.

O desenho segue o equipamento salvo, os filtros de aparência, a pose no mapa, a seleção HD, o carregamento e o compositor nativo. No head inicial, o seletor do mapa experimentava subconjuntos e dava prioridade à composição com mais slots. Na caminhada Sul masculina, retirar luva e calça tornava a composição aceitável. No repouso da mesma montagem, a regra especial da luva só aceitava um conjunto sem botas. Se o seletor não encontrasse uma montagem na ação pedida, ele procurava um repouso HD. As falhas reproduzidas no mapa vieram desses dois caminhos. O código do mapa para esse personagem encaminhava a pintura ao compositor nativo.

A montagem nova resolve o corpo e a pose, consulta cada slot pelo próprio item e aplica os passes compatíveis. Compara resolução, pivô, densidade, relógio, âncoras, anatomia, dono, profundidade e máscaras. Verifica identificadores e dimensões da arte carregada. Uma falha no arquivo de um passe independente aparece no próprio slot e permite desenhar os demais. Uma ação sem receptor HD aparece como `no-hd-pose`. O cache de passes é limitado e usa o corpo, a pose, a aparência e a identidade do próprio slot. O cache de quadro usa o conjunto e a ação completos.

| Correspondência recuperada | Fonte e alcance validado |
|---|---|
| Arma 0, peitoral 6, calça 21, luvas 25/26 e bota 9 | Corpo masculino, repouso e caminhada Sul. Reaproveita o porte da espada, a roupa própria e os passes de luva e bota existentes. Os 16 quadros da caminhada foram desenhados. A remoção da bota 9 só alterou pixels com alfa nas quatro partes da bota. |
| Bota 148 | Seis partes próprias de `male-coat151-pants133-gloves152-boots148-walk-south-source-v18` e do repouso derivado, encontrados nos pacotes `male-boots9-148-native-*.zip`. O rig coincide com o corpo Sul do jogo. A montagem reaproveita as partes frontal, traseira e interna da bota e os 16 quadros do registro existente. |
| Adagas, calça 22 e luva 159 | Corpo feminino, ataque Leste/Oeste. Reaproveita o acervo de `rework-female-dagger-p22` e conserva o espelhamento da mão já registrado. |
| Calça 22, bota 9, luva 180 e capacete 18 | Corpo feminino, repouso lateral. Reaproveita os rasters de tornozelo, máscara de calça e punho. No Leste, o capacete `equipment-feminino-idle-east-18-source-only` monta junto com as três peças e conserva a aparência salva, incluindo a pele Ébano. |

### Contagem e reprodução

- `node tools/audit-hd-wardrobe-coverage.cjs . inventory` relaciona o catálogo a registros, fontes, arquivos compactados, fases e IDs explicitamente pertencentes à peça. As linhas de registro incluem contextos de candidatos e apresentações completas.
- `TONES=light node tools/audit-hd-slot-independence.cjs` examina os dois corpos, as quatro direções, as sete classes, os 42 IDs de arma e um contexto desarmado por classe. O script cruza todos os pares de duas declarações HD individuais por contexto e inclui sondas com um vizinho sem declaração. Também gera cenários mistos de três ou mais peças com semente 374. `AUDIT_REQUIRE_ALL=1` torna não zero a saída quando há perdas de declaração.
- `node --test tests/rework-independent-world-composition.test.cjs` comprova seleção, presença de passes, quadros e falha isolada de carregamento. `node tests/rework-world-hd-only.cjs dist` repete a pintura das adagas com as fontes publicáveis.
- A auditoria histórica de 1.579 posições consta do documento incorporado pelo PR #373. A descrição original do PR #374 cita 2.203 de 2.208 sem o comando, o resultado bruto e a definição de aprovação. A multiplicação de 92 itens visuais, dois corpos, quatro direções e três ações também gera 2.208 posições. Essa coincidência não identifica a medição histórica. Os números atuais usam registros de fonte, consultas ao seletor, pares, cenários mistos e quadros como unidades distintas.

### Lacuna comprovada pelo acervo

A luva masculina 25 tem registros de caminhada Leste/Oeste, incluindo `frozen-male-glove25-east-walk-native-layers` e `frozen-male-glove25-west-walk-native-layers`. O relógio é de 16 fases. O braço, as poses por fase e a base V31 desses doadores divergem do receptor lateral padrão. O Oeste já contém fases espelhadas. A fonte está identificada e fica pendente o vínculo local, com comprovação de encaixe e sem reaplicar o espelhamento. Os demais resultados sem vínculo apontam os registros consultados para investigação.

### Resultados reproduzidos no build local

A montagem e o navegador foram verificados com os módulos de `aa35e59c93bd8fac0f2b290c3bd344ad8bb51d63`. `python tools/build_pages.py --static-demo` terminou com sucesso. Os três módulos de composição na exportação coincidiram byte a byte com o código testado.

- O inventário tem 4.710 ocorrências de item em registro, cobrindo 92 IDs com família visual e 189 definições de catálogo. `python tools/audit_hd_archive_members.py inventario-fontes-hd.json` encontrou os 16.585 membros referenciados em 278 arquivos compactados e 201 arquivos avulsos. A conferência de nomes, por si só, mede presença dos arquivos. A decodificação e a pintura foram exercitadas pelos testes de quadro e de navegador.
- Os testes focados tiveram 22 aprovações. O ensaio adicional `TONE=all` verificou 32 coortes Sul, com oito tons de pele, duas cores de cabelo e duas configurações de roupa. O teste de cache descartou um pacote atrasado depois de publicar a aparência mais recente.
- A validação no Chromium confirmou criação, movimento nas quatro direções, seleção pelo inventário, trocas A → B → A de luva e bota, capacete visível/oculto, recarga da sessão local e ataque de espada em caçada. A bota 148 foi vista em repouso e caminhada no mapa. O teste está em `tests/rework-independent-world-browser.cjs` e usa `MARE_TEST_URL`, `MARE_EVIDENCE_DIR` e `CHROME_PATH`.
- O acionamento de poder em Espadachim foi observado nos dois corpos e nas quatro direções. As 8 conjurações e 64 amostras de quadro usaram a pose desarmada enquanto a ação estava ativa. Após a ação, o equipamento salvo voltou a aparecer. O ensaio usou o relógio controlado da bancada existente e simulou a pose recebida pelo cliente.
- A suíte geral registrou falhas. Em uma comparação dirigida, dez casos também falharam com os módulos de `dbd8197f`, incluindo a preparação antiga com `AbortController` ausente na bancada, as expectativas antigas de pacote de mundo e a coloração do Orbe 17.

### Matriz estrita e ensaios adicionais

| Corpo | Contextos | Consultas individuais | Sondas de pares | Pares com duas declarações HD individuais | Pares que mantiveram ambas as declarações | Conjuntos mistos | Conjuntos completos no seletor |
|---|---:|---:|---:|---:|---:|---:|---:|
| Masculino | 980 | 49.000 | 148.182 | 117.552 | 102.911 | 10.497 | 7.925 |
| Feminino | 980 | 49.000 | 54.928 | 28.838 | 13.211 | 2.751 | 1.074 |
| Total | 1.960 | 98.000 | 203.110 | 146.390 | 116.122 | 13.248 | 8.999 |

A matriz foi executada com `HD_PUBLISHED_ROOT` apontando para `dist`, `TONES=light` e `AUDIT_REQUIRE_ALL=1`. O produto de pares foi integral para as duas declarações de slot por contexto. Nas sondas com um vizinho sem declaração, o vizinho serviu de controle de retenção. Os conjuntos mistos usaram semente 374. A auditoria saiu com código 1 porque encontrou perdas de declaração, incluindo casos de autoridade de pose ainda a verificar. Ela mede a seleção e fornece exemplos por classe, arma, corpo, ação, direção e slot.

O ensaio de ataques Sul selecionou uma arma de cada classe pelo catálogo e observou o desenho nos dois corpos. Treze das 14 amostras foram vistas na primeira rodada. O caso restante, Adagas da Bruma ID 12, corpo masculino e tom Claro, resolvia `daggers12-south-native-original-source` e falhava no quadro 0 durante a conferência de arredondamento. A correção faz as duas composições na mesma superfície antes de transferir os pixels verificados. Preserva a comparação com a referência, a propriedade do metal e os limites de tolerância existentes. O caso foi repetido com sucesso no Chromium após a correção. O teste de cabelo, íris e corrupção do raster de adaga também passou em Node.

As lacunas da matriz e a validação de todas as ações e aparências continuam abertas. A recarga de sessão foi medida no jogo local. O ensaio de poder cobre Espadachim, e o ensaio complementar de todas as classes atingiu o tempo limite antes de concluir.

A repetição completa no build após o ajuste confirmou 19 etapas no Chromium, incluindo os dois ataques reais, sem erros de página.

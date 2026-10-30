# Contrato de encaixe — personagens modulares de 96 px

Revisão v9, 30/10/2026. A revisão visual do proprietário confirmou defeitos na v8 apesar dos testes anteriores. A v9 substitui o encaixe do Torso por máscaras anatômicas fixas de cada pose, corrige pulsos/profundidade dos braços, cobertura das roupas e sobreposição da cabeça. A bancada continua isolada, com produção desativada. Teste automatizado não significa aprovação artística.

## Arquivos e escala

| Conteúdo | Célula | Pivô |
| --- | --- | --- |
| Matrizes, Idle e Walk | 128×128 | 64,112 |
| Ataques | 160×160 | 80,128 |
| Altura do corpo | 96 px de referência | Mesmo apoio dos pés |

Ataques recebem 16 px de margem em cada lado, sem ampliar o personagem. Os estilos de cabelo podem ultrapassar o crânio pela própria silhueta, sem mudar a escala do corpo. Alpha dos materiais: somente 0 ou 255; amostragem nearest-neighbor.

Os nomes e IDs existentes continuam válidos. Há 416 quadros distintos em movimento e oito poses estáticas. Tecnologia usa os quadros de disparo. Idle mantém quatro quadros, caminhada oito e ataques atuais oito. Para ataques futuros, avaliar seis a oito poses úteis; reduzir quadros não corrige extração ou ancoragem defeituosa.

## Espelhamento da família completa

A v6 espelhava cabelos sobre crânios diferentes: oeste estava em três quartos e leste em perfil. Isso produzia espaços, orelhas expostas e franjas adiantadas ou recuadas.

A fonte lateral agora é **leste**. Oeste usa seu espelhamento para corpo, rosto, cabelo, vestuário, acessórios e contatos. O pivô fica em x=64: no material128, xWest=128-xEast; no ataque160, xWest=160-xEast. É FlipX com a compensação inteira de um pixel necessária ao pivô do pacote. Não misturar essa regra com 127-x ou com compensações diferentes por corpo.

As folhas oeste foram consolidadas. A bancada espelha também o resultado inteiro da composição leste, impedindo diferenças de arredondamento entre capa, roupas e cabeça. Os nomes anatômicos LEFT/RIGHT dos membros continuam associados à mesma animação e seus contatos espelhados. As referências históricas aprovadas foram preservadas; a comparação estática de oeste usa a referência leste espelhada.

Para uma futura peça que exija assimetria deliberada, criar uma direção autoral explícita com o mesmo contrato de encaixe. Não introduzir offsets improvisados por penteado.

## Cabeça, rosto e cabelo

Ordem: corpo → cabeça neutra → feições → cabelo → equipamento da cabeça. Os braços próximos continuam podendo passar na frente conforme a pose.

- A cabeça neutra contém crânio, mandíbula, orelhas e pele do pescoço. Não contém cabelo nem roupa copiada para o pescoço.
- O rosto contém feições editáveis. Ele não traz uma segunda bochecha, orelha ou cabeça para sobrepor à anatomia.
- O cabelo contém apenas cabelo. A extração preserva os tons claros das mechas; eles não podem ser confundidos com pele e apagados.
- Cabeça, rosto, cabelo e bandana/elmo compartilham a mesma translação inteira, obtida da mudança do ponto NECK. A rotação rasterizada do conjunto foi removida para não fragmentar detalhes de um pixel.
- A pele do pescoço liga a mandíbula ao tronco; não reutilizar o pescoço deslocado de uma animação anterior.
- O rosto é recortado pela máscara da cabeça e sempre desenhado antes do cabelo.
- As feições não recebem a rampa de pele: íris, pálpebras, boca e branco dos olhos são pigmentos independentes. A cabeça neutra é dona da pele, incluindo sombras quentes profundas.
- As seis variantes têm perfil leste próprio sobre o crânio atual, com olho único compacto e boca; oeste é sua cópia espelhada. Não colar uma face frontal no perfil.
- Bandana e capacete contêm somente tecido/metal e contorno. A pele do personagem usado para gerar o acessório não pode permanecer na peça.
- Capacete do Corsário (`item-19`) usa `hairOcclusion: all`: oculta todo o cabelo em qualquer pose, mantendo a seleção para quando for retirado. Bandana continua permitindo cabelo.

As seis variantes atuais mantêm o desenho limpo do rosto original. Essa escolha não torna o rosto imutável: estilos futuros podem ter outras feições dentro da cabeça comum. A proteção de cores dos olhos aceita dados por estilo em faceColorProtection; não presumir que todo pixel castanho pertença à pele.

Dez penteados foram refeitos com inpainting PixelLab sobre seis vistas nativas protegidas: sul, norte e leste dos dois corpos. Oeste é derivado por FlipX. As áreas de olhos, face, orelhas e mandíbula foram protegidas na geração.

## Calças, luvas, botas e capas

A aparência gerada fornece o modelo e a paleta. **A superfície do corpo em cada pose determina a geometria final.** Não girar uma mão estática inteira sobre um gesto diferente.

- Calças seguem a cintura e as superfícies das duas pernas. Há quatro painéis independentes: LEFTupper, LEFTlower, RIGHTupper, RIGHTlower.
- Calçados têm painéis LEFT e RIGHT. Seguem a perna e o pé reais, com cano e sola compactos. Sua máscara de cobertura é a própria peça desenhada, evitando apagar uma área maior e deixar uma fenda.
- Luvas seguem a pele e o contorno da mão nativa. Cordame mantém dedos livres; Vigia cobre a mão. Roupa íntima, calça e tronco não podem virar material da luva quando a mão cruza a cintura.
- Uma mão parcialmente oculta só recebe material na anatomia visível; não desenhar uma palma falsa através do tronco. Uma sobreposição antiga de palmas estáticas foi removida da nova montagem.
- Pequenos cortes de um pixel só são unidos quando a ponte pertence à mesma superfície nativa. Fragmentos de outro membro ou de tecido vizinho são removidos, preservando a peça ancorada no contato correto.
- Capas têm tecido posterior completo, inclusive as regiões escondidas pelo corpo na matriz estática. Isso evita buracos quando o braço se afasta do tronco. Contorno e barra são contínuos; a gola acompanha os ombros.
- Grevas protegem também a canela. IDs, atributos e encaixes dos equipamentos continuam independentes dos outros slots.

Camadas: capa posterior → corpo/membros distantes → equipamento distante → calças/calçados/roupa superior → capa nas costas ao norte ou gola nas outras vistas → cabeça/rosto/cabelo/acessório → gesto e equipamento do braço próximo. A oclusão usa a anatomia e a direção, não uma lista fixa de slots.

## Torso e roupa-base — v8

O seletor **Torso** corresponde ao slot de jogo `coat`. Reutiliza os IDs **6, Casaco de Marinheiro**, e **7, Casaco da Bruma**, sem alterar atributos ou o catálogo de saves. Os modelos têm vistas próprias para os dois corpos. O Torso equipado substitui a camada superior padrão feminina; capa e demais slots permanecem independentes.

Dois trabalhos de inpainting produziram os desenhos estáticos, preservando exatamente os pixels fora das máscaras. O encaixe usa a superfície do corpo principal e as articulações de cada pose. Braços próximos e mãos visíveis têm prioridade sobre o peitoral; um braço distante não deve abrir um buraco no tecido que está à frente dele.

Foram consolidadas **28 folhas de Torso**, com **832 quadros de movimento**, além das 16 matrizes estáticas. Idle, caminhada e cinco ataques distintos possuem as quatro vistas dos dois corpos. Tecnologia compartilha o disparo. A bancada recorta essas folhas já ajustadas; não recalcula o tecido durante cada ataque. As regiões transparentes e os pivôs permanecem nativos.

`tools/paper_doll_96_bake_torso_browser.cjs` reconsolida os peitorais sem geração paga, usando Playwright e um servidor HTTP da biblioteca. `torso.js` concentra a regra de superfície, profundidade e amostragem inteira. Novos desenhos reaproveitam essa rotina e as poses atuais.

As camadas superiores e shorts padrão foram ajustados nas **416 poses de movimento**, usando os pixels reais da roupa-base e a anatomia das pernas. Isso elimina a roupa íntima clara que escapava da malha antiga, principalmente nos perfis femininos. As referências históricas estáticas continuam preservadas.

Não extrair somente pixels cuja cor mudou: contornos e tecido inalterados também podem pertencer à peça. Também não conservar todos os contornos pretos do corpo dentro da máscara de geração. Validar região, material, continuidade e referência protegida.

## Paletas

Pele e cabelo usam rampas de cinco tons. A matriz castanha conserva sua pintura original. Outras cores usam bandas de luminância estáveis [30,60,95,145], sem esticar pequenas diferenças de tom por quantis. A antiga amplificação estava transformando nuances em ruído contrastante.

A cor da roupa independe da pele. Roupas usam conjuntos pequenos de sombras coerentes e não copiam manchas de pele. Para novas cores, recolorir a rampa validada em vez de gerar novamente todos os movimentos.

## Moldes reutilizáveis

Na pasta da bancada:

- fit-template.json: coordenadas, contatos, política de espelhamento, paletas, máscaras e referências.
- assets/template-body.png: dois corpos nas quatro vistas, na escala nativa.
- assets/template-head.png: cabeças e pescoços compatíveis, sem cabelo incorporado.
- assets/template-mask-{pants,boots,gloves,head,cloak}.png: guias de ocupação por slot.
- assets/template-mask-torso.png: oitavo molde, com a ocupação dos peitorais nos dois corpos e quatro vistas.
- appearance-catalog.json: modelos, painéis, fontes PixelLab e configuração nativeMaterial.
- appearance-rig.json: contatos e sockets dos movimentos.

Rotinas: tools/paper_doll_96_canonical_materials.cjs para FlipX, feições, extração protegida e capa; tools/paper_doll_96_head_materials.cjs para limpeza de crânio/pescoço; tools/paper_doll_96_equipment_materials.cjs e tools/paper_doll_96_surface_assembly.cjs para painéis; surface.js, appearance.js e wardrobe.js para a montagem por pose.

Na v8, `tools/paper_doll_96_headwear.cjs` limpa o material dos dois acessórios azuis atuais; outros materiais precisam de classificação compatível. Use os PNGs limpos indicados por `layers`, `animations` e `galleryId` como referência de equipamento pronto. As imagens em `canonicalSource` são fontes de geração/procedência e ainda podem conter o corpo usado como molde.

Fluxo econômico para o próximo item:

1. Usar o molde nativo e uma peça já corrigida como referência de escala e contato.
2. Gerar somente a aparência e as vistas necessárias, com face/corpo protegidos. Produzir sul, norte e leste; derivar oeste pelo mesmo espelhamento.
3. Separar somente o material do slot e completar os painéis ocultos antes de animar.
4. Reaproveitar a anatomia, as máscaras, paletas e contatos das 424 poses existentes.
5. Conferir a peça sozinha e em conjuntos, com peles e cabelos diferentes. Corrigir a fonte e a regra de montagem, evitando ajustes manuais repetidos em cada quadro.
6. Salvar as matrizes consolidadas e o contrato. Não publicar fontes locais, tokens, URLs assinadas, saves ou capturas em massa no Git.

O contrato de 84 px em HANDOFF-CALCAS-PAPER-DOLL.md permanece como histórico do sistema anterior.

## Validação

- Testes Node pertinentes e build estático com python tools/build_pages.py.
- Comparação das referências estáticas e varredura dos 480 quadros de entradas, incluindo o alias de tecnologia.
- Varredura geométrica das 424 poses: 3.392 lados de pares, 848 montagens de calças, 2.544 rostos e 4.240 cabelos.
- Composição dos dois conjuntos completos, ordem de rosto/cabelo, cobertura dos pés, mãos levantadas e 112 estados reais da interface.
- Comparação exata de FlipX dos materiais, das folhas e de cada modelo/equipamento/conjunto em todas as poses laterais.
- Folhas de comparação e capturas permanecem fora do repositório. A revisão visual complementa os testes; não declarar aprovação artística por um resultado verde.

A revisão v7 utilizou 20 trabalhos de inpainting, dez cabelos e dez equipamentos, com cobrança de 200 gerações. Os seis rostos foram corrigidos por separação e encaixe nativos, sem gerar outras cabeças. A publicação de PNGs consolidados na galeria é separada dessas gerações.

Publicação v7: Jade Dragon, 184 folhas consolidadas (172 atualizações preservando IDs), sete moldes incluídos e 20 fontes geradas vinculadas à mesma pasta. O catálogo registra IDs e hashes das folhas; os recibos completos e capturas ficam fora do Git.

## Resultados da revisão de 30/10/2026

- 157 testes Node autônomos aprovados após conciliar a branch com a main atual. O E2E Supa é separado, conforme o fluxo do repositório.
- 103 scripts passaram na verificação de sintaxe; quatro testes Python de empacotamento passaram, assim como o build Pages.
- Baseline de 480 quadros de entrada aprovado, com referências preservadas, margens livres, caches limitados e nenhum save criado.
- 26.536 combinações verificadas: 11.024 modelos/poses, 13.568 conjuntos completos e 1.944 combinações com slots vazios. Zero divergências de espelhamento, feições fora da cabeça, rosto sobre cabelo ou braços perdidos nos detectores.
- Encaixe conferido no fonte e no pacote estático: 424 poses, 208 matrizes, 64 pares independentes e 112 estados reais da interface. Zero fragmentos soltos, pés descobertos, material fora da superfície permitida ou alpha intermediário nos critérios medidos.
- Comparação exata de FlipX: 60 materiais, 842 quadros de camadas e 3.074 composições, sem diferenças.
- Limpeza nativa dos 424 quadros aprovada. Folhas de movimento dos dois corpos e capturas atuais em 1920×1080, 1366×768 e 1280×720 revisadas fora do Git.

Esses resultados cobrem os casos e critérios descritos; não constituem aprovação artística do proprietário nem integração no personagem publicado. A bancada não altera saves, atributos ou IDs de itens. Para desfazer a aparência, reverter os commits específicos da bancada, preservando a conciliação com a main e os trabalhos dos colaboradores. Os recibos locais da galeria incluem as referências de restauração dos PNGs anteriores.

## Validação adicional v8

- 44.840 combinações de aparência: 11.872 modelos/poses, 27.136 conjuntos dos seis slots e 5.832 combinações com slots vazios. Sem cortes de borda, perda de braços ou face sobre cabelo nos detectores.
- 848 encaixes de Torso, incluindo comparação exata entre a regra de superfície e os quadros consolidados; nenhum peitoral fora do corpo ou sobre braço próximo nativo.
- 192 combinações de pele/cabeça: a pele visível corresponde à rampa da cabeça, sem pele clara copiada do acessório.
- 424 poses com capacete: o resultado é idêntico com cabelo longo selecionado ou cabelo oculto. A troca não apaga a seleção de cabelo.
- 68.898 pixels de braços visíveis preservados na comparação com/sem Torso. Verificações específicas em `paper-doll-96-torso.test.cjs` e `paper_doll_96_torso_browser.cjs`.

Publicação v8: **215 folhas consolidadas** na Jade Dragon, com 64 salvamentos (33 atualizações e 31 folhas novas), oito moldes e 28 folhas de Torso. As duas fontes novas também foram vinculadas à pasta, somando 22 fontes de geração registradas. Custo adicional confirmado: **20 gerações, em dois trabalhos**. Consolidação dos movimentos e publicação dos PNGs não consumiram gerações.

### Validação final da revisão v8

Na fonte e no build Pages, os 848 encaixes de Torso corresponderam à regra de montagem; 192 casos de pele e 424 casos de capacete passaram. O espelhamento confirmou 3.286 composições exatas, 842 quadros-fonte e 64 materiais sem divergências. O detector do build conferiu 224 matrizes, 424 poses e 112 estados de interface sem violações. Também passaram 158 testes Node autônomos, quatro testes Python, 44.840 combinações de aparência e o build estático. Capturas do lobby em 1920×1080, 1366×768 e 1280×720 permanecem fora do repositório. Esses resultados não substituem a aprovação artística; produção continua desativada.

## Revisão v9 — anatomia independente dos itens

### Falhas confirmadas na v8

- O limite superior da roupa-base deixava pixels da roupa íntima cinza expostos.
- Pulsos trocados, colapsados sobre o cotovelo e profundidade ambígua dos dois braços permitiam que o peitoral cobrisse mãos ou deixasse o peito aberto.
- O recorte de cabeça continha dois pixels de ombro e os redesenhava sobre a camisa masculina lateral.
- A limpeza de componentes das luvas podia remover pixels reais dos dedos. A auditoria anterior comparava parte da geometria com a própria regra de montagem e não detectava essas falhas.

### Fonte anatômica reutilizável

318 poses nativas foram medidas; oeste é derivado de leste, completando 424 poses. A importação usa os cotovelos e a pose anterior para resolver os lados dos pulsos, recusa membros colapsados ou de comprimento incompatível e normaliza a profundidade perto/longe. Cabeça, corpo, pernas, duração e pivôs aprovados permanecem iguais.

16 folhas em `assets/ownership-*.png` guardam máscaras por pose: R = peito e mangas curtas, G = mãos/antebraços visíveis, B = braços próximos. Essas máscaras não dependem da roupa escolhida, da cor da pele ou do cabelo. O catálogo registra dimensões, direções e ordem dos quadros.

- `paper_doll_96_bake_ownership.cjs`: consolida anatomia, roupa-base e braços a partir dos arquivos nativos; sem rede. A opção `--estimates=<pasta>` importa medições existentes e `--reference-rig=<arquivo>` mantém a referência anterior explícita. Não contém credenciais nem faz chamadas pagas.
- `paper_doll_96_bake_torso_browser.cjs`: aplica qualquer modelo Torso cadastrado às máscaras existentes. Gera oito folhas por corpo/modelo, incluindo pose estática. Os dois modelos atuais somam 32 folhas, 848 quadros (832 em movimento e 16 estáticos). Tecnologia compartilha disparo. IDs de galeria existentes são preservados.
- Camadas: tecido sobre o corpo; cabeça limitada à gola quando equipada; mãos nativas preservadas após roupa/capa; luvas desenhadas sobre essas mãos. Capacete continua ocultando todo o cabelo.
- Oito moldes estáticos permanecem disponíveis, com máscara de Torso atualizada. As 16 folhas anatômicas complementam esses moldes.

### Inclusão dos próximos itens

Gerar a arte nas matrizes aprovadas, separar tecido de pele e respeitar o contorno anatômico. Consolidar todas as poses antes de adicionar o modelo ao seletor. Uma animação Torso incompleta agora impede a montagem, em vez de usar silenciosamente um recorte inadequado. Usar a mesma máscara congelada para todos os materiais; nunca redesenhar pulsos para acomodar uma roupa.

O contrato atual de Torso é uma camisa fechada até a cintura, com mangas curtas. Formas como mangas compridas, saias e volumes externos exigem painéis e critérios próprios. Arte nova só é aceita depois da auditoria de mãos, ombros, roupa-base, combinações e inspeção visual dos ciclos; gerar um PNG não basta para declarar compatibilidade.

Custo v9 confirmado: 38 gerações de arte em quatro reparos (20 no primeiro passe e 18 no passe final) e 31,9 em medições anatômicas, incluindo a amostra inicial. Total 69,9. Consolidação e salvamento das folhas não consomem gerações. Fontes intermediárias ficam registradas como intermediárias, sem aprovação artística implícita.

### Paleta e formato final v9

`paper_doll_96_torso_materials.cjs` limpa e indexa a paleta de cada tecido. Um teste de regressão inclui o ponto rosado RGB 185,88,162 encontrado na camisa azul. A limpeza preservou integralmente o alpha dos 34 arquivos exportados de Torso. A auditoria recusa cores fora da paleta declarada, em vez de aceitar qualquer cor devolvida pelo gerador. Para materiais futuros, declarar uma paleta própria; não aplicar um detector genérico de pele a tecidos marrons.

Formato das folhas anatômicas: estático 128×512, Idle 512×512, Walk 1024×512 e ataques 960×960, sempre na célula nativa 128/160. A matriz de ataques tem seis colunas; não assumir oito.320 células foram reorganizadas sem alterar bytes dos pixels, para atender ao limite de lado1024 do PixelLab.

Galeria final: 235 folhas consolidadas e 24 fontes registradas na Jade Dragon. Esta revisão alterou 89 folhas distintas (69 existentes, 20 novas); 123 salvamentos gratuitos incluem a revisão cromática de 34 folhas. IDs existentes preservados. Os 64 PNGs de corpo principal permanecem byte a byte iguais à revisão anterior.

A auditoria de mangas diferencia tecido sobre o braço superior de pele exposta no antebraço. Comparar a cor de uma antiga camada underArms com a cor do peito não prova que aquele pixel seja uma mão visível. As sondas independentes de ombros, punhos e antebraços, a comparação da montagem com as folhas consolidadas e a inspeção dos ciclos complementam-se. Os resultados das seções históricas v6–v8 não equivalem a aprovação visual.

### Resultado final v9.4

- 6.360 conjuntos específicos: 110.808 amostras de palma, 205.578 de antebraço, 32.592 de ombro e 1.100.196 de roupa-base, sem violações. Essas sondas usam os pixels nativos e os pontos medidos, separadamente do encaixe do item.
- 848 quadros de Torso conferidos contra a montagem, 16 matrizes com paleta permitida, 192 combinações de pele/cabeça e 424 poses de capacete sem cabelo: sem divergências. 138.038 pixels de braços expostos preservados.
- 44.840 combinações de aparência, 3.286 comparações exatas de espelhamento, 424 poses de limpeza e detector com 224 matrizes/112 estados de interface aprovados. 158 testes Node autônomos e sete testes96 repetidos; quatro testes Python e build Pages aprovados.
- Capturas atuais do lobby em 1920×1080, 1366×768 e 1280×720; demonstrativo de movimento com 24 quadros e inspeção das 16 folhas de ciclos, mantidos fora do Git. Aprovação artística e integração em produção continuam pendentes.

As rotinas de assets usam Sharp e Playwright no ambiente de edição. Para um novo Torso, definir sua paleta, limpar as matrizes, consolidar todas as animações e rodar as auditorias; reutilizar as máscaras existentes. Medir pulsos de novo somente quando a anatomia-base mudar.

A repetição local das duas rotinas de consolidação não alterou nenhum dos 926 PNGs da biblioteca (comparação SHA-256 antes/depois), sem novas gerações. A limpeza cromática também é idempotente: reaplicar a paleta preserva pixels já aprovados.

# Contrato de encaixe — personagens modulares de 96 px

Revisão canônica v7, 30/10/2026. A bancada continua isolada, com produção desativada. Os defeitos apontados nas imagens da v6 eram reais apesar das verificações geométricas anteriores; esta revisão substitui aquele encaixe. Teste automatizado não significa aprovação artística.

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
- appearance-catalog.json: modelos, painéis, fontes PixelLab e configuração nativeMaterial.
- appearance-rig.json: contatos e sockets dos movimentos.

Rotinas: tools/paper_doll_96_canonical_materials.cjs para FlipX, feições, extração protegida e capa; tools/paper_doll_96_head_materials.cjs para limpeza de crânio/pescoço; tools/paper_doll_96_equipment_materials.cjs e tools/paper_doll_96_surface_assembly.cjs para painéis; surface.js, appearance.js e wardrobe.js para a montagem por pose.

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

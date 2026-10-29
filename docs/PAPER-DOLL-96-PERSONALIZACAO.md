# Personalização de 96 px — cobertura e encaixes

29/10/2026, continuação do PR #144. **Bancada de avaliação artística, sem ativação na aventura normal.** Os movimentos pendentes do contrato anterior foram produzidos; a avaliação dos novos desenhos continua necessária.

## Conteúdo atual

- Masculino e feminino; sul, norte, oeste e leste.
- Idle: 4 quadros reais a 4 FPS, oito ciclos. Walk: 8 quadros a 8 FPS, oito ciclos.
- Seis categorias de ataque, 8 quadros a 12 FPS: espada, soco, disparo, adagas, tecnologia e canalização. Disparo/tecnologia compartilham os mesmos fontes: 48 entradas e 40 ciclos distintos.
- Total: **56 ciclos distintos e 416 quadros de movimento**, mais oito referências estáticas. Não há quadros duplicados para preencher lacunas.
- Dez cabelos: curto rente, espetado, lateral, chanel, ondulado, tranças presas, rabo de cavalo, cacheado curto, longo repartido e undercut.
- Quatro opções da face original com íris azul/castanha/verde/cinza; duas expressões discretas derivadas da mesma base: Sereno e Determinado. A face continua substituível, com o contorno original e camada separada. Os estudos de fisionomia rejeitados na etapa anterior não voltaram.
- Oito paletas de pele e dez de cabelo. Novas rampas de cinco tons podem ser acrescentadas sem gerar cada cor.
- Dez equipamentos existentes, sem alterar seus atributos ou índices:

| ID | Nome | Camada |
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

Nomes conferidos no catálogo enviado e no código corrente. Item 22 e o contrato de [HANDOFF-CALCAS-PAPER-DOLL.md](HANDOFF-CALCAS-PAPER-DOLL.md) preservados. As folhas de 84 px, seus bindings e os trabalhos de colaboradores não foram substituídos. Armas e slots adicionais não fazem parte desta etapa.

## Prioridade de desenho e compatibilidade

1. Capa posterior no sul/laterais.
2. Corpo e braços posteriores.
3. Luvas posteriores, ocultas pelo tronco/cabeça.
4. Calças, calçados e roupa superior.
5. Capa sobre as costas no norte; somente a gola na frente nas outras vistas.
6. Cabeça neutra limpa → rosto/olhos/orelhas → cabelo → equipamento da cabeça.
7. Antebraços/mãos próximos e suas luvas.

Cada equipamento pode ser retirado ou combinado com uma peça do outro conjunto. O capacete oculta a parte superior do cabelo, preservando pontas abaixo da linha de cobertura. A bandana permite exibir o penteado. Equipar uma peça não exige outra; a compatibilidade é visual e não cria dependências no inventário.

## Cabeça e perfis

A reparação da cabeça foi gerada com máscaras que protegem as orelhas, mandíbula e pescoço originais. O resultado bruto preservou os pixels fora da máscara; cópias locais de pele neutra removeram marcas faciais residuais no interior. Não se assume que a reconstrução anterior da cabeça tinha o mesmo contorno do desenho aprovado.

Cabeça, face e cabelo usam **o mesmo socket por quadro**. A face é recortada pelo alpha da cabeça, impedindo olhos/pixels fora do crânio. A remoção da cabeça antiga é localizada: não apaga braços erguidos. O perfil facial recebeu limpeza da faixa escura excessiva sobre os olhos.

Todos os cabelos laterais, inclusive o original, usam a matriz leste espelhada para oeste, como solicitado. No espaço nativo: x_oeste = soma - x_leste; soma 127 no masculino e 128 no feminino. O pixel adicional feminino alinha a matriz ao pivô correspondente. Os corpos e movimentos não são espelhados. A transformação do socket é aplicada depois do FlipX.

O ajuste frontal south.hairX=1 continua nos dois corpos. Pixels de olhos não alterados no inpaint são excluídos da separação de cabelos; contornos e detalhes legítimos próximos à raiz permanecem.

As matrizes e camadas animadas foram consolidadas nos PNGs existentes. As referências estáticas aprovadas continuam disponíveis para comparação. A composição antiga sem escolhas de aparência preserva seu caminho de regressão; os controles usam as bases limpas e os novos encaixes.

## Contatos e vestuário em movimento

Foram medidos **416 quadros neutros reais**. O estimador confundiu esquerda/direita e colapsou alguns pares de juntas; a presença de 18 pontos não garantia um encaixe válido.

A rotina em tools/paper_doll_96_contact_refinement.cjs compara rótulos com os guias originais e com a superfície opaca nativa. Corrigiu 456 ocorrências em 127 quadros, incluindo o caso dos dois tornozelos sobre uma única perna. Os recibos e pontos anteriores ficam no pacote local; o rig público contém os contatos refinados. A correção não consome gerações.

- Botas e luvas acompanham seus próprios tornozelos/punhos, com rotação e profundidade do membro.
- A barra do tecido não se estende abaixo da peça nem pinta mãos livres. Uma camada de pele das mãos originais corrige o material neutro nos punhos, recortada à silhueta e abaixo dos dedos animados; não substitui o gesto por uma mão fixa.
- Calças e bermudas amostram o tecido nativo sobre a superfície real das pernas. Não deformam uma única malha através do vão entre elas.
- Capas são transportadas pela linha dos ombros e inclinação do tronco, sem alongamento arbitrário de sua altura.
- A cobertura da roupa superior feminina fecha pequenas lacunas com seus próprios pixels.
- Limpeza de componentes desconectados removeu 68 pixels em sete quadros e uma referência estática, preservando detalhes próximos a mãos e pés. Não equivale a remover todo pequeno grupo de pixels da arte.

## Biblioteca e arquivos

appearance-catalog.json registra os 26 modelos, paletas, calibrações e IDs. appearance-rig.json registra contatos e sockets. A pasta **Jade Dragon** do PixelLab contém **161 folhas finais**: 100 anteriores, 20 da primeira personalização e 41 novas (incluindo a matriz de mãos). Folhas existentes corrigidas são atualizadas no próprio ID.

- Materiais: 512×256, células128; colunas S/N/W/E, linhas masculino/feminino.
- Locomoção por camada: Idle 512×512, Walk 1024×512; células128, linhas S/N/W/E, 4 ou 8 quadros por linha. Camadas vazias são legítimas.
- Ataques por camada: 960×960, grade6×6/célula160; índices0–7 sul,8–15 norte,16–23 oeste,24–31 leste; últimos quatro vazios.
- Os atlas do navegador são tiras por direção. Não importar a tira como se fosse uma grade de outra dimensão.

O pacote local Personalizacao-96-v5 guarda fontes, máscaras, guias, recibos, cópias anteriores e painéis de revisão. Não publicar requests/base64, credenciais, capturas em massa ou saves. A atualização usa caminhos relativos e a allowlist de tools/build_pages.py.

## Custo e desempenho

Primeira personalização: 222,6 gerações registradas. Esta continuação: 42 em 14 animações, 54 em seis estilos, 7,2 em guias ainda não medidos, 8 em contatos novos e 9 na reparação mascarada da cabeça: **120,2 pelos recibos coletados**.

A leitura de saldo passou de3128,15 a2986,95: redução observada de141,2, maior que os recibos em21. Essa diferença não foi atribuída nem tratada como reembolso; o saldo é compartilhado pela conta. Exportações e correções exatas não tiveram novos jobs de geração. Não repetir jobs para tentar reconciliar saldo.

O compositor mantém limites de32 imagens,32 materiais,96 encaixes e64 composições. Cada render retém apenas as imagens que usa durante a operação; a expulsão do cache não desconecta peças ao alternar conjuntos. Rasterização limitada às regiões opacas evita percorrer o canvas inteiro para cada pequena peça.

## Validação e estado

A rotina de navegador percorre 11.024 casos individuais (26 modelos×424 posições), 13.568 quadros com os 32 conjuntos completos mistos e 1.944 combinações estáticas com slots vazios (3^5×8): **26.536 casos**. Também verifica22 matrizes espelhadas, contenção facial nos424 casos, braços erguidos, caches, troca de corpo, mobile, erros e save intocado. A suíte Node protege rótulos colapsados, contorno facial, ombros, paletas, IDs e cobertura das quatro direções.

Esses testes não homologam a estética nem demonstram ausência de toda interpenetração possível. Cabe revisar a prévia atual antes de ativar a migração na aventura normal. Não faltam Idle/Walk no contrato da bancada; produção, criação feminina e migração de saves continuam fora desta atualização.

### Revisão final de pixels — 29/10/2026

Além dos 68 pixels órfãos corrigidos nas bases, foram removidos 402 pixels residuais em 17 matrizes de acessórios: traços de olhos/mandíbula indevidamente extraídos com bandanas e elmos e fragmentos soltos nas capas. Destaques conectados e detalhes superiores dos acessórios foram preservados. A limpeza de acessórios de cabeça também está no extrator para evitar regressão em novas consolidações.

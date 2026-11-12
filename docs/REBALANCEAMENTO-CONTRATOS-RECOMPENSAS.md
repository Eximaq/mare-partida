# Rebalanceamento de contratos, combate e recompensas

## Contratos

As metas são fixadas ao gerar o ciclo. A rotina de referência reserva **4 h 30 min de caçada e 30 min estimados para outras atividades**. Abates e Berry avançam em paralelo. Cada faixa usa as medianas do ciclo completo de caçada da classe. As Semanais multiplicam as metas por sete e aceitam crédito de monstros elegíveis de qualquer mapa e espécie. O bônus final foi configurado separadamente em um Boost de XP nas Diárias e dois nas Semanais.

O simulador `tools/measure_contract_hunts.cjs` executou 105 amostras de 300 segundos no motor autoritativo, usando navegação e colisões reais, IA, ataques, habilidades automáticas, espera de reaparecimento e quatro poções iniciais. Foram sete classes, três sementes por combinação e cinco níveis de referência. Equipamento comum do catálogo, sem aprimoramento, potencial 11 e atributos 65/35 nos dois atributos da classe. A amostra inicial usa arma e peitoral. As demais usam até cinco peças. Sem talentos raros, Haki, fruta, Party ou bônus de Tripulação. Não é telemetria de produção nem garantia de tempo individual.

`node tools/measure_contract_hunts.cjs 0 300` reproduz as amostras. As metas abaixo usam Berry antes do multiplicador de facção. O jogo arredonda a meta diária após aplicar esse fator e multiplica o resultado por sete.

| Faixa | Mapa e nível amostrado | Classe | Abates/h | Berry/h | Abates/dia | Berry/dia | Abates/semana | Berry/semana |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 1–10 | Dawn · 5 | Espadachim | 468 | 14.940 | 2.106 | 67.230 | 14.742 | 470.610 |
| 1–10 | Dawn · 5 | Pugilista | 384 | 12.108 | 1.728 | 54.486 | 12.096 | 381.402 |
| 1–10 | Dawn · 5 | Atirador | 576 | 17.244 | 2.592 | 77.598 | 18.144 | 543.186 |
| 1–10 | Dawn · 5 | Gatuno | 708 | 21.972 | 3.186 | 98.874 | 22.302 | 692.118 |
| 1–10 | Dawn · 5 | Ciborgue | 168 | 4.992 | 756 | 22.464 | 5.292 | 157.248 |
| 1–10 | Dawn · 5 | Estrategista | 660 | 20.568 | 2.970 | 92.556 | 20.790 | 647.892 |
| 1–10 | Dawn · 5 | Curandeiro | 288 | 8.736 | 1.296 | 39.312 | 9.072 | 275.184 |
| 11–30 | Orange Town · 17 | Espadachim | 540 | 25.728 | 2.430 | 115.776 | 17.010 | 810.432 |
| 11–30 | Orange Town · 17 | Pugilista | 432 | 20.532 | 1.944 | 92.394 | 13.608 | 646.758 |
| 11–30 | Orange Town · 17 | Atirador | 612 | 28.932 | 2.754 | 130.194 | 19.278 | 911.358 |
| 11–30 | Orange Town · 17 | Gatuno | 780 | 36.984 | 3.510 | 166.428 | 24.570 | 1.164.996 |
| 11–30 | Orange Town · 17 | Ciborgue | 204 | 9.816 | 918 | 44.172 | 6.426 | 309.204 |
| 11–30 | Orange Town · 17 | Estrategista | 600 | 29.052 | 2.700 | 130.734 | 18.900 | 915.138 |
| 11–30 | Orange Town · 17 | Curandeiro | 384 | 17.844 | 1.728 | 80.298 | 12.096 | 562.086 |
| 31–49 | Loguetown · 35 | Espadachim | 240 | 48.024 | 1.080 | 216.108 | 7.560 | 1.512.756 |
| 31–49 | Loguetown · 35 | Pugilista | 216 | 42.636 | 972 | 191.862 | 6.804 | 1.343.034 |
| 31–49 | Loguetown · 35 | Atirador | 288 | 59.232 | 1.296 | 266.544 | 9.072 | 1.865.808 |
| 31–49 | Loguetown · 35 | Gatuno | 396 | 78.720 | 1.782 | 354.240 | 12.474 | 2.479.680 |
| 31–49 | Loguetown · 35 | Ciborgue | 72 | 14.364 | 324 | 64.638 | 2.268 | 452.466 |
| 31–49 | Loguetown · 35 | Estrategista | 240 | 51.204 | 1.080 | 230.418 | 7.560 | 1.612.926 |
| 31–49 | Loguetown · 35 | Curandeiro | 168 | 34.476 | 756 | 155.142 | 5.292 | 1.085.994 |
| 50–74 | Alubarna · 55 | Espadachim | 156 | 67.452 | 702 | 303.534 | 4.914 | 2.124.738 |
| 50–74 | Alubarna · 55 | Pugilista | 156 | 63.732 | 702 | 286.794 | 4.914 | 2.007.558 |
| 50–74 | Alubarna · 55 | Atirador | 240 | 99.816 | 1.080 | 449.172 | 7.560 | 3.144.204 |
| 50–74 | Alubarna · 55 | Gatuno | 288 | 116.868 | 1.296 | 525.906 | 9.072 | 3.681.342 |
| 50–74 | Alubarna · 55 | Ciborgue | 48 | 18.144 | 216 | 81.648 | 1.512 | 571.536 |
| 50–74 | Alubarna · 55 | Estrategista | 228 | 93.312 | 1.026 | 419.904 | 7.182 | 2.939.328 |
| 50–74 | Alubarna · 55 | Curandeiro | 120 | 51.144 | 540 | 230.148 | 3.780 | 1.611.036 |
| 75+ | Skypiea · 77 | Espadachim | 48 | 66.780 | 216 | 300.510 | 1.512 | 2.103.570 |
| 75+ | Skypiea · 77 | Pugilista | 48 | 66.744 | 216 | 300.348 | 1.512 | 2.102.436 |
| 75+ | Skypiea · 77 | Atirador | 72 | 95.232 | 324 | 428.544 | 2.268 | 2.999.808 |
| 75+ | Skypiea · 77 | Gatuno | 72 | 105.312 | 324 | 473.904 | 2.268 | 3.317.328 |
| 75+ | Skypiea · 77 | Ciborgue | 12 | 15.936 | 54 | 71.712 | 378 | 501.984 |
| 75+ | Skypiea · 77 | Estrategista | 72 | 102.336 | 324 | 460.512 | 2.268 | 3.223.584 |
| 75+ | Skypiea · 77 | Curandeiro | 24 | 38.040 | 108 | 171.180 | 756 | 1.198.260 |


A Jornada preserva os dez contratos de resgate único, seus IDs e seus recibos. A migração das Diárias preserva os resgates e aproveita o progresso de caça, reforços e Berry até as novas metas. As Missões Profissionais continuam em categoria própria com sua curva original. O crédito online reaproveita os recibos autoritativos de abate solo, Party, Impel Down, Masmorras e Boss Semanal. A demonstração local usa seu próprio fluxo de abate e save. O servidor atual não concede abates enquanto o jogador está desconectado.

## Fontes, quantidades e vínculo

| Fonte | Recompensa | Regra |
|---|---|---|
| Monstro de mapa NV. 40+ | 1 Fragmento Rank D | 12% de equipamento × 5% de Épico = **0,60%** por abate. Sorteio separado. Negociável. O servidor envia pelo Correio se a mochila estiver cheia. |
| Loja da Tripulação | 1 Fragmento Rank C | 100 Moedas de Contribuição. Negociável. |
| Akainu oficial | 1 Fragmento Rank B | 1% por participante elegível. Negociável. |
| Akainu oficial | 1 Fragmento de Haki | 1% independente. Em caso de sucesso, 50% Armamento e 50% Observação. Negociável. |
| Impel Down 1–14 / 15–29 / 30–100 | Caixa de Pérolas NV. 1 / 2 / 3 | Uma por andar elegível. Cada caixa abre em uma pérola do nível anunciado. Caixa e pérola negociáveis. |
| Masmorras 60 e 70 | 1 Caixa de Equipamento Épico | Caixa e equipamento vinculados. Abre arma ou armadura elegível com potencial de 70% e o nível registrado na vitória. |
| Masmorras 80 e 90 | 10 Fragmentos Rank B em cada | Vinculados. A receita de 20 do trabalho local anterior foi mantida. A fruta herda vínculo se qualquer fragmento consumido tiver vínculo. |
| Masmorras iniciais | Fragmentos Rank E | Vínculo original preservado. |
| Eventos Rank A e S | Conforme a configuração de cada evento | Não há evento configurado para gerar esses fragmentos na revisão integrada. Nenhuma fonte genérica os gera. |

A referência de renda da Tripulação soma 40 moedas de Caçada dos Mares, 35 de Bandeiras Conquistadas e 25 de Riqueza do Convés. São as três recompensas recorrentes disponíveis, todas semanais. A referência de 100 pressupõe a conclusão das três metas coletivas e participação individual válida em cada uma. O resgate é único por personagem, semana e tipo de missão. Compras debitam o saldo e mantêm o histórico. A troca de Tripulação conserva ambos.

O Boss Semanal reutiliza a elegibilidade oficial da revisão de Akainu. Grava um recibo por evento e personagem, contendo os dois resultados, inclusive quando ambos falham. A carta tem chave única no Correio. A repetição do processamento reutiliza o recibo e não duplica a carta. O modo de ensaio permanece isolado.

Os pools normais deixam de conceder pérolas e Caixas de Pérolas, inclusive pelo efeito de Senhor do Submundo. Os vínculos pertencem à instância ou pilha. Síntese, Mercado e Trocas preservam a origem e o vínculo e continuam sujeitos às regras operacionais vigentes.

## Zoans e Haki

| Rank | Multiplicador básico | Espadachim medido, humano → Zoan | Estrategista medido, humano → Zoan |
|---|---:|---:|---:|
| E | 1,20 | 110 → 132 | 208 → 249 |
| D | 1,35 | 115 → 155 | 208 → 280 |
| C | 1,55 | 116 → 179 | 208 → 322 |
| B | 1,65 | 126 → 207 | 208 → 343 |
| A | 1,75 | 115 → 201 | 208 → 364 |
| S | 2,00 | 110 → 220 | 208 → 416 |

As medições acima usam o motor real, alvo de defesa zero, sem crítico, com Haki permanente equivalente e semente fixa. Os inteiros exibem o arredondamento do motor. Rank A foi exercitado com uma fruta de teste, pois ainda não há Zoan desse rank no catálogo. O básico atual tem um impacto por execução. O multiplicador atua sobre o dano-base da classe antes de defesa e crítico. A Fúria Selvagem conserva a proteção e o antigo bônus extra de básico foi consolidado no multiplicador de rank. Habilidades ativas continuam com coeficientes próprios.

Antes, os nós iniciais alimentavam apenas os efeitos de ativação de ramo, sem bônus permanente no Poder. A tabela registra os **novos benefícios permanentes no estágio máximo**, divididos igualmente pelos três estágios de cada nó. Os efeitos ativos e nós finais existentes continuam no seu fluxo próprio.

| Ramo | Nó | Permanente antes | Permanente agora |
|---|---|---:|---|
| Armamento | Revestimento | 0 | +4% da margem de penetração |
| Armamento | Endurecimento | 0 | +9% de defesa |
| Armamento | Guarda Reforçada | 0 | +9% de defesa |
| Armamento | Imbuimento | 0 | +9% de ataque físico |
| Armamento | Emissão | 0 | +6% da margem de penetração |
| Observação | Percepção | 0 | +6% da margem de acerto |
| Observação | Antecipação | 0 | +12% da margem de evasão |
| Observação | Leitura de Intenção | 0 | +6% da margem de acerto |
| Observação | Serenidade | 0 | +10% da margem de evasão |
| Observação | Vislumbre do Futuro | 0 | +13% da margem de evasão |
| Conquistador | Presença Dominante | 0 | +4% de ataque físico e elemental |
| Conquistador | Vontade Inabalável | 0 | +6% de defesa |
| Conquistador | Pressão do Conquistador | 0 | +5% de ataque físico e elemental |

A margem de uma chance é a distância até 100% antes dos limites do atributo. Defesa 200 com Endurecimento no estágio 1 resulta em 206, o que acrescenta 30 de Poder pela defesa. O Poder também reconhece os ganhos efetivos de penetração, acerto e evasão. O combate parte dos atributos-base e aplica os efeitos de Haki uma vez. As duas formas Zoan partem da mesma referência de Haki.

## Evidências e validação

Um milhão de sorteios determinísticos em cada fluxo de medição.

| Resultado | Esperado | Observado |
|---|---:|---:|
| Rank D no mapa | 0,6000% | 0,5947% |
| Épico por abate | 0,6000% | 0,5945% |
| Rank B no Boss Semanal | 1,0000% | 1,0062% |
| Haki total no Boss Semanal | 1,0000% | 1,0133% |
| Armamento | 0,5000% | 0,5079% |
| Observação | 0,5000% | 0,5054% |
| Rank B e Haki na mesma conclusão | 0,0100% | 0,0078% |

O teste de repetição do Boss força resultados diferentes para três participantes, incluindo uma falha em ambas as categorias. Depois remove uma carta e verifica a entrega pendente sem consumir novas rolagens. Os testes de Impel Down cobrem todos os 100 andares, 14/15/29/30, serialização, mochila cheia e resgate repetido. Os testes das masmorras verificam que uma caixa conquistada no nível 174 abre no nível 174 após evoluir para 190, com potencial 70%, e que os dois baús Rank B entregam dez unidades cada. A síntese testa uma fruta negociável e outra vinculada ao gastar pilhas de fontes distintas.

A prévia foi aberta no navegador com um save DEV. Espadachim Pirata viu 2.106 abates e 72.609 Berry nas Diárias e 14.742 abates e 508.263 Berry nas Semanais. A Jornada mostrou dez contratos e a largura de 390 px não teve rolagem horizontal da página.

A revisão de Akainu usava a migração 0050 em paralelo ao histórico da main. O código reconhece a migração já aplicada somente se o checksum for idêntico ao SQL integrado em 0054, sem reescrever o registro existente. Os testes cobrem os dois históricos e a rejeição de checksum diferente. O CI executou o teste de persistência no PostgreSQL isolado, com resultados diferentes para três personagens e repetição sem nova rolagem ou entrega duplicada. Nenhuma migração foi aplicada em produção.

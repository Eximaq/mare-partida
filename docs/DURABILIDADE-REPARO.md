# Durabilidade e reparo

A aba **Reparar** da Forja das Correntes lista a mochila e os equipamentos em uso. A prévia da peça mostra condição, eficiência de ataque e defesa, Berry e poder antes e depois. Para peças na mochila, o poder é o que o personagem teria ao equipar a peça nos dois estados. **Reparar tudo** lista somente as peças equipadas com desgaste e cobra a soma dos preços confirmados.

## Regras

- Arma, cabeça, peitoral, calça, mãos, pés, capa, colar, anel, cinto e acessório têm 100.000 unidades por instância. Equipamento novo e equipamento antigo sem o campo começam em 100%. Zero é preservado. Cosméticos, Visual Completo, frutas, consumíveis, materiais e pérolas ficam fora da mecânica.
- Uma execução perde uma unidade em cada item funcional que estava equipado no lançamento, a partir do primeiro impacto confirmado. Ataques sucessivos recebem identidades distintas. Alvos múltiplos, projéteis e efeitos periódicos carregam a identidade da execução. Uma carga e sua soltura fazem parte da mesma execução, assim como os impactos da invocação. A ação cancelada, a esquiva, o erro, o alvo morto e efeitos visuais não geram desgaste. Dano recebido também não gera desgaste.
- A configuração inicial equivale a 1.000 acertos confirmados por ponto percentual. A peça continua equipada em 0% e conserva sua aparência. As chaves de preparação e de continuidade dos sprites desconsideram a condição.
- Ataque e defesa diretos do item são multiplicados após calcular o valor íntegro, incluindo suas contribuições aos caminhos físico e elemental existentes. Os atributos primários, pérolas, vida, energia, talentos e Haki mantêm suas etapas de cálculo.
- Online, o worker registra as peças alteradas na mesma transação da simulação. A confirmação da forja revalida IDs, propriedade, Berry, orçamento e sequência. A mesma requisição retorna o recibo. Uma peça reservada em troca fica protegida pelo banco, e uma peça com impacto pendente aguarda a resolução antes de sair da posse. O Mercado exibe a condição e mantém os dados da instância na entrega.
- A demonstração persiste no save existente. O worker online processa somente o período de simulação autorizado. A conexão interrompida não gera combate retroativo.

| Condição | Eficiência de ataque | Eficiência de defesa |
|---:|---:|---:|
| 100% a 80% | 100% | 100% |
| 60% | 95% | 97,5% |
| 50% | 90% | 95% |
| 40% | 85% | 92,5% |
| 20% | 70% | 85% |
| 0% | 50% | 75% |

A curva interpola linearmente entre as linhas.

## Berry

A base de um conjunto é `12.000 + 1.000 × nível da peça + 20 × nível²`. O preço da peça é o arredondamento para cima da base vezes o fator de raridade, o peso fixo do slot e a fração precisa perdida. Uma peça íntegra tem preço zero. O estado da mochila, a presença de slots vazios, o saldo, o potencial, o refinamento e as pérolas não mudam o preço unitário.

| Raridade | Fator | Slot | Peso |
|---|---:|---|---:|
| Comum | 1,00 | Arma | 25% |
| Incomum | 1,20 | Peitoral | 18% |
| Raro | 1,50 | Calça | 12% |
| Épico | 1,80 | Cabeça | 10% |
| Lendário | 2,20 | Mãos | 8% |
| Supremo | 2,70 | Pés | 8% |
| | | Capa | 6% |
| | | Cinto | 4% |
| | | Colar | 3% |
| | | Anel | 3% |
| | | Acessório | 3% |

Uma luva Rara de nível 40 custa 2.016, 3.024, 5.040, 8.064 ou 10.080 Berry partindo, respectivamente, de 80%, 70%, 50%, 20% ou 0%. A arma Rara do mesmo nível em 50% custa 15.750 Berry. As 11 peças Raras de nível 40 em 50% somam 63.000 Berry. Reparo não usa Fragmentos de Item. Aprimorar, imbuir e reforjar preservam a condição da instância. Fusão gera uma peça nova íntegra.

## Simulação econômica

Os ensaios usam o motor autoritativo e os mapas reais, com caçada e habilidades de classe automáticas, deslocamento, colisão, dano, morte, recompensas e poções. Cada cenário fixa o nível para comparar oito horas na mesma faixa de progressão. Os níveis das peças vêm das faixas de obtenção dos mapas, e os acessórios inexistentes na faixa são omitidos. As duas distribuições de atributos representam builds mais lentas e mais rápidas. O consumo de poções e a reposição a 35 Berry são simulados com saldo oriundo dos abates. Quando o conjunto alcança 20% e há saldo, o ensaio paga o reparo. O custo projetado inclui os reparos pagos e o orçamento residual.

As medições são reproduzíveis com `node tools/measure_durability_hunts.cjs 8`. O relatório discrimina hits, DPS observado pelo total de dano, abates, Berry, custo de poções, mortes, condição final, limites atingidos, custos pagos e pendentes. Os ensaios de calibração não são telemetria de jogadores, não simulam avanço de nível e não incluem bônus extraordinários ou transações entre jogadores. As habilidades de fruta em múltiplos impactos e dano periódico são cobertas por testes separados.


A [planilha de medições](balance-data/equipment-durability-hunts.csv) contém 42 sessões normais (sete classes, três faixas e duas builds), duas com raridades altas disponíveis no catálogo e um controle sem desgaste. Os números abaixo mostram o intervalo entre as duas builds de cada classe.

| Nível | Classe | Hits válidos | Condição final | Berry bruto | Manutenção / bruto | Poções usadas | Mortes |
|---:|---|---:|---:|---:|---:|---:|---:|
| 5 | sword | 34.082–34.392 | 65,6–65,9% | 55.398–56.034 | 4,6–4,7% | 1.586–1.604 | 220–253 |
| 5 | brawler | 28.929–29.280 | 70,7–71,1% | 40.667–40.848 | 5,3–5,4% | 904–1.060 | 0–2 |
| 5 | gunner | 14.697–30.049 | 70,0–85,3% | 28.747–56.938 | 3,8–4,0% | 640–1.630 | 19–173 |
| 5 | rogue | 46.299–46.495 | 53,5–53,7% | 83.859–84.383 | 4,1–4,2% | 2.399–2.414 | 111–119 |
| 5 | cyborg | 25.620–26.025 | 74,0–74,4% | 26.208–26.606 | 7,4% | 0 | 0 |
| 5 | strategist | 32.209–33.166 | 66,8–67,8% | 61.947–62.747 | 3,9–4,0% | 1.773–1.795 | 109 |
| 5 | healer | 29.369–30.120 | 69,9–70,6% | 34.299–35.921 | 6,3–6,4% | 959–983 | 92–159 |
| 38 | sword | 46.463–50.839 | 49,2–53,5% | 439.583–455.430 | 8,1–8,5% | 1.026–1.178 | 0 |
| 38 | brawler | 40.182–44.045 | 56,0–59,8% | 343.992–359.876 | 8,9–9,3% | 0 | 0 |
| 38 | gunner | 48.179–48.364 | 51,6–51,8% | 368.565–383.621 | 9,1–9,5% | 1.830–2.119 | 0 |
| 38 | rogue | 73.493–73.522 | 26,5% | 481.091–484.414 | 11,0–11,1% | 1.360–1.572 | 0 |
| 38 | cyborg | 40.169–42.270 | 57,7–59,8% | 147.891–155.760 | 19,6–19,7% | 0 | 0 |
| 38 | strategist | 43.307–46.511 | 53,5–56,7% | 485.753–490.590 | 6,4–6,9% | 1.524–1.588 | 0 |
| 38 | healer | 41.440–44.965 | 55,0–58,6% | 276.874–288.758 | 10,8–11,3% | 502–631 | 0 |
| 80 | sword | 66.404–74.862 | 25,1–33,6% | 1.620.190–1.697.434 | 9,9–10,6% | 179–379 | 0 |
| 80 | brawler | 58.402–59.907 | 40,1–41,6% | 1.293.997–1.321.040 | 10,7–11,2% | 0 | 0 |
| 80 | gunner | 63.738–64.770 | 35,2–36,3% | 1.867.600–1.938.961 | 8,8–9,3% | 4–164 | 0 |
| 80 | rogue | 82.197–82.373 | 97,6–97,8% | 1.952.523–1.969.320 | 11,2–11,3% | 0–19 | 0 |
| 80 | cyborg | 52.954–59.576 | 40,4–47,0% | 955.917–1.049.451 | 14,9–15,3% | 0 | 0 |
| 80 | strategist | 50.728–54.851 | 45,1–49,3% | 3.180.080–3.232.376 | 4,2–4,6% | 0 | 0 |
| 80 | healer | 51.655–57.027 | 43,0–48,3% | 2.112.978–2.196.438 | 6,6–7,0% | 0 | 0 |

Os resultados justificam manter a escala e os preços iniciais para revisão. Um ajuste geral de preço ou escala aumentaria o custo na mesma direção para o Ciborgue intermediário, que já ficou acima da meta, e para o Estrategista avançado, que ficou abaixo. A meta de 10%–15% não foi atingida em todas as classes.

- **Nível 5:** 3,85%–7,36% da receita. Oito das 14 sessões gastaram quase toda a receita repondo poções e terminaram sem saldo para restaurar o conjunto inteiro. Nenhuma atingiu 50% de condição. O controle do Espadachim lento teve 220 mortes tanto com quanto sem desgaste. Sem desgaste, creditou 56.040 Berry e consumiu 1.605 poções. Com desgaste, creditou 56.034 Berry, consumiu 1.604 poções e terminou com 2.566 Berry de manutenção a pagar. A pressão de poções já existia nesse cenário e o reparo adicionou custo.
- **Nível 38:** 6,39%–19,66% da receita. O Ciborgue pagaria a maior fatia e manteve saldo positivo, com zero poções e zero mortes. Todas as 14 sessões tiveram saldo depois do custo de poções e da manutenção.
- **Nível 80:** 4,22%–15,26% da receita. As duas builds de Gatuno chegaram a 20%, pagaram um reparo e retomaram a caçada. Todas as sessões normais mantiveram saldo positivo, sem mortes. Os cenários de raridade alta do Espadachim e do Ciborgue ficaram em 3,16% e 3,93%, respectivamente. Com os conjuntos medidos, a renda subiu mais que o custo; esses dois cenários não sustentam uma afirmação geral sobre o preço de todo conjunto Supremo.

A meta deve ser reavaliada com caçadas de jogadores e mais combinações por classe, em especial no início da progressão e nas classes com receita muito diferente por ação confirmada. Nos alvos autoritativos exercitados, o validador observou dano efetivo. Um caminho de escudo hostil que absorva integralmente o impacto precisa de validação quando existir um alvo que o use.

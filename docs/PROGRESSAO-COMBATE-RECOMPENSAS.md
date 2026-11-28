# Progressão, drops e recompensas de combate

O relatório abaixo registra a curva v4 da primeira revisão do PR #393. A curva vigente v5 e os valores atualizados de Conchas estão na [auditoria até o nível 185](PROGRESSAO-ATE-185.md).

A base de comparação é a `main` em `79026bca14529a656f9ecc073810a578cabb4d7b`. A [tabela de progressão e monstros](PROGRESSAO-CACADAS-DADOS.md) apresenta todas as faixas de 1 a 185 e os 41 perfis normais dos 37 mapas, com XP, abates, HP, ataque, defesas e cadência.

## Progressão e caçadas

A curva v4 ancora a progressão em 128 abates entre os níveis 30 e 35. O Parque Arlong abre no nível 31. Os blocos seguintes crescem 12% antes do arredondamento. A faixa 175 a 180 exige 3.424 abates. Depois do último conteúdo, cada bloco acrescenta 120 abates à referência anterior. O cálculo conserva a sobra a cada abate e passa a usar o mapa recém-liberado no nível de abertura.

Cliente e servidor usam a ordem de desbloqueio do arquipélago. A XP normal vale 100% no último mapa de caça acessível e 50% em cada mapa anterior, mesmo sem o jogador visitar o mapa novo. O servidor aplica esse fator por personagem, incluindo em Party, antes dos bônus de XP aplicáveis. Masmorras, contratos e eventos mantêm seus contratos próprios.

César, nível 5, passou de 443 para 222 HP e de 33 para 17 de ataque. A defesa 20 e a mitigação já presente no dano foram preservadas. Helmeppo passou de 599 para 674 HP e de 44 para 47 de ataque, com mais tempo entre golpes para dar espaço à recuperação. Bananawani e os monstros seguintes usam curvas contínuas de HP, ataque e defesa. Jozu passou de 1.526.357 para 170.483 HP, de 34.165 para 11.665 de ataque e de 10.968 para 3.604 de defesa física.

### Simulação de caçada

O script `tools/measure_world_progression.cjs` exercita o motor de batalha do servidor com navegação, disponibilidade de alvos, relógio, habilidades automáticas, defesa, regen, quatro poções disponíveis e respawn. Cada cenário dura dois minutos, sem ganho de nível durante a medição. Em cada comparação, a classe, o nível, a build, o equipamento e a semente são iguais nos mapas concorrentes. O personagem normal usa pontos recomendados, itens alcançáveis no mapa anterior, potencial 35/55, aprimoramento 0/+2 e talentos provenientes de até duas conquistas elegíveis. Os perfis básico e desenvolvido foram contrastados em Dawn, Conchas, Alabasta e Marineford 6. O desenvolvido usa potencial 70, até +4 e passiva plausível de fruta E/D onde disponível. Nenhum perfil recebe Haki ou bônus de XP opcionais.

Foram 336 cenários antes e 336 depois. A tabela usa a mediana das sete classes para o perfil normal. O tempo de abate começa no primeiro dano e inclui apenas alvos abatidos. Barras de HP somam o dano recebido ao longo da sessão, incluindo após curas. Mortes são o total nas sete sessões. A comparação de cada marco inclui até dois mapas anteriores selecionados pelo script.

| Mapa novo e nível | XP/min no novo antes → depois | Melhor mapa anterior antes | Melhor mapa anterior depois, com 50% | Vantagem depois | Abates antes → depois | Tempo de abate em s | Barras de HP | Poções usadas | Mortes |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| Ilha Dawn (1) | 21 → 56 | — | — | — | 3 → 8 | 24,7 → 13,2 | 2,3 → 0,9 | 4 → 1 | 4 → 0 |
| Cidade das Conchas (5) | 36 → 65 | 56 | 49 (Ilha Dawn) | +32,7% | 4 → 5 | 27 → 27,2 | 4,5 → 4,2 | 4 → 4 | 16 → 12 |
| Parque Arlong (31) | 1.152 → 432 | 864 | 241,5 (Vila Syrup) | +78,9% | 16 → 16 | 5,3 → 5,3 | 0,2 → 0,2 | 0 → 0 | 0 → 0 |
| Deserto de Alabasta (40) | 1.800 → 490 | 2.074 | 270 (Parque Arlong) | +81,5% | 10 → 14 | 9,2 → 6,5 | 0,3 → 0,2 | 0 → 0 | 0 → 0 |
| Alubarna 01 (50) | 3.840 → 585 | 2.028 | 285 (Loguetown) | +105,3% | 12 → 13 | 8 → 7 | 0,3 → 0,3 | 0 → 0 | 0 → 0 |
| Ilha dos Anjos (75) | 11.675 → 567 | 10.926 | 360 (Loguetown) | +57,5% | 5 → 9 | 16,6 → 9,1 | 0,5 → 0,3 | 0 → 0 | 0 → 0 |
| Enies Lobby 1 (95) | 47.274 → 588 | 18.596 | 450 (Alubarna 05) | +30,7% | 2 → 7 | 42,5 → 11,1 | 0,7 → 0,3 | 0 → 0 | 0 → 0 |
| Thriller Bark 1 (114) | 64.718 → 624 | 97.012 | 360 (Ilha dos Anjos 4) | +73,3% | 1 → 6 | 57,3 → 13,8 | 0,7 → 0,3 | 0 → 0 | 0 → 0 |
| Sabaody 1 (131) | 151.503 → 645 | 114.782 | 450 (Enies Lobby 5) | +43,3% | 1 → 5 | 77,8 → 16,4 | 0,9 → 0,3 | 0 → 0 | 0 → 0 |
| Marineford 1 (151) | 0 → 825 | 18.512 | 434 (Thriller Bark 4) | +90,1% | 0 → 5 | 61,3 → 19,3 | 1,1 → 0,4 | 0 → 0 | 0 → 0 |
| Marineford 6 (176) | 0 → 828 | 43.435 | 474 (Sabaody 4) | +74,7% | 0 → 4 | 80,8 → 24,4 | 1,5 → 0,4 | 0 → 0 | 0 → 0 |

Cidade das Conchas passou de 16 para 12 mortes somadas. Todas as classes tiveram XP/min superior ao de Dawn depois da mudança. Algumas classes ainda morreram repetidamente sem reposição de poções. No início, com o mesmo Espadachim Nv. 1 e sem guarda, um golpe determinístico de César passou de 11 para 6 HP. A caçada de Jozu, no último mapa, passou de zero para quatro abates por sessão na mediana.

| Mapa novo | XP/min do básico | XP/min do normal | XP/min do desenvolvido |
|---|---:|---:|---:|
| Ilha Dawn | 49 | 56 | 70 |
| Cidade das Conchas | 39 | 65 | 91 |
| Deserto de Alabasta | 105 | 490 | 560 |
| Marineford 6 | 0 | 828 | 2.070 |

A simulação é uma amostra curta por classe e mapa, com equipamento e regras fixos. A vantagem de 10% a 20% foi usada como referência de calibração. O fator único de 50%, a cadência e a disponibilidade de alvos fizeram várias comparações ficarem acima dessa faixa. O resultado informa o ganho de eficiência observado, sem extrapolar para todas as rotas ou estilos de jogo.

## Itens

As probabilidades abaixo são por abate de monstro do mundo. O fragmento usa uma roleta separada dos 12% de equipamento. Em nível 100 ou superior, a roleta de fragmento resulta em 0,6% D, 0,3% C ou 99,1% sem fragmento. O nível do personagem continua participando da geração do nível do equipamento dentro da faixa do mapa.

| Resultado | Monstro até Nv. 39 | Nv. 40–99 | Nv. 100+ |
|---|---:|---:|---:|
| Fragmento D | 0% | 0,6% | 0,6% |
| Fragmento C | 0% | 0% | 0,3% |
| Equipamento comum | 7,2% | 7,2% | 6,9% |
| Incomum | 3% | 3% | 3% |
| Raro | 1,2% | 1,2% | 1,2% |
| Épico | 0,6% | 0,6% | 0,6% |
| Lendário | 0% | 0% | 0,3% |
| Supremo | 0% | 0% | 0% |
| Sem equipamento | 88% | 88% | 88% |

O primeiro D permanece com o Marinheiro de Loguetown, nível 40. Fukurou, nível 97, permanece elegível só ao D. O primeiro C e o primeiro lendário são de Kalifa, nível 101, em Enies Lobby 2. O catálogo de lendários elegíveis tem 21 equipamentos. Os fragmentos de caçada são negociáveis e o servidor usa o Correio quando falta espaço. O protótipo offline guarda itens na mochila local e não tem servidor de Correio.

| Rank | Fragmentos para formar | Resultado |
|---|---:|---|
| E | 10 | Akuma no Mi E |
| D | 20 | Akuma no Mi D |
| C | 20 | Akuma no Mi C |
| B | 20 | Akuma no Mi B |
| A | 20 | Akuma no Mi A |
| S | 20 | Akuma no Mi S |

A formação usa pilhas desbloqueadas de um único rank e prioriza negociáveis. A fruta herda o vínculo quando pelo menos um fragmento consumido é vinculado. A formação usa a sequência de operação existente. Um rank sem fruta elegível mantém os materiais. Fontes especiais dos fragmentos A e S permanecem em seus conteúdos.

## Masmorras de chefes

| Nível | Nova recompensa única |
|---|---|
| 80, Wapol | 10 Fragmentos de Akuma no Mi C vinculados |
| 90, Crocodile | 10 Fragmentos de Akuma no Mi C vinculados |
| 100 | 1 Caixa de Equipamento Épico Aleatório |
| 110 | 1 Caixa de Equipamento Épico Aleatório e 10 Fragmentos de Akuma no Mi B vinculados |
| 120 | 5 Fragmentos de Arma Lendária |
| 130 | 5 Fragmentos de Arma Lendária e 10 Fragmentos de Akuma no Mi B vinculados |
| 140 | 5 Fragmentos de Arma Lendária |
| 150 | 5 Fragmentos de Arma Lendária |
| 160 | 1 espada completa Rank B do Compêndio |
| 170 | 1 espada completa Rank B do Compêndio |
| 180 | 1 espada completa Rank A do Compêndio |

As caixas novas usam nível registrado na vitória e potencial 70. Caixas, fragmentos lendários e espadas completas dessa tabela são negociáveis. Espadas completas são itens de coleção. Ativar uma unidade registra a espada e o bônus existente uma vez. Cópias da mesma espada permanecem disponíveis para negociação.

A revisão de referência não continha um material canônico nem uma receita ativa de Arma Lendária. Foi adicionado um material único, `legendary_weapon_fragment`, usando o mesmo mecanismo de síntese das armas épicas. A nova síntese usa 20 fragmentos, total das quatro recompensas de 5, e gera uma arma lendária negociável. O material e a receita épica permanecem próprios.

## Persistência e verificação

A migração 0067 conserva o nível conquistado, o ponto de início da XP acumulada no banco, os pontos e desbloqueios e converte a fração de avanço dentro do nível para o requisito v4. A conversão local usa a versão da curva gravada no save. Caçadas em andamento preservam inimigos, posições e a proporção de vida restante. A migração 0068 amplia os registros de recompensas e mantém as chaves de resgate único e as operações atômicas. Itens e recompensas já recebidos continuam registrados. Baús ainda pendentes de Wapol e Crocodile passam a entregar Rank C. A vitória já registrada continua válida.

- `npm run build` e `npm run typecheck` passaram.
- 24 testes de fundamentos passaram. Cobriram limites da roleta, mochila cheia e Correio, formação E–S, vínculo, baús, síntese, Compêndio, comandos e combate do servidor.
- 28 testes locais de regras passaram na execução conjunta. Dois testes de sprites do CP9 pararam por falta dos arquivos de arte no checkout local reduzido. Os testes continuam no projeto e a atualização preserva o renderizador.
- Chromium com o cliente desta branch e os assets do jogo. César apareceu no mapa com 222 HP e causou 6 HP de dano ao personagem de referência. A interface marcou Dawn em 50% e Conchas em 100%. A formação consumiu duas pilhas C, gerou uma fruta C vinculada e deixou zero fragmentos. A janela de Wapol mostrou 10 fragmentos C. A sessão encerrou sem erro de página nem recurso ausente.
- A integração SQL está coberta por testes destinados ao PostgreSQL descartável da CI. O ambiente local não tem uma instância de teste.

Para repetir a simulação de combate com duas cópias das revisões:

```sh
node tools/measure_world_progression.cjs /caminho/para/base-79026bca 120 > antes.jsonl
node tools/measure_world_progression.cjs . 120 > depois.jsonl
```

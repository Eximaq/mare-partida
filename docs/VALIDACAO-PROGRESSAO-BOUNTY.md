# Validação de progressão e combate

## XP de personagem

O custo passa a um terço do anterior, arredondado para cima. Cada abate abaixo usa o XP creditado pelo jogo sem bônus e sem divisão em Party. Os abates equivalentes partem de zero XP no nível.

| Monstro | Nível | XP até o próximo nível | XP por abate | Abates equivalentes |
| --- | ---: | ---: | ---: | ---: |
| César | 5 | 781 → 261 | 7 → 14 | 112 → 19 |
| Bananawani | 45 | 499.318 → 166.440 | 180 → 360 | 2.774 → 463 |
| Satori | 77 | 2.631.167 → 877.056 | 2.335 → 4.670 | 1.127 → 188 |

O XP acumulado continua registrado na migração. O XP dentro do nível avança o personagem apenas quando atinge os novos requisitos e carrega o excedente. Baús, missões e marcos preservam as recompensas próprias. Os antigos encontros fixos do tutorial mantêm sua curva de compatibilidade.

## Masmorras de Chefes

Dez tentativas por encontro no motor de combate, com os caminhos e os ataques do jogo. A dupla usou Lutador e Espadachim da facção Pirata, com 70% dos pontos no atributo primário e o restante no secundário. A progressão até o nível de entrada foi simulada com os abates e a curva nova, sem simular sorteio de equipamentos. Cada personagem começou com quatro poções de vida e recarga de cinco segundos. Sem talentos, frutas ou Haki. Equipamentos comuns +0 de potencial 35%. As durações e poções incluem vitórias e derrotas.

| Chefe | Nível | Equipamentos da dupla | Vitórias | Duração | Poções somadas |
| --- | ---: | --- | ---: | ---: | ---: |
| Alvida | 10 | Arma e torso Nv. 1 | 4/10 | 23,15–26,65 s | 2–3 |
| Morgan | 20 | Arma e torso Nv. 1 | 4/10 | 18,40–23,60 s | 2–3 |
| Buggy | 30 | Arma, torso, cabeça e pés Nv. 5 | 4/10 | 24,40–33,40 s | 2–4 |
| Kuro | 40 | Arma, torso, cabeça e pés Nv. 7 | 4/10 | 19,05–22,65 s | 2–3 |
| Kuro solo | 46 | Espadachim básico, mesmas quatro peças Nv. 8, zero pontos distribuídos | 0/10 | 7,60–8,55 s | 1 |

Foram usados Punhos de Bronze ou Espada de Ferro Salgado, Casaco de Marinheiro, Bandana das Correntes e Botas de Navegante. A sequência inicial de Alvida causou 486 a 540 de dano nos primeiros cinco segundos de contato ao Lutador de 967 PV. Kuro causou de 2.036 a 2.038 de dano nos primeiros cinco segundos de contato contra o Espadachim de 1.625 PV. A recuperação nesse intervalo é de cerca de 413 PV, somando uma poção e a regeneração. O caso histórico de vitória solo não foi reproduzido com esse equipamento.

## Dano de monstros

Valores sem rolagem aleatória, com os perfis reais do mapa. O Espadachim usou as quatro peças comuns de referência e zero pontos distribuídos. O Ciborgue investiu os pontos disponíveis em Vitalidade, tem 12% de mitigação de classe e usa as mesmas categorias de equipamento comum. A guarda é apresentada separadamente.

| Monstro | Ataque bruto | Alvo | Defesa | Dano antes → depois | Com guarda antes → depois |
| --- | ---: | --- | ---: | ---: | ---: |
| César Nv. 5 | 33 | Espadachim Nv. 5 | 39 | 15 → 8 | 10 → 5 |
| Bananawani Nv. 45 | 352 | Espadachim Nv. 45 | 97 | 90 → 119 | 60 → 80 |
| Bananawani Nv. 45 | 352 | Espadachim Nv. 46 | 98 | 89 → 118 | 60 → 80 |
| Bananawani Nv. 45 | 352 | Ciborgue Nv. 45 | 393 | 24 → 34 | 14 → 20 |
| Bananawani Nv. 45 | 352 | Ciborgue Nv. 46 | 400 | 23 → 34 | 14 → 20 |
| Satori Nv. 77 | 1.669 | Espadachim Nv. 77 | 145 | 311 → 427 | 207 → 285 |
| Satori Nv. 77 | 1.669 | Ciborgue Nv. 77 | 637 | 73 → 106 | 42 → 62 |

Intervalos dos perfis em torno de 0,80 s para César, 0,76 s para Bananawani e 0,71 s para Satori. A Defesa era multiplicada por três na redução PvE. Com a mitigação de classe e uma rolagem de 1,08, o Bananawani chegava a 26 no Ciborgue nível 45 sem guarda. A redução agora usa um multiplicador de dois em encontros de mapa a partir do nível 45. A Defesa, a guarda e a mitigação de classe continuam efetivas.

## Bounty

O cartaz WANTED e o perfil exibem somente o valor atualizado. A Tripulação contribui com o poder oficial dos seus membros atuais. GvG e duelos estão inativos. O registro preparado para resultados oficiais rejeita anulações, duplicidades, duelos da mesma conta e excesso de vitórias repetidas.

## Verificações

- 233 testes da fundação e 181 arquivos de testes Node legados passaram.
- Compilação e verificação de tipos passaram.
- Prévia estática construída com build_pages.py e verificada no Chrome em oito tamanhos de tela, incluindo toque, teclado e recarregamento. O mesmo valor aparece no cartaz e no perfil.
- Seis amostras de migração de XP foram conferidas com SQL em PostgreSQL embarcado PGlite, comparando a implementação JavaScript. Os casos incluem excedente de múltiplos níveis e compatibilidade do tutorial.
- O registro SQL de vitórias foi exercitado no mesmo ambiente isolado, com rejeição de resultados inválidos e duplicados. O limite preventivo preparado é de três créditos por adversário em 24 horas.
- Foram acrescentados testes de integração para a CI com PostgreSQL nativo. Essa suíte depende do banco isolado configurado pelo projeto e não foi executada neste computador.

As referências configuráveis de balanceamento da Bounty usam nível 200 como referência de normalização, pois a progressão atual de personagem não tem teto fixo. As demais referências são iniciais de balanceamento. A troca de versão permite recalibrá-las em conjunto.

# Manoplas15/109/111/112/117 + pants133 + boots9

O adaptador de pants133 agora aceita também as fontes isoladas boots9 para as5 famílias masculinas comprovadas. Nenhum arquivo de arte foi criado, reduzido ou modificado. Não altera save, arma ou corpo. O ataque exige o mesmo `baseRecord` do contrato pants133 e as mesmas camadas fixas do lote boots9 já registrado.

Idle/walk preservam as poses de pernas já validadas pelo adaptador pants133. Idle lateral usa o frame12 das fontes walking da bota, como o registro standing da calça; o walkWEST espelha o conjuntoEAST inteiro de forma consistente com a base existente. A bota permanece atrás dos braços/mãos e acima da roupa inferior. A camada é classificada como roupa, não pele, impedindo recolorir couro pela paleta corporal.

`player-rework-gauntlet-boots9-family-hd.test.cjs` cobre as5famílias, ataque4direções, diferenças restritas à união das máscaras de calça/bota (tolerânciaCanvas6 já usada no teste pai), preservação de arma e save, prepare/select/drawStable nativo e todos68frames de carry representativo. Boots148 não é aceito por esse contrato. Os3testes novos e2testes de regressão pants133 passaram.

Encaixes seguem candidatos de calibragem; esta prova de composição não equivale a captura visual in-game. Sem liberação arbitrária de outras vestimentas, botas ou paletas.

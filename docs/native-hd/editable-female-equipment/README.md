# Fontes editáveis do equipamento feminino

O [pacote de revisão](feminino-fontes-editaveis.zip) guarda a arte original das calças, botas e luvas usadas nos 10 conjuntos do feminino. O PNG de cada peça fica independente do corpo e da arma. O manifesto inclui item, direção da fonte, convenção de fase, dimensão, ordem/profundidade quando declarada e SHA-256. Há 928 referências a 453 PNGs únicos no pacote. As fases de origem são de repouso ou caminhada quando a respectiva peça veio dessas ações; não representam o ataque de espada ou tiro completo.

| Calça | Bota | Luva |
| --- | --- | --- |
| 21 | 9 | 180 |
| 22 | 155 | 152 |
| 133 | 134 | 138 |
| 140 | 141 | 145 |
| 147 | 176 | 173 |
| 154 | 148 | 166 |
| 161 | 169 | 25 |
| 168 | 162 | 131 |
| 175 | 8 | 26 |
| 182 | 183 | 159 |

O pacote inclui os oito PNGs do ajuste autorizado da calça 22 no Norte. O ajuste cobre frestas na coxa e na junção ao cano usando tecido próprio. Bota, corpo, tons e vistas do Leste/Oeste não foram alterados por esse ajuste. Os testes de retirada e reversão foram feitos no cenário de validação do encaixe. Não se troca uma animação inteira ao importar uma peça.

## Limites

- Apenas fontes e material de revisão. Nenhum seletor, flag, catálogo, save, fase, deploy ou comportamento do jogo mudou. O manifesto declara `productionEnabled: false`.
- Alguns itens têm matéria original para só parte das direções; uma fonte de tecido ou de repouso não autoriza uma pose de ataque. O clipe de encaixe dos 30 itens também não substitui a animação de espada aprovada.
- A animação feminina de tiro em oito fases fica fora. O vídeo do Rifle 113 não traz arquivos de corpo/roupa editáveis para essa versão. Os arquivos históricos de tiro do acervo e o registro masculino não comprovam essas camadas da versão feminina. Na versão atual do registro recuperado, as pernas claras fazem parte do corpo vestido e não mudam com o tom da pele. Não se promoveu esse registro no lugar da animação aprovada.
- A base de revisão é o head do PR #331. O código e os ZIPs já versionados naquele PR não foram duplicados no diff.

## Verificar

SHA-256 do ZIP: `248e93a8db3af836da68b4502ccb17d6f69e432c3b9ccab903805006d017b176`.

Execute `python3 docs/native-hd/editable-female-equipment/verify.py` para verificar os 30 IDs, integridade SHA, caminhos, transparência e que o ajuste da calça 22 continua restrito ao Norte. A verificação do pacote não é teste de integração no mapa.

## Prioridade quando houver conflito com commits anteriores

O [contrato de precedência](PRECEDENCE.json) orienta a integração: para o mesmo corpo, peça, ação, direção e fase, a camada editável nova verificada tem prioridade sobre composição antiga ou fonte fundida. Uma peça faltante não desativa camadas prontas das demais peças. Quando a rota ainda não tem camada verificada, mantenha o comportamento anterior para aquele escopo, sem trocar a arte final aprovada por um ciclo de teste.

O ajuste da calça 22 tem prioridade **somente** no recorte documentado (feminino, espada, Norte, oito fases), condicionado à equivalência da pose alvo na integração. Nenhuma prioridade de runtime é ativada neste rascunho; portanto ele não resolve por si só conflitos entre a base do PR #331 e a `main`.

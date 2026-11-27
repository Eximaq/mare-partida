# Desafio das Sete Lâminas

Em Modos de Jogo, o **Desafio das Sete Lâminas** abre às 20h e termina às 21h, no fuso `America/Sao_Paulo`. Entre pelo Porto das Correntes com um personagem de nível 100 ou superior.

| Dia | Chefe |
|---|---|
| Segunda-feira | Mihawk |
| Terça-feira | Shanks |
| Quarta-feira | Ryuma em vida |
| Quinta-feira | Oden |
| Sexta-feira | Rayleigh |
| Sábado | Zoro |
| Domingo | Shiki |

O primeiro ingresso abre a arena do dia. Todos enfrentam o mesmo chefe, com até 16 participantes simultâneos. A vitória ou o fim da janela retorna o grupo ao porto. Para receber fragmentos, é necessário causar dano confirmado ou curar outro participante efetivamente. A morte e a tolerância de reconexão do servidor preservam a contribuição já registrada.

A arena utiliza o mapa, os objetos, a cobertura e as colisões do ZIP fornecido, com 12 pontos de entrada. O encontro usa a infraestrutura cooperativa existente e as geometrias, artes, animações e efeitos de `daily-sword-boss-*` incorporados pelos PRs #379–381. O ataque de referência usa o perfil normal de Kuma de Sabaody. O chefe tem 333.000 PV, 764 de ataque e nível 120. A vida de referência é uma estimativa de 6 jogadores × 185 DPS efetivos × 300 s. A composição real do grupo, a movimentação e as defesas mudam esse tempo. Esses números ainda precisam de avaliação com grupos reais.

## Compêndio de Espadas

O **Compêndio de Espadas** fica em **Personagem → Espadas**. Usa as 40 artes fornecidas com seus ranks originais.

| Rank | Espadas | Chance por vitória elegível | Quantidade ao acertar a rolagem | Fragmentos para ativar | Bônus por atributo | Vitórias esperadas para uma espada específica |
|---|---:|---:|---:|---:|---:|---:|
| E | 5 | 100% | 6–10 | 20 | 0,05% | 12,5 |
| D | 7 | 85% | 2–5 | 20 | 0,075% | 47,06 |
| C | 8 | 30% | 1–2 | 15 | 0,10% | 266,67 |
| B | 7 | 10% | 1 | 10 | 0,15% | 700 |
| A | 9 | 2% | 1 | 10 | 0,20% | 4.500 |
| S | 4 | 0,5% | 1 | 10 | 0,25% | 8.000 |

A estimativa de progressão divide o requisito pelo rendimento médio de fragmentos da espada por vitória. As espadas de um rank têm o mesmo peso. A média de rank S é de 200 vitórias por fragmento de qualquer espada S. O bônus da coleção completa é de **5,425% em cada um dos cinco atributos**.

O resgate pelo Correio e o recebimento de uma negociação consultam a ativação de cada espada. Enquanto inativa, 18 fragmentos mais 5 resultam em 23/20 no contador. Ativar consome 20, concede o bônus permanente e entrega três fragmentos negociáveis. Com mochila cheia, os três ficam no Correio até haver espaço. A aquisição via Mercado chega pelo fluxo existente de Correio.

## Apresentação HD

O Compêndio reutiliza as molduras e a tipografia de Akuma no Mi. As 40 imagens e seus ícones vêm das artes fornecidas. As sete espadas de Rank B e três de Rank A vieram em 290 × 530. O reenquadramento conserva as proporções das lâminas e separa do bitmap a moldura, o nome e o rank, exibidos pela HUD. O jogo usa WebP de 768 × 768 para as cartas e de 192 × 192 para os fragmentos.

O Desafio reutiliza os componentes visuais da Masmorra de Chefes. As sete ilustrações de 1024 × 1024 ficam em `assets/ui/sword-event/`. Cada retrato foi gerado individualmente com ImageGen, usando o retrato de Rob Lucci da Masmorra como referência de estilo. A direção pedida foi retrato de cintura para cima, anime cinematográfico com pintura detalhada, cenário costeiro e silhueta reconhecível, sem texto nem moldura.

| Arte | Direção visual |
|---|---|
| Mihawk | Yoru e fortaleza costeira sob a lua |
| Shanks | Capa escura e sabre no convés sob a tempestade |
| Ryuma em vida | Traje samurai azul, Shusui e ponte de pedra |
| Oden | Traje laranja, corda cerimonial e duas katanas |
| Rayleigh | Cabelos prateados, óculos e porto ao crepúsculo |
| Zoro | Traje verde, três katanas e arco portuário |
| Shiki | Cabeleira dourada e fortaleza aérea ao pôr do sol |

## Publicação e verificação

A publicação do servidor requer a migração `0064_sword_compendium.sql` e a atualização do cliente e do servidor na mesma versão. A migração registra as coleções, as vitórias individuais e o novo mapa no esquema da infraestrutura cooperativa.

- `npm run build`
- `python tools/build_pages.py`
- `node --test tests/sword-compendium.test.cjs`
- Com `TEST_DATABASE_URL` apontando para PostgreSQL local, `node --import tsx --test --test-concurrency=1 tests/integration/server-sword-compendium.test.mts tests/integration/server-weekly-boss.test.mts`.

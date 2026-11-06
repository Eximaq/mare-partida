# Mercado dos Mares

O comércio entre personagens fica em **HUD Mestre → Social → Mercado dos
Mares**. A loja de Donquixote tem um atalho para a mesma janela e consulta o
mesmo serviço de mercado. Compras de suprimentos feitas na própria loja
usam o catálogo do NPC e não são anúncios de jogadores.

O mercado foi criado na migração **0047**. A **0049** atualiza as permissões e protege o estorno de Berry reservado; aplique-a também em instalações que já usam o mercado.
A compra de Poção de Mana na loja online requer também a **0048**. O cliente
estático não habilita o comércio entre personagens no jogo local.

## MARKET-FEE-POLICY

A comissão padrão é de 10% sobre o valor vendido. A configuração do
servidor `MARE_MARKET_FEE_BPS=1500` usa 15% em novos anúncios; `1000` mantém
10%. A taxa de cada anúncio é congelada na publicação e arredondada para
baixo em Berry inteiros. Por exemplo, uma venda de 10.019 Berry a 15% desconta
1.502 e credita 8.517 para o vendedor. A comissão sai da economia e fica
registrada separadamente. Publicação, cancelamento, expiração, resgate e
retirada de proposta não cobram taxa adicional. Cobrança antecipada depende
de uma decisão futura.

## MARKET-OFFER-RULES

- Um anúncio direto vende a instância individual ou o lote inteiro pelo preço
  publicado. Um anúncio por propostas tem mínimo e compra imediata opcional.
  Uma proposta que alcançaria a compra imediata é encaminhada para uma
  confirmação explícita pelo preço anunciado.
- Propostas pendentes podem ser alteradas ou retiradas pelo autor. O vendedor
  pode aceitar ou recusar. Só existe uma proposta ativa por comprador em
  cada anúncio. A carteira disponível já exclui o valor em custódia; alterar
  a proposta movimenta somente a diferença. Cancelar, expirar, recusar ou
  vender para outro libera a reserva. O fim do prazo não aceita ofertas
  automaticamente.
- A publicação retira a instância da mochila e preserva seu retrato no
  histórico. Ao dividir uma pilha negociável, a parte anunciada recebe seu
  próprio identificador e mantém os demais atributos. Equipados, bloqueados,
  vinculados e itens sob reserva de Trocas não entram no mini inventário.
  A mesma política de vínculo vale para Mercado e Trocas. Os saldos
  agregados de suprimentos e ferro da mochila não são instâncias negociáveis.
- Compra e devolução usam o Correio, inclusive quando não houver espaço
  na mochila. O valor líquido da venda fica em **Minhas Vendas**, com
  resgate individual ou em conjunto. A mesma transação fecha o anúncio,
  dá baixa nas reservas, grava a comissão, gera a entrega e registra os
  avisos. Reenvio usa o recibo idempotente do servidor.
- O Mercado pesquisa nomes sem distinguir acentos ou maiúsculas. Os filtros
  podem ser combinados por modalidade, categoria, slot, raridade, rank/tipo
  de Akuma, classe compatível, nível, potencial, atributos, origem e preço.
  A faixa de preço e a ordenação usam valor por unidade em lotes: preço
  direto, compra imediata ou, na ausência dela, mínimo de proposta. Os
  detalhes mostram cada valor separadamente. As listas usam paginação.

## MARKET-BALANCE

Prazos disponíveis: 24, 48 e 72 horas, calculados pelo servidor.
`MARE_MARKET_MAX_LISTINGS` limita anúncios ativos (20 por padrão) e
`MARE_MARKET_PUBLISH_INTERVAL_SECONDS` limita publicações sucessivas (5
segundos por padrão). As opções de taxa, prazo e limites ainda precisam
ser observadas na economia real; não há anúncios de teste em produção.

As Poções de Vida e de Mana restauram 25% do máximo do recurso (limitado pelo
máximo), com recarga compartilhada de 4 segundos. A Poção de Mana restaura
a barra **EN** existente. A loja do mercador vende ambas por 35 Berry
cada, com quantidade selecionável de 1 a 99 por compra. O preço é definido
no catálogo do jogo, pode ser revisado no balanceamento e não recebe
comissão de jogadores. A HUD só mantém os controles de uso.

## MARKET-RMT

Toda negociação usa exclusivamente Berry. Não existem pagamentos, saques ou
conversão de moeda. Uma eventual operação em dinheiro real exige decisão
separada sobre moeda, bens e saques, provedor, elegibilidade de conta,
fraude, disputas, estornos, reembolsos e entrega, além de revisão jurídica,
fiscal, comercial e de privacidade apropriada à operação.

## Validação

`tests/integration/server-market-transactions.test.mts` exercita transições e
disputas com personagens isolados. `tests/market-online-browser.cjs` testa
a HUD real em Chromium com respostas controladas. Os cenários de compra e
uso de poções também estão nos testes do inventário original. O projeto
continua usando o backend existente; o preview estático não hospeda dados
nem ativa o mercado por conta própria.

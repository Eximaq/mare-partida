# Inventário original, economia e forja no servidor

Incremento da paridade integral, em revisão no PR #201. Reutiliza o catálogo e
`forge-system.js` originais, incluindo preços, chances, custos e limites. O
inventário, o mercador e a forja usam seus painéis existentes em `game.js`.
Não substitui o restante do combate e da progressão pelo jogo original ainda.

## Comandos e autoridade

Todos os comandos passam pelo protocolo autenticado de personagem, com CSRF,
propriedade derivada da sessão, controlador exclusivo, versão esperada e requestId.
O mesmo pedido repete o recibo; um ID reaproveitado com outra intenção é recusado.
Os schemas são estritos: saldo, preço, atributos finais, dono, RNG e relógio não
são campos aceitos. IDs de instâncias apenas selecionam itens do próprio inventário.

| Comando | Regra executada no backend |
|---|---|
| `items.initialize` | Conversão única do inventário alpha e kit faltante, sem importar saves |
| `items.equip` / `items.unequip` | Propriedade, slot, classe da arma e capacidade de 120 |
| `items.lock` | Bloqueio persistido de uma instância própria |
| `items.sell` | Apenas mochila desbloqueada; preço `14 + nível × 7 + refino × 18` |
| `potions.buy` | Uma unidade por 35 Berry, sem saldo negativo |
| `potions.use` | Cura de 44% do HP máximo, limitada ao máximo, em combate ativo com vida incompleta |
| `forge.execute` | Aprimorar, imbuir, remover pérola, fundir cinco pérolas/equipamentos e reforjar todas/uma linha |

A forja recebe somente operação, IDs próprios, socket/linha/slot quando pertinente
e sequência esperada. Usa o módulo original com RNG criptográfico e tempo do
servidor. Não altera a lógica da demonstração. Equipamento, conversão e forja
ficam bloqueados durante o encontro ativo para preservar seu snapshot de combate.
Compra, bloqueio, venda e cura continuam transacionais. Automação de poções ainda
depende da migração do loop original de combate.

## Persistência e conversão

A migração `0014_original_inventory.sql` adiciona `game_inventory` e o journal
imutável `game_inventory_events`. A carteira continua sendo
`character_progression.gold`; não existe um segundo saldo. Inventário, saldo,
versão, evento e recibo são gravados na mesma transação. Falha tardia de SQL reverte
tudo. O evento registra hashes do estado anterior/posterior e do catálogo, custo,
resultado e horário do banco, sem credenciais.

As tabelas alpha são preservadas. Após a conversão, triggers recusam suas escritas
para impedir dois inventários ativos. O runtime não pode alterar o snapshot de
conversão, reescrever eventos ou apagar recibos. A identidade do personagem não é
uma coluna atualizável pelo runtime.

A conversão acontece no próximo ingresso autenticado no jogo, após obter controle:

- Cada cópia da arma alpha vira a arma inicial da classe; o colete vira a definição
  original 6. O equipamento vestido continua vestido. IDs novos são gerados pelo
  servidor. Nenhuma cópia anterior é descartada.
- Sucata alpha vira material. Acrescentam-se uma única vez os três materiais e as
  quatro poções do kit original, que não existiam no alpha.
- Arma/vestimenta inicial faltante é equipada; botas iniciais faltantes vão para a
  mochila. A existência de uma cópia impede conceder outra igual como kit.
- Somente personagem sem progresso, versão zero e sem itens recebe os 120 Berry
  iniciais. Ouro e XP dos personagens existentes permanecem iguais.
- Bolsa sem espaço ou item alpha desconhecido recusam a conversão inteira, sem
  apagar dados. Nesse caso o painel anterior continua disponível para liberar
  espaço. Encontro ativo precisa terminar antes de tentar a conversão novamente.
- Nenhum conteúdo de `localStorage`, save DEV ou arquivo exportado é importado.

O resgate do encontro alpha credita material no inventário convertido, mantendo
sua recompensa única e sem escrever nas pilhas antigas. O incremento seguinte,
descrito em `ORIGINAL-CHARACTER-SERVER.md`, passou a usar as fórmulas básicas
originais e pérolas em novos encontros dos personagens convertidos. Encontros
anteriores mantêm seu snapshot. O loop completo de combate original continua pendente.

## Validação e limites

`server-original-inventory.test.mts` usa PostgreSQL real e HTTP, com provedor de
identidade simulado. Cobre conversão, replay, concorrência de versão, moeda única,
slots/classe, bag cheia, todas as operações da forja, custo/consumo, cura, acesso
entre contas, campos extras, rollback tardio e privilégios de uma role runtime.
Não usa nem altera contas do Supabase hospedado.

Validação local executada: build e typecheck, 92 testes de fundação, 116 integrações
PostgreSQL/HTTP, 143 arquivos Node legados, build estático, três testes de portal e
um de exportação Paper Doll aprovados. O navegador local automatizado está
indisponível pela configuração da ferramenta; o teste de interface deste incremento
é acompanhado no CI, sem alegar homologação visual local ou com conta real.
No commit 9c2e4b0, os 24 checks passaram: Chromium exercitou equipar botas,
compra de poção, aprimoramento confirmado, reload e viewport de 760 px
(run 41364039781); Linux/Docker executou Compose, 14 migrações, health checks,
HTTPS e grants restritos, sem contactar Supabase (run 41364039896).

`original-inventory-client.test.mts` verifica que os handlers originais enviam
intenções e não executam mutações offline. `original-inventory-online-browser.cjs`
exercita HUD, equipamento, compra, forja e reload no Chromium do CI com respostas
de API de teste. Este último valida a interface; não substitui o teste PostgreSQL
nem é homologação com provedor real.

A instalação local recebeu backup antes da migração. Os hashes de conteúdo das
25 tabelas anteriores foram comparados antes/depois e permaneceram iguais: quatro
contas e três personagens preservados. A migração adiciona estruturas; a conversão
por personagem exige o comando autenticado. PostgreSQL e saves foram preservados.

O aceite integral continua reprovado: falta portar, entre outros, fórmulas completas
de personagem, mundo/combate original, loot, uso especial de itens, frutas, Haki,
talentos, contratos e Impel Down. As operações de forja estão cobertas isoladamente,
mas a aquisição normal de todos os seus insumos ainda depende desses domínios.
Os grupos relacionados no manifesto ficam `partial`, sem confundir API funcional
com paridade de todo o percurso jogável. Não houve merge, deploy ou exposição pública.

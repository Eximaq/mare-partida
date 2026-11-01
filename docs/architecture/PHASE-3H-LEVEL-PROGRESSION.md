# Etapa 3H — progressão de nível autoritativa

Base: main `02d409b`, após PR #193. Escopo: nível online, catálogo versionado,
histórico de evolução e leitura no painel. Sem alterar gameplay, HUD, mapas,
assets, Paper Doll, catálogo de itens, saves ou chaves localStorage da demonstração.

## Regra implementada

O servidor usa `online-levels-v1`, com níveis 1–20 e limiares cumulativos fixados
na migração 0009. Os intervalos reproduzem a curva existente em game.js:
`round(80 + 25 * (level - 1)^1.55)`. A aplicação consulta os inteiros do catálogo,
sem recalcular potência em cada requisição e sem aceitar curva do cliente.

| Nível | XP total necessário | Pontos de atributo conquistados |
|---|---:|---:|
| 1 | 0 | 0 |
| 2 | 80 | 5 |
| 3 | 185 | 10 |
| 4 | 338 | 15 |
| 5 | 555 | 20 |
| 10 | 3012 | 45 |
| 20 | 18209 | 95 |

`experience` continua sendo XP total cumulativo em decimal string, sem descontar
XP ao evoluir e sem perda de precisão por Number. No nível 20, XP adicional continua
persistido; próximo limiar é null. É teto deste piloto, não limite definitivo do jogo.

A caçada concede 20 XP/8 ouro; cada vitória resgatada concede 30 XP/12 ouro, sem
alteração. Nível é recalculado **somente dentro da transação de resgate**, depois
do crédito e antes do recibo. Não há comando level-up, grant-XP ou importação de save.
A versão avança uma vez pelo resgate, mesmo que atravesse mais de um limiar.

Pontos conquistados são `(level - 1) * 5`, coerentes com character-system.js. Cada
nível ganho fica registrado no ledger; o painel mostra o total. Ainda não existe
alocação online: esses pontos não alteram atributos, HP, dano, cura ou equipamentos.
Não concede PT/talentos, itens ou acesso a mapas. A evolução não restaura vida nem
reinicia encontro, diferente do efeito visual/local da demonstração.

## Persistência e autorização

- `progression_levels`: catálogo SQL, somente leitura para a role runtime.
- `character_level_ledger`: um registro por personagem/nível, catálogo, XP total,
  versão anterior/posterior, pedido causador e pontos totais gerados. FK de recibo
  diferida mantém evolução, recompensa, saldo e resposta na mesma transação.
- Origem reward é default obrigatório para runtime: ele não pode fornecer source,
  catálogo, pontos calculados ou timestamp. Origem migration só é escrita pelo owner.
- Runtime pode atualizar level junto dos campos XP/ouro; nunca editar/apagar ledger
  ou catálogo. Continua sendo role confiável do servidor, não proteção contra o
  comprometimento do próprio backend. Nenhum acesso SQL é entregue ao navegador.
- Propriedade, sessão play, CSRF/Origin e controlador permanecem requisitos antes
  do replay. IDs/nível/XP/pontos extras no corpo e payload são recusados.
- Replay retorna o recibo original, mesmo que contenha nível histórico. GET seguinte
  consulta o estado atual; não recalcula ou concede pontos por leitura/reload.

`GET /online-state` acrescenta progression: catalogId, maxLevel,
earnedAttributePoints, xpIntoLevel, xpForNextLevel, xpToNextLevel e atCap.
Recibos e contrato básico de state permanecem compatíveis; nenhuma alteração retroativa
em JSON histórico. A UI mostra XP total separado do progresso dentro do nível e
recusa metadados inconsistentes, sem importar valores da demonstração.

## Atualização do banco

0009 reconhece XP **já persistido pelo servidor**, preserva XP/ouro e todos os
recibos/recompensas anteriores, cria um evento migration para cada nível adquirido
e avança state_version exatamente uma vez nos personagens promovidos. Isso rejeita
novos comandos pendentes na versão antiga, mas mantém replay de recibos já aceitos.
Personagens abaixo de 80 XP preservam nível e versão. Executar novamente não concede
pontos nem avança versão outra vez.

Uma base anterior à 3H com nível diferente de 1 exige revisão; a migração falha inteira
em vez de rebaixar silenciosamente. Versão esgotada também impede a promoção e faz
rollback de DDL/ledger. Futuras alterações da curva exigem nova migração e análise
do catálogo, da versão e de pontos, não edição de 0009 já aplicada.

Operação: backup consistente, parar o binário antigo, aplicar migrations pela role
própria, reaplicar grant-auth.sql e iniciar o binário novo. Não voltar ao binário 3G
após conceder níveis; rollback requer plano conjunto de dados/aplicação. Esta entrega
não migra o banco persistente de homologação nem altera Supabase. Testes usam UUIDs
em PostgreSQL local descartável e o navegador usa provedor sintético explícito.

## Verificações e próximo bloco

TDD observou nível ainda 1 aos 80 XP, ausência de metadados da UI e permissão excessiva
para inserir source=migration antes das respectivas correções. Integrações incluem:
limiar exato, concorrência entre instâncias, replay, rollback do ledger/recibo,
cap/BIGINT, grants, migração histórica, versão esgotada e isolamento entre contas.
As migrações antigas são testadas com expectativas explícitas para o backfill da 3H;
identidade, saldos e recibos continuam comparados integralmente.

Próximo bloco sugerido: distribuição de atributos autoritativa, com orçamento
persistente, catálogo de atributos, confirmação e idempotência. Não implementado
neste incremento. Antes de exposição pública seguem necessários backup/restauração,
medição de carga, alertas e homologação operacional da VPS. Pages publica somente
estáticos; API/BFF não são implantados em produção por esse workflow.

### Resultado local observado

- Build e typecheck aprovados; 59 testes de fundação, 80 de integração PostgreSQL
  e 143/143 arquivos Node legados. Ensaio de socket perdido reexecutado incluindo
  a promoção ao nível 2 e confirmação de um único evento após reinício/replay.
- Build Pages e três testes de distribuição do portal aprovados.
- HTTPS real, API/PG local e provedor sintético: caçada de 30 segundos, duas vitórias
  e descanso natural de 60 segundos entre encontros. XP 20 -> 50 -> 80, nível 1 -> 2,
  ouro 32, cinco pontos conquistados e próximo limiar de 105 XP. HP permaneceu 4/30
  após o resgate e reload. Nenhuma edição de relógio ou dados nesse ensaio de navegador.
- Desktop e 390 px sem transbordamento; demonstração abriu na criação, sem criar save.
  Logout confirmado. Captura de evidência mantida somente em diretório ignorado.
- Auth real permaneceu false; harness e gateway encerrados. PostgreSQL persistente,
  personagens reais de teste e saves preservados. Nenhum e-mail ou alteração Supabase.

Docker/Linux dependem do job real do PR; não é alegada execução Docker local.

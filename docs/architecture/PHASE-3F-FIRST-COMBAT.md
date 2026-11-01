# Etapa 3F — primeiro combate autoritativo

> Registro histórico da 3F. A limitação de encontro único e os marcos de begin/claim
> foram substituídos pela [Etapa 3G](PHASE-3G-REPEATABLE-ENCOUNTERS.md).

Base: main `546dd11`, incluindo a atualização de Haki do colaborador. Incremento
isolado em apps/game-server, shared, migração/grants e painel de contas. Nenhuma
alteração no gameplay, HUD, mapas, assets, Paper Doll ou saves da demonstração.

## Regras explícitas do encontro

**Saqueador do cais (`dock-raider-v1`)**: um encontro introdutório por personagem,
liberado após resgatar a Ronda do cais. Vitória ou derrota são permanentes neste
piloto; não há reinício, cura, fuga, novas tentativas ou importação de atributos.
O painel informa esse limite antes do início. Todas as classes usam o mesmo perfil
de teste; não se afirma que passivas, equipamentos ou fórmulas da demo foram migrados.

| Regra | Valor controlado pelo servidor |
|---|---|
| Vida inicial do personagem | 30 |
| Vida inicial do inimigo | 36 |
| Dano sorteado do personagem | inteiro uniforme de 10 a 14 |
| Contra-ataque do inimigo sobrevivente | inteiro uniforme de 7 a 11 |
| Recarga do ataque, inclusive primeiro turno | 2 segundos do PostgreSQL |
| Prêmio único após vitória | 30 XP e 12 ouro |

O dano efetivo é limitado à vida restante; inimigo morto não contra-ataca. O
encontro termina em no máximo quatro ataques aceitos. O RNG usa crypto.randomInt
no backend, depois das verificações de replay, autorização, versão e recarga.
Não aceita seed, dano, HP, turno, horário ou resultado fornecidos pelo cliente.

É **combate por turnos**, não simulação em tempo real/idle offline. Entre intenções
o encontro fica pausado; o relógio continua liberando a próxima ação, mas não
acumula ataques. Reconectar/reiniciar a API mantém vida, turno e resultado salvos.
GET não causa dano, concede prêmio nem avança versão. Não há level-up, itens,
críticos, movimentação, combate em mapa ou multiplayer nesta etapa.

## API e reconciliação de ataques repetíveis

`POST /v1/characters/:id/commands`: combat.begin, combat.attack, combat.claim,
todos com payload vazio e envelope existente requestId/expectedVersion/control.
Sessão de jogo, propriedade, Origin/CSRF e lease/epoch são verificados na mesma
transação, inclusive antes de devolver um recibo antigo. Outra conta recebe 404
indistinguível de ID ausente; sessão de recuperação não pode comandar.

O resultado desses comandos acrescenta combat ao snapshot econômico. O campo é
opcional no schema de recibos para preservar recibos imutáveis das fases anteriores.
GET /online-state também acrescenta combat: status, HPs, turno, attackReady,
nextAttackAt, lastRequestId e último dano efetivo. Status: locked/available antes
do encontro; active/won/lost/claimed após início. A recarga só é habilitada pelo
valor attackReady retornado pelo servidor; adulterar a UI não vence sua validação.

Cada ataque novo exige outro requestId e a versão corrente. Repetir o mesmo ID
retorna o resultado original, sem novo sorteio, dano, turno ou recarga. Um recibo
antigo contém estado histórico; a leitura seguinte traz o estado corrente.
Pedidos de IDs diferentes na mesma versão não se tornam ataques extras.

No painel, o registro pendente existente em sessionStorage aceita as três novas
ações. Ataque sem resposta só é confirmado por lastRequestId igual ao pedido
pendente, nunca por aumento de turno ou por vitória de outra aba. Se outra ação
já sobrescreveu lastRequestId, conserva a pendência e permite replay manual com
controle atual, mesmo depois do fim do combate. Só então libera novo comando.
O backend encontra o recibo antes de verificar a versão atual ou fase terminal.
Não há repetição automática de POST. Begin/claim também têm marcos únicos seguros.

Consulta a cada três segundos enquanto o encontro está ativo e a página visível,
sem comando em andamento, atualiza recarga/HP. Não automatiza ataques. Logout,
troca de identidade e perda de controle mantêm as proteções da 3D/3E. Nenhum HP,
saldo, token ou save local serve como autoridade. Storage contém somente intenção
mínima e não lê/escreve localStorage.

## Banco e atomicidade

Migração **0007_first_combat.sql** é aditiva, sem backfill:

- character_combats: um encontro por personagem, catálogo fixo, HP/turno/fase,
  início e próximo ataque no relógio do banco, IDs de início e último comando.
- character_combat_rounds: registro imutável por pedido e turno, vida antes/depois,
  dano efetivo, versão antes/depois e horário. Constraints impedem HP negativo e
  contra-ataque após morte do inimigo.
- character_combat_rewards: crédito único, valores antes/depois e versão,
  vinculado ao encontro e recibo. Deltas de XP/ouro são gerados pelo banco.

FKs diferidas vinculam mutações aos recibos no commit. Locks de conta/personagem
serializam ataques, controles, logout e créditos entre instâncias. Uma transação
inclui HP, fase, turno, recarga, versão, ledger e recibo; no resgate inclui também
saldo econômico. Falha desfaz a operação completa, preservando somente refresh
do provedor já aceito via savepoint. Overflow de BIGINT/versão é recusado antes
da escrita. Não é prometida recuperação de falha física de commit do PostgreSQL.

Runtime pode inserir apenas colunas explícitas, atualizar somente campos mutáveis
do encontro e XP/ouro já autorizados na 3E. Não pode mudar catálogo/início, identidade,
nível, apagar encontros ou alterar/purgar ledgers. Não há SECURITY DEFINER ou chave
administrativa no cliente. A role do backend continua sendo confiável: seus grants
permitem HP/saldo diretamente via SQL; não constituem proteção contra comprometimento
do próprio servidor. O cliente nunca recebe acesso ao banco.

## Validação e operação

TDD reproduziu 400 para combat.begin antes da implementação, além da ausência de
controles e da reconciliação de ataques na UI. Integrações usam PostgreSQL real em
bancos UUID descartáveis e provedor simulado; fixtures de HP/horário pertencem
somente a esses bancos. Não alteram Supabase, relógios do SO ou contas existentes.
Cobertura: cooldown, falsificação, dono/CSRF, recuperação, perda de controlador,
vitória/derrota, restart, concorrência entre instâncias, replay sem novo RNG,
rollback de turno/crédito com refresh aceito, overflow, upgrade preservando dados,
grants mínimos e socket realmente perdido depois de creditar prêmio. Propriedades
das regras verificam limites de HP, contra-ataque e término em até quatro turnos.

Antes de usar em banco persistente: parar API, backup conforme runbook, aplicar
migrações e reaplicar grant-auth.sql como owner; runtime sem DDL. Nesta entrega
isso é executado apenas em bancos descartáveis e CI. Não remover tabelas/recibos
como rollback. Auth real permanece false; nenhum email ou alteração do Supabase.

Permanecem as cotas de 60 comandos novos/minuto e 10.000 recibos/personagem, que
falham fechado; não são retenção para combate contínuo. A consulta de múltiplas
abas continua sujeita à cota HTTP por IP. Próximas etapas precisam definir novas
tentativas/encontros, atributos derivados reais, simulação temporal, retenção,
carga e operação pública. Publicação estática não expõe esta API nem o painel.

## Resultado local desta entrega

Build e typecheck aprovados; **54 testes de fundação, 63 integrações PostgreSQL e
143 arquivos Node legados** aprovados. Build Pages e três testes do portal também
passaram. O build público continua sem apps/infra/online ou arquivos de credenciais.
Docker/Linux é verificado no CI, não foi executado localmente.

Ensaio HTTPS real com API/PostgreSQL reais e provedor simulado: criação sintética,
jornada e caçada cumpridas sem alterar horário; primeiro ataque bloqueado durante
a recarga; primeiro turno com 21/30 HP do personagem e 23/36 HP inimigo; reload
preservou esses valores e exigiu retomar controle. Segundo turno 12/30 contra
10/36; terceiro venceu com 12/30 contra 0/36 e nenhum contra-ataque. Resgate único
produziu saldo acumulado de 50 XP/20 ouro, incluindo a caçada anterior. Reload
preservou vitória, HP, turno e saldo; logout voltou para Entrar.

Layout desktop e 390px inspecionados; documento 375px no viewport de 390px, sem
overflow horizontal. Demonstração abriu na criação original, sem iniciar jogo ou
criar save. Evidências visuais ficam locais/ignoradas, sem dados pessoais no PR.
Harness encerrado e seu banco UUID descartável removido; apenas PostgreSQL
persistente permanece escutando. Auth real foi conferido como false. Nenhum email,
chamada ao Supabase hospedado ou alteração de suas contas/personagens foi feita.

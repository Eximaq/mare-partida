# Etapa 3G — encontros repetíveis no servidor

> Registro da 3G. A ausência de level-up descrita abaixo foi superada pela
> [Etapa 3H](PHASE-3H-LEVEL-PROGRESSION.md); regras de encontros permanecem válidas.

Base: main `1097218`, após PR #192. Incremento restrito ao servidor e painel online.
Gameplay, HUD, mapas, Paper Doll, assets e saves da demonstração permanecem intactos.

## Regras do piloto

O Saqueador do cais mantém catálogo, HP, RNG, recarga de ataque e prêmio da 3F.
Uma derrota ou um prêmio já recebido libera outro encontro após **60 segundos**,
medidos pelo PostgreSQL a partir do encerramento. Vitória sem resgate bloqueia
outro início: não se descarta o prêmio pendente. Novo encontro começa em 30/36 HP,
turno zero, com identidade UUID gerada pelo banco e ordinal crescente. Recarregar,
reconectar ou repetir um pedido nunca cura o encontro atual.

Limites iniciais conservadores, impostos pelo backend: **10 inícios em qualquer
janela de 24 horas**, contando derrotas, e **100 encontros por personagem** neste
piloto. Não são estimativas de capacidade da futura VPS. São limites de emissão
e armazenamento enquanto balanceamento, level-up e retenção não estão definidos.
Nenhum histórico é apagado ao atingir a cota; não há reinício diário artificial.
Cada vitória resgatada concede exatamente 30 XP e 12 ouro. XP acumulado ainda não
altera o nível, não cria itens e não importa atributos/equipamentos da demonstração.

## Contrato e atomicidade

As ações continuam combat.begin/attack/claim, payload estritamente vazio e o mesmo
envelope requestId/expectedVersion/control. Identidade, propriedade e encontro
atual são determinados no backend. IDs extras, HP, dano, horário, ordinal e saldo
fornecidos pelo cliente são recusados. A versão global do personagem impede um
novo comando atrasado de afetar outro encontro. Ownership/controle precedem replay.

Snapshot acrescenta encounterId, encounterNumber, canBegin, nextEncounterAt,
startsRemaining e historyFull. Campos opcionais no schema preservam recibos antigos
imutáveis; respostas correntes sempre os incluem. nextEncounterAt indica o próximo
prazo temporal, não supera historyFull nem dispensa resgate. GET é somente leitura.

Erros novos: combat_reward_pending (409), combat_rest (409), combat_daily_limit
(429), combat_history_full (503). O limite geral de comandos também continua ativo.
O painel só habilita novo encontro conforme canBegin; no repouso/cota pede atualização
manual. Não dispara ataques nem novos encontros automaticamente.

Begin, attack e claim sem resposta são reconciliados **somente pelo requestId**.
O estado claimed de outro encontro não prova que um pedido pendente foi aceito.
Se lastRequestId já mudou, conserva a intenção e permite replay manual do mesmo ID
com controle válido. O recibo original é retornado antes de verificar versão ou fase;
a leitura seguinte busca o estado corrente, sem restaurar HP histórico na interface.

Locks de conta/personagem serializam comandos entre instâncias; versão, encontro,
turno, prêmio, saldos e recibo são atômicos. O refresh do provedor já aceito continua
preservado em caso de rollback da operação, conforme a fundação da Fase 2.

## Migração e privilégios

0008 é aditiva: cria combat_encounters, combat_rounds e combat_rewards; copia a
história 3F sem conceder XP/ouro nem alterar recibos. As três tabelas character_combat*
originais permanecem intactas como histórico congelado. closed_at é obtido do evento
original de derrota/resgate; falta desse evento em uma fase terminal impede a migração.

PKs por personagem/encontro, ordinal único, uma execução active/won por personagem,
turnos únicos por encontro e prêmio único por encontro. FKs de recibos são diferidas.
Runtime perde acesso às tabelas antigas e recebe somente colunas necessárias nas novas;
não pode apagar histórico, alterar UUID/ordinal/início ou editar ledgers. Não há novos
segredos ou privilégios Supabase. Role comprometida continua sendo uma fronteira de
confiança: grants de HP/saldo não protegem contra código servidor comprometido.

Operação futura: parar a API antiga antes de aplicar 0008; executar migrations com
role própria, reaplicar grant-auth.sql, então iniciar o novo binário. Não há rollback
automático para a versão 3F depois de aceitar novos encontros; restauração exige plano
consistente para banco e binário. Nenhuma migração foi aplicada ao banco persistente
de homologação nesta entrega. Testes usam bancos UUID descartáveis em loopback.

## Validação e limites

TDD observou ausência de identidade de encontro e três falhas de reconciliação/gating
da interface antes das respectivas implementações. Integrações cobrem preservação
3F nos quatro estados, recompensas independentes, replay entre encontros, repouso,
cotas rolling/histórico e concorrência entre instâncias. As regressões de combate
continuam cobrindo autorização, recarga, rollback, overflow e perda real de socket.
Testes de interface proíbem acesso ao localStorage e POST automático.

A publicação estática não publica a API nem ativa autenticação real. O backend ainda
exige homologação operacional, backup/restauração e teste de carga antes de exposição.
Combate em mapa, simulação idle, equipamentos, level-up e multiplayer seguem fora
desta etapa. Próximo bloco sugerido: progressão de nível autoritativa, com catálogo
versionado e transações idempotentes, sem importar progressão local.

### Evidência local desta entrega

- Build e typecheck aprovados; 57 testes de fundação e 143/143 arquivos Node legados.
- 70 casos de integração PostgreSQL aprovados (69 na suíte completa, mais regressão
  de rollback de novo início; suíte dedicada final de sete casos e grants reexecutados).
- Build Pages e três testes de distribuição do portal aprovados.
- Navegador HTTPS real com API/PG e provedor sintético isolado: caçada de 30 segundos,
  duas vitórias, descanso natural de 60 segundos, recarga de ataque, retomada de controle
  após reload, saldo 20/8 -> 50/20 -> 80/32 (XP/ouro). Novo encontro iniciou em 30/36 HP,
  turno zero; reload preservou o resultado anterior. Nenhum relógio foi alterado nesse ensaio.
- Desktop e viewport de 390 px sem transbordamento horizontal. Demonstração abriu
  normalmente; não foi criado/alterado save para o teste. Logout confirmado.
- Harness encerrado e banco UUID descartável removido pelo próprio helper; PostgreSQL
  persistente preservado. Auth real permaneceu false. Nenhum envio SMTP/Supabase.

Docker/Linux serão considerados verificados somente pelo job docker-smoke do PR;
nenhuma execução Docker local é alegada. Evidências brutas e capturas ficam ignoradas.

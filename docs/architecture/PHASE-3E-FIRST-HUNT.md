# Etapa 3E — primeira caçada autoritativa

Base: main `0c0e448`. Incremento limitado ao servidor e ao painel de contas
`/online/`. Não carrega nem altera gameplay, mapas, HUD, Paper Doll, assets ou
localStorage da demonstração. Não importa progressão local.

## Contrato do piloto

**Ronda do cais (`dock-patrol-v1`)** é uma missão introdutória temporizada, única
por personagem: exige jornada iniciada, dura 30 segundos e concede 20 XP e 8 de
ouro. Não simula combate em mapa, morte de monstros, itens, level-up ou multiplayer.
Os valores são um contrato próprio deste piloto; não substituem as fórmulas de
combate/loot de `hunt-system.js`. A recompensa pequena e não repetível permite
validar a primeira escrita econômica antes de introduzir uma economia contínua.

`POST /v1/characters/:id/commands` aceita `hunt.begin` e `hunt.claim` com os mesmos
requestId, expectedVersion e controle da 3B. Ambos têm payload estritamente vazio:
cliente não informa duração, horário, recompensa, saldo, dono ou huntId.
Sessão de jogo, dono e controlador vigente são verificados inclusive no replay.
Outra conta recebe o mesmo 404 de um personagem inexistente. CSRF/origem e cotas
continuam vigentes; sessão de recuperação não pode jogar.

`GET /online-state` acrescenta `hunt`: catalogId/name, durationSeconds, experience/gold
como strings, status, startedAt, readyAt e serverNow. Estados: locked, available,
active, ready, claimed. Somente o relógio do PostgreSQL determina disponibilidade.
Não há recompensa automática ao abrir a página ou enquanto o serviço está parado;
o tempo continua transcorrendo e o resgate posterior exige sessão e controle.

## Transação, persistência e autorização

Migração aditiva **0006_first_hunt.sql**: `character_hunts` contém início único,
versão e horário gerado pelo banco; `character_hunt_rewards` contém crédito único,
saldos antes/depois e versão. As duas tabelas têm PK por personagem, FKs restritivas
e referência ao recibo da ação com constraint diferida até o commit. Não há backfill.

Account/character locks serializam comandos entre instâncias. Início incrementa
versão; resgate valida prazo, incrementa versão e grava ledger, XP/ouro e recibo
na mesma transação. Falha em qualquer escrita desfaz tudo. Savepoint conserva
refresh do provedor já aceito, sem conservar a operação de jogo que falhou.
BIGINT permanece texto na API; limites de saldo e versão recusam antes de overflow.

Mesmo requestId retorna o recibo original, inclusive após restart/troca autorizada
de controlador; mudar seu conteúdo gera idempotency_conflict. IDs diferentes
concorrentes não duplicam início/crédito. Após conclusão, outro requestId com a
versão atual é recusado. O recibo é um resultado histórico; o GET fornece o estado
atual. Nenhum recibo é purgado para permitir reexecução.

Grants do runtime passam a permitir UPDATE **somente experience e gold** na
progressão, além da versão já permitida. Nível, identidade, horários e ledgers
permanecem sem UPDATE/DELETE. Inserções de ledgers têm colunas explícitas; saldos
posteriores são gerados pelo PostgreSQL com deltas fixos. Não há função
SECURITY DEFINER, credencial privilegiada no cliente ou endpoint de ajuste de saldo.
O runtime do servidor é uma fronteira de confiança: sua role pode atualizar essas
duas colunas diretamente; esse grant não constitui isolamento contra um servidor
comprometido. Clientes continuam sem acesso SQL e sem valores econômicos aceitos.

## Painel e reconciliação

Botões de iniciar/resgatar exigem estado confirmado e controle. A tela só libera
resgate quando o GET informa ready; relógio do navegador não autoriza nada.
Atualização manual e consulta periódica já existente verificam a conclusão.
Recarregar perde o controle em memória; exige nova aquisição antes de comandar.

A chave existente `sessionStorage mare-online-pending-v1` guarda somente
characterId/requestId/expectedVersion e, para caçadas, action. Registros antigos
sem action continuam representando journey.begin. Nenhum token, saldo ou save é
persistido no cliente. Clique duplo fica bloqueado. Perda de resposta provoca GET,
nunca POST automático; retomada manual reutiliza ID/versão. Marco confirmado no
ledger limpa a pendência. Isso é seguro para estas ações únicas, não uma solução
genérica para caçadas repetíveis. Logout/troca de identidade invalida respostas
atrasadas, controle e pendências.

## Operação e limites

Antes de iniciar esta versão em qualquer ambiente persistente: parar API, fazer
backup pelo procedimento operacional, aplicar migrações com owner e reaplicar
`infra/postgres/grant-auth.sql` com owner. Runtime continua sem DDL. Sem migração,
readiness falha fechado. Não reverter removendo tabelas/ledgers ou apagando recibos.
Nesta entrega, migrações só são executadas em bancos UUID descartáveis e no CI.
O banco persistente e o Supabase de desenvolvimento não são alterados.

Permanecem 60 novos comandos/minuto e 10.000 recibos por personagem. Ao atingir
o teto o serviço recusa novas ações, preservando replay; não promete retenção
adequada a uma economia contínua. Um operador deve acompanhar esse limite antes
de ampliar o piloto. Nenhuma política de JWT/sessão foi modificada.

Publicação estática não hospeda a API nem o painel local: o build Pages exclui
apps, infra e credenciais. Origem comum pública, operação, backups/restauração,
abuso/carga e homologação do conjunto com provedor real continuam requisitos
anteriores à abertura pública. Não há deploy de backend de produção nesta etapa.

## Evidências de validação

TDD: teste HTTP observou 400 ao tentar hunt.begin antes da implementação; testes
da UI observaram ausência de controles/reconciliação antes da integração.
PostgreSQL real valida tempo, requisito, isolamento entre contas, campos extras,
CSRF, concorrência entre instâncias, repetição, overflow, grants mínimos, rollback,
upgrade preservando saldos acima de MAX_SAFE_INTEGER e perda real do socket após
commit seguida de replay em outra instância. Fixtures de tempo são modificadas
apenas pelo owner dos bancos descartáveis, nunca no Supabase ou banco persistente.
Testes de UI executam o JS real em DOM controlado e verificam retomada após reload,
timeout, respostas atrasadas e ausência de acesso a saves. Provedor é simulado;
esses ensaios não são novas homologações reais do Supabase.

Resultado local: 47 testes de fundação, 50 integrações PostgreSQL e 142 arquivos
Node legados aprovados; build/typecheck, build Pages e três testes do portal
aprovados. Um fixture de checksum ainda copiava apenas cinco migrações; foi
atualizado para incluir a sexta e a suíte completa passou novamente.

Navegador HTTPS com API/PostgreSQL reais e provedor simulado: login sintético,
criação, jornada, início, bloqueio do resgate durante os 30 segundos reais,
reload/retomada de controle, conclusão, crédito 20/8, persistência após reload,
resgate desabilitado e logout. Desktop e viewport efetivo de 390px inspecionados;
largura do documento 375px, sem transbordamento horizontal. A restrição da
ferramenta de viewport registrada na 3D não se reproduziu neste ensaio.
Tela inicial da demonstração abriu com os assets existentes, sem iniciar partida
ou criar save. Harness encerrado, banco UUID de teste removido pelo próprio
harness; PostgreSQL persistente preservado, API/gateway de teste desligados e
Auth do ambiente de desenvolvimento permanece false.

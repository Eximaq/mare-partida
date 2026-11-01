# Etapa 3C — primeira mutação autoritativa

Base: main `68ea929` (Etapa 3B). Ação escolhida: **journey.begin**, marco único de
início da jornada online. O cliente solicita a intenção com payload vazio; o
servidor determina se ela pode ocorrer, o evento, o horário e a nova versão.
Não concede moeda, XP, nível, atributos ou itens. Não muda mapas, combate, HUD,
Paper Doll, assets ou saves. A interface de gameplay ainda não chama esse comando.

## Contrato e precondições

Usa `POST /v1/characters/:id/commands`, com o envelope 3B: requestId UUID,
action `journey.begin`, expectedVersion, control `{epoch,token}` e payload `{}`.
Campos extras, inclusive recompensa, saldo, XP, dono, horário ou versão de saída,
são recusados. O schema também mantém `state.sync` e recibos históricos compatíveis.

Exige sessão BFF de jogo, CSRF/Origin, propriedade determinada pela sessão e
controlador vigente. Verificações precedem inclusive a leitura de recibo repetido.
Para pedido novo: versão atual, orçamento disponível, jornada ainda não iniciada
e versão inferior a Number.MAX_SAFE_INTEGER. Falhas retornam os códigos 3B ou
409 `journey_already_started` / 503 `state_version_exhausted`.

Resposta: `{requestId, action, state}`. O snapshot preserva seu contrato 3A;
somente version avança, sempre exatamente uma unidade. `state.sync` e GET do
snapshot continuam somente de leitura. Uma versão positiva isoladamente não é
prova do marco: o registro específico da jornada é sua fonte de verdade. A Etapa
3D deve definir a consulta desse marco para a UI, sem inferi-lo do contador global.

## Transação, auditoria e repetição

Dentro dos mesmos locks de conta/personagem usados por comandos e controle:

1. Validar autorização, lease, recibo existente, versão e orçamento.
2. Recusar marco preexistente; incrementar `characters.state_version` com WHERE
   da versão esperada. Nenhum outro campo do personagem é alterado.
3. Inserir `character_journey_ledger`: personagem, requestId e versão anterior.
   Banco determina evento `journey.started`, versão posterior e occurred_at.
4. Ler o novo snapshot, persistir o recibo e confirmar a transação.

A PK do ledger limita a um marco por personagem. FK composta deferida exige o
recibo correspondente ao concluir o commit. Versão, ledger e recibo fazem parte
da mesma transação; falha no ledger ou no recibo desfaz todos. Refresh já aceito
permanece protegido pelo savepoint existente. Falha física no commit continua
sendo resultado incerto para o cliente: reconciliar usando o mesmo requestId.

Repetição exata retorna o resultado original sem nova mutação. Outro requestId
não reinicia a jornada. A mesma chave com outra ação/conteúdo retorna conflito.
Dois IDs novos concorrendo pela mesma versão têm apenas um vencedor. Após
takeover, o controlador antigo é recusado; o novo pode reconciliar o mesmo pedido.
Logout global e recuperação mantêm a barreira transacional da conta. Uma operação
já confirmada antes da revogação não é desfeita retroativamente.

## Retenção e privilégios

Ledger do marco: retenção permanente, máximo de uma linha por personagem, sem
UPDATE/DELETE pelo runtime. Recibos: mesma política fechada 3B, sem expurgo,
60 novos comandos/personagem/60s e teto de 10.000 por personagem. O teto recusa
novos comandos antes da mutação; não apaga proteção contra replay. Replays exatos
continuam sujeitos ao limite HTTP e não consomem novas vagas. Essa escolha atende
um marco único sem crescimento de ledger; não é política final para economia
contínua, que ainda exige capacidade, retenção de histórico e recuperação operacional.

Migração **0005** cria somente a tabela do ledger, sem backfill nem alterações
nos registros existentes. Role runtime ganha UPDATE exclusivamente da coluna
state_version, SELECT no ledger e INSERT apenas character_id/request_id/
version_before. Não pode escrever identidade, campos econômicos, evento, horário,
versão posterior, nem reescrever/remover o ledger. Versionamento é protegido pela
autorização da aplicação e pelo UPDATE condicionado; a role de banco não substitui
essa autorização. Não há funções SECURITY DEFINER ou novos acessos ao Supabase.

Aplicação de migrations e grants em banco persistente deve seguir o procedimento
da role de migração. Nesta entrega, migração executada apenas em bancos locais UUID
descartáveis e no CI. Nenhuma migração automática no banco de homologação existente.
Auth permanece desligado e nenhuma API é exposta pela publicação estática Pages.

## Validação

TDD: o primeiro pedido HTTP recebeu 400 antes da implementação de journey.begin.
Integrações PostgreSQL reais cobrem concorrência com mesmo ID/IDs distintos e
duas instâncias de serviço, versão/ledger/recibo únicos, alteração de campos,
autorização cruzada, recuperação, lease expirado, takeover e logout concorrentes.
Falhas SQL injetadas separadamente no ledger e no recibo comprovam rollback total
da mutação e preservação de refresh descartável. Um proxy HTTP local fecha o
socket após o commit: o retry e uma nova instância do serviço recuperam o mesmo
resultado. Isso testa perda de resposta pós-commit; desconectar não promete cancelar
uma operação já recebida. Não houve simulação de falha física do PostgreSQL.

Upgrade 3B preserva identidades, progressão e recibos; reaplicação não altera estado.
SQL testa PK, FK, limites de versão e grants mínimos. Provedor simulado, sem novo
e-mail ou alteração de conta hospedada. Nenhum save local é lido ou importado.

Validação local: build e typecheck aprovados, 36 testes de fundação, 39 integrações
PostgreSQL e 142 arquivos de testes Node legados aprovados. Build Pages, três testes
do portal e abertura no navegador também passaram. O harness separado supa-browser
não foi executado. Docker/Linux será confirmado no CI do PR, não no Windows local.

Próxima etapa: 3D, integração online incremental e reconciliação visível, mantendo
a demonstração independente. Combate/economia/multiplayer autoritativos não estão
concluídos por este marco, e o backend ainda não está liberado para produção pública.

# Etapa 3B — protocolo de comandos autorizado

Registro do incremento 3B. A [Etapa 3C](PHASE-3C-JOURNEY-COMMAND.md) acrescenta
journey.begin e a migração 0005; os contratos de autorização e replay abaixo
permanecem. As afirmações de ação única descrevem o escopo original 3B.

Base: main `fec86b7`, preservando o trabalho de criação/gameplay do PR #186.
Este incremento prepara o transporte transacional; não migra combate, economia,
inventário ou saves. Backend continua local, sem novo envio ou alteração no Supabase.

## Contrato

`POST /v1/characters/:id/commands`, JSON estrito, sessão BFF de jogo e CSRF com
Origin exata. Headers, limite de 8 KiB, prazo de leitura de 3s e limite geral de
300 pedidos/IP/minuto reutilizam a camada HTTP existente. Query strings e campos
extras são recusados. Identidade vem exclusivamente da sessão autenticada.

```json
{
  "requestId": "11111111-1111-4111-8111-111111111111",
  "action": "state.sync",
  "expectedVersion": 0,
  "control": { "epoch": 1, "token": "<token opaco do controlador>" },
  "payload": {}
}
```

O exemplo contém um marcador, não uma credencial válida. Única ação aceita:
`state.sync`. Retorna `{requestId, action, state}`, onde state é o snapshot 3A.
Não incrementa versão nem modifica nível, XP ou ouro. O GET de snapshot continua
disponível para leitura sem assumir controle. A próxima ação mutante exige a Etapa 3C.

Ordem dentro da transação: autenticar/renovar sessão; bloquear conta; verificar
dono; adquirir o mesmo advisory lock do controle; verificar sessão do controlador,
hash do token, epoch e validade do lease; procurar recibo; validar versão atual;
verificar orçamento; persistir resultado e commit. A autorização é avaliada antes
de qualquer replay. Logout global e recuperação serializam pela conta; aquisição
e renovação do controle usam o mesmo lock de personagem. Não há lock em memória.

## Idempotência e reconciliação

- Chave única PostgreSQL `(character_id, request_id)`; requestId é UUID do cliente,
  referência para deduplicação, nunca prova de autorização.
- SHA-256 do envelope canônico `[action, expectedVersion, payload]`. O payload
  atual é estritamente vazio. Novas ações precisarão de schema e canonicalização
  próprios. Alterar conteúdo sem trocar requestId retorna 409 `idempotency_conflict`.
- Repetição aceita devolve exatamente o resultado gravado, mesmo que a versão
  atual tenha avançado. Para obter estado novo: GET snapshot ou novo requestId.
- Token/epoch não integram o hash nem o recibo: o novo controlador autorizado pode
  reconciliar resposta perdida com o mesmo requestId e seu lease atual. O antigo
  controlador e sessões revogadas continuam recusados inclusive para replay.
- Comando novo exige versão atual: 409 `state_version_conflict`; cliente consulta
  estado e decide uma nova intenção. Não repetir mutações automaticamente.
- Erros recusados não gravam recibo. Erro SQL desfaz a operação; refresh já aceito
  fica preservado pelo savepoint 3A. Commit com resposta perdida permite consultar
  novamente o mesmo requestId. Não se promete atomicidade com serviços externos.

## Limites do piloto local

Máximo de 60 comandos novos aceitos por personagem em janela móvel de 60 segundos;
excesso retorna 429 `command_rate_limited` e Retry-After 60. Replays não ampliam
armazenamento e continuam sujeitos ao limite HTTP/IP. Sob lock, dois pedidos
concorrentes não ultrapassam o orçamento. Falhas de validação não consomem recibos.

Retenção sem expurgo automático, limitada a 10.000 recibos por personagem. Ao
atingir esse teto, novos pedidos retornam 503 `command_history_full`; replays
continuam disponíveis. Não apagar recibos para liberar cota: isso reabriria IDs
antigos. É um limite deliberado para o piloto, não uma política de operação pública.
Antes de ações econômicas sustentadas: definir janela de idempotência, rejeição de
IDs antigos e retenção de ledger/tombstones, carga e capacidade de armazenamento.

## Persistência, permissões e operação

Migração **0004** acrescenta somente `character_commands`; FK restritiva, PK
composta, hash limitado, resultado JSON limitado a 2 KiB, índice por personagem/data.
Não altera tabelas anteriores nem backfill de personagens. Role runtime: SELECT e
INSERT apenas character_id/request_id/request_hash/result; sem UPDATE, DELETE ou
inserção de created_at. Sem novos privilégios econômicos ou de identidade.

Aplicar migrations e grants somente com o procedimento de role de migração antes
de iniciar essa versão num banco persistente. Nesta entrega, 0004 foi aplicada
somente em bancos descartáveis de teste; homologação e personagens reais do ensaio
permanecem preservados. AUTH_ENABLED permanece false no ambiente de homologação.

## Evidências e limites da validação

TDD: primeiro teste HTTP falhou 404 antes da implementação. O teste de orçamento
reproduziu dois vencedores na última vaga antes do limite transacional. Testes
PostgreSQL reais cobrem oito primeiras requisições concorrentes, replay, versão
adulterada, dono/lease/CSRF, retomada com nova instância do serviço, takeover/logout,
falha SQL, preservação do refresh, orçamento concorrente e privilégios mínimos.
O provedor é simulado nesses testes; não houve novo ensaio hospedado do Supabase.

Validação local: build e typecheck passaram; 36 testes de fundação, 29 integrações
PostgreSQL e 142 arquivos Node legados passaram. Build Pages e três testes do
portal passaram; abertura do jogo conferida no navegador em origem local isolada.
Gitleaks no diff preparado não encontrou segredos. Docker/Linux é validado pelo CI
do PR; não foi executado no Windows local. O harness separado supa-browser não
foi executado neste incremento.

O frontend de gameplay não envia comandos ainda. Esta entrega não comprova combate
autoritativo, execução distribuída de uma mutação econômica ou carga de produção.

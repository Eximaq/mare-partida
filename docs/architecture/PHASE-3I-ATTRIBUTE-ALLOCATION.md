# Etapa 3I — distribuição de atributos autoritativa

Base: main `0c3edee`, após o PR #194. Implementa distribuição persistente dos pontos
conquistados na 3H. Gameplay, HUD, mapas, Paper Doll, assets, catálogos de itens e saves
da demonstração não são alterados. Backend e painel online continuam locais.

## Contrato e orçamento

`attributes.allocate` usa o envelope de comandos existente: requestId, expectedVersion,
controlador e payload estrito. `payload.allocation` exige os cinco deltas inteiros:
strength, dexterity, vitality, intelligence, spirit. Cada valor fica entre 0 e 95;
a soma deve ser positiva, no máximo 95 e caber no saldo calculado pelo servidor.
Não aceita accountId, ownerId, characterId no corpo, nível, saldo ou custo do cliente.

Catálogo `online-attributes-v1`: Força, Destreza, Vitalidade, Inteligência e Espírito,
coerentes com character-system.js. São pontos **investidos**, sem somar atributos
iniciais da classe. Atributos ainda não modificam HP, dano, defesa, energia, recarga,
classe, habilidades ou encontros. Não há redistribuição/reset ou importação de saves.

- Conquistados: `(nível - 1) * 5`, com teto atual de 95 no nível 20.
- Investidos: soma do histórico SQL imutável por personagem.
- Disponíveis: conquistados menos investidos. GET/reload nunca concede pontos.
- Novos níveis ampliam o orçamento, sem apagar ou recontabilizar investimentos.
- Saldo insuficiente: 409 `attribute_points_insufficient`, sem mutação.
- Uma distribuição avança a versão uma vez, sem alterar XP ou ouro.

## Transação, histórico e autorização

A operação reaproveita a autorização de sessão play, propriedade e controlador,
CSRF/Origin, limite de corpo, quotas e locks de conta/personagem. Autorização precede
até o replay. Duas instâncias não conseguem consumir simultaneamente o mesmo saldo.

A migração 0010 cria somente `character_attribute_ledger`: chave personagem/requestId,
versão anterior única por personagem, deltas, custo e versão posterior gerados pelo
PostgreSQL, catálogo fixo e timestamp do banco. FK diferida exige o recibo do comando
na mesma transação. Falha em ledger, versão, saldo ou recibo desfaz toda a operação.

Role runtime: SELECT e INSERT somente nas colunas de identidade do comando, versão
anterior e deltas. Sem UPDATE/DELETE e sem INSERT de catálogo/timestamp/custo gerado.
A role do backend continua confiável: a proteção entre contas e o orçamento dependem
do serviço autorizado; esses grants não tornam seguro entregar SQL ao navegador.

Repetição do mesmo requestId/versão/deltas retorna o recibo original. Ordem diferente
das chaves JSON não muda a identidade; deltas diferentes com o mesmo ID geram 409.
Recibos anteriores continuam legíveis. O retorno pode incluir attributes com catálogo,
allocated, earned, spent, available e lastRequestId; GET /online-state traz o estado atual.
A persistência do recibo permite reconstruir a resposta depois de perder a conexão.

## Interface e retomada

O painel mostra saldo e totais por atributo. O jogador escolhe um atributo, informa
a quantidade e confirma antes de enviar. Cancelar não gasta. Campos e botão ficam
bloqueados sem controle, durante envio ou com saldo esgotado. O texto deixa explícito
que ainda não existem efeitos de combate nem redistribuição.

Pendência em sessionStorage guarda somente personagem, ID, versão, ação e deltas;
sem cookies/tokens/senhas. Payload é validado ao restaurar. Reload faz somente GET:
o jogador retoma manualmente o mesmo pedido com controle válido. Outra distribuição
não confirma este pedido; lastRequestId precisa corresponder. Mesmo com saldo zero,
um pedido incerto continua reconciliável por replay, antes da checagem de saldo atual.
Logout troca a tela e remove a pendência; nenhuma chave de save/localStorage é usada.

## Migração e operação

0010 é aditiva: não muda personagens, progressão, versões, recibos ou saldos antigos.
Histórico vazio significa zero investido. Aplicação da migração e dos grants deve
anteceder a nova versão da API. Não voltar a um binário que desconhece recibos
attributes.allocate após ativar a funcionalidade; planejar rollback junto dos dados.
Não aplicar esta migração automaticamente ao banco persistente de homologação.

## Evidência e limites

- TDD: rota inicialmente recusou o comando válido com 400; UI não mostrava orçamento
  nem tratava a distribuição. Após implementação, casos passam.
- 89 integrações PostgreSQL: HTTP estrito/CSRF, acesso cruzado, controlador, saldo,
  concorrência entre instâncias, rollback, cap, versão esgotada, migração preservando
  recibos, grants mínimos, perda real de socket e reconstrução do serviço.
- 61 testes de fundação, 143/143 arquivos Node legados, build/typecheck, build Pages
  e três testes de distribuição do portal aprovados localmente.
- Navegador HTTPS com API/PG real local e provedor sintético, em banco UUID descartável.
  Fixture inicial preparada no nível 2/80 XP/5 pontos; não é ensaio de Supabase real.
  Distribuição 3 Força + 2 Vitalidade, cancelamento preservando saldo, saldo zero,
  bloqueio de nova distribuição e persistência após reload verificados. Uma aba da
  automação travou no diálogo; foi encerrada e a leitura independente confirmou que
  a tentativa ainda não havia gasto os pontos restantes antes de prosseguir.
- Desktop e 390 px sem transbordamento, logout e abertura da demonstração sem criar
  save. Captura local ignorada. Harness encerrado, apenas PostgreSQL preservado;
  Auth real false. Sem e-mails, mudanças Supabase, DNS, VPS ou backend em produção.

Docker/Linux serão verificados no CI real do PR, sem alegar Docker local.
Próximo bloco: atributos iniciais/derivados e efeitos no combate, com catálogo de regras
versionado e snapshot por encontro para preservar batalhas em andamento. Inventário,
economia contínua e requisitos operacionais da hospedagem permanecem fora desta etapa.

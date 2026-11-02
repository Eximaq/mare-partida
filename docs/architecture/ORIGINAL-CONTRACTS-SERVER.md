# Contratos originais no servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

Base `e0b4443`, incluindo os chefes e correções dos PRs #207/#208. Os dez contratos existentes passam
a funcionar pelo BFF/PostgreSQL e pelo quadro original, sem mudar objetivos,
recompensas, arte ou saves da demonstração.

## Contrato e persistência

`contract-system.js` preserva os IDs, textos, metas e valores antes definidos em
`game.js`. A demonstração mantém sua persistência. Online, o progresso vem de
`contracts` no snapshot autenticado de `/online-state`; a leitura não conta
abates, paga recompensas nem reinicia objetivos.

`contract.claim` aceita apenas `{contractId}`, com versão, requestId e controle no
envelope existente. Sessão, dono e controlador são revalidados antes do replay.
Campos extras e IDs desconhecidos são recusados. Resgates do mesmo requestId
retornam o recibo original; intenções distintas competem pela versão. A chave
única por personagem/contrato impede novo pagamento, mesmo com outro requestId.

Os contadores avançam na transação do abate, após o registro único do spawn em
`world_battle_rewards`, e são limitados às dez metas. Resgate, XP, ouro, nível,
versão e recibo são atômicos. Subir de nível restaura HP e energia persistidos
pelas fórmulas originais. Falha reverte tudo; limites BIGINT/versão são verificados.
A role runtime não pode alterar/apagar resgates, apagar contadores ou trocar sua
identidade. As consultas usam parâmetros.

“Diários” continua sendo a apresentação dos contratos únicos. Semanais/Mensais
estão vazios; não existe reset por relógio ou recompensa final em 10/10.

## Migrações

- `0018_battle_profile_compatibility.sql`: o PR #207 extraiu `profileAtLevel` e
  mudou o hash das regras. A comparação de 864 perfis válidos confirmou resultados
  idênticos. Apenas o hash conhecido do PR #204 é atualizado; hashes desconhecidos
  continuam bloqueados. HP, monstros, posição, relógios e recompensas são preservados.
  Perfis de chefes inexistentes que antes retornavam NaN não são encontros válidos.
- `0019_original_contracts.sql`: cria contadores/resgates e reconstrói contadores
  dos spawns já pagos pelo servidor, limitados à meta. Não paga contratos nem importa
  saves durante a migração. Atualizar os grants depois de migrar.
- `0020_restore_stable_battle_hash.sql`: o PR #208 restaurou a fonte/hash original
  enquanto este bloco estava em revisão. A 0018 já aplicada permanece imutável;
  a 0020 reconcilia apenas seu hash intermediário conhecido com o engine atual,
  sem mudar o estado da batalha. Instalações antigas e intermediárias convergem.

A instalação contínua recebeu backup e foi parada antes das migrações. A comparação
das 30 tabelas anteriores confirmou preservação, normalizando apenas o hash
explicitamente migrado: quatro contas, três personagens, 20 migrações e zero
resgates artificiais. PostgreSQL e o banco anterior foram preservados.

## Interface, testes e limites

O quadro original, seus atalhos e o diário de bordo usam o progresso do servidor.
O cliente não concede recompensa antecipada. Uma resposta perdida mantém a intenção
em sessionStorage para reconciliação após reload com o mesmo requestId.

- `original-contracts.test.mts`: catálogo, payload estrito e paridade dos perfis.
- `server-contracts.test.mts`: PostgreSQL descartável, HTTP/CSRF, acesso cruzado,
  concorrência, replay, rollback, limites, nível/HP/energia, grants e migrações.
- `server-world-battle.test.mts`: o worker real conta cada abate uma única vez.
- `contracts-online-browser.cjs`: quadro original, resgate, resposta perdida,
  reload, viewport estreito e save sentinela preservado.
- `contracts-board-browser.cjs`: regressão do quadro e saves da demonstração.

O navegador usa BFF simulado; as transações usam PostgreSQL real descartável.
Não houve novo ensaio Supabase, cadastro ou e-mail. Docker é executado no CI Linux,
não presumido neste Windows; consultar os checks do commit publicado.

O backend continua local. Talentos, conquistas, hierarquia, frutas, Haki, Impel Down
e masmorras online seguem pendentes no escopo integral. Pages publica o frontend
estático; não hospeda o backend.

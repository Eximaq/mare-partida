# Haki original no servidor

O modo online reutiliza `haki-system.js` e `haki-progression.js`, a mochila, as
árvores e os controles H/J/K existentes. O backend determina desbloqueio, custos,
Vontade, efeitos e recargas. Nenhum save da demonstração é lido ou alterado.

## Regras preservadas

- Livro da Vontade: nível50, item próprio desbloqueado, consumo único. Chance5%
  por chefe de mundo Nv.30+, sem multiplicador de sorte. Não cai de comuns,
  Impel Down ou masmorras. Mochila cheia não recebe o livro.
- O livro libera acesso às árvores, não habilidades gratuitas. São16 nós e42
  graduações com custos e dependências originais; Conquistador depende dos dois
  ramos iniciais. Pilhas bloqueadas não pagam o custo. Sequência obsoleta e
  concorrência não duplicam investimentos.
- Vontade100; drenagem5/s, regeneração5/s em descanso vivo, combate prolongado por
  contatos até6s. Automação única e ativada no primeiro contato; esgotamento não
  religa no mesmo combate. Armamento e Observação são mutuamente exclusivos.
- Conquistador custa50, mantém recarga absoluta8s, raio360 e linha de visão.
  Comuns recebem stun3s; chefes, redução15% ATQ/DEF por8s sem empilhar. Os buffs
  são temporários e não aumentam o BP permanente das conquistas.
- Troca de mapa/controlador, interrupção longa, morte e reconexão encerram os
  efeitos; reserva e recarga permanecem. Não há regeneração pelo tempo offline.
- Fragmentos continuam sem fonte no gameplay normal, conforme o catálogo atual.
  Testes criam materiais somente nos bancos descartáveis e fixtures. Não foi
  criado comando de concessão, compensação ou importação de Haki antigo.
- Aprender cada ativo habilita sua conquista original. `Domínio Supremo` continua
  sem crédito automático: o jogo atual não emite o evento `hakiMaximized`.

## Contratos e persistência

`haki.unlock` recebe só `itemId`; `haki.invest`, `nodeId` e `expectedSeq`;
`haki.configure`, ramo contínuo e booleano; `haki.toggle`, ramo contínuo;
`haki.cast`, objeto vazio. Payloads extras, dono, atributos, relógio, alvos e
resultados são recusados. Sessão, propriedade, CSRF, controlador, versão,
rate limit e recibo são os mesmos dos outros comandos, inclusive no replay.

Estado permanente e runtime residem no combate persistido do personagem. Eles
são validados separadamente da intenção do cliente. O worker serializa atualizações
com os comandos e não mantém sessões vivas. Desbloqueio e graduação gravam
inventário, estado, evento econômico, versão e recibo na mesma transação. Falha
reverte tudo; a role não pode apagar combates nem reescrever os eventos.

Migração0026 permite os dois eventos de consumo e atualiza somente o hash de
combate conhecido do release anterior. Não importa progresso local nem altera
contas, personagens, itens, HP, energia, cooldowns existentes ou regras de Auth.
Os módulos de Haki já estavam incluídos no pacote Docker com contexto restrito.

## Validação e operação

- Motor: automação, exclusividade, drenagem/esgotamento, caps, contato ofensivo e
  defensivo, LOS, chefes/comuns, recarga após JSON/viagem e morte.
- PostgreSQL descartável: livro,42 graduações, pilhas/custos, concorrência/replay,
  rollback, worker, ausência de regeneração offline, chance exata do livro,
  capacidade, CSRF, conta alheia, controlador antigo, logout, grants e migração.
- Navegador real com BFF de fixture: livro,16 nós/42 graduações, recarga,
  preferências, reload, atalhos, desktop/mobile e save da demonstração preservado.
  A fixture visual é separada dos testes transacionais reais de PostgreSQL.
- Build/typecheck, fundação, integração,147 arquivos Node legados, navegador da
  demonstração e build estático são gates deste incremento.

Atualização local executada com backup e API/gateway parados. As44 tabelas
anteriores mantiveram o conteúdo, normalizando apenas o hash conhecido do combate.
Permanecem quatro contas, três personagens e26 migrações. HTTPS local, recursos
estáticos e exigência de sessão foram conferidos após reinício. Não houve e-mail,
alteração no Supabase, DNS ou publicação pública do backend.

A migração das frutas e o aceite integral dos demais domínios continuam no
manifesto. Este documento não declara o servidor inteiro concluído.

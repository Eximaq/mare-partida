# Aceite integrado do servidor do jogo atual

Revisão de 02/11/2026. Escopo: portar as funções existentes do jogo para o backend,
conservando regras, HUD, mapas, Paper Doll, assets e saves da demonstração. O histórico
incremental está em `ORIGINAL-*-SERVER.md`; os limites anotados nesses documentos
referem-se às respectivas entregas. Esta consolidação registra o estado posterior.

## Cobertura funcional

| Grupo | Autoridade e integração | Evidência principal |
|---|---|---|
| Identidade, confirmação e recuperação | Supabase Auth de desenvolvimento, BFF, cookie opaco, CSRF, revogação, controle exclusivo | PHASE-2F-FINAL-ACCEPTANCE; integrações de autenticação |
| Entrada, criação e perfil | Login abre o jogo original; três passos de criação, aparência, preferências, edição de classe/facção e logout | server-profile, profile-online-browser, final-online-browser |
| Classes, atributos e evolução | Sete classes, quatro facções, fórmulas e orçamento originais, pontos sem importação local | server-original-character, server-attributes, server-levels |
| Catálogo e mochila | IDs preservados, 109 definições, 30 frutas, 12 slots, capacidade120, instâncias emitidas no backend | current-game-catalog, server-original-inventory |
| Economia, poções e forja | Preços, custos, RNG, venda, bloqueios, cura, upgrade, reforja, imbuir, remoção e fusões originais | server-original-inventory, original-inventory-online-browser |
| Mundo e viagens | Posição, velocidade, caminhos, colisões, alcance, viagens e requisitos calculados pelo servidor | server-world, server-navigation, online-world-browser |
| Monstros, IA e combate | Spawns, patrulha, aggro/leash, respawn, ataques, LOS, energia/HP, habilidades e derrota | world-battle, server-world-battle, online-battle-browser |
| Caçadas e loot | Setores, chefes, drops, raridades, afixos, primeira vitória e recibos únicos | server-world-battle, server-original-inventory |
| Contratos e conquistas | Contadores derivados de eventos válidos, resgate único e pontos adicionais | server-contracts, server-achievements, navegadores correspondentes |
| Talentos e finais | Sete árvores, pré-requisitos, reset no porto, builds por classe, efeitos solo e recargas preservadas | server-talents, world-talents |
| Impel Down | Andares, encontros, marcos, caixas, repetição e recompensas atômicas | server-prison, prison-online-browser |
| Masmorras | Nove chefes originais; baús/recompensas apenas onde o catálogo original já os define; fragmentos vinculados | server-dungeons, dungeons-online-browser |
| Haki | Livro, requisitos, Vontade, três ramos, maestria, efeitos e recarga do Rei | server-haki, haki-online-browser |
| Hierarquia | Promoções, requisitos e ranking autoritativo; requisitos futuros continuam fechados | server-hierarchy, hierarchy-online-browser |
| Frutas | Registro possuído, compêndio, passivos, transformações e habilidades E–S de todas30 | server-fruits, fruit-runtime, fruits-online-browser |
| Persistência e segurança transversal | Transações, recibos, backup/restore, revalidação de sessão/dono/controlador e payload estrito | server-backup, server-final-acceptance, suites HTTP |

O compêndio online não concede cópias gratuitas de frutas. A identidade do dono
vem da sessão. O cliente não fornece saldo, dano, chance, resultado de RNG, XP,
relógio, recargas ou estado final. A nova API não encaminha as APIs Python legadas.
Os futuros portões de conteúdo do original são conservados, sem inventar recompensas
para os sete baús ainda sem definição, promoções futuras ou recursos multiplayer.

## Percurso real em HTTPS

`tests/final-online-browser.mts` usa Chromium/Edge isolado, certificado local confiável,
TLS habilitado, gateway HTTPS, aplicação Node real e banco PostgreSQL descartável.
Somente o provedor de identidade é uma fixture determinística. Nenhum e-mail,
conta hospedada ou configuração Supabase foi alterado neste aceite. A validação
real do provedor está nos registros anteriores da Fase2, não é substituída por mocks.

Percurso aprovado: login → criação original → porto/HUD originais → compra de
poção com resposta perdida depois do commit → recuperação do mesmo pedido com
um único recibo → equipamento → viagem para Dawn → combate do worker e recompensa
real → retorno → recarregamento/retomada do controle → mesmos saldos/equipamento →
logout → tela de login. Save sentinela da demonstração intacto e zero erros JavaScript.
O teste aceita somente a confirmação prevista de retomada de controle após reload.

Esse ensaio encontrou duas navegações concorrentes no logout. O redirecionamento
agora é único; o teste de regressão reproduziu a falha e passou com a correção.
A indisponibilidade simulada da compra não foi escondida nem confundida com falha
na transação: exatamente um item foi concedido e um recibo foi persistido.

## Segurança, recuperação e capacidade medida

- Matriz de todos55 comandos:220 recusas HTTP esperadas para CSRF ausente,
  personagem alheio, campo de proprietário extra e controlador obsoleto;605
  tentativas de injetar campos de autoridade rejeitadas pelo contrato. A enumeração
  falha se um novo comando não receber cobertura. Nenhum saldo/item muda.
- Suítes de domínio exercitam replay, concorrência, rollback, requisitos, limites,
  sessões revogadas e privilégios mínimos. Os ledgers não concedem UPDATE/DELETE
  à role runtime. Edição de nome/classe/facção não concede edição de dono/ID.
- `server-backup` executa pg_dump/pg_restore em outro banco descartável, compara
  todas as tabelas, inicia nova instância de AuthService, lê os agregados originais
  e repete um pedido já confirmado sem nova cobrança. Não apaga o banco de origem.
-12 mundos privados simultâneos,168 monstros e quatro lotes: todos avançaram,
  com interrupção do progresso após logout. Medição inicial local: maior lote557ms,
  média409ms. É uma amostra local, não uma promessa de CCU para VPS.
- O gargalo estava nas verificações repetidas contra todos os obstáculos. O índice
  server-only reduz os candidatos, mantendo os predicados exatos originais. Grades,
  colisões, tiros e rotas foram comparados em todos os mapas; estados de batalha
  determinísticos também coincidem. Passos de Dawn caíram de160–260ms para20–49ms
  no ensaio local. Não se alterou velocidade, mapa ou balanceamento.
- Worker: máximo32 candidatos por lote, transações independentes, SKIP LOCKED,
  fencing, tempo simulado limitado e cancelamento após lacunas prolongadas. Não
  concede farm offline nem compensa suspensão do computador com recompensas.

## Migração e preservação

A migração0030 atualiza somente o hash conhecido das regras de navegação. Conteúdo
geométrico e dados do personagem permanecem iguais; versão desconhecida continua
recusada. O teste aplica a SQL duas vezes e compara todas as tabelas. A migração29
já publicada não foi reescrita. Fazer backup antes de atualizar a instalação local,
com API/gateway parados; não reiniciar o cluster PostgreSQL compartilhado.

Na instalação contínua, backup e migração0030 foram executados:49 tabelas anteriores
com dados idênticos, quatro contas/três personagens e30 migrações. Início e HTTPS
verificados; recursos200, catálogo privado401. Auth/API/gateway parados no encerramento.

Capturas, dumps, envs e logs detalhados ficam ignorados. Não publicar identificadores
pessoais, sessões, cookies, tokens, senhas ou saves. Assets não são regenerados.

## Execução reproduzível

```sh
npm run build
npm run typecheck
npm run test:foundation
npm run test:legacy
npm run test:integration
python tools/build_pages.py
python tests/portal_build_test.py
node tools/server-completeness.mts
```

A integração requer `TEST_DATABASE_URL` de PostgreSQL descartável em loopback e
`PG_BIN` para as ferramentas nativas. O ensaio HTTPS combinado requer o certificado
local já confiável, Playwright e `CHROME_PATH`; parar a instalação contínua antes
para liberar9443. Executar `node --env-file-if-exists=.env.test.local --import tsx
tests/final-online-browser.mts`. Ele fecha seus processos e elimina apenas o banco
UUID que criou. Não altera a confiança TLS, as contas reais ou o Supabase.

## Limites de operação

A conclusão funcional refere-se ao gameplay existente, não à criação de um MMO
compartilhado. Presença no lobby, party/PvP e chat entre jogadores são escopo novo.
Renderização/interpolação pode mostrar efeitos depois do snapshot; a resolução
válida fica no servidor. O backend permanece restrito ao computador local.

GitHub Pages publica apenas os arquivos estáticos. Hospedagem pública ainda exige
origem HTTPS comum, Supabase de produção autorizado, sizing no host real,
backup externo/restore, alertas e políticas de retenção; ver ONLINE-ALPHA-HOSTING.
Recibos duráveis não são apagados automaticamente para liberar espaço. Monitorar
crescimento e espaço do disco. Os resultados não são garantia de invulnerabilidade.

## Registro final de validação

Build e typecheck aprovados;181 testes de fundação e147/147 arquivos Node legados
aprovados. PostgreSQL executou210 casos:209 passaram e o novo cenário de hash
incorreto foi inicialmente impedido pelo CHECK do próprio banco. A fixture foi
corrigida para um hash desconhecido de formato válido; o cenário passou no reteste.
Os210 casos têm aprovação observada. Não houve falha de aplicação ignorada.

HTTPS combinado aprovado, três testes Python da exportação aprovados e npm audit
sem alertas nas dependências de produção. Assets sem alterações em relação à main.
O gate do manifesto conclui27/27 grupos; o CI agora exige esse gate, em vez de
executar somente a auditoria informativa. O CI repete o conjunto completo e Docker
Linux antes do merge; seu resultado exato fica nos checks do PR de consolidação.
Não se afirma execução de Docker neste Windows.

O perfil foi mesclado no PR#217 depois de25 checks aprovados, incluindo Docker/Linux.
GitHub Pages run41415331244 concluiu com sucesso e o game.js público foi comparado
ao commit69b4cf6. A consolidação seguinte mantém a publicação estática separada do
backend local. Merge e publicação somente após os checks da respectiva revisão.

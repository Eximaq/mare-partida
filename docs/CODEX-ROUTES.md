# CODEX-ROUTES — índice de consulta sob demanda

Este índice é **mapa de navegação**, não descrição confiável do estado atual. Confirme caminhos, exports e regras no código da branch antes de implementar. Use somente a(s) rota(s) correspondentes à solicitação.

| Tarefa | Código a localizar primeiro | Documentos e testes a procurar | Atenção |
|---|---|---|---|
| Fundação do servidor autoritativo | `apps/game-server`, `packages/shared`, `infra` | `docs/architecture/AUTHORITATIVE-FOUNDATION.md`, `docs/operations/LOCAL-SERVER.md`, `tests/foundation`, `tests/integration/server*` | Fase 1: sem autenticação/gameplay online; preservar frontend/saves; publicação da branch e Draft PR autorizados na revisão; sem merge/deploy |
| Autenticação e aceite da Fase 2 | `apps/game-server/src/auth`, `apps/account-client` | `docs/operations/PHASE-2F-FINAL-ACCEPTANCE.md`, `docs/architecture/ADR-0002-BFF-SESSIONS.md`, `docs/operations/SUPABASE-DEVELOPMENT-SETUP.md` | Matriz 2F é status atual; histórico não renova autorização; sem e-mails/mudanças Supabase antes de aprovação específica |
| Estado autoritativo — Etapa 3A | `apps/game-server/src/characters`, migração 0003, `packages/shared/src/schemas/character-state.ts` | `docs/architecture/PHASE-3-SERVER-STATE-PLAN.md`, `tests/integration/server-character-state.test.mts` | Snapshot restrito ao dono; sem mutações econômicas ou importação de saves; migração/grants antes de iniciar a nova versão |
| Comandos autoritativos — Etapa 3B | `apps/game-server/src/characters/commands.ts`, migração 0004, `packages/shared/src/schemas/character-command.ts` | `docs/architecture/PHASE-3B-COMMAND-PROTOCOL.md`, `tests/integration/server-commands.test.mts` | Somente state.sync; sessão/dono/controlador antes do replay; recibos imutáveis e limitados; nenhuma mutação econômica |
| Primeira mutação — Etapa 3C | `apps/game-server/src/characters/journey.ts`, migração 0005 | `docs/architecture/PHASE-3C-JOURNEY-COMMAND.md`, `tests/integration/server-journey.test.mts` | journey.begin uma vez; versão/ledger/recibo atômicos; sem recompensas ou importação de save; leitura de recibos históricos preservada |
| Painel online — primeiro fluxo 3D | `apps/account-client`, GET `/online-state` em auth/service e routes | `docs/architecture/PHASE-3D-ONLINE-PANEL.md`, `tests/foundation/online-journey-ui.test.mts`, `tests/integration/server-online-state.test.mts` | Leitura do ledger, jornada única e reconciliação; pendência mínima em sessionStorage; nenhum acesso ao localStorage/save; somente gateway local |
| Login/portal | `portal/index.html`, `portal/portal.js`, `portal/portal.css`, `tools/build_pages.py` | `docs/COLABORACAO_GITHUB.md`; testes web/build relevantes | Não afirmar Supabase conectado sem confirmar; preservar fundo/arte aprovada |
| Primeira caçada online — 3E | `apps/game-server/src/characters/hunt.ts`, migração 0006, `apps/account-client` | `docs/architecture/PHASE-3E-FIRST-HUNT.md`, `tests/integration/server-hunt.test.mts` | Uma caçada por personagem, tempo PostgreSQL e crédito único; não importar saves, não aceitar valores econômicos do cliente; backend ainda local |
| Primeiro combate online — 3F | `apps/game-server/src/characters/combat.ts`, `combat-rules.ts`, migração 0007, schema shared/combat | `docs/architecture/PHASE-3F-FIRST-COMBAT.md`, `tests/integration/server-combat.test.mts`, `tests/foundation/combat-rules.test.mts` | Encontro único por turnos; HP/RNG/recarga no servidor; replay de ataque por requestId, nunca por turno; não alterar a demonstração |
| HUD/UI/inventário | `character-hud.js`, `ui-system.js`, `notification-system.js`, `ui-*.css`, `index.html`, `ui-preview.html`, `game.js` (somente funções de UI), `forge-ui.js` | `docs/UI-DESIGN.md` (se existir), `docs/CHARACTER-PARCHMENT-HUD.md` (perfil/cartaz), `docs/HUD-NAVIGATOR-DIRECTION.md` (demais painéis), testes de inventário | Índices `itemDefs`, equipamentos e saves |
| Personalização visual/criação | `character-appearance.js`, `game.js` criação, `paper-doll-96-lobby.js`, `tools/paper-doll-96-v3/wardrobe.js` | `docs/PERSONAGEM-APARENCIA-96.md`; testes character-appearance/character_appearance | Rascunho separado, íris mascarada, pele fora do cabelo, política de capacete |
| Personagens/classes | `character-system.js`, `game.js` funções de criação | testes de personagem; sec. 3 de `AGENT.md` somente se necessário | Facção ≠ classe; dados migrados |
| Combate/caçadas | `hunt-system.js`, `monster-behavior.js`, `world-system.js`, `combat-*.js` | `docs/MONSTER-SPAWNS.md`, `docs/CACADAS-1-20.md`, `docs/ATTACK-SPEED-ANIMATION.md`, testes de combate/caça | Dano real/hit-frame, LOS, cooldown e anti-duplicação |
| Física/profundidade global | `world-system.js`, `world-depth.js`, `game.js` (combatLine/filas de desenho) | `docs/MAP-COLLISION-AUDIT.md`, `tools/audit_maps.cjs`, testes map-physics-audit/world-depth/map_audit_browser | Separar pés e disparos; preservar máscaras e pixels dos mapas |
| Mapas/Dawn | `dawn-world.js`, `dawn-map-data.js`, `dawn-renderer.js` | `docs/DAWN-MAPA-MANUAL.md`, `tests/dawn_manual_browser.py` | Mapa fornecido pelo proprietário e fidelidade |
| Mapas/Conchas | `conchas-world.js`, `conchas-renderer.js`, `conchas-*.js` | `docs/CIDADE-DAS-CONCHAS.md`, testes de Conchas | Rotas, casas, colisões; PRs recentes podem mudar geometria |
| Arquipélago/ilhas | `archipelago.js`, `new-islands*.js`, `alubarna-*.js` | `docs/ARQUIPELAGO-REGIOES.md`, `docs/ALUBARNA.md`, testes das ilhas/Alubarna | IDs persistidos e permissões de entrada |
| Personagem atual / Paper Doll | `paper-doll-96-lobby.js`, `character-appearance.js`, `headgear-visibility.js`, `tools/paper-doll-96-v3/`, `tools/player96_release.py` | `docs/SPRITES-ATUAIS-FONTE-UNICA.md`; testes `current-player-*`, `player_sprite_ownership_browser`, `paper_doll_96_*` | Exclusivo native96, sem fallback visual; módulos Paper Doll84 somente nas bancadas históricas; DEV ≠ produção |
| Sprites/PixelLab | `sprite-combat-v2.js`, `sprite-combat-v2-data.js`, manifests do pacote específico, `assets/**` do subsistema | `docs/ART_BIBLE.md`, `docs/SPRITES-COMBAT-V2.md`, testes `sprite_combat_v2*` e `sprite-combat-v2*` | Custo explícito, licença, pivôs, nearest-neighbor; timing lógico permanece nos controladores existentes |
| Haki | `haki-system.js`, `haki-ui.js`, `haki-art.js` | `docs/HAKI.md`, testes de Haki/talentos | Consumo transacional e saves |
| Talentos/conquistas | `talent-*.js`, `achievement-system.js`, `ultimate-system.js` | `docs/TALENTOS.md`, testes de talentos | Conquistas únicas, respec e resets |
| Forja/itens | `forge-system.js`, `forge-ui.js`, `game.js` definição de itens | testes de forja/inventário | Índices append-only, pérolas, refinamento |
| Frutas avançadas A/S | `rank-a-system.js`, `rank-a-expansion.js`, `rank-s-system.js`, `rank-s-data.js`, `server/rank_s.py` | `docs/RANK-S-YAMI-MERA.md`, documentos Rank A; testes `rank-s-system` e `rank_s_*` | Três slots, tokens, timelines, auras e catálogo append-only |
| Akuma no Mi/Zoan | `akuma-system.js`, `zoan-art.js`, `neko-system.js`, `ushi-system.js`, `doru-system.js`, `wolf-system.js`, `server/akuma.py` | `docs/AKUMA-NO-MI.md`, `docs/NEKO-LEOPARDO-RANK-D.md`, `docs/USHI-GIRAFA-RANK-D.md`, `docs/DORU-RANK-D.md`, `docs/WOLF-RANK-D.md`, `tests/wolf_browser.cjs`, testes de Akuma/Zoan/Doru e `tests/neko_browser.cjs`/`tests/ushi_browser.cjs` | Persistência, fallback, bônus |
| Deploy/Pages | `tools/build_pages.py`, `.github/workflows/*.yml` | `docs/COLABORACAO_GITHUB.md` | Commit ≠ deploy bem-sucedido |

## Processo de engenharia para duas IAs (consulta opcional)

- **Depuração, PR complexo, tarefas paralelas ou gastos com arte:** abrir `docs/CODEX-QUALITY-LOOP.md` e aplicar reprodução -> hipótese -> patch mínimo -> regressão.
- **Se o erro lembra um incidente anterior:** consultar a linha relevante de `docs/CODEX-LESSONS.md` sem ler tudo novamente.
- **Auditoria periódica de qualidade/custo:** usar os cenários em `docs/CODEX-EVALS.md`, medindo apenas créditos observáveis.
- **Antes de ler código:** `python3 tools/codex_snapshot.py --area termo --compare origin/main` produz visão curta de branch/arquivos, sem dumps.
- **Antes do PR:** preencher somente as seções aplicáveis de `.github/pull_request_template.md` e indicar conflitos de branch, testes e custo.
- Não carregar estes documentos em correções textuais simples; mantê-los pequenos e atualizados a partir de falhas comprovadas.

## Procedimento rápido de leitura

Autenticação online em desenvolvimento: `apps/game-server/src/auth/`,
`packages/shared/src/schemas/auth.ts`, `apps/account-client/`;
ver `docs/architecture/ADR-0002-BFF-SESSIONS.md` e
`docs/operations/PHASE-2-DEVELOPMENT.md`. Testes: `tests/foundation/auth*`,
`supabase-provider.test.mts`, `gateway.test.mts`, `tests/integration/server-auth*`.
Sem integração de gameplay/saves; consultar a matriz 2F para os ensaios Supabase reais concluídos e seus limites.

```bash
git status --short && git log -1 --oneline
rg --files | rg '(portal|paper-doll|conchas|tests)'  # troque pelo domínio da tarefa
rg -n 'nomeDaFuncao|identificador' caminho1.js caminho2.js
sed -n '120,210p' caminho1.js  # apenas intervalo necessário
git diff --stat && git diff -- caminho1.js
```

Evite abrir todas as pastas `docs/`, `assets/` ou `pixellab-pip-generations/` e evite copiar o `README.md` completo para o contexto.

## Critérios de decisão para testes
1. **Pure logic:** teste Node focado do módulo e dos consumidores diretos.
2. **Interface/Canvas/arte:** testes focados **e** captura/inspeção visual em navegador real (desktop/móvel), com estado e origem isolados.
3. **Estado/saves/economia:** migração + reload + falha de persistência + regressão de duplicação.
4. **Mapa/colisões:** navegabilidade real, rotas, entrada/saída, viewport e linhas de visão.
5. **Build/publicação:** `python tools/build_pages.py`, integridade dos caminhos e workflow Pages. Só declarar online depois de sucesso constatado.

## Compatibilidade de memória
Não dependa de contexto de conversa anterior. Uma nova sessão consegue se orientar por `AGENTS.md` + esta tabela + arquivos específicos. Para tarefas longas, usar `docs/AI-HANDOFF.md` como checkpoint curto; conferir se o commit de referência ainda é atual.

## Regras de manutenção
- Atualize este índice somente quando rotas de código/teste mudarem.
- Prefira vincular uma documentação específica a duplicar trechos enormes aqui.
- Não transfira datas, níveis e nomes históricos como fatos atuais sem verificar o código.

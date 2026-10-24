# CODEX-ROUTES — índice de consulta sob demanda

Este índice é **mapa de navegação**, não descrição confiável do estado atual. Confirme caminhos, exports e regras no código da branch antes de implementar. Use somente a(s) rota(s) correspondentes à solicitação.

| Tarefa | Código a localizar primeiro | Documentos e testes a procurar | Atenção |
|---|---|---|---|
| Login/portal | `portal/index.html`, `portal/portal.js`, `portal/portal.css`, `tools/build_pages.py` | `docs/COLABORACAO_GITHUB.md`; testes web/build relevantes | Não afirmar Supabase conectado sem confirmar; preservar fundo/arte aprovada |
| HUD/UI/inventário | `ui-system.js`, `ui-*.css`, `game.js` (somente funções de UI), `forge-ui.js` | `docs/UI-DESIGN.md` (se existir), testes de inventário | Índices `itemDefs`, equipamentos e saves |
| Personagens/classes | `character-system.js`, `game.js` funções de criação | testes de personagem; sec. 3 de `AGENT.md` somente se necessário | Facção ≠ classe; dados migrados |
| Combate/caçadas | `hunt-system.js`, `world-system.js`, `combat-*.js` | `docs/CACADAS-1-20.md`, `docs/ATTACK-SPEED-ANIMATION.md`, testes de combate/caça | Dano real/hit-frame, LOS, cooldown e anti-duplicação |
| Mapas/Dawn | `dawn-world.js`, `dawn-map-data.js`, `dawn-renderer.js` | `docs/DAWN-MAPA-MANUAL.md`, `tests/dawn_manual_browser.py` | Mapa fornecido pelo proprietário e fidelidade |
| Mapas/Conchas | `conchas-world.js`, `conchas-renderer.js`, `conchas-*.js` | `docs/CIDADE-DAS-CONCHAS.md`, testes de Conchas | Rotas, casas, colisões; PRs recentes podem mudar geometria |
| Arquipélago/ilhas | `archipelago.js`, `new-islands*.js` | `docs/ARQUIPELAGO-REGIOES.md`, testes das ilhas | IDs persistidos e permissões de entrada |
| Paper Doll | `paper-doll.js`, `paper-doll-assets.js`, `paper-doll-review.js` | `docs/PAPER-DOLL.md`, `docs/PAPER-DOLL-CONJUNTO-AZUL.md`, testes `paper_doll*` | `approved:false`; fallback; DEV ≠ produção |
| Sprites/PixelLab | manifests do pacote específico, `assets/**` do subsistema | `docs/ART_BIBLE.md` se existente, docs do pacote | Custo explícito, licença, pivôs, nearest-neighbor |
| Haki | `haki-system.js`, `haki-ui.js`, `haki-art.js` | `docs/HAKI.md`, testes de Haki/talentos | Consumo transacional e saves |
| Talentos/conquistas | `talent-*.js`, `achievement-system.js`, `ultimate-system.js` | `docs/TALENTOS.md`, testes de talentos | Conquistas únicas, respec e resets |
| Forja/itens | `forge-system.js`, `forge-ui.js`, `game.js` definição de itens | testes de forja/inventário | Índices append-only, pérolas, refinamento |
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

# AGENTS.md — Operação eficiente do Codex | Maré Partida

> **Fonte das regras operacionais para agentes nesta raiz.** Leia este arquivo uma vez por sessão. Consulte `docs/CODEX-ROUTES.md` para localizar SOMENTE a documentação da tarefa. `AGENT.md` contém planejamento e decisões históricas do proprietário: **não** leia inteiro automaticamente nem trate roadmap como funcionalidade implementada.

## Ordem de verdade (em caso de divergência)
1. Pedido atual do proprietário e limitações explicitamente aprovadas.
2. Código e testes da branch atual (estado implementado).
3. Documentos específicos do subsistema afetado.
4. `AGENT.md` e histórico do `README.md` (contexto/objetivos, nunca implementação presumida).
Se houver conflito material, informe antes de alterar comportamento, save ou arte aprovada.

## Inicialização mínima (sem varrer o repositório inteiro)
1. `pwd; git status --short; git branch --show-current; git log -1 --oneline`.
2. Identifique os arquivos com pesquisa dirigida: `rg -n 'termo|identificador' --glob '!dist/**' --glob '!assets/**' --glob '!pixellab-pip-generations/**'`; depois `rg --files | rg 'nome-ou-subsistema'`. Não despeje `game.js`, `README.md`, logs ou manifests enormes sem necessidade.
3. Abra `docs/CODEX-ROUTES.md` e no máximo os documentos e trechos de código pertinentes à mudança.
4. Antes de editar, declare em poucas linhas: objetivo, arquivos prováveis, invariantes, teste específico e risco. Não repita um levantamento já realizado se arquivos/commit relevantes não mudaram.

## Estratégia de tokens e contexto
- Primeiro procure **nomes de funções e ocorrências**, depois leia janelas pequenas em torno delas (`rg -n`, `sed -n 'N,Mp'`). Amplie apenas se houver dependência real.
- Priorize `git diff --stat` e `git diff -- arquivo` sobre arquivos inteiros. Para PRs: `git diff origin/main...HEAD --stat` antes de examinar patches.
- Investigue um fluxo vertical de cada vez: ponto de entrada -> lógica -> estado -> UI -> testes. Não abra cinco sistemas adjacentes sem evidência.
- Não releia a mesma documentação em todo passo. Resuma somente decisões verificadas, arquivo/linha, testes e pendências no fechamento; não crie diários extensos ou caches de prompts.
- Não criar ou atualizar arquivos de memória automaticamente a cada turno. Use `docs/AI-HANDOFF.md` apenas em trabalhos longos/interrompidos, com fatos atuais, referência do commit e validade limitada; nunca inclua segredos, logs brutos ou texto completo de arquivos.
- Evite `git add .`, dumps enormes, refatorações fora do escopo, novo framework sem pedido e mudanças cosméticas em cascata.

## Invariantes críticos
- Preservar saves e índices do catálogo `itemDefs`; migrações idempotentes e testes de retorno/reload. Não modificar chaves `localStorage` nem conceder XP, ouro ou itens duplicados.
- Manter modos DEV e save de teste isolados do jogo normal; não promover flags experimentais.
- Paper Doll: `approved:false` e `productionEnabled:false` continuam obrigatórios sem aprovação artística explícita; manter fallback e proteger animações/sprites aprovados.
- Mapas: preservar IDs/contratos, colisões, rotas e dados fornecidos pelo proprietário; conferir dimensões específicas nos arquivos atuais em vez de copiar números do histórico.
- Portal web: HTML com formulários reais; não substituir UI por imagem estática. Jamais armazenar credenciais no frontend ou fingir login Supabase funcional.
- Arte: **protótipo -> avaliação visual -> aprovação -> integração**. Não gastar créditos PixelLab nem lançar uma nova identidade visual por iniciativa própria.
- Repositório compartilhado: nunca sobrescrever alterações locais do colaborador, usar force-push ou apagar assets sem autorização. Respeitar PR #39 pausado; verificar situação real dos demais PRs.

## Testes proporcionais ao risco
- Toda mudança: verificar sintaxe relevante, `git diff --check`, testes focados na área modificada.
- Mudanças de runtime: adicionar regressão específica e executar testes dos consumidores; para interação visual ou mapas, testar em navegador e pelo menos um viewport estreito.
- Mudanças de publicação/assets: `python tools/build_pages.py`, verificar caminhos relativos e imagens, além de teste visual real quando possível.
- Em alterações de save, combate, loot, colisão ou Paper Doll, usar as suítes de regressão descritas na rota do subsistema, não apenas o teste que foi alterado.
- Se falhar: diagnosticar a causa; **nunca** alterar uma asserção só para tornar CI verde sem confirmar a regra de produto e reproduzir o comportamento.

## Colaboração e publicação
- Trabalhar em `feature/...`, `fix/...` ou `docs/...` a partir de base atualizada; commit e push dos arquivos da tarefa; abrir PR para `main`.
- O proprietário já autorizou commit/push de tarefas solicitadas. **Merge e lançamento em produção exigem instrução específica**; não confundir push, merge, build e deploy concluído.
- Não adicionar saves, chaves, `.env`, arquivos temporários nem capturas de teste em massa.
- Na entrega informar: arquivos alterados, comportamento validado, comandos e resultados, riscos ainda abertos, link do PR/commit, estado **verificado** da publicação. Não afirmar testes ou deploy não observados.

## Uso de documentação extensa
- `README.md`: leia seções pontuais, não o histórico inteiro.
- `AGENT.md`: guia longo de objetivos e decisões anteriores **mantido pelo proprietário**. Consulte se a tarefa exigir decisão de design não coberta por código/docs atuais; usar busca por título/termo e trechos, não leitura integral.
- `docs/CODEX-ROUTES.md`: índice de arquivos, riscos e testes; atualize quando a arquitetura ou nomes de arquivos mudarem, não após toda tarefa.

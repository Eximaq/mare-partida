# CODEX-QUALITY-LOOP — engenharia, colaboração e custo

**Uso:** abra este arquivo ao iniciar trabalho de implementação, depuração, revisão de PR ou geração paga. Em pedidos triviais (texto/renomeação), use apenas AGENTS.md. Regras de saves, Paper Doll e publicação permanecem no AGENTS.md.

## 1. Contrato da tarefa — até seis linhas

Antes de editar, defina brevemente:
- **Objetivo observável** e o que está *fora* do escopo.
- **Área/proprietário da branch** (qual agente e quais arquivos pretende modificar).
- **Comportamento atual** (evidência real) e **comportamento esperado**.
- **Invariantes** (save, combate, loot, colisão, assets aprovados, contratos públicos).
- **Critério de aceite** e teste mais barato que demonstra o resultado.
- **Orçamento:** baixo (inspeção/patch), médio (teste de navegador), alto (geração externa ou refatoração ampla).

Não repita este contrato a cada mensagem se o objetivo e o commit não mudaram.

## 2. Resolução de bugs — hipótese, prova, correção

1. Reproduza o defeito com o menor cenário que reflita o comportamento real; anote entrada, estado, resultado e fonte (arquivo/função/linha).
2. Procure primeiro no *fluxo relevante* — disparador -> regra -> mutação de estado -> renderização/persistência -> teste. Leia blocos de código, não arquivos gigantes.
3. Levante até **três hipóteses distintas**, com evidência e teste barato para rejeitar cada uma. Não recomece a investigação completa a cada hipótese.
4. Confirme uma causa antes de alterar lógica. Se ainda não há reprodução, faça primeiro instrumentação *temporária e local* que não chegue ao deploy.
5. Corrija a causa com o **menor diff coerente**. Crie ou ajuste teste de regressão representativo. Não altere expectativa somente porque CI falhou; valide a nova regra com fonte do produto/usuário e teste no jogo.
6. Execute testes focados, de integração necessários e navegador se houver tela, mapa ou animação. Revise `git diff --check` e o diff final.
7. Quando duas tentativas produzirem o mesmo erro, interrompa o ciclo de tentativas semelhantes: verifique premissas, entradas, ambiente e ramo de código efetivamente executado. Se não houver evidência suficiente, reporte bloqueio, sem inventar conclusão.

**Critério de pronto:** problema reproduzido ou causa demonstrada; patch mínimo; regressão observável; invariantes preservadas; falhas restantes informadas. CI verde isoladamente **não comprova** correção visual, física ou de combate.

## 3. Dois agentes trabalhando em paralelo

- **Uma branch por tarefa/agente**; nunca dois agentes editando simultaneamente o mesmo worktree ou aplicando `git reset --hard`/force-push sobre o trabalho alheio.
- Antes de editar: `git status --short`, `git log -1 --oneline`, diff local e PRs abertos; combinar *responsável, arquivos e contratos* da tarefa. Não reservar um subsistema inteiro sem necessidade.
- Identifique colisões por arquivos entre branches antes de revisar/mesclar: `git diff --name-only origin/main...HEAD` de cada branch. Mesmo sem conflito textual, dois PRs podem mudar a mesma regra de comportamento.
- Para arquivos compartilhados como `game.js` e `tools/build_pages.py`, use PRs pequenos e sequenciais; extraia lógica para módulos apenas quando houver teste de caracterização e benefício real. Não faça refatoração ampla simultânea com mudança funcional.
- Ao integrar uma branch, o outro agente atualiza sua base, inspeciona novo diff e roda testes dos consumidores afetados. Não resolver conflito escolhendo cegamente “ours/theirs”.
- **PR #39 pausado**: não retomar/mesclar sem instrução explícita. Paper Doll em revisão deve manter flags de produção desligadas até aprovação artística.
- O proprietário aprova artes e mudanças de escopo/produção. Um agente não pode considerar o próprio review visual como aprovação do proprietário.

## 4. Consumo de créditos — dois custos diferentes

**Contexto/modelo Codex:** tamanho do prompt e respostas, releituras do repositório, ferramentas e rodadas de solução. **Créditos de arte:** chamadas e edições em PixelLab/serviço externo; cobrança deve ser observada na ferramenta, nunca inferida.

| Tipo de tarefa | Estratégia mais barata que continua segura |
|---|---|
| Mudança pequena | Busca direcionada + diff pequeno + teste unitário relevante; sem carregar README/AGENT.md inteiros |
| Bug com sintoma conhecido | Reproduzir primeiro; ler função e chamadores; executar teste focado antes do E2E |
| Alteração de mapa | Testar função/rota/colisão no menor mapa necessário; navegador de aceite após passar testes locais |
| Layout visual | Um protótipo completo e captura real em desktop/móvel; pedir aprovação *antes* de lote de imagens |
| PixelLab ou imagens pagas | Inventariar assets reaproveitáveis; gerar uma amostra pequena e registrar custo; somente ampliar depois de aprovação |
| Refatoração grande | Primeiro teste de caracterização; dividir em PRs com comportamento observável invariável |

- Antes de serviço pago: verificar créditos/limites disponíveis; estimar quantidade de variações/frames e identificar reutilização. Se o custo real for incerto, declarar que é incerto.
- Não duplicar chamada paga por impaciência; verifique histórico de trabalhos já solicitados. Não esconder custo nem gerar lote “para adiantar” sem autorização.
- Use um ciclo **amostra -> captura integrada -> revisão -> lote final**, evitando produzir dezenas de imagens que não combinam.
- Não reduzir testes críticos para economizar tokens. Economize **na investigação e repetição**, não na segurança.
- Evite abrir muitos conectores MCP quando uma ferramenta local barata resolve; não criar resumos prolixos após cada comando.
- Para tarefas repetitivas, registrar duração, comandos desnecessários, tentativas, bugs escapados e créditos informados pela ferramenta/usuário. **Nunca atribuir valores fictícios a tokens ou créditos.**

## 5. Aprendizado após cada PR (sem crescer infinitamente)

Ao concluir, responda internamente: (a) qual evidência resolveu o problema? (b) qual tentativa ou leitura foi desperdício? (c) qual proteção faltou?
- Se foi **caso isolado**, registrar somente no PR e teste. Não editar AGENTS.md.
- Se erro **se repetiu** ou causou regressão/custo material, propor uma lição em `docs/CODEX-LESSONS.md`, apontando PR/incidente, *causa confirmada* e proteção verificável. Não registrar suposições como fatos.
- Promova lições recorrentes para **teste ou verificação automática**, em vez de repetir advertências em prompts.
- Revisar/compactar lições antigas quando ficarem obsoletas. Não criar memória automática a cada turno, nem guardar logs/trechos longos.
- Sempre comunicar **o que foi observado** e **o que é hipótese**, separadamente.

## 6. Avaliação comparável de melhora

Para medir ganho de verdade, executar tarefas comparáveis antes/depois destas regras: correção de UI, colisão, save e análise de Paper Doll. Registrar:
- funcionamento validado e regressões (prioridade 1);
- número de tentativas repetidas e arquivos/linhas lidos sem necessidade;
- tempo e chamadas de ferramentas quando disponíveis;
- consumo real de tokens/créditos **somente se o produto/ferramenta fornecer esses dados**;
- PRs que precisaram de retrabalho.
Mais barato mas incorreto **não é** melhoria. Não declarar economia percentual sem medições comparáveis.

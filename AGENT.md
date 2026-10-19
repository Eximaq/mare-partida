# AGENTS.md — Direção permanente do Codex para o Maré Partida

> **Instalação:** coloque este arquivo na raiz do projeto atual com o nome exato `AGENTS.md`. Este documento orienta o trabalho do Codex; ele **não executa tarefas automaticamente**. Para cada sessão, informe qual sprint executar.
>
> **Estado:** guia do projeto e roadmap pretendido, **não relatório de funcionalidades concluídas**. Atualizado em 19/10/2026.

## 0. Missão e princípio inegociável

Você é o agente principal de engenharia, game design, UI/UX, pixel art e QA do **Maré Partida**, RPG Idle 2D de navegador ambientado em fantasia náutica original, com evolução planejada para MMORPG online comercializável.

**Não recrie o projeto do zero, não substitua arquivos modificados pelo usuário por cópias antigas e não diga que uma funcionalidade está pronta sem teste real.** O código presente no workspace é a fonte primária para determinar **o que está implementado**; este documento registra **o que queremos construir**. Quando houver conflito entre descrição e código, inspecione, registre e pergunte antes de descartar dados existentes.

**Loop-alvo:** criar personagem → escolher facção e classe → entrar no porto → explorar mundo limitado com câmera seguindo → conversar com NPCs → selecionar caçada → viajar → caçar automaticamente com animações → obter XP/itens → distribuir atributos e melhorar equipamentos → retornar ao porto → cooperar com outros jogadores quando a infraestrutura online existir.

**Prioridade de qualidade:** jogabilidade correta > estabilidade/saves > navegação e combate > consistência visual > novos recursos cosméticos.

## 1. Protocolo de trabalho a cada solicitação

1. **Descobrir o projeto certo:** confirmar `pwd`, raiz do repositório, branch/commit, mudanças não commitadas e estrutura atual. Se existir ZIP/RAR ou arquivo enviado pelo usuário, comparar hashes e diffs com a cópia corrente; **não assumir** que a versão numericamente maior é a versão certa.
2. **Ler a documentação existente:** este `AGENTS.md`, README, documentos de game design e roadmap, arquivos de arquitetura e histórico das últimas alterações. O `GAME_DESIGN.md` antigo pode conter hipóteses superadas pelas decisões recentes; documentar diferenças, não apagá-las silenciosamente.
3. **Inspecionar o código real:** descobrir engine, bundler, controles, assets, renderização, combate, persistência, backend e scripts de teste. **Não presumir Phaser/React/Colyseus já instalados.**
4. **Criar ponto de recuperação:** branch/commit/checkpoint ou backup confiável, sem sobrescrever trabalho não commitado. Nunca apagar save ou assets sem permissão.
5. **Planejar a sprint:** escopo pequeno, arquivos afetados, critérios de aceite, riscos, tempo e custo de API/assets. Solicitar aprovação para alterações destrutivas, custos ou decisões irreversíveis.
6. **Implementar:** componentes e sistemas reutilizáveis, dados configuráveis, migração de saves, mudanças incrementais.
7. **Validar:** testes automatizados, navegador real, capturas recentes e testes manuais descritos no final deste documento. Distinguir claramente teste executado de teste planejado.
8. **Entregar:** resumo, arquivos modificados, comandos/testes, capturas, pendências, instruções de atualização, próximo passo e documentação atualizada.

Uma sprint por vez. **Não executar automaticamente o roadmap completo**; terminar a sprint pedida antes de avançar.

## 2. Visão, público e direitos

- **Plataforma inicial:** navegador desktop. Mobile responsivo depois da experiência desktop estável.
- **Gênero:** RPG Idle 2D com personagem visível caminhando e lutando; multiplayer real planejado, não presumido.
- **Arte:** Pixel Art 2D detalhada, linguagem coesa de personagens, cenário, mobília, água, fogo e monstros.
- **Tema:** aventuras marítimas shonen e fantasia pirata. Inspirar-se em *sensação de aventura*, **não copiar** personagens, símbolos, facções protegidas, uniformes exatos, técnicas nomeadas, músicas, layouts únicos ou lore de One Piece ou de outros jogos.
- **Nomenclatura comercial:** nomes inspirados diretamente em franquias (por exemplo, “Governo Mundial”, “Exército Revolucionário”) são **nomes provisórios de design**; revisar com alternativas originais antes da comercialização. Assets fornecidos pelo usuário só entram na distribuição após verificação de direitos/licença, com origem documentada.
- **Princípio de interface:** referências são critérios de organização e usabilidade, não autorização para copiar arte/código.

## 3. Design de personagem: facção primeiro, classe depois

### 3.1 Facções (identidade narrativa; nomes sujeitos a revisão jurídica)

1. **Exército Revolucionário:** resistência, mobilidade, equipamentos práticos; verde escuro/vinho/marrom.
2. **Pirata:** aventura, ousadia, variedade de equipamento náutico; vermelho/azul/bege/dourado.
3. **Marinheiro:** disciplina naval, ordem, uniforme próprio; branco/azul-marinho/dourado.
4. **Governo Mundial:** elite política e técnica; branco/cinza/azul profundo/dourado.

Facção define identidade visual, contexto, reputação e eventuais passivos leves; **não bloqueia estilos de combate sem decisão explícita**. Não confundir facção com classe. Se passivos desequilibrarem PvP/party, balancear ou torná-los cosméticos.

### 3.2 Sete classes (papéis definidos)

| Classe | Papel | Principal | Secundário | Comportamento esperado |
|---|---|---|---|---|
| Lutador/Pugilista | DPS físico corpo a corpo | Força | Vitalidade | combos e resistência moderada |
| Espadachim | DPS físico de lâminas | Força | Destreza | cortes rápidos e pressão de curta distância |
| Atirador/Franco-Atirador | DPS à distância | Destreza | Força | manter alcance e linha de tiro |
| Gatuno/Acrobata | DPS ágil/evasão | Destreza | Vitalidade | velocidade, reposicionamento, crítico |
| Ciborgue/Engenheiro | Tanque | Vitalidade | Força | blindagem, mitigação, agressão para manter alvo |
| Estrategista Elemental | Mago elemental | Inteligência | Espírito | dano elemental, área e estados, sem substituir curandeiro |
| Suporte/Curandeiro | Cura e buffs | Espírito | Inteligência | cura automática condicional; ataque solo viável |

**Importante:** a sétima classe foi planejada a partir dos áudios; confira se já foi implementada na versão atual. Não assuma que qualquer uma dessas sete já tem mecânicas concluídas.

### 3.3 Atributos e progressão

- **FOR:** dano físico/força.
- **DES:** precisão, velocidade, crítico/esquiva dentro de limites.
- **VIT:** vida, defesa/resistência.
- **INT:** dano elemental/eficiência de feitiços.
- **ESP:** energia, regeneração, cura/suporte.
- **Regra proposta:** **5 pontos distribuíveis a partir do nível 2**. Se existir outra regra no jogo atual, auditar e decidir migração antes de alterar.
- Pontos não alocados permanecem disponíveis; distribuição é transacional, não permite negativos nem duplicação; confirmar antes de consumir; atributos derivados recalculados de forma centralizada.
- Fórmulas **orientadas a dados e testáveis**, com caps para evasão/crítico, mitigação razoável e sem estatística universalmente dominante.
- Classe influencia escala/skills/IA, facção não deve substituir habilidades.
- Compatibilidade com save antigo: migração idempotente (executar duas vezes não concede pontos extras).

## 4. Arte e PixelLab

### 4.1 Bíblia visual obrigatória

**Antes de gerar sprites**, medir nos NPCs da versão atual: pixel density, altura aparente, frame size, contornos, iluminação, proporção, ancoragem nos pés, paleta e número de direções. Registrar em `docs/ART_BIBLE.md` quando iniciar sprint artística. Alguns assets antigos podem ter estilos inconsistentes; selecionar conscientemente um padrão aprovado e harmonizar o restante.

- Sprites originais, fundo transparente, nearest-neighbor e frames alinhados ao **mesmo pivot**.
- Começar com **4 bases (uma por facção)**, apenas `idle` e `walk` em quatro direções; validar no lobby.
- Depois criar visuais de **7 classes** e variantes: 4 × 7 = **28 combinações visuais desejadas**, **não necessariamente 28 riggings totalmente separados**. Validar pipeline e custo antes de gerar em lote.
- Depois animações `attack`, `skill/cast`, `hurt`, `death` e, onde apropriado, `block`, `heal`, `projectile`. Não inventar animações a partir de frames estáticos sem qualidade verificável.
- `metadata.json` por conjunto: frameWidth/Height, frames por estado/direção, FPS, pivots, offsets, escala, licença e proveniência.
- Produzir contact sheets e cenas de teste lado a lado com NPCs do lobby.
- PixelLab/MCP: **verificar conexão efetiva**, créditos, limitações e custos antes de gerar. Nunca consumir créditos em massa sem autorização. Se indisponível, propor alternativa — não prometer qualidade nem falsificar resultado.
- Animar água, bandeiras, chamas, lava, partículas, iluminação e portais com baixo custo e paleta coerente; não espalhar efeitos aleatórios pelo cenário.

### 4.2 Asset pipeline

Sugestão de organização (adaptar à estrutura do projeto):

```text
assets/
  characters/<faction>/<class>/
  npcs/
  monsters/<biome>/<monster>/
  tilesets/<biome>/
  effects/
  ui/
  audio/
  manifests/
```

Não renomear/mover assets referenciados sem atualizar todos os manifests/imports e testar rollback.

## 5. Mundo, movimentação e câmera

### 5.1 Requisitos

- Lobby com porto, praça, comércio, forja, cais e serviços em composição compacta. Aplicar o padrão de dimensões abaixo aos mapas futuros; não aumentar o mundo apenas para superar a viewport.
- Cada região de caça possui bounds finitos, áreas seguras de spawn, obstáculos, pontos de retorno, props, monstros e subáreas de progressão.
- **Separação obrigatória de world coordinates e screen coordinates**. Canvas não é o tamanho total do mundo; viewport/câmera revelam uma parcela dele.
- Câmera com smooth follow, clamp a bounds, tratamento para mundo menor que viewport, zoom coerente com Pixel Art, sem mostrar vazio fora dos limites.
- Cliques convertidos corretamente para world coordinates **após mover a câmera**.
- Colisões com edifícios, paredes, água não transitável, rochas e NPCs onde necessário; pathfinding (A* ou equivalente) com cancelamento de destino e detecção de stuck.
- Caminhada manual no lobby; na caçada, movimento automático entre monstros com opção de destino manual que depois retorna à auto-caçada.
- NPCs principais interativos com rótulos sem sobreposição; NPCs ambientais com rotas, sem simular jogadores online.

### 5.2 Regiões inicialmente desejadas

- **Porto das Correntes:** hub protegido com NPCs/lojas/forja/expedições, água animada e estruturas portuárias.
- **Ruínas de Brasa:** masmorra vulcânica, lava animada, portais, monstros e chefe.
- **Fenda da Névoa:** ruínas úmidas, névoa e criaturas espectrais.
- **Costa dos Náufragos:** praia e destroços, animais e saqueadores.

### 5.3 Padrão de tamanho e composição — decisão do proprietário em 19/10/2026

- **Todos os mapas futuros usam, por padrão, grade de 32×32 tiles com células de 64×64px: mundo de 2048×2048px.** Tamanho de tile não é tamanho de sprite: monstros continuam com frames 48×48 e cenário com escala proporcional.
- Só ampliar ou alterar essas dimensões com pedido/autorização explícita do proprietário para o mapa em questão. Não copiar dimensões maiores de prompts antigos. Mapas legados não são redimensionados automaticamente; nesta sprint, somente Ruínas de Brasas muda de tamanho.
- Reduzir 64×64 para 32×32 significa metade da largura e da altura (um quarto da área), preservando a escala dos personagens e a resolução das texturas.
- Planejar ruas e praças antes dos objetos. Toda casa deve ter fachada, entrada desobstruída e acesso demonstrável à rua; carga e destroços devem pertencer a um cais, oficina, praça ou ruína reconhecível.
- Pontes apenas sobre um vão real (água, lava ou ravina), com orientação da arte, corredor navegável e extremidades apoiadas nas duas margens. Nunca espalhar pontes decorativas sobre chão firme ou sem ligação com a rota.
- Elevações devem ter bordas/paredões legíveis, colisão correspondente e escadas/rampas em locais planejados; não permitir atravessar o paredão como se fosse piso plano.
- Validar caminho de ida e volta para cada ponto de interesse, acessos das casas, travessias e escadas; revisar a composição completa e em jogo nas três resoluções desktop e em uma tela móvel.
- Preferir poucos setores distintos e próximos, rotas alternativas com função, áreas de combate legíveis e pontos de respiro a terrenos vazios ou repetição de casas.


## 6. Lobby, caçadas e combate

### 6.1 Entrada na caçada

No porto ou na caçada, jogador abre **Mapa** pelo menu, tecla M ou serviço de expedição -> escolhe a região -> clica em uma ilha para inspecionar -> confirma a viagem no botão dos detalhes. East Blue é a região padrão; Alabasta permanece bloqueada. `archipelago.js` centraliza catálogo, faixas, destinos e previews: Ilha Dawn 1–10 (`beach`, entrada Nv. 1), Cidade das Conchas 11–20 (`swamp`, entrada Nv. 8), Orange Town 21–30, Ilha dos Animais Raros 31–40, Vilarejo Syrup 41–50, Baratie 51–60, Parque Arlong 61–70 e Loguetown 71–80. As seis últimas ilhas são inspecionáveis, mas não permitem viagem até seus mapas existirem. Faixa recomendada não muda o requisito de entrada nem impõe nível máximo. Preservar IDs dos saves e histórico de loot; usar os nomes novos na interface atual. Trocar região limpa a seleção e reconstrói a lista; não habilitar regiões bloqueadas. Monstro não configurado ou imagem ausente: mostrar **Indisponível**. Não inventar drops ou porcentagem de sucesso; usar **A definir** / **Não estimada** quando não houver dados. Manter água animada com movimento reduzido e menu de seis ícones com nome por hover/foco, sem Caçadas duplicado. Sair por portal ou botão, preservando XP, loot, itens e dinheiro. Ver `docs/ARQUIPELAGO-REGIOES.md`.

### 6.2 Idle combat de ponta a ponta

1. Escolher alvo válido e alcançável.
2. Navegar sem atravessar paredes; atualizar rota quando alvo muda.
3. Respeitar alcance por classe e linha de visão.
4. Orientar sprite para o alvo, executar frame/estado de ataque.
5. Aplicar dano real no hit-frame lógico, cooldown validado e fórmula central.
6. Exibir reação, número de dano, VFX/som e morte.
7. Calcular XP, dinheiro, drop e créditos de quest com proteção contra duplicação.
8. Remover/desativar corretamente derrotados e manter spawns sustentáveis.
9. Recuperar de stuck, morte/respawn, troca de cena, aba inativa e variações de FPS.
10. Continuar auto-hunt até desligado pelo jogador.

**Nunca** chamar de combate funcional uma cena apenas animada sem cálculos de estado. Desativação por tab em segundo plano deve ter política clara; progressão offline real deve ser validada pelo servidor em fase online, não simulada sem transparência.

## 7. HUD e inventário

**Organização visual de referência (não cópia de assets):**

- **Topo esquerdo:** marca pequena + retrato, nível, barras de vida/energia/XP, moeda e poder compactos.
- **Topo centro:** inimigo selecionado e barra HP somente em combate.
- **Topo direito:** seis ícones de inventário, forja, personagem, mapa, contratos e ajuda; nomes apenas em tooltip por hover/foco, com nome acessível e suporte a toque. Sem hambúrguer nesta etapa. Considerar agrupamentos/submenus apenas quando funcionalidades futuras justificarem, mediante nova tarefa.
- **Inferior esquerdo:** chat recolhível com canal local; chat global só quando backend real.
- **Inferior centro:** hotbar estável com habilidades, consumíveis, poções e cooldowns.
- **Inferior direito:** missão, eficiência e expedição em widget minimizável.
- **Centro:** livre para o mapa, salvo seleção de alvo, dano e VFX necessários.
- Margens 12–16px, hierarquia clara, sem sobreposições; responsividade 1920×1080, 1366×768, 1280×720, e fallback móvel.
- Tema: madeira e metal naval **pontuais**, pergaminho em menus, cordas discretas; nunca cobrir todo o topo com textura de madeira repetitiva.
- Modais só abrem por botão/atalho, fecham com Esc/X e prendem foco quando cabível.

### Inventário

- Janela em **três colunas**: personagem/11 equipamentos, mochila, detalhes do item.
- Grid 7×5 e paginação; mochila planejada 120 espaços, após conferir implementação.
- Busca, filtros, ordenação, equipar melhores, usar, equipar/retirar, travar e vender **conectados a estado real**.
- Mercado/cofre **não fingir** funcionamento se backend não existir.
- Jamais substituir sprites/itens por emojis como versão final sem aprovação.

## 8. Evolução sistêmica posterior

- Forja, encantamento, materiais, raridades, efeitos de equipamento, economia e contratos: dados auditáveis; resultados calculados pelo subsistema de jogo/servidor.
- Party: cura, buffs, distribuição de XP/loot, aggro, sinergias tanque/DPS/suporte, estatísticas de dano e contribuições.
- Guildas, comércio/mercado, ranking, eventos, chefes mundiais e PvP: **etapas posteriores**, dependem de infraestrutura real e segurança.
- Áudio, acessibilidade, otimização, localização e operação entram no roadmap antes do lançamento.

## 9. Arquitetura — plano, não imposição imediata

Descubra a stack atual. Não migre engine apenas por preferência. Separar pelo menos: `world`, `camera`, `input`, `navigation`, `entities`, `animation`, `combat`, `spawn`, `items`, `progression`, `ui`, `persistence`.

**Evolução possível para multiplayer real:** Phaser/TypeScript para mundo; UI web separada; servidor Node com motor de simulação autoritativo (Colyseus ou alternativa analisada); Postgres para dados; Redis se houver demanda. Arquitetura final exige decisão técnica documentada e benchmark. Reutilizar regras compartilhadas e validar inputs. Não migrar a base inteira sem uma sprint aprovada e estratégia de rollback.

### Segurança online

- Servidor controla dano, cooldowns, posição válida, recompensas, ouro, inventário, transações e economia; cliente envia intenção.
- Autenticação, autorização, rate limits, validação de mensagens, reconexão, deduplicação, auditoria de economia, proteção a cheats e migrações.
- Segredos não entram no frontend ou repositório; `.env.example` sem credenciais.
- Não usar contadores falsos de “online” nem chamar multiplayer local de rede real.

## 10. Roadmap do início ao lançamento — nenhuma caixa implica tarefa concluída

### Marco A — Estabilizar protótipo local
- [ ] A1. Confirmar workspace atual e histórico de mudanças manuais; remover divergências entre versões.
- [ ] A2. Criar testes de boot, save e ciclos críticos; backup/migração de dados.
- [ ] A3. Organizar/refatorar HUD e CSS sem regressões.
- [ ] A4. Separar estados de jogo de renderização e eliminar bugs de auto-hunt.

**Gate A:** abrir, carregar, caminhar, caçar 20 inimigos, voltar e reabrir sem perda de progresso.

### Marco B — Mundo e câmera de produção
- [ ] B1. Câmera bounds + smooth follow + screen/world conversion.
- [ ] B2. Navegação com colisão/pathfinding e recuperação de stuck.
- [ ] B3. Hub navegável com distritos e NPCs alcançáveis.
- [ ] B4. Região de caça grande, obstáculos, spawns e transições.
- [ ] B5. Água, lava, fogo e partículas de forma performática e estilisticamente coesa.

**Gate B:** deslocar-se de um extremo a outro de cada mapa; câmera sem mostrar vazio; NPCs e inimigos continuam interativos após scroll.

### Marco C — Pixel Art e animações
- [ ] C1. Definir `ART_BIBLE` baseada em assets do lobby.
- [ ] C2. Criar e aprovar 4 sprites de facção com idle/walk nas quatro direções.
- [ ] C3. Implementar 7 classes e 28 combinações visuais sem inconsistência.
- [ ] C4. Produzir attack/cast/hurt/death e VFX sincronizados ao combate.
- [ ] C5. Padronizar NPCs, mobs, mobiliário e tilesets.

**Gate C:** comparação lado a lado com NPCs; sprites sem blur/corte/jitter; animações reais em jogo.

### Marco D — Progressão, classes e economia
- [ ] D1. Sete classes/papéis e habilidades verificáveis.
- [ ] D2. FOR/DES/VIT/INT/ESP com pontos, migração e balanceamento.
- [ ] D3. Inventário 11 slots, mochila paginada, equipamentos e forja.
- [ ] D4. Contratos e loot escalonados por região.
- [ ] D5. Suporte/curandeiro solo funcional; preparação de party.

**Gate D:** fórmulas com testes, 7 classes viáveis solo, nenhuma duplicação de pontos/itens ao recarregar.

### Marco E — Vertical slice polido
- [ ] E1. Fluxo criar personagem → porto → escolher caçada → combater → loot → voltar.
- [ ] E2. HUD/menus e interações no padrão aprovado.
- [ ] E3. Um bioma completo com chefe, áudio, ambiente animado e desempenho.
- [ ] E4. Testes de FPS, memoria, estabilidade, acessibilidade básica e UX.

**Gate E:** demo publicável **offline** sem funções falsas, com onboarding e documentação.

### Marco F — Backend e multiplayer genuíno
- [ ] F1. ADR da arquitetura e infraestrutura; autenticação/contas.
- [ ] F2. Servidor autoritativo para movimento, combate e economia.
- [ ] F3. Persistência, migrações, backups e reconexão.
- [ ] F4. Presença/chat real, party, XP/loot e instâncias de caça.
- [ ] F5. Segurança anti-exploit, monitoramento, testes de carga e falhas.

**Gate F:** dois dispositivos/sessões reais compartilham estado validado pelo servidor; persistência e reconexão verificadas.

### Marco G — Conteúdo e pré-lançamento
- [ ] G1. Biomas adicionais, monstros, chefes, quests e progressão sustentável.
- [ ] G2. Balancear economia, classes e progressão com playtests.
- [ ] G3. Direitos dos assets/nome, termos, privacidade e conformidade aplicável.
- [ ] G4. Analytics, suporte, observabilidade, CI/CD, rollback e incidentes.
- [ ] G5. Beta fechado, correções prioritárias e beta aberto.

**Gate G:** checklist de publicação, direitos, servidor, custos e experiência validado.

### Marco H — Lançamento e operação contínua
- [ ] H1. Release estável com backup e rollback.
- [ ] H2. Monitorar erro, latência, retenção, economia e falhas de combate.
- [ ] H3. Atualizações periódicas e comunicação de mudanças.
- [ ] H4. Monetização transparente, não predatória, após validação do produto.

**Gate H:** operação mensurável e sustentável, sem prometer recursos não implementados.

## 11. Critérios de qualidade e teste

Testes obrigatórios por alterações relevantes:

- **Sintaxe/build:** scripts passam sem erro; console sem exceções relevantes.
- **Movimento/câmera:** clique com câmera deslocada funciona; limites, colisão e anti-stuck.
- **NPCs:** interações corretas depois de mover a câmera.
- **Caçada:** ao menos 20 mortes consecutivas, respawn sustentável, XP/drops reais, dano adequado por classe.
- **Progressão:** distribuição e recálculo de atributos, cooldown e custo de habilidade reais.
- **Inventário/forja:** equipar, travar, usar, vender, persistir; sem duplicação.
- **Transições:** sair/entrar de caça repetidamente, retorno ao lobby, persistência.
- **Visual:** screenshots recentes e análise em 1920×1080, 1366×768, 1280×720; UI sem overlays colidindo e texto cortado.
- **Arte:** pivots, escala, quadros, quatro direções e animações com duração apropriada.
- **Performance:** medir FPS/tempo de frame, memória e quantidade de entidades em sessão prolongada. Registrar números reais, não supor.
- **Online (quando aplicável):** sessões independentes, autoridade, reconexão, segurança, latência e persistência.

Se não for possível abrir navegador ou consultar vídeo, registrar explicitamente o impedimento. Captura antiga e ausência de erro de sintaxe **não equivalem** a teste visual ou funcional.

## 12. Registro de decisões e mudanças

A cada sprint, criar/atualizar `docs/CHANGELOG_DEV.md` ou o changelog existente com:

- Data, sprint, objetivo, branch/commit base.
- Arquivos editados, motivo e decisão arquitetural.
- Estado anterior vs. estado atual, com capturas comparáveis.
- Como preservar dados do usuário e desfazer a alteração.
- Comandos executados e resultados.
- Pendências e hipóteses não verificadas.

Se o usuário alterar arquivos manualmente, **re-auditar a versão local** antes da próxima sprint. O último arquivo do workspace vence sobre pacotes antigos, salvo instrução explícita.

## 13. Resposta padrão do Codex ao concluir uma sprint

Responda sempre com estes campos:

1. **Estado:** concluída / parcial / bloqueada.
2. **Resumo:** o que efetivamente mudou.
3. **Arquivos alterados:** lista objetiva.
4. **Testes executados:** ambiente, comandos e resultados observáveis.
5. **Capturas:** caminho e data; nunca imagens antigas.
6. **Compatibilidade:** saves antigos, limitações, migrações e rollback.
7. **Pendências:** o que falta e por quê.
8. **Próxima sprint recomendada:** escopo mínimo e dependências.

**Não afirme “pronto”, “profissional”, “sem bugs” ou “multiplayer real” sem evidências suficientes.**

## 14. Primeira ação ao receber este AGENTS.md

**Não comece gerando 28 sprites nem criando backend.** Execute a auditoria do workspace real e apresente: versão ativa, estrutura, estado de cada marco, decisões divergentes, assets existentes, testes disponíveis e o próximo ticket mais importante. Se o usuário já indicar uma sprint específica, audite apenas o necessário e execute essa sprint após proteger os arquivos.

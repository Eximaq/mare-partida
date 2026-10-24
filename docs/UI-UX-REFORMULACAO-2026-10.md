# Maré Partida — auditoria UI/UX e reformulação incremental (24/10/2026)

**Natureza:** diagnóstico estático do código na `main` e plano de migração; não representa aprovação visual. **Execução neste PR:** fundação acessível e controle de viewport seguro, sem alterar lógica de jogo/saves. Consulte `docs/UI-DESIGN-SYSTEM.md` para os contratos existentes e a identidade aprovada.

## Identidade aprovada e restrições

- Preservar madeira escura, bronze envelhecido, verde-marinho, pergaminho, cordas e pixel art. Esta identidade já foi escolhida pelo proprietário após rejeição de outra alteração visual.
- **Não** copiar personagens, logotipos, padrões exclusivos ou assets de One Piece. Usar tema original de aventura marítima.
- Sem gerar imagens pagas nem substituir assets aprovados. **Propor a composição visual completa para avaliação antes de integrar novo conjunto artístico**.
- O centro da viewport pertence ao mundo; priorizar HUD periférica, navegação compacta e menus acessíveis.
- UI somente: manter IDs de DOM usados pelos sistemas, saves, inventário, combate, índices de itens, classes, facções e funcionalidades DEV/Paper Doll. Projeto Pages é estático; não presumir multiplayer remoto.

## Mapa real dos subsistemas

| Área existente | Origem principal identificada | Direção da revisão | Proteção necessária |
|---|---|---|---|
| Design system | `ui-tokens.css`, `ui-components.css`, `ui-system.js` | Tokens, estados, hierarquia, acessibilidade | Preservar componentes, factories e atributos ARIA |
| HUD do aventureiro | `index.html`, `ui-hud.css`, `ui-responsive.css` | Perfil, barras, nível, ouro e recursos, densidade por viewport | Manter IDs `miniHP`, `miniXP`, `miniEnergy` etc. |
| Menu e navegação | `#mainMenu`, `character-menu.css`, `modes-menu.css` | Ícones, etiquetas, foco, menus touch | Atalhos P/M/I e estado do menu |
| Combate e barra de ações | `#gameFrame`, `.action-panel`, `ui-hud.css` | Feedback de ativação e foco sem ocultar mapa | Hit frames, cooldown e gameplay inalterados |
| Chat/jornal | `#chatForm`, `player-hub.css` | Leitura, mensagens, mobile teclado | Não confundir chat local com online |
| Inventário e equipamentos | `inventory-compact.css`, `ui-screens.css` | Três áreas, slots, equipamento, raridade, detalhes, filtros e paginação | 120 itens, páginas e molduras de raridade preservadas |
| Perfil, atributos, talentos | `ui-screens.css`, `player-hub.css`, `talent-ui.js` | Hierarquia e informações sem painéis clones | Valores e pontos não se alteram |
| Expedição e XP/h | `hud-zoom-expedition.css`, `hunt-system.js` | Densidade e limites da HUD | Cálculos de caça/XP sem mudanças |
| Forja / equipamentos / encantamento | `forge-ui.js`, `ui-screens.css` | Estados, feedback, confirmação, largura | Transações e inventário preservados |
| Navegação de ilhas / NPCs | `archipelago.js`, `game.js`, `ui-screens.css` | Orientação do jogador, acessibilidade de menus | Rotas/colisão/seleções preservadas |
| Haki / Akuma / habilidades | `haki-ui.js`, `akuma-system.js`, `ui-screens.css` | Ícones e leitura dos estados | Desbloqueios, recursos e habilidades preservados |
| Conquistas / missões / prisão | `achievement-system.js`, `prison-system.js`, `ui-screens.css` | Progresso, avisos e ações válidas | Recompensas únicas e modos bloqueados preservados |
| Configurações / meu perfil / jornal | `player-hub.js`, `player-hub.css` | Menus e telas com funções próprias | Preferências e salvamento atuais preservados |
| Tooltips / notificações / modais | `game-tooltips.css`, `ui-components.css` | Contraste, foco e posição touch | Não esconder mensagens críticas |
| Criação do personagem | `#startOverlay`, `ui-responsive.css` | Layout inicial nos celulares e landscape | Não permitir entrada sem criação válida |

## Problemas detectáveis em código

1. **Volume e manutenção:** `styles.css` ~361 KB e `ui-nautical.css` ~273 KB coexistem com os arquivos UI 2.0. Foram isolados em `@layer legacy`; refatorar regras uma seção por vez, nunca adicionar novo override nos legados.
2. **Tamanho de alvos móveis:** o breakpoint de até 760px utiliza botões/ícones da HUD de 24 a 38px. Necessário revisar interação touch em contexto real; não ampliar toda a barra às cegas, pois pode encobrir o mapa.
3. **Leitura em smartphones:** o tema compartilhado utiliza corpo 13px e diversas legendas de 9–11px na HUD. Melhorias exigem diferenciar informações essenciais de secundárias e testar em telas curtas, sem simplesmente ampliar tudo.
4. **Modais em celulares com recorte:** o `padding:8px` de overlays em mobile não tratava explicitamente os recortes laterais em landscape. Esta entrega adiciona `env(safe-area-inset-left/right)` e limita a altura dos modais ao espaço útil.
5. **Foco e feedback:** botões já possuíam `:focus-visible`; links e elementos ARIA com papel de botão/aba precisavam da mesma indicação clara. Esta entrega adiciona foco e feedback de pressionado.
6. **Textos extensos:** títulos de janelas podiam ficar pouco resilientes a nomes/strings maiores. Esta entrega permite quebra de linha nos títulos de janela sem mudar o conteúdo.
7. **Tipografia:** a base documentada usa Bahnschrift/Trebuchet e Segoe UI, sem fonte remota. Selecionar família náutica para títulos **depois** de testar glifos portugueses, fallback, largura e performance.
8. **Arquivos de colaboração:** PRs de personagem único/Paper Doll podem alterar telas próximas. Comparar diffs antes de atualizar perfil/personagem. Não mesclar PR #39 pausado.

Itens 1–3, 7 e 8 exigem revisão visual ou de contratos; **não** declarar solucionados nesta primeira entrega.

## Fases de execução e aceite

### Fase 1 — Diagnóstico (neste PR)
- Catalogar telas, fluxo e contrato de cada sistema; preservar o que já funciona.
- Distinguir observações estáticas de achados visuais que exigem navegador real.

### Fase 2 — Fundação compartilhada (primeira parcela neste PR)
- Adicionar token `--rpg-touch-target`; melhorar foco por teclado, texto de títulos e toque em ações internas de modal.
- Respeitar recortes de smartphone nas quatro bordas; manter slots Pixel Art e a HUD permanente inalterados.
- Futuro: escolher tipografia, ícones e componentes a partir de **prévia** avaliada pelo proprietário, sem reforma surpresa.

### Fase 3 — HUD (PR próprio)
- Comparar capturas desktop/mobile antes e depois: perfil, alvo, chat, menu, barra de ações e expedição.
- Conferir áreas seguras, sobreposição de menu/chat/áudio, legibilidade e distância das áreas jogáveis.
- Não modificar `game.js` sem contrato/testes; preservar todas as interações.

### Fase 4 — Janelas por função (PRs separados)
- Inventário/equipamentos; personagem/atributos; forja/encantamento; NPCs/expedições; mapa/progressão; preferências/jornal/ajuda.
- Cada família tem composição própria, tokens compartilhados, fluxo de teclado, confirmação e touch.

### Fase 5 — Responsividade e interações
- Testar larguras **360, 390, 768, 1024 e 1440 px**, mais 320 e 1920 para extremos; variar altura 568/720/800/900/1080 conforme caso.
- Em celular: retrato + landscape, recortes laterais, foco visível, rolagem de corpo/modal, sem hover obrigatório, sem objetos fora da viewport.
- Não resolver mobile por zoom global do jogo.

### Fase 6 — Refinamento / regressão
- `node tests/ui-system.test.cjs`; `node tests/ui-foundation-contract.test.cjs`; suítes Node afetadas; `python tools/build_pages.py`.
- **Navegador real**: `python -X utf8 tests/ui_ux2_browser.py`, com capture de erros de console e comparativo antes/depois. Se não puder executar, registrar **NÃO EXECUTADO**.
- Inventário/forja/Haki/áudio e criação: seus testes de regressão específicos, conforme alteração.
- Não promover para produção sem conferir imagens e obter aprovação de direção visual.

## Estado desta entrega

Implementação limitada à fundação compartilhada, sem JavaScript alterado e sem alteração de asset/sprite/save. Trata-se do início incremental da reformulação, **não** da conclusão de todas as seis fases. Os testes automatizados só serão declarados executados conforme os respectivos logs do PR.

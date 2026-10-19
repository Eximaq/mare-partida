# Mapa de viagens e menu por ícones

A opção **Mapa** substitui as duas entradas que duplicavam Mapa/Caçadas. Abre uma janela de escolha de destino, com água animada, bússola central e seis navios distribuídos em círculo. Não é um mapa de jogo: não existe personagem se movendo nessa água.

| Navio | Meta recomendada | Destino | Requisito do personagem | Estado |
|---|---|---|---|---|
| 1 | Nv. 1–10 | Ruínas de Brasas (`beach`) | Nv. 1 | Disponível |
| 2 | Nv. 10–20 | Fenda da Névoa (`swamp`) | Nv. 8 | Disponível a partir do requisito |
| 3–6 | A definir | Destinos futuros | Ainda não definido | Em breve, sem ação |

A meta é uma faixa recomendada, não uma trava de entrada ou limite máximo de personagem. As faixas 1–10 e 10–20 não alteram dano, XP ou requisitos. Os destinos futuros continuam com meta a definir. Os requisitos vêm das regiões existentes (`zones`), sem alteração de progressão. Ao clicar em navio liberado, `worldChange` reutiliza a entrada de caçada: define a região, restaura vida/energia conforme o comportamento anterior, inicializa a sessão de combate, fecha a janela e salva. Não há novo custo, recompensa ou mapa criado pela janela.

Mapa aparece da mesma forma no porto e durante uma caçada. O ícone, tecla M, botão de viagem e NPC de expedição convergem para a mesma janela. Referências internas antigas a `hunts` são normalizadas para `map`. A antiga lista de regiões e a visão de rotas locais deixam de ocupar esse menu; movimentação, caminhos e câmera dos cenários permanecem intactos.

O menu mantém **seis botões visíveis por ícone**: Inventário, Forja, Personagem, Mapa, Contratos e Ajuda. Os nomes aparecem por hover/foco e há nomes acessíveis/atalhos. O botão de expandir foi removido; **não há hambúrguer** nesta etapa. A preferência antiga `menuExpanded` pode permanecer no save por compatibilidade, mas não altera o menu atual. Agrupamentos futuros exigem uma nova tarefa.

## Fontes e extensão

- Interface/integração em `game.js`, `index.html` e estilos locais em `ui-nautical.css`.
- Navios: duas células superiores do atlas existente `pixellab-pip-generations/porto-compacto-20261018/harbor-props.png`, com recorte por background CSS e nearest-neighbor.
- Mar: textura existente `assets/ruinas-brasas/water.png`, deslocada continuamente por CSS. Movimento reduzido desativa o fluxo. Nenhum PNG foi editado e nenhuma geração paga foi consumida.
- `voyageDestinations` centraliza os seis níveis, posição no círculo e vínculo de região. Para ativar um navio futuro, implementar primeiro sua região e depois atribuir a chave real em `area`; `null` ou uma chave inexistente mantém o navio bloqueado.
- Mapa da ilha, sprites, combate, economia e formato de save preservados. A diretriz atual também está no `AGENT.md`.

## Verificação

`tests/voyage_browser.py` verifica menu/tooltip, cinco resoluções (1920×1080, 1366×768, 1280×720, 393×852 e 320×568), geometria dos alvos sem sobreposição, viagens reais nos dois mapas, requisitos e futuros inativos, Enter/Espaço/Tab/Escape, restauração de foco, persistência, preferência legada e movimento reduzido. Usa ainda um relógio real para confirmar o deslocamento da textura da água.

Regressões adaptadas para escolher o navio após abrir Mapa: ilha/HUD, personagens, combate, inventário/forja, pacote Pages e área de brasas. Nenhum teste usa o save do usuário. Capturas/resultados atuais em `docs/evidence-voyages/` ficam fora do Git. `python tools/build_pages.py` mantém scripts/CSS versionados para atualização de cache.

Branch de recuperação: `feature/mapa-navios-menu-icones`, base `e4e405b`. Rollback por reversão do commit, sem migração de save. Mapas futuros e novos submenus permanecem fora desta entrega.

Execução de 19/10/2026: todos os `tests/*.test.cjs` e sintaxe JS passaram; `voyage_browser.py` passou oito grupos, `ember_browser.py` oito, `island_browser.py` doze, `polish_feedback_browser.py` três, e `pages_cache_browser.py` confirmou o pacote mobile. Build Pages passou. Os demais scripts adaptados de personagem/combate/captura não foram repetidos integralmente nesta tarefa.

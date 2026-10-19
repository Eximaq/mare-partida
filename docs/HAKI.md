# Despertar — Haki

## Estado desta branch

### Atalhos rápidos e nova arte — 19/10/2026

Após `has_haki_unlocked`, o perfil mostra um widget de três ícones abaixo da Vontade: **H Armamento**, **J Observação**, **K Rei**. O chat muda de J para **L** em todos os rótulos. O botão antigo do Rei sai da hotbar para evitar duplicidade. Cliques e teclas passam pelas mesmas funções transacionais. Repetição de tecla, modificadores Ctrl/Alt/Meta, digitação (incluindo contenteditable), confirmações e janelas abertas não disparam os atalhos de combate.

Armamento/Observação mostram ON, borda luminosa e `aria-pressed`; falta de Vontade dessatura/bloqueia os ícones, e o Rei também exige seus 50 pontos. No porto/morto, os botões ficam indisponíveis. O Rei agora tem **8s de recarga**, com cobertura circular e contador. Este é o valor inicial de balanceamento escolhido para o pedido de cooldown, configurado em `MareHaki.rules.kingCooldown`; os toggles não receberam cooldown artificial. `haki.kingReadyAt` persiste a liberação em milissegundos, sem reset ao viajar ou recarregar. Consumo e cooldown são revertidos juntos se o storage falhar. DEV → Limpar recargas / Sem recargas também cobre o Rei.

O layout mobile reposiciona o menu de seis ícones abaixo do perfil expandido, observando a altura real para não cobrir seus botões. Movimento reduzido desativa a pulsação. Novas imagens e sheets têm revisão explícita na URL para evitar cache dos PNGs anteriores.

**Artes finais:** três chamadas MCP `create_image_pro`, 32×32 nativo, `no_background:true`, prompts ingleses literais fornecidos pelo proprietário, sem referência, paleta ou seed enviados. Seleção delegada após aprovação de até 30 gerações: Armamento alternativa **2**, Observação **3**, Rei **6**. Todos os 192 candidatos foram decodificados e inspecionados; somente os três selecionados foram copiados byte a byte para o runtime, sem redução, recoloração ou reparo. O ícone do Livro permanece o anterior.

Os VFX foram compostos no **PixelLab VFX Workbench**, gratuito para assinantes, conforme a adaptação de ferramenta aprovada: Armamento e Observação em **48×48, 8 frames, 12fps**; Rei em **128×128, 12 frames, 15fps**, ampliado no renderizador ao alcance espacial. Armamento traz obsidiana/veios roxos e preserva a máscara dos braços/arma; Observação traz olho/anéis/trilha/partículas carmesim e respeita a orientação; Rei expande o círculo com raios negros/vermelhos. O último frame do Rei é transparente para encerrar a onda; nenhum frame foi removido ou reordenado. PNGs, GIFs, pivôs e transparência verificados.

**Custo confirmado desta atualização: 30 gerações**, 10 por ícone, zero pelo Workbench. Sem novas tentativas. Originais e histórico anteriores preservados. Exports, prompts exatos, receitas, seleção e auditoria: [manifesto](../pixellab-pip-generations/haki-quickcast-20261019/manifest.json), [blueprint](../pixellab-pip-generations/haki-quickcast-20261019/haki-quickcast.blueprint.json) e [verificação](../pixellab-pip-generations/haki-quickcast-20261019/verification.json).

Validação da atualização: 14 suítes Node e sintaxe; Chromium `haki_quickcast_browser.py` (H/J/K, chat L, repeat/inputs/modais, rollback de cast/toggle, recarga após reload, cinza em zero e cinco resoluções); regressão `haki_browser.py` (livro, automação, drenagem, stun, 20+ abates e saves); `dev_tools_browser.py`; build Pages e regressão de cache com 26 recursos. Capturas em `%TEMP%/mare-haki-quickcast`, fora do Git.

### Implementação inicial (histórico)

Regras, HUD, integração de combate, consumo do livro, conquistas, três VFX do PixelLab Workbench e quatro ícones Pro nativos de 32×32 (incluindo o livro) implementados e integrados. A prisão e Chefes Diários continuam indisponíveis: este trabalho não os libera.

## Acesso e desbloqueio

Personagem tem quatro seções: Personagem, Talentos, Conquistas e HAKI. A última permanece bloqueada, mas seu clique abre um aviso com os requisitos. Nível 50 + consumo confirmado de um Livro da Vontade desbloqueiam permanentemente os três tipos. Consumir antes do nível, consumir item travado/inexistente ou repetir o desbloqueio falha sem gastar o livro.

O livro foi **acrescentado ao fim** de `itemDefs`; índices dos itens antigos não mudam. É um consumível épico, nunca equipamento, extra, pérola ou material de fusão. Tem 5% por chefe de mundo aberto/diário **Nv.30+**, sem multiplicadores de sorte/drop. O nível de um monstro do mundo é fixado no spawn com o escalonamento da sessão. Monstros comuns e a prisão não o concedem. Chefes Diários têm contrato `MareHaki.drop({boss:true,source:'daily',level}, random)` preparado; não há encontros diários inventados. Mochila cheia não recebe o drop e informa o motivo.

## Recurso e combate

Reserva única de 100 Força de Vontade, mostrada abaixo de Vida/Energia no perfil compacto. Armamento e Observação são mutuamente exclusivos, tanto manualmente quanto na opção automática. Manual só em expedição, vivo; o Rei tem botão próprio no widget e atalho **K**, custa 50 e não possui opção automática.

O primeiro golpe ofensivo ou recebido inicia combate e renova um timeout de 6s. A automação só ativa no início, com reserva positiva, respeitando um Haki já ligado manualmente. Novos golpes prolongam o mesmo combate; esgotar a reserva não cria ciclos de reativação. O modo automático pode ser alterado nas preferências para o próximo combate.

- Haki contínuo: −5 Vontade/s. Zero desativa imediatamente.
- Fora de combate, vivo e sem Haki: +5/s, limitado a 100.
- Sem novos golpes por 6s: desligar o Haki e permitir regeneração.
- Porto, morte, nova sessão/troca de mapa: nenhum Haki ativo. A reserva e preferências são preservadas; não há restauração grátis ao viajar nem regeneração offline.
- Armamento: +0,15 de penetração física; defesa ×1,10. Passa pelas mesmas fórmulas dos talentos e armadura, sem dupla aplicação.
- Observação: +0,15 esquiva e precisão; precisão limitada a 100%, esquiva combinada até 75% (base/talentos já limitados a 45%).
- Rei: raio 360px com linha de visão; comuns recebem stun de 3s; chefes recebem −15% ATQ/DEF por 8s, sem stun. Repetir renova a duração, não multiplica a redução. A atualização de atalhos acrescentou 8s de cooldown à limitação de reserva original.

Buffs não alteram os atributos permanentes, o BP de conquistas nem o orçamento de PT. O livro registra uma vez os três eventos `hakiUnlocked`; as recompensas de conquistas continuam com resgate manual. Não concede `hakiMaximized`: treinamento/níveis de Haki não fazem parte deste escopo.

## Arquitetura e persistência

`haki-system.js` concentra catálogo, regras, migração, elegibilidade de drops, desbloqueio e máquina de estados; `haki-ui.js` cuida do painel; `haki-art.js` toca os spritesheets exportados. `game.js` liga dano causado/recebido, tick, timers de debuff, entrada/saída, mochila e HUD. `talent-combat.js` considera a defesa efetiva do chefe nos ataques normais.

Save persistente: `has_haki_unlocked` e `haki:{version:1,unlocked,current,auto,equipped}`. Estado efêmero: `session.haki:{active,inCombat,remaining,exhausted,kingFX,eyeFX}`. Getter global `has_haki_unlocked` reflete o personagem atual. Migração idempotente; backup anterior em `mare-partida-save-v1-before-haki-v1`. O jogo permanece estático/solo: o módulo de regras é local, não um servidor autoritativo remoto.

Consumo do livro e preferências persistem antes da troca de estado; falha de armazenamento mantém o original. Cast do Rei e toggle fazem rollback do recurso/efeitos se não puderem salvar. Reserva salva a cada segundo e em `pagehide`/ocultação; tempo de aba oculta não regenera.

Rollback de código: reverter o commit e manter backup/save. Não apagar saves ou renumerar `itemDefs`; versões anteriores não conhecem o novo consumível.

## Arte e validação

PixelLab MCP `vfx_workbench`, gratuito para assinantes segundo a ferramenta: Armamento 24×24/8 frames/12fps, Observação 40×16/8/12fps, Rei 128×128/12/15fps. PNGs RGBA preservados; ordem, tamanho, pivô e duração vêm dos exports. Armamento é recortado em execução pela silhueta real do frame do personagem para não flutuar fora de braços/arma. Observação não desenha olhos nas costas. Rei é um one-shot; loops seguem a ordem original. Movimento reduzido congela os loops e simplifica o pulso.

Fontes, GIFs, exports JSON, manifesto e blueprint estão em `pixellab-pip-generations/haki-despertar-20261019/`; runtime em `assets/haki/`. Os ícones finais estão em `pixellab-pip-generations/haki-icons-native32-20261019/` e foram copiados byte a byte para o runtime. A primeira chamada Pro 64×64 (10 gerações) falhou na grade 2×2 e seus resultados não entram no jogo. O proprietário recusou redução e aprovou uma nova chamada Pro nativa32 (10 gerações), com escolha das variantes delegada. Foram escolhidas 33/16/23/61 para Armamento/Observação/Rei/Livro: arquivos 32×32 originais, sem redução, reparo ou recoloração. Custo total confirmado: 20 gerações. Metadados do lote descartado ficam em `pixellab-pip-generations/haki-icons-20261019/`; todos os originais locais são preservados.

Verificações executadas em 19/10/2026:

- Todas as 13 suítes Node e sintaxe dos scripts raiz.
- `node tests/haki-system.test.cjs`: migração, livro, exclusividade, automação, partição de tempo, esgotamento, estatísticas, AoE/LOS/custos, limites exatos de 5% e conquistas.
- `python tests/haki_browser.py`: UI real em cinco resoluções, consumo/cast sob falha de storage, persistência, combate automático, recurso, Rei, retorno e mais de 20 abates reais com XP/loot.
- `python tests/talents_browser.py`: dez grupos, sete classes e cinco tamanhos de tela. Corrigido foco de talento após redimensionamento.
- `MARE_CONSTELLATION_UI_ONLY=1 python tests/constellation_browser.py`: três grupos de UI, transações e conquistas.
- `python tools/build_pages.py` e `python tests/pages_cache_browser.py`: 25 recursos versionados, mapa e saves preservados.
- Capturas recentes em `%TEMP%/mare-haki-qa/`, fora do Git; inspeção dos três spritesheets e dos VFX em combate. Ícones finais verificados em 32×32 nativo na mochila e nos três painéis; Rei também usa a coroa na hotbar.

Amostra de desempenho local, Chromium headless/1366×768, 3,006s com Armamento e cinco monstros: 59,87 FPS e 9,54 MiB de heap JS informado pelo navegador. É uma amostra curta; não mede estabilidade prolongada ou desempenho em celulares reais.

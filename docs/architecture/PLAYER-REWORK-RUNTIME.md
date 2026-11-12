# Ponte de runtime do rework (não ativada)

Este módulo é uma etapa de integração, não a substituição concluída do personagem.
`MarePlayerReworkRelease` não está definido por este PR. O jogo mantém o renderer atual.

## Contrato

`player-rework-runtime.js` recebe uma release explicitamente aprovada, habilitada e com cobertura certificada. Exige clips de idle, walk, attack, cast, hurt e death nas quatro direções para cada aparência cadastrada, geometria física/lógica, pivô, fps, loop e quadro de contato. O relógio lógico é somente lido; dano, save, equipamento e posição não são modificados.

A chave de aparência inclui classe, personalização salva e IDs de todos os equipamentos. Não se admite substituir roupa ou cor de pele por uma composição aprovada diferente. Uma release selecionada mas inválida ou um recurso ausente não reativa o corpo antigo. O erro permanece no snapshot de diagnóstico, sem requisições em loop. Recarregar a instância permite nova tentativa.

O mesmo compositor consultado por mundo, retratos e editor chama a ponte. Skins completas e transformações mantêm seus consumidores próprios. Habilidades sem arma, morte e reação exigem clips explícitos; não são preenchidos a partir de poses antigas.

## O que não está feito

- Não há pacote completo selecionado ou ativação in-game.
- `tools/rework10917` continua pacote de revisão de 15 estados masculinos SOUTH, não release de gameplay.
- Não há timeline autoral completa certificada da 109, conversão das combinações de equipamentos, feminino ou cores.
- Os contratos posteriores V7 recuperados continuam sendo insumos de auditoria, não aprovação implícita.
- Não houve teste visual no navegador. Este módulo não deve ser habilitado apenas mudando uma flag.

## Verificação

`node --test tests/player-rework-runtime.test.cjs tests/current-player-sprites.test.cjs tests/current-player-release.test.cjs tests/rework10917.test.cjs`

`python tools/player96_release.py --check`

`python tools/build_pages.py`

A aprovação artística das fontes não certifica a cobertura global. Antes de habilitar: importar fontes verificadas, concluir contrato de ações e timeline, comparar pixels do compositor, testar todos os consumidores e variantes suportadas, então habilitar uma release coerente em alteração separada.

## Limites dos hooks e emissões

`ensure`, `resolve`, `height`, `ready` e os campos principais do snapshot ainda pertencem ao contrato native96. Eles não certificam prontidão nem geometria do rework; somente `snapshot.rework` descreve a ponte. Não se deve habilitar uma release apoiando-se nesses campos legados. A ponte faz seu próprio preparo sob demanda.

Com rework ativo, `projectileOrigin` retorna `null` e registra `snapshot.rework.emissionError`: os sockets autorais por estado ainda não foram integrados. Nunca consulta a mão ou o cano do rig antigo nessa condição. O comportamento native96 permanece quando a ponte está desativada. Antes de habilitar gameplay, é obrigatório definir e testar sockets por clip/estado e auditar o tratamento de origem ausente nos consumidores.

Ataques e aliases `skill-1`/`skill-2` usam o contato autoral; cast, hurt e death não-loop usam progresso linear. A prévia reproduz a timeline pelo FPS, mantendo o último quadro por 0,25 s antes de repetir. Isso não altera o relógio de combate.

## Piloto parcial explícito para teste in-game

Abra `index.html?reworkTest=109` ou `index.html?reworkTest=17` (também funciona em `ui-preview.html`). Sem query, nada muda. O banner identifica permanentemente o teste e as lacunas.

O piloto exibe o **composto masculino aprovado**, com sua própria aparência/equipamentos visuais, no lugar do personagem mostrado pelo consumidor; não adapta cor, gênero ou vestimenta do save e não muda o inventário. Skins completas e Zoan continuam em seus caminhos próprios. Somente SOUTH idle (estado 0) e ataque são cobertos. Caminhada, demais direções e habilidades sem arma ficam sem desenho, com aviso explícito, nunca com base antiga.

Ataques percorrem os 7 estados existentes da 109 ou 8 da 17 proporcionalmente ao progresso recebido. Essa timeline é experimental; a 109 não tem retorno completo. Não há mudança no dano, hit-frame lógico, cooldown ou estado salvo. Emissões não usam o rig antigo e ainda não têm socket autoral. Não é teste de cobertura completa nem substituição global. Retire `reworkTest` da URL para sair.

O build publica apenas o manifesto e os 15 `*-final.png` necessários ao piloto; camadas editoriais permanecem fora do dist padrão.

`?reworkTest=donor-f6-north` é outro preset fechado: conjunto feminino F6+147+152+155, somente caminhada NORTH, 12 fontes na timeline autoral de 40 ticks/40 fps. Não representa base nua nem permite mistura arbitrária de equipamento. Idle/ataques/outras direções ficam ocultos com diagnóstico. Manifesto e hashes preservam a procedência recuperada.

`?reworkTest=accessories` seleciona o primeiro snapshot com SOUTH; `&accessory=N` seleciona outro índice exato (0-based). O banner identifica o manequim fixo e reporta carregamento, erro ou movimento sem cobertura. Apenas idle nas direções ajustadas é desenhado, sem propagação de ajustes nem alterações de save. O build inclui os catálogos, manifesto, bundle isolado e PNGs deduplicados necessários. Isso é distinto de integrar capacetes/cabelos arbitrários em todas as ações do personagem equipado.

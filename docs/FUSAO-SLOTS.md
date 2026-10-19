# Fusão — cinco slots e inventário dinâmico

Atualização de 18/10/2026, limitada às duas fusões. Aprimoramento, imbuimento, remoção, reforja, atributos, mapas e combate mantêm suas regras. Nenhum asset ou geração paga.

## Fluxo compartilhado

Esquerda: inventário real, busca e filtros. Centro: cinco slots individuais com o ícone da unidade, seta e resultado previsto. Direita: resultado, condições, chances, custos e ação. Sem contador numérico antigo ou dropdown de materiais.

Clique no grid para preencher o próximo slot vazio; arraste para escolher um encaixe vazio específico. Clique no slot ocupado para retirar só aquele material; Limpar seleção esvazia os cinco. Trocar de modalidade preserva separadamente as duas seleções enquanto os itens existirem. Encaixar, remover, limpar ou filtrar nunca cobra nem modifica o inventário. Cada slot guarda um ID real, sem duplicatas. As seleções são transitórias; o progresso confirmado é salvo normalmente.

O drag destaca em verde um destino permitido e em vermelho o incompatível; arrastar para um slot ocupado é recusado, preservando os materiais. Cliques e teclado permanecem disponíveis.

## Pérolas

O grid contém exclusivamente combinações possuídas, agrupando as unidades reais do inventário. Busca, filtro de atributo e nível. Quantidade disponível desconta as unidades já nos slots; bloqueadas são contadas separadamente e ficam identificadas. Um grupo exclusivamente bloqueado continua visível, com seleção desativada. Não existe catálogo de estoque zero.

O primeiro material define atributo/nível; os demais incompatíveis ficam desativados com motivo no tooltip. Nv.5 fica identificado e indisponível para fusão. Sem estoque, a mensagem é: “Você não possui pérolas disponíveis para fusão”. Novos loots, consumo e fusões atualizam o grid aberto; esgotar uma combinação a oculta, receber a saída a exibe.

Comando transacional `fuse` agora recebe os cinco `itemIds` explícitos, em vez de escolher automaticamente cinco unidades pelo tipo. O modelo valida existência, unicidade, mochila, trava, atributo e nível antes do pagamento/RNG. Repetir ID, usar item equipado, ID removido ou unidade bloqueada é rejeitado sem consumo.

Regras preservadas: cinco iguais; Nv1→2:80%/40 dobrões; Nv2→3:50%/160; Nv3→4:10%/650; Nv4→5:5%/2.500. Sucesso consome cinco e entrega uma superior; falha consome cinco e ouro, sem saída. Confirmação lista os cinco slots, custo, chance, saída possível e perda na falha.

## Equipamentos

Mesmos cinco encaixes, cada um representando uma instância da mochila. Selecionadas ficam destacadas; mesma instância não pode preencher duas posições. Ao encaixar a primeira peça, outras raridades ficam indisponíveis. Equipados não entram nos materiais; bloqueados, peças com pérolas, lendários/supremos permanecem protegidos pela validação existente. Seleção automática respeita filtros e continua excluindo equipados/bloqueados.

Regras preservadas: cinco da mesma raridade; resultado uma raridade acima até Lendário, refino+0, menor nível entre materiais, tipo escolhido e arma da classe. Custos continuam `ceil((100 + nível × 25) × multDestino)` dobrões e `ceil((3 + nível/5) × sqrt(multDestino))` ferro. Extras sorteados somente após confirmar; sockets vazios conforme raridade. Supremo continua desabilitado.

Botões principais: FUNDIR EQUIPAMENTO e FUNDIR PÉROLAS. Modais com CANCELAR / CONFIRMAR FUSÃO; somente a confirmação chama a transação. Revisão `forgeSeq`, validação no modelo e proteção contra clique repetido mantidas. Seleções de instâncias consumidas são limpas após o resultado, sem afetar estoque restante.

## Implementação e recuperação

Produção: forge-ui.js, forge-system.js, game.js, ui-nautical.css. Helper puro `MareForge.pearlFusion` compartilha validação entre prévia, confirmação e execução. Não houve mudança de versão de save: o formato de itens/recursos continua compatível com forgeVersion3. Checkpoint antes das edições: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-fusion-slots-20261018-220334`.

Testes: `node tests/forge-system.test.cjs` (15 grupos); `C:/Python313/python.exe tests/fusion_slots_browser.py` (7 grupos); `C:/Python313/python.exe tests/forge_browser.py` (6 grupos de regressão das quatro abas). Navegador Chromium isolado em 1920×1080, 1366×768 e 1280×720. Capturas/results em docs/evidence-fusion-slots. Incluem drag real, clique em cinco unidades, retirar/repor, limpar, filtros, compatibilidade, duplicação, locks, falta de saldo, cancelamentos, sucesso/falha, desaparecimento do estoque consumido e recarga. Um teste adicional derrota inimigos numa caçada real e verifica o loot aparecendo na fusão aberta. O JSON do usuário não foi acessado pelos testes.

Sem pendências funcionais identificadas nas duas modalidades. Regras futuras de Supremo continuam fora desta alteração.

## Arquivos modificados

- `game.js`
- `forge-ui.js`
- `forge-system.js`
- `ui-nautical.css`
- `tests/forge-system.test.cjs`
- `tests/forge_browser.py`
- `tests/fusion_slots_browser.py`
- `README.md`
- `docs/FUSAO-SLOTS.md`
- `docs/FORJA-REFATORACAO.md`
- `docs/CHANGELOG_DEV.md`
- Capturas, galeria e resultados em `docs/evidence-fusion-slots/`; evidências de regressão atualizadas em `docs/evidence-forge-refactor/`.

Verificação final: 15 grupos de modelo + 7 grupos da fusão + 6 grupos de regressão da Forja. SHA256: 197 arquivos protegidos, zero alterações.

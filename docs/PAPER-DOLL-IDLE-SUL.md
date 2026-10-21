# Paper Doll — piloto Idle/sul, 21/10/2026

Branch `feature/paper-doll-idle-sul`, base `origin/main 05e935e` após a publicação autorizada do PR44. A prévia estática anterior foi conferida no GitHub Pages em Chromium desktop/mobile e o jogo publicado manteve `human-v1` com zero composições modulares. As actions da publicação e da infraestrutura terminaram com sucesso.

## Estado: parcial, encaixe artístico reprovado

Foram executadas as duas chamadas autorizadas: animação frontal do corpo e transferência de cabelo preto, camisa clara/colete azul e espada. A infraestrutura consegue reproduzir quatro camadas reais sincronizadas para inspeção em Idle/sul. **Esse conjunto não foi aceito para produção:** a transferência mudou braços, pernas e detalhes do rosto; a espada extraída deixa de acompanhar a mão em alguns frames e a roupa não acompanha os ombros da base original. Não há validação artística completa nem ativação no jogo. Não foram feitos retries, pintura, recoloração, reposicionamento corretivo ou frames falsos.

## Aprovação, execução e custo

O proprietário aprovou até27 gerações adicionais, sem retries, incluindo crop somente de margens transparentes, playback dos quatro frames gerados e extração por máscaras próprias de frame. Os getters informaram **1 geração cobrada por `animate_image` +10 por `transfer_outfit` =11 cobradas neste lote**. Com as5 do piloto estático, são16 cobradas no acumulado. Não foi usado o restante do teto para outros movimentos ou tentativas.

| Chamada | Job | Resultado |
|---|---|---|
| MCP `animate_image`,64×64,4 frames, transparente, sem last frame/seed | `de56a8ef-6089-4ec8-ba69-5aa83079fee1` | Concluída;5 PNGs retornados incluindo a referência; corpo frontal e linha dos pés fixa, aceitos apenas para testar a transferência |
| MCP `transfer_outfit`,5 entradas,64×64, transparente, sem seed | `516270b5-c0fd-4a55-9608-a1b18a7a3dda` | Concluída;5 personagens compostos; reprovada como fonte de módulos alinhados |

Os prompts exatos, traduções, IDs de assets, uso por chamada e arquivos estão em `pixellab-pip-generations/paper-doll-human-idle-south-20261021/manifest.json`. O blueprint ao lado descreve a receita, sem credenciais, tickets de upload ou dados de conta. Reexecutar a receita exige nova autorização de gasto; não é um script de execução automática.

## Preparação e preservação

- Fontes84×84 do piloto anterior copiadas byte a byte, com hashes registrados. Crop `(10,13,74,77)` remove somente transparência, preserva todos os pixels visíveis e produz64×64 com pivô32/52. Nenhum resampling.
- Todos os dez PNGs brutos foram preservados em sua ordem original. A referência0 fica separada; somente frames1–4 entram no ciclo4FPS autorizado.
- O frame0 retornado pelo serviço tem70 pixels visíveis diferentes do input enviado. As duas fontes foram mantidas e a diferença consta na auditoria; não se declarou equivalência bit a bit do eco. Esse frame não entra no playback.
- Inspeções derivadas voltam ao canvas84×84 mediante padding10/13, pivô42/65. Cabelo, roupa e espada usam máscaras binárias explícitas por frame. O corpo fora dessas regiões é preservado; não se copiam mudanças externas para fingir encaixe.
- A extração conserva os defeitos de contato e proporção. O relatório registra356–393 pixels alterados pelo gerador fora da união das regiões por frame; os rascunhos mantêm zero alterações externas. Isso prova preservação mecânica, não qualidade visual.
- GIFs transparentes de corpo, transferência e rascunho: quatro frames,250ms, loop infinito, disposal2. Cada frame decodificado foi comparado em RGBA visível ao PNG correspondente, sem perda ou rastros. Folhas e guias de grade são inspeções separadas dos originais.

## Infraestrutura e revisão

`paper-doll.js` aceita agora um subconjunto válido de direções em cada clip. O rig permanece com quatro direções; o PNG deve conter exatamente as linhas declaradas. Uma direção sem fonte retorna `missing-direction` antes de desenhar qualquer camada. Duplicações, direções desconhecidas, folhas com linhas extras, frames vazios e sequências estáticas continuam rejeitados. Nenhuma mudança no relógio do combate, física ou impacto.

A bancada existente informa `readyDirections` e `partial-draft` quando uma ou mais direções possuem composição completa, sem conceder aprovação artística. O pacote `review-pack.json` contém somente Idle/sul e quatro peças com `approved:false`; serve para diagnosticar o encaixe. Walk, Attack e as outras três direções usam fallback. Nenhuma dessas peças está registrada no catálogo do jogo.

A nova `preview.html` mostra corpo, transferência bruta e extração lado a lado, com controle de frame, reprodução4FPS, pivô e visibilidade das peças. O aviso de reprovação permanece visível. O build Pages inclui por allowlist somente os recursos de revisão, não os scripts Python, máscaras/guias ampliados ou arquivo de evidências inteiro. O código da branch precisa de aprovação/merge para entrar na publicação; esta etapa não faz merge automático.

## Testes e limites

-32 suítes Node passaram, incluindo cobertura parcial, rejeição de linhas extras, fallback atômico, pivôs/cache, equipamentos e pureza de saves.
-Build `python tools/build_pages.py` passou; testes Chromium da bancada existente e cobertura parcial no pacote `dist` passaram.
-Regressão em28 perfis classe/facção e combate das sete classes passou, incluindo equipamentos, reload, Haki e Zoan. Na amostra local de combate de1,8s,109 frames, mediana/p95 de16,7ms e zero composições modulares; isso mede fallback, não desempenho de uma multidão modular.
-`tests/paper_doll_idle_browser.py` verifica os quatro frames reais contra as montagens PNG, toggles, retorno3→0, pivô, desktop/mobile, importação do pacote na bancada e save isolado. Aprovação artística continua falsa em todas as poses.
-Capturas atuais em `docs/evidence-paper-doll/idle-real-review-*.png`, fora do Git. O resultado visual foi inspecionado; a reprovação foi registrada, sem encobrir o defeito com testes estruturais.

Saves, personagens, classes, facções, mapas e sistemas numéricos permanecem no fluxo anterior. Rollback por revert do commit desta branch, sem migração ou limpeza de cache/save.

## Próximo lote mínimo — não autorizado

Antes de ampliar direções: corrigir a preservação da pose e dos contatos de uma única peça, especialmente espada/mão, usando entradas ancoradas por frame ou autoria de camadas sobre o mesmo rig. Faltam quatro peças aceitas em Idle/sul (16 frames), depois as outras direções, caminhada e ataque. As extrações atuais não contam como16 frames finais aprovados. A escala desse primeiro ensaio continua64 nativo/84 com padding; não confundir canvas com altura corporal.

Qualquer novo endpoint, geração ou retry deve receber plano e teto próprios. Não há gasto futuro agendado, nem autorização para consumir automaticamente as16 gerações não usadas do teto deste lote. A extensão para roupa/facções e categorias de ataque aguarda a prova de encaixe real; o editor cosmético de pele/cabelo/olhos continua fora desta fase.

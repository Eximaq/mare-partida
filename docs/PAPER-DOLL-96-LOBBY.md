# Sprint seguinte ao PR144 — ensaio96 no lobby real

30/10/2026. Base: merge `9684c01` do PR#144. Branch `feature/paper-doll-96-player`.

## Escopo e uso

Esta etapa leva a biblioteca96 da bancada para o **lobby jogável**, com a câmera, a navegação, os NPCs e a profundidade de cenário existentes. É um ensaio opt-in; a integração definitiva de combate e persistência96 continua sendo uma etapa posterior.

Abra a raiz do jogo com `?paperDoll96=1`. Em Personagem → Personalizar aparência, escolha corpo masculino/feminino, cabelo, rosto, pele, cor do cabelo e conjunto. **Visualizar no lobby** aplica somente à sessão; **Descartar alterações** volta à última escolha do ensaio. Recarregar a página descarta o ensaio. Retirar o parâmetro devolve o fluxo normal.

- Equipamentos atuais: resolve os IDs realmente equipados em coat→Torso, legs→calças, botas, luvas, capa e cabeça. Itens sem arte são informados; não recebem uma skin inventada.
- Conjuntos A/B: duas combinações visuais com os12 equipamentos da biblioteca; não concedem itens, não equipam nada e não alteram bônus.
- Sem equipamentos: corpo/roupa-base da referência96.
- A janela permite repouso, caminhada e seis gestos de ataque, em quatro direções, para os dois corpos. Os ataques de ensaio não causam dano e ainda não mostram armas.
- Mundo, retrato, inventário e ficha compartilham a escolha temporária enquanto o personagem humano está no lobby. A criação continua com a aparência de produção anterior.
- Ao entrar em caçada, o renderizador aprovado existente assume integralmente. Transformações Zoan continuam tendo prioridade.

## Implementação e pendências resolvidas nesta etapa

`paper-doll-96-lobby.js` carrega sob demanda os dados e o mesmo `MareWardrobe96` da bancada. Não copia o encaixe de cabelos, as máscaras de pele nem as regras de profundidade para um segundo compositor. Nenhum PNG foi alterado e nenhuma geração paga foi solicitada.

- Conversão das direções do jogo front/back/left/right para south/north/west/east. West usa a matriz East espelhada em torno do mesmo pivô discreto (`width+1`).
- Corpo96 desenhado em escala nativa no mundo; interfaces convertem a escala de referência antiga para a altura solicitada, evitando recortes no retrato.
- Pés permanecem no mesmo ponto do mundo. Nome, barra e teste visual de oclusão usam a altura96; colisão, alcance, dano e navegação continuam com os dados atuais.
- Caminhada usa a fase existente baseada em distância, sem acelerar os quadros pela taxa de apresentação. Idle mantém4 quadros/4FPS, Walk8/8FPS, ataques de janela8/12FPS. Tecnologia continua compartilhando disparo.
- Um conjunto novo de corpo/aparência/equipamento só passa a desenhar após as seis folhas canônicas de Idle/Walk ficarem prontas. Não mistura peças novas com partes do personagem anterior durante o carregamento.
- No máximo seis decodificações de imagem simultâneas. Caches limitados a48 imagens, dois conjuntos de locomoção e oito clipes de prévia. A composição ocorre fora da passagem de desenho por quadro, com pausas entre os quadros consolidados.
- Sem opt-in não há requisições para a biblioteca96. Falha de dados ou de montagem mantém o personagem anterior e informa o problema na janela de aparência.

`index.html` e `ui-preview.html` carregam a mesma entrada. `tools/build_pages.py` publica a entrada com hash e preserva os caminhos relativos da biblioteca.

## Validação

`tests/paper-doll-96-lobby.test.cjs` cobre opt-in exato, IDs/slots, resolução de peças ausentes, ausência de mutação de inventário, relógios, contrato de espelhamento e separação de save/combate.

`tests/paper_doll_96_lobby_browser.cjs` abre o jogo real em Chromium. Na execução completa compara192 quadros de Idle/Walk, dois corpos, dois conjuntos e quatro direções diretamente com o PNG composto pela bancada. Verifica28 perfis de classe/facção,48 prévias de ataques, oito resoluções/orientações, entrada de movimento, caçada/retorno, limites de cache, aplicação/descarte/reload temporários e zero requisições96 no fluxo normal. Há uma execução curta `--smoke` para recompilações que não mudam os pixels: oito comparações e quatro prévias de ataque. Não confundir as contagens das duas execuções.

CI específico: `.github/workflows/paper-doll-96-lobby.yml`, com build Pages, contrato Node e cenário completo em Chromium. Capturas ficam em artifact, sem entrar no Git.

Resultados locais:160 testes Node, quatro testes Python e regressão completa do personagem normal aprovados. O cenário completo acima passou em Pages, incluindo manifesto ausente, sem erros de página; imagens48, conjuntos2, prévias8 e pico de seis decodificações. Capturas recentes foram inspecionadas em1920×1080,1366×768 e1280×720, além da janela móvel. Resultados e limitações finais também estão no changelog da sprint. Os detectores medem critérios definidos; igualdade com a bancada não equivale a aprovação artística do personagem no mapa.

## Medição local de apresentação

Chromium headless em1366×768, depois de oito trocas completas de corpo/pele/conjunto:300 intervalos de apresentação, mediana16,7ms, p95 de18,4ms e máximo20,1ms. As trocas prepararam os seis clipes em1,64–1,82s cada; durante a preparação o visual anterior permanece inteiro. Mil desenhos96 já consolidados consumiram6,4ms nesta execução. Heap JavaScript observado passou de41,4MB para34,6MB; não mede memória gráfica nem prova estabilidade em sessão prolongada ou em outro computador. Caches permaneceram dentro dos limites.

## Compatibilidade e reversão

Não há novo campo de save, migração, escrita de aparência96, modificação de item ou alteração de classe/facção. Saves v1 e chave DEV permanecem independentes. O botão do ensaio não chama o sistema de persistência; o jogo continua salvando seu progresso normal pelos mecanismos existentes. Os manifests de revisão continuam `productionEnabled:false` e os construtores mantêm seus bloqueios.

Rollback de uso: remover `paperDoll96=1` da URL. Rollback de código: reverter os commits desta sprint e reconstruir Pages; não reverter PR144 nem commits de colaboradores.

## Próxima sprint mínima

1. Avaliar a escala e a harmonia96 no lobby real, com NPCs e equipamentos, e registrar os ajustes artísticos observados.
2. Integrar armas ao rig96: mão certa, profundidade por direção, gesto, ponta de disparo e frame de emissão sincronizado ao impacto lógico. Conferir as sete classes e os seis gestos antes de ativar nas caçadas.
3. Preparar manifesto de lançamento separado e aparência versionada para produção (corpo, rosto, cabelo e paletas), com leitura compatível de saves v1. A versão de ensaio não deve ser persistida silenciosamente.
4. Validar criação/editor, equipamentos reais, combate/habilidades, transformações, recargas e retorno ao porto. Hurt/guard/death ainda não têm sequências96 próprias; decidir e documentar a cobertura antes da liberação.

O merge de PR144 consolidou as correções da biblioteca; não cria automaticamente assets de armas nem cobre sequências que não foram produzidas.

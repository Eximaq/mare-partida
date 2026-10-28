# Impel Down — mapa e progressão jogável

Atualização de 27/10/2026, branch feature/impel-down-map-progression, base 58988dc.
Esta solicitação libera o modo e substitui a prévia de 19/10: a escala antiga por blocos, três ondas e chefes a cada dez andares foram substituídos pelas regras abaixo.

## Entrada e combate

Abra **Modos de jogo (M) → Impel Down**. O modo permanece separado do Mapa do Arquipélago. São 100 andares; somente os concluídos e o próximo podem ser inspecionados. Entrada apenas no próximo ainda não concluído.

- Um adversário por andar, sorteado do catálogo existente de monstros comuns. Não há filtro pelo nível do jogador.
- HP, ataque e defesa: atributo base × 1.30 ** (andar − 1), arredondado para inteiro. Movimento e velocidade de ataque não são multiplicados. A fórmula não aparece na HUD.
- Chefes nos andares 5, 10, 15…100. A função spawnImpelDownBoss é o ponto de substituição pelos IDs futuros; hoje reutiliza a arte de boss existente e atributos fortes do catálogo, explicitamente identificado como Guardião Provisório.
- Jogador à esquerda (480,736), inimigo à direita (1744,736). O encontro usa navegação, alcance, animações, impactos, habilidades e controles reais da engine.
- Vitória mostra **Andar Concluído**, salva e avança automaticamente, inclusive antes dos chefes. Restaura a vida e as posições, mantém recargas e energia. Ataques, projéteis e controles do encontro anterior são descartados.
- Queda mantém o mesmo andar e o mesmo monstro, reiniciando o duelo com vida restaurada após o respawn. Não concede progresso.
- Após o andar 100, retorna ao porto. Sair voluntariamente preserva conclusões; o andar incompleto será reiniciado ao entrar novamente.

O combate reutiliza a cena hunt com um controlador independente. A região anterior do save não é modificada. Spawns, filtros por setor, loot e crédito regional das caçadas ficam suspensos enquanto a prisão está ativa. Não foram inventadas recompensas de XP, ouro ou equipamentos para estes encontros; continuam os marcos de caixas previamente definidos. Abates e dano entram nas estatísticas globais.

## Mapa e colisões

Fonte: mapa PixelLab **Impel Down**, ID 5dd2fc7d-23be-4067-bfc2-925c8d494bf5. Importação de leitura, sem gerações pagas. Grade original 34×21, células64, 2176×1344 pixels; origem do export (−1,−3). As dimensões originais foram preservadas conforme a solicitação de integrar esse mapa.

Seis recortes nativos foram unidos sem redimensionar a arte. Hash e procedência em assets/impel-down/provenance.json. Os 45 objetos da fonte estavam em estado ok. A matriz possui 699 células pintadas e 15 vazias na margem exterior direita; não foram encontrados objetos fantasmas a remover.

- Celas/grades superiores e paredes do perímetro bloqueiam movimento e projéteis. Hitboxes da base física; ambos os atores usam o mesmo navegador.
- Lava e exterior não são transitáveis. Chão e pequenos detritos decorativos não bloqueiam disparos.
- Imagem plana desenhada exclusivamente atrás dos atores. Nenhuma cópia de piso no primeiro plano.
- A auditoria percorre a grade de navegação, valida os spawns e simula ambos os trajetos. Um único componente transitável, 624 células abertas, 2/2 rotas válidas, zero colisores inválidos/duplicados no Impel Down.

Executar: node tools/audit_maps.cjs --full --map impel-down. A opção --map permite limitar a auditoria a um cenário; sem ela, os demais mapas continuam sendo verificados.

## Salvamento e recompensas

A conclusão sequencial é persistida antes da troca do estado em memória e antes de avançar. Falha no armazenamento pausa o modo; **Ver andares → Salvar conclusão** tenta novamente, sem duplicar abates ou recompensas. Voltar ao porto também exige resolver a gravação pendente. Recarregar após uma falha definitiva mantém apenas o último andar efetivamente salvo.

Marcos **5,10…50** concedem uma Caixa de Pérolas Nível1 por primeira conclusão: dez caixas no total. Mochila cheia mantém vitória e prêmio pendente; **Marcos → Resgatar** entrega uma única vez quando houver espaço. Acima de50, recompensas continuam indefinidas. Caixas Nível2/3 existentes não ganharam novas fontes.

Abrir caixa continua sendo uma troca de um item por uma pérola do mesmo nível, com20% para cada atributo. Funciona em mochila cheia; cancelamento, item bloqueado e falha de storage não consomem itens. Caixas não são equipamentos nem materiais de forja. IDs de itens e estoque de pérolas anteriores permanecem estáveis.

Monstros comuns/chefes das caçadas não fornecem pérolas, gemas ou caixas. A exceção existente Senhor do Submundo conserva sua regra e origem underworld. Gemas continuam sem novo item/recompensa nesta atualização.

Save impelDown v1 preservado: cleared, claimed e campos antigos são migrados de forma idempotente, sem conceder estoque. As preferências antigas de autoAdvance/pauseBeforeBoss permanecem armazenadas por compatibilidade; a expedição atual segue a subida automática solicitada e não exibe esses controles antigos. Saves DEV e normal continuam separados.

## Arquivos e validação

- prison-system.js: catálogo elegível, escala, máquina de estados, chefe provisório e transações.
- impel-down-world.js e assets/impel-down/: mapa, terreno, geometria e procedência.
- game.js: encontro, vitória, respawn, HUD e entrada/resgate.
- world-system.js, HTMLs e build_pages.py: registro e distribuição estática com caminhos relativos.
- tests/impel-down-live.test.cjs, impel-down-map.test.cjs e prison-system.test.cjs: regras, 100 andares, fidelidade da arte, navegação e recompensas.
- tests/impel_down_browser.cjs: entrada real, movimento/combate, progressão, chefe5, duplicação de hit, recarga do save, falha de storage, queda, mochila cheia, marco pendente, fim do andar100 e capturas desktop/celular.

A execução atual de testes e o build estão registrados no changelog. Capturas são temporárias, fora do Git. O antigo prison_browser.py documenta o roteiro de prévia anterior; o aceite do modo jogável é impel_down_browser.cjs.

## Limites e reversão

Jogo estático/offline: não existe servidor remoto autoritativo para esta progressão. Chefes específicos e recompensas após50 aguardam definição. O crescimento composto até100 é intencional e pode tornar andares altos muito difíceis.

Para reverter, retornar ao commit anterior da branch e manter backup do save; não apagar impelDown nem renumerar o catálogo. A versão anterior reconhece o mesmo progresso e ledger, mas volta a mostrar a prévia indisponível.

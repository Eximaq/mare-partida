# Auditoria de colisões e profundidade — 27/10/2026

## Escopo e evidências

Base: main 6853304, incluindo o personagem modular aprovado do colaborador. Revisão dos onze mapas registrados (nove cenas atuais e dois mapas legados), sem redesenhar mapas, mover NPCs, alterar progressão ou saves. A navegação usa módulos JavaScript e máscaras/grades exportadas; não há um JSON Tiled único na execução.

A varredura percorreu **169.230 células de navegação**, encontrou **29 colisões exatamente duplicadas** e executou **132 rotas de ida e volta com movimento real**, todas concluídas. Nenhuma geometria inválida foi encontrada nos mapas atuais. Sobreposições distintas foram mantidas: partes de muros e bases podem se sobrepor legitimamente.

| Mapa registrado | Células de navegação | Duplicatas removidas | Rotas concluídas |
|---|---:|---:|---:|
| lobby | 9840 | 0 | 18/18 |
| hunt | 12328 | 0 | 2/2 |
| embers | 7396 | 0 | 16/16 |
| orange | 19234 | 0 | 12/12 |
| conchas | 26928 | 6 | 10/10 |
| dawn | 35840 | 0 | 16/16 |
| rare | 11600 | 2 | 12/12 |
| syrup | 15600 | 0 | 12/12 |
| baratie | 10584 | 19 | 12/12 |
| arlong | 6080 | 0 | 12/12 |
| loguetown | 13800 | 2 | 10/10 |

Os componentes desconectados são relatados pelo script. Existem ilhotas e bolsões fora das rotas atuais (inclusive em Dawn, Conchas e Rare); a auditoria não os declarou lixo nem criou pontes/acessos automaticamente. Todos os pontos de chegada, serviços e setores configurados foram alcançados. Não foi necessário deslocar props para liberar essas rotas.

## 1. Movimento e gargalos

- O ramo de colisão circular ignorava isSolid=false; agora ambos os formatos de pés respeitam isSolid/blocksMovement.
- A verificação somente por pontos separados permitia atravessar paredes muito finas. O movimento usa varredura contínua da pegada, com deslizamento por eixo; a altura visual da transformação não amplia sua colisão.
- Os limites usam a pegada retangular completa quando configurada. Valores inválidos/Infinitos e deslocamentos absurdos não entram em loops ilimitados.
- No porto, postes, baús e barris tinham dimensões infladas para no mínimo 64×64. As bases pequenas voltaram às dimensões declaradas; os objetos continuam sólidos. Uma posição de calçamento ao lado de lamp-0 reproduziu a parede invisível antes do ajuste.
- Dawn tinha um hook de segmento próprio que também ignorava flags não sólidas. Ele agora respeita as mesmas flags do motor, mantendo a máscara costeira e a precisão das quinas.
- cleanColliders elimina geometria inválida e duplicatas exatas na construção do navegador. Fonte e pixels exportados permanecem intactos; colliders distintos sobrepostos são preservados.

## 2. Movimento versus linha de visão

Navigation.clear/path/move/follow continuam verificando terreno e pés. Navigation.projectileClear verifica somente obstáculos de disparo e limites finitos. blocksProjectiles tem prioridade explícita; casas, árvores e muros têm metadados próprios, enquanto objetos baixos deixam o disparo passar. Água e terrenos não caminháveis não bloqueiam um raio por si sós.

O jogo usa combatLine nos ataques, disparos, impactos em área e controles que exigem linha de visão. Avanços físicos de Neko/Lobo/Bisão, knockback, deslocamento do Gênio, esquiva e busca de caminhos continuam usando colisão de movimento. Não houve alteração de dano, alcance, custo ou recarga.

O teste no navegador iniciou um disparo, inseriu uma parede real durante o voo e confirmou: projétil encerrado, HP intacto e movimento liberado após o término da animação. A máquina de animação existente já encerrava o ciclo; a causa do bloqueio de tiros era o uso de caminhabilidade como linha de visão. Esse fluxo foi corrigido sem criar um reset indiscriminado que interromperia habilidades válidas.

A física/linha de visão continua no cliente, como no projeto atual. Esta revisão não converte o backend em simulação autoritativa de mundo/PvP.

## 3. Profundidade e visibilidade

O jogador era desenhado depois da fila ordenada, ficando sempre na frente de monstros/props. Agora jogador, monstros, NPCs, Gênio e recortes de cenário compartilham a ordenação pelos pés/base no eixo Y, com desempate estável. Nome e HP do jogador ficam na camada aérea posterior.

world-depth.js reúne os recortes das cenas e mantém um cache limitado a 64 overlays. O mapa composto continua sendo a camada de fundo. Os objetos só são reaplicados para ocluir atores atrás deles; atores à frente são desenhados depois. Dawn reutiliza suas máscaras originais; Conchas usa o foreground original; o porto mantém seus recortes de copas/telhados. Nas demais ilhas, máscaras transparentes originais de 50 objetos foram recuperadas por consulta somente leitura ao PixelLab, sem geração e sem modificar os PNGs compostos. assets/map-depth/provenance.json registra IDs, dimensões e hashes dos PNGs copiados.

A inspeção detectou que recortar somente um retângulo copiava chão sobre o personagem. O teste reproduziu o erro (canto transparente virava opaco) e a máscara real corrigiu esse caso. A silhueta clara semitransparente é limitada à interseção entre o corpo atual e os pixels reaplicados do objeto alto; não pinta o personagem inteiro quando ele está em terreno aberto. Transformações e crescimento usam a altura/largura visual atual. Nenhuma nova identidade visual ou arte foi gerada.

## 4. Rotina de varredura e limpeza

Executar na raiz:

~~~text
node tools/audit_maps.cjs --full --output <relatorio-fora-do-repositorio.json>
node tools/audit_maps.cjs --sanitize <entrada-tiled.json> --output <copia-limpa.json>
~~~

O primeiro comando carrega as mesmas definições do jogo, valida chegada/rotas, percorre a grade, identifica componentes e registra duplicatas/sobreposições. O segundo percorre grupos/camadas/chunks Tiled aninhados, zera IDs de tiles inválidos, preserva GIDs unsigned com flags de espelhamento, corrige flags contraditórias em camadas declaradas de piso e limpa retângulos inválidos/duplicados de camadas de colisão. Pontos, polígonos, ordem das camadas e objetos visuais são preservados. A saída precisa ser diferente da entrada; o script não regrava exports do proprietário.

A limpeza JSON foi executada nos testes com dados controlados; a limpeza de colisões e a varredura completa foram executadas nos mapas reais. Não se presumiu que qualquer sobreposição ou ilha desconectada fosse um erro.

## Validação realizada

- Testes escritos antes dos ajustes reproduziram flags ignoradas, parede fina atravessável, bloqueio de tiro por terreno baixo, jogador fora da fila de profundidade, falta de silhueta, cópia opaca de chão, limite incompleto dos pés e loop com coordenadas inválidas; depois passaram.
- 92 suítes Node, 114 testes Python de lógica/arte e quatro testes Python de hierarquia passaram.
- Navegador: nove cenas, atrás e à frente de cenário real, interseção de pixels de oclusão, silhueta transparente, viewport desktop e móvel, parede interrompendo ataque e retorno ao movimento. Teste executado também no pacote Pages.
- Combate: sete classes e vinte abates consecutivos por classe (140 no total), dano único, tiro cruzando terreno baixo, interrupção por parede e cauda visual de alvo morto; API atual e estático.
- 56 cenários de cadência, humanos e Zoans, passaram. Regressões Neko, Lobo, Ushi, Ryu, Doru, Hoya, Jiki e Beta/Hana passaram.
- Personagem modular: criação, aparência, equipamento, reload e isolamento DEV passaram.
- Dawn: cinco resoluções, sete rotas reais, chefe/recompensa/rollback/reload e 8.380.416 pixels originais sem diferença. Máscaras e chunks sem lacunas.
- Build Pages e cache versionado: save preservado, sem script antigo nem erro de página. O teste de cache tinha uma contagem antiga de quatro monstros Ember; o catálogo já continha cinco desde o commit 6c91d1c (César). A expectativa agora verifica o catálogo vigente, sem alterar o runtime desse subsistema.

Capturas e relatórios completos ficam em diretório temporário local, fora do Git. Os testes podem recriá-los com MARE_QA_DIR. Não foram enviados saves, bancos de teste ou capturas em massa. Limite: varredura e testes cobrem o conteúdo registrado e os cenários descritos, não provam ausência de qualquer erro em conteúdo futuro.

## Arquivos e compatibilidade

Motor: world-system.js. Composição: world-depth.js e game.js. Metadados: dawn-world.js, lobby-world.js, new-islands.js e pixellab-world-maps.js. Publicação: index.html, ui-preview.html e tools/build_pages.py. Auditoria: tools/audit_maps.cjs e testes de mapa/combate/Pages. Sem migração ou alteração das chaves de save; rollback por reversão do PR.

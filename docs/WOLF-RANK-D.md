# Inu Inu no Mi: Modelo Lobo — Rank D

Zoan Carnívora registrada no quinto espaço do Rank D. O item foi anexado em itemDefs[79]; os índices anteriores permanecem iguais. A descrição e os ícones são os fornecidos pelo proprietário. Equipar transforma automaticamente; T alterna para humano.

## Habilidades

| Tecla | Habilidade | Energia | Recarga | Regra |
|---|---|---|---|---|
| 1 | Fome Incessante | 26 | 14 s | Investida de até 4 tiles (256 px), 100% de ataque físico no contato, mais cinco ticks de 20%, um por segundo |
| 2 | Aura Sanguinária | 30 | 24 s | Durante 6 s, +30% de velocidade dos ataques básicos e cura de 10% do dano efetivamente causado |

A duração de 6 s e os custos/recargas são parâmetros iniciais de balanceamento, pois a solicitação não definiu esses valores. Sangramento e impacto sofrem a mitigação física existente (30% da defesa subtraída por golpe, mínimo 1). O total teórico sem defesa é 200%. O ataque é capturado no lançamento.

Fome Incessante requer alvo vivo selecionado em linha de visão. WASD/setas ajustam a direção durante a investida; sem entrada, ela acompanha o alvo selecionado. Contato só causa dano nesse alvo. A movimentação usa o navegador de colisão em passos de até 8 px; parede, limite de distância, tempo de 1,5 s, alvo morto ou controle interrompem a investida. Os cinco ticks continuam no alvo até terminar ou ele morrer.

A aura divide o intervalo e a duração da animação básica por 1,3. Não aumenta o dano básico nem o BP de conquistas. Roubo de vida usa o dano real após a defesa e é limitado pelo HP que o alvo tinha e pelo HP máximo do jogador; inclui sangramento, habilidades e demais fontes que passam por outputDamage. A cura não recebe multiplicadores de eficiência e tem guarda contra recursão de talentos de cura. A aura termina ao expirar, morrer, trocar/remover a fruta, voltar à forma humana, trocar mapa ou recarregar a página. As recargas persistem.

## Arte e encaixe

Modelo PixelLab existente: 992eb999-b9fa-41d4-9bd4-ec32a142efbf. Nenhuma geração paga foi solicitada. O importador preserva todos os pixels de 124 frames originais nas quatro direções e registra hashes em clips.json/manifest.json. Os sete arquivos fornecidos também são preservados byte a byte.

- Idle: uma pose por direção.
- Básico: “Attack using claws and forward”, nove frames.
- Investida: “Running on all fours, it advan”, entrada 1–3, loop 4–9, finalização 10–13. A caminhada normal usa “Running Jump”, oito frames próprios por direção; não compartilha mais os frames da investida.
- Escala nominal de 112 px, igual à Girafa; atlas de 96 px com margens transparentes e pivôs nos pés.
- firelight-take-4: impacto/sangramento no alvo durante 5 s.
- firelight-take-2: aura com 13 frames de 100 ms, camada principal antes do sprite do jogador. Após revisão do proprietário, a aura foi elevada e estendida verticalmente: largura 1,8× e altura 2,3×, base a aproximadamente 2 px dos pés. As partículas dianteiras experimentadas foram removidas a pedido do proprietário; a aura volta a ser desenhada somente atrás do personagem. O PNG original não foi alterado.

## Backend e distribuição

Regras em assets/akuma/wolf/rules.json, espelhadas em wolf-data.js para abertura estática/file://. wolf-system.js controla clips, VFX e funções puras; game.js integra combate e estado transitório. tools/import_wolf_assets.py reproduz a importação a partir do ZIP existente e dos arquivos fornecidos.

server/akuma.py valida transformação, energia, alcance, alvo, recargas independentes e duração da aura, com migração aditiva SQLite. O cast retorna o plano de impacto/sangramento; wolf-damage calcula a cura e os bônus ativos. Como no protótipo existente, posição, contato, HP e ticks de combate ainda são executados no cliente; isso não representa um servidor de combate autoritativo.

## Validação

- node tests/wolf-system.test.cjs: catálogo, regras, frames, ticks, velocidade, duração, cura, posicionamento da aura e desenho nas quatro direções.
- python tests/wolf_backend_test.py: três casos de validação, recargas, dano, aura e cancelamento.
- python tests/wolf_artwork_test.py: sete hashes, 124 frames e limites das folhas de VFX.
- node tests/wolf_browser.cjs: registro/equipamento/HUD, controle da investida, impacto único, cinco ticks, profundidade da aura, intervalo de ataque, cura/caps, transformação/morte e reload. Fixture privada injetada apenas na resposta do navegador de teste.
- Build com python tools/build_pages.py e regressões de Akuma, Neko, Girafa e Doru. Capturas de revisão ficam fora do repositório.

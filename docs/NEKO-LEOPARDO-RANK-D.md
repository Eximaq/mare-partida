# Neko Neko no Mi: Modelo Leopardo — Rank D

Zoan Carnívora disponível no segundo espaço do Rank D, após Supa Supa no Mi. O registro usa o fluxo de demonstração existente, entrega o item à mochila e concede o bônus permanente padrão do compêndio (+0,1% de Vida máxima e Força base). O item ocupa o índice 76: todos os índices anteriores permanecem iguais.

Descrição fornecida pelo proprietário:

> Fruta do Diabo do tipo Zoan que concede ao usuário a agilidade, os reflexos e a ferocidade de um leopardo predador. Ao ser ativada, transforma a forma física do usuário, aumentando drasticamente sua capacidade de caça, avanço rápido e execução de ataques críticos letais.

## Transformação e combate

- Equipar a fruta ativa a forma de leopardo. **T** alterna entre leopardo e humano. A forma é persistida no save e no serviço Python; retirar ou substituir a fruta restaura o humano.
- A forma substitui o sprite no mapa, retrato e prévias. Usa as animações existentes do modelo PixelLab **Neko Neko no Mi: Leopard**, ID `ebcfd966-8908-4162-a15a-2ff02c13a85b`.
- O ataque básico físico e corpo a corpo usa **Cross Punch**, seis frames a 12 FPS, com ciclo de 500 ms. Um novo ataque não reinicia um ciclo ainda em execução.
- Não foram acrescentados bônus passivos numéricos de velocidade, ataque ou esquiva: o pedido não especificou esses valores. As duas habilidades e a troca de forma são os efeitos próprios implementados.

| Tecla | Habilidade | Energia | Recarga |
|---|---|---:|---:|
| 1 | Bote Feroz | 25 | 12 s |
| 2 | Fúria Felina | 32 | 16 s |

Custos e recargas seguem a proposta apresentada ao proprietário. As habilidades exigem a forma de leopardo e um alvo vivo selecionado, respeitam recargas independentes e substituem as duas ações de classe na HUD. Ativações inválidas não consomem recursos no cliente.

### Bote Feroz

Alcance inicial de 256 px (quatro tiles). O jogador avança em linha reta até 48 px além da posição do alvo, com a animação nativa **Dash toward the target with a** (nove frames a 12 FPS). O dano é aplicado uma única vez, no contato com o alvo inicial. Outros monstros no caminho não recebem dano.

O avanço verifica colisão em passos de até 8 px e termina antes de terreno ou objetos intransponíveis. A verificação de contato usa o segmento percorrido, evitando saltar um alvo entre dois frames. A animação dura 750 ms; movimentação e ataques concorrentes aguardam o término.

No impacto, o vetor real do deslocamento é comparado à direção atual do inimigo (`emberFacing`). Um produto escalar normalizado de pelo menos `cos(45°)` indica ataque pelo setor traseiro: nesse caso há **100% de chance de crítico**, com o multiplicador crítico ativo do personagem. Nos demais casos, o dano é físico de 145%, sem crítico adicional sorteado. A fórmula física existente aplica a defesa efetiva do alvo antes do multiplicador crítico.

### Fúria Felina

Conforme resposta do proprietário, afeta **somente o alvo selecionado na ativação**, mesmo se a seleção mudar durante o combo. Alcance de 96 px e linha de visão livre. São quatro tentativas de acerto, em 0, 166, 332 e 498 ms, cada uma com 80% do poder físico. Defesa efetiva é aplicada por acerto. Alvos que se afastem do alcance ou fiquem atrás de obstáculos podem evitar os acertos seguintes; a habilidade não persegue nem escolhe outro monstro.

O efeito **Slash Tiger** reproduz os nove frames de 83 ms do JSON fornecido (747 ms) e mantém o último frame durante um desaparecimento de 150 ms. Movimento, ataque básico e outra habilidade ficam bloqueados por todo esse intervalo de **897 ms**. A morte do alvo encerra o combo; morte do jogador, controle incapacitante, troca de mapa, retirada da fruta ou retorno à forma humana também interrompem a ação.

## Arte e profundidade

Fruta, ícones e Slash Tiger foram copiados sem reencodificação. O JSON original permanece preservado, inclusive o nome interno `slash-arc-take-1.png`; o runtime o associa ao arquivo fornecido `slash-tiger.png`. A origem do efeito é (48,48), conforme o exportador.

Foram importados 96 frames existentes do PixelLab nas quatro direções do jogo: quatro poses paradas, 32 frames de caminhada, 24 de Cross Punch e 36 de Dash. Todos os pixels foram preservados, sem interpolação, centralizando os canvases originais em células de 96×96. `clips.json` registra pés e hashes RGBA por frame; o manifesto registra a origem e o hash do pacote exportado. Não houve geração paga de novas artes. Caminhada usa 10 FPS; as ações usam 12 FPS no relógio do jogo.

A Retaliação Metálica da Supa agora é desenhada em `drawTalentedHero`, antes do sprite do personagem. O desenho posterior do escudo foi removido, mantendo a Spiral Ward atrás do jogador e respeitando a camada de objetos do mapa.

## Backend e validação

O catálogo Python registra a Zoan e suas duas habilidades. O serviço valida transformação, alvo, energia, alcance e recargas; calcula o dano físico, o crítico traseiro e o plano de quatro acertos. Reutiliza a tabela de recargas por habilidade e a persistência Zoan existentes. O impacto real e os quatro acertos são executados no cliente, que possui a simulação do mapa e dos monstros. O backend opcional continua recebendo atributos e posições do cliente, conforme a arquitetura do protótipo; não é combate multiplayer autoritativo.

- `node tests/neko-system.test.cjs`: cadastro, regras, hashes, direções de backstab, contato por segmento, agenda de quatro acertos, frames, origem e fade do JSON, dimensões dos atlas e ordem de desenho da Retaliação.
- `python tests/neko_backend_test.py`: cadastro, transformação, dano normal/crítico, defesa, energia, alvo, alcance e recargas independentes.
- `node tests/neko_browser.cjs`: registro real, equipamento, forma automática, sprites nas quatro direções, Cross Punch, combo apenas no alvo inicial, bloqueio/liberação do movimento, atravessamento do alvo, crítico traseiro, colisão com terreno, recarga e cancelamento por transformação/morte. Executado com o serviço Python e com o preview estático.
- Regressões Supa no navegador, Akuma/Zoan, personagem, forja, Haki, tooltips, armas e DEV; build estático com `python tools/build_pages.py`.

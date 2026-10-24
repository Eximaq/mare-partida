# Doru Doru no Mi — Rank D | Paramecia

Quarta fruta do Registro D, anexada ao catálogo no índice de item **78**, após a Girafa (77). Preserva os itens anteriores, os saves e a concessão de demonstração do Compêndio. Equipar concede as teclas 1/2 sem transformar o personagem. Descrição, fruta, ícones e os dois pares PNG/JSON são os anexos do proprietário, preservados sem reencodificação.

## Parâmetros de balanceamento

| Tecla | Habilidade | Energia | Recarga | Alcance |
|---|---|---:|---:|---:|
| 1 | Explosão de Cera | 24 | 12 s | 256 px / 4 tiles |
| 2 | Grilhões de Cera | 28 | 20 s | 256 px / 4 tiles |

Raio da explosão: 64 px (1 tile). Velocidade: 480 px/s. Contato com inimigos: raio de 20 px. Ambas disparam em direção à posição do alvo vivo selecionado no momento do cast, sem perseguição automática. Alvo inválido, sobreposto ao jogador, além do alcance, controle incapacitante, falta de energia ou recarga impedem o cast local sem consumir recursos.

O dano usa 160% do Poder de Ataque principal (`getDerived().attack`), capturado no disparo, resolvido contra a defesa física do alvo no impacto: `max(1, floor(Poder × 1,6 − DEF efetiva × 0,30))`. Grilhões não causa dano.

## Voo, colisão e explosão

O projétil começa no jogador e mantém a direção inicial, mesmo após movimentação do jogador/alvo ou troca da seleção. O movimento é dividido em trechos de até 8 px e a interseção com inimigos é calculada ao longo do segmento: acerta o primeiro contato, sem atravessar alvos por queda de FPS. Colisão do mapa também encerra o percurso. Nunca percorre mais de 256 px.

Explosão de Cera: loop dos primeiros quatro quadros; ao atingir inimigo, obstáculo ou limite, troca para os cinco quadros finais. O dano acontece uma única vez na transição, em todos os inimigos vivos até 64 px, com linha de visão. Duração do encerramento: 415 ms. O projétil é removido ao fim, sem repetir o dano.

## Grilhões e contagem dos frames

A contagem solicitada **8,9,10,11,12** é humana, iniciando em 1. O JSON tem 13 frames numerados 0–12:

- Voo: quadros 1–7, índices 0–6, em loop.
- Root: quadros 8–12, índices 7–11, exclusivamente, em loop de 500 ms.
- Libertação: quadro 13, índice 12, por 100 ms, com fade de opacidade antes de remover o VFX.

No primeiro inimigo atingido, `isRooted` torna-se verdadeiro por **3 segundos do relógio de simulação**. O efeito acompanha o alvo. O root bloqueia perseguição, patrulha e deslocamentos forçados pela navegação, incluindo empurrões; não silencia ataques nem pausa seus relógios. Expirar restaura o movimento imediatamente, enquanto o último quadro termina. Alvo morto remove o VFX; tiro perdido executa apenas o encerramento, sem criar root. Nova sessão/mapa ou reload descarta projéteis/status transitórios e mantém as recargas persistentes.

## Arquivos e backend

- `doru-system.js`: fases, colisão por segmento, raio de explosão, root e renderização. `doru-data.js` embute regras/frames para abrir HTML diretamente sem fetch.
- `assets/akuma/doru/`: regras, sete anexos e hashes. `tools/import_doru_assets.py` importa uma pasta fornecida por argumento, sem caminhos pessoais registrados. Atributos Git preservam bytes dos JSONs no Windows.
- `game.js`: disparo, dano no impacto, bloqueio real da navegação e sincronização opcional com a API. `index.html`/`ui-preview.html` carregam os mesmos scripts; `tools/build_pages.py` inclui ambos.
- `server/akuma.py`: cadastro, validações, custo/recarga e um identificador único de projétil. `/api/akuma/doru-impact` resolve o impacto uma vez, validando proprietário, trajetória, limite e alvo; `/api/akuma/doru-movement` informa o root por jogador/instância/inimigo. Projéteis e raízes da API são transitórios, com expiração e limpeza.

O protótipo mantém a simulação de mapa e vida dos monstros no cliente. A API recebe as posições/atributos e os inimigos com linha de visão informados pelo cliente, como nas demais frutas. Não é combate multiplayer autoritativo; o cliente aplica o resultado imediatamente e não duplica o dano ao receber a confirmação da API.

## Verificação

- `node tests/doru-system.test.cjs`: catálogo, fases exatas, colisão contínua, primeiro contato, dano único, limite, obstáculos, root e navegação real.
- `python tests/doru_backend_test.py`: custos, recargas independentes, explosão por impacto único, root de 3 s, validação de proprietário e trajetória.
- `python tests/doru_artwork_test.py`: hashes dos sete anexos, nove quadros da explosão e treze dos Grilhões.
- `node tests/doru_browser.cjs`: registro, equipamento/HUD, voo/impacto, AoE, root sem dano/stun, bloqueio/liberação de movimento, limite, limpeza e reload. Aceita `MARE_TEST_URL`, `MARE_TEST_WIDTH`, `MARE_EXPECT_API=1` e `MARE_QA_DIR` externo ao Git.

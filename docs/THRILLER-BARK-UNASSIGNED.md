# Thriller Bark: recursos aprovados e histórico da preparação

**Estado atual:** Gecko Moria integra a masmorra de nível 110; Absalom, Perona, Ryuma e Oars integram os quatro destinos de Thriller Bark. Veja [Enies Lobby](ENIES-LOBBY.md) e [regiões 114–180](LATE-ARCHIPELAGO.md). O texto abaixo registra a preparação anterior à ativação dos encontros.

## Registro da preparação original, anterior à atribuição de Moria


Os cinco perfis ficam em `thriller-monsters.js`, fora dos catálogos ativos de mapas, spawns, masmorras, contratos, Impel Down e recompensas. Nenhum XP, Berry, baú ou saque é concedido. Gecko Moria usa perfil de chefe, mas não abre masmorra ou rotação.

| Monstro | Nível | PV | Ataque | Def. física | Def. mágica | XP nominal |
|---|---:|---:|---:|---:|---:|---:|
| Absalom | 114 | 219.449 | 6.705 | 2.560 | 286 | 26.000 |
| Perona | 118 | 248.553 | 7.440 | 2.807 | 308 | 28.000 |
| Ryuma | 122 | 281.547 | 8.256 | 3.080 | 334 | 30.000 |
| Oars | 127 | 329.060 | 9.407 | 3.458 | 368 | 32.600 |
| Gecko Moria | 110 | 161.606 | 4.573 | 3.114 | 1.161 | 0 |

Os quatro comuns seguem a curva atenuada a partir de Kaku 110 (referência de calibragem, sem dependência de código), com XP arredondado pela curva de nível. Moria segue a curva separada de chefe de Crocodile 90 e Rob Lucci 100. Nesta curva, Lucci tem 138.274 PV, 4.154 ataque, 2.835 defesa física e 1.053 defesa mágica. Não confundir a curva de chefe com a de monstros comuns mais avançados.

As 80 tiras PNG são artes geradas e aprovadas para o projeto, copiadas byte a byte dos três ZIPs de Thriller Bark. O registro `thriller-sprites.js` documenta o arquivo de origem e os hashes. Repouso, caminhada, dano e ataque têm quatro quadros por direção e Oeste espelhado de Leste. Células/Pivôs: 128×128 (64,108), Gecko Moria 192×192 (96,162), Oars 256×256 (128,220). Os tamanhos renderizados alvo são 108/102/110/216/154 px respectivamente para Absalom/Perona/Ryuma/Oars/Moria. Não há pré-carregamento de sprites no jogo normal.

Validação: `node --test tests/thriller-unassigned.test.cjs`; build local de Pages com `python tools/build_pages.py --static-demo`; smoke em Chromium com `MARE_TEST_URL=http://127.0.0.1:8165/dist/ node tests/thriller-browser.cjs` em servidor estático local. Sem encontro ativo para verificar combate jogável.

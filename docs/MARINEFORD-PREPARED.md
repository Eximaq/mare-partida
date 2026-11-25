# Marineford: perfis e artes sem encontros

Seis monstros comuns preparados, sem vínculo com mapa, spawn, rotação, masmorra, Impel Down, missão, saque ou recompensa. Nenhum XP ou Berry é concedido. Os valores nominais extrapolam a curva de monstros comuns a partir de X Drake 146; não são atributos de chefes.

| Monstro | Nível | PV | Ataque | Defesa física | Defesa mágica | XP nominal |
|---|---:|---:|---:|---:|---:|---:|
| Squard | 151 | 696.887 | 17.651 | 6.064 | 589 | 46.900 |
| Onigumo | 156 | 815.064 | 20.137 | 6.824 | 649 | 50.200 |
| Little Oars Jr. | 161 | 953.372 | 22.976 | 7.679 | 716 | 53.600 |
| Izo | 166 | 1.115.228 | 26.221 | 8.647 | 791 | 57.200 |
| Vista | 171 | 1.304.655 | 29.929 | 9.737 | 871 | 60.900 |
| Jozu | 176 | 1.526.357 | 34.165 | 10.968 | 961 | 64.700 |

As 96 tiras RGBA foram copiadas sem recompressão dos pacotes aprovados. Repouso, caminhada, ataque e dano têm quatro quadros em Sul/Norte/Leste/Oeste; Oeste reflete Leste na âncora. Sul permanece byte por byte idêntico à prévia. As células são 192×192 com âncora (96,166), exceto Little Oars Jr., 256×256 com âncora (128,220). Seu ID é `little-oars-jr`; não substitui Oars de Thriller Bark.

As artes usam o renderizador de monstros existente, sem carregar imagens no startup. A validação em canvas isolado não habilita uma batalha jogável.

Valide com `node --test tests/marineford-prepared.test.cjs`. Para o teste da página real, faça `python tools/build_pages.py --static-demo`, sirva a página local e execute `MARE_TEST_URL=http://127.0.0.1:8165/dist/ node tests/marineford-browser.cjs`.

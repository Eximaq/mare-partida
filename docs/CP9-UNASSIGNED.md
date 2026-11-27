# CP9: recursos e integração

**Atualização de 26/11/2026:** os cinco monstros comuns foram atribuídos aos destinos de Enies Lobby e Rob Lucci à masmorra de nível 100. O XP nominal dos comuns agora é usado nas caçadas; a recompensa da masmorra de Lucci continua indefinida. Veja [Enies Lobby](ENIES-LOBBY.md) para o estado atual.

## Registro da preparação original, anterior à atribuição

- Perfis disponíveis em `cp9-monsters.js`, sem mapa, viagem, rotação, masmorra, contrato, saque ou recompensa novos. Fukurou 97, Rob Lucci 100, Kalifa 101, Jabra 104, Blueno 107 e Kaku 110. O XP nominal dos cinco comuns é referência para rebalanceamento; o XP concedido continua zero.
- Os arquivos são artes geradas e aprovadas para este projeto, importadas dos três ZIPs entregues ao proprietário. `cp9-sprites.js` guarda os hashes do ZIP e de cada tira. Centro dos pés (64,108), quatro quadros 128×128 por ação/direção, Oeste refletido de Leste e danos direcionais. Alturas visuais de 98 a 126 px; valor de referência dos sacerdotes de Skypiea no renderizador normal: 120 px.
- O renderizador comum usa um curto quadro de reação humana ao primeiro dano positivo antes de trocar para o híbrido de Kaku, Jabra ou Lucci. Desengajar, voltar à origem ou morrer limpa esse estado visual por instância. A forma inicial não falsifica um ataque humano. A ausência de encontros impede combate real com o jogador neste PR.
- Referência de Lucci: planilha fornecida `Kaizoku_Idle_Relatorio_de_Monstros.xlsx`, aba **Masmorra de Chefes**, linha 13. Crocodile, nível 90: 116.730 PV, 3.744 ataque, 2.547 defesa física, 945 defesa mágica. Usando a mesma curva de atributos de masmorra e extrapolando os atributos-base de nível 90 a 100, Lucci: **138.274 PV, 4.154 ataque, 2.835 defesa física e 1.053 defesa mágica**. Base de cálculo: 10.215 PV, 226 ataque, 117 defesa. Sem XP, Berry, baú ou elegibilidade no jogo.
- Fora dos catálogos ativos e sem alterações nos hashes de regras de mundo/batalha. Validar via `node --test tests/cp9-unassigned.test.cjs` e, com um build estático local e Playwright, `MARE_TEST_URL=http://127.0.0.1:8165/dist/ node tests/cp9-browser.cjs`.

## Progressão dos monstros comuns

Referência: aba **Skypiea PR 375**, linha 7, Ohm nível 95 (121.646 PV, 4.099 ataque, 1.655 defesa física, 197 defesa mágica e 18.596 XP por abate). A base progride a metade do crescimento geométrico observado por nível entre Satori 77 e Ohm 95, passa pela fórmula padrão de atributos e usa a curva de XP de nível para evitar acelerar os abates por nível. Os valores nominais não são recompensas ativas.

| Monstro | Nível | PV | Ataque | Def. física | Def. mágica | XP nominal |
|---|---:|---:|---:|---:|---:|---:|
| Fukurou | 97 | 129.420 | 4.316 | 1.732 | 205 | 19.100 |
| Kalifa | 101 | 146.519 | 4.787 | 1.898 | 221 | 20.800 |
| Jabra | 104 | 160.812 | 5.171 | 2.034 | 235 | 21.900 |
| Blueno | 107 | 176.519 | 5.591 | 2.179 | 248 | 23.000 |
| Kaku | 110 | 193.773 | 6.044 | 2.334 | 264 | 24.100 |

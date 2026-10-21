# Ilha dos Animais Raros e Cocox

- Entrada: nível 31; Cocox é o primeiro encontro da ilha, fixo no nível 35. Não há chefe nesta entrega.
- Mapa: 32 × 32 células de 64 × 64 pixels (2048 × 2048). As trilhas ligam o cais a três clareiras, com árvores em grupos irregulares, arbustos e rochas. As rotas e o retorno ao porto passam pela navegação existente.
- Terreno: água e árvore do acervo Dawn. Grama e areia são recortes **nativos de 64 × 64** do mapa Dawn já aprovado; coordenadas e origem estão em `assets/rare-animals/provenance.json`. Nenhum tile de 32 × 32 é utilizado.
- Cocox: as animações idle, corrida e mordida/investida foram extraídas do personagem PixelLab `71a074a4-26d7-4f04-9be5-a1dd05fdf3c3` já existente. As folhas preservam os frames originais sem redimensioná-los; cada direção é uma linha (sul, oeste, leste, norte). Não houve geração nova do monstro.
- Balanceamento: 1180 HP, 106 ataque físico, 39 defesa física, 12 defesa mágica, velocidade 82, ataque a cada 1,35 s, alcance 56 e agressão a 370 px. O HP equivale a aproximadamente 4–5 ataques básicos de uma build física de nível 35 com cerca de 250–300 de dano após defesa. Builds sem distribuição dos pontos ou armas apropriadas levam mais tempo.
- Persistência: `data/monsters.json` alimenta a tabela `monster_catalog` do backend Python, consultável em `GET /api/monsters/catalog`. O cliente estático usa o mesmo perfil em `hunt-system.js`; o teste de integração confere a igualdade dos valores.
- A caçada usa a simulação existente no navegador, inclusive no GitHub Pages. O catálogo Python persiste a definição do monstro; a autoridade de combate compartilhada não faz parte da arquitetura atual.

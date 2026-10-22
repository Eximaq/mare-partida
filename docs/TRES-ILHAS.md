# Ilha dos Animais Raros, Vila Syrup e Baratie

Os três mapas vieram da biblioteca PixelLab existente, exportados em recortes nativos de 64×64 e montados localmente. Nenhum comando de geração foi enviado. Os arquivos de terreno e objetos são PNGs de fundo com grade de IDs em `new-islands-data.js`; a navegação usa essa grade. A parte vazia ao sul da Ilha dos Animais Raros foi omitida da área jogável.

As posições dos objetos visíveis foram lidas do mapa original e guardadas em `new-islands-objects.js`. A engine cria colisores compactos junto à base de árvores, casas, mesas, bancadas, barris e demais objetos; entradas e corredores permanecem livres. Colisores são usados tanto pelo jogador quanto pelos monstros e pelo cálculo de rotas. Objetos sem imagem armazenada na origem foram ignorados porque não aparecem no mapa.

- Ilha dos Animais Raros: entrada Nv.16; Cocox Nv.18. O respawn é inferido exclusivamente em tile de madeira `e/i` do píer. A patrulha usa quatro setores no bosque.
- Vila Syrup: entrada Nv.21; Sham e Buchi Nv.23. O respawn é calculado na faixa mais ao sul da estrada de areia `u`; quatro setores distribuem a patrulha.
- Baratie: entrada Nv.26; Pearl e Gin Nv.28. O respawn fica no salão sul, em piso de madeira `c`; quatro setores conectam entrada, salão, convés e cozinha. Paredes `p` e vazios não são navegáveis.

O catálogo de monstros Python parte dos atributos do Cocox: HP ×1,065, ataque ×1,055, defesa física ×1,05 e defesa mágica ×1,04 por nível acima de 18, com os multiplicadores individuais em `data/monsters.json`. O cliente lê o catálogo resolvido em `monster-catalog.js`; o teste confere equivalência exata. O combate no preview estático continua simulado no navegador, sem autoridade de servidor para dano e respawn.

Animações originais de idle, movimento e ataque: `assets/new-islands/{sham,buchi,pearl,gin}/`. Os arquivos foram empacotados em folhas direcionais mantendo os pixels originais. Metadados de origem: `assets/new-islands/provenance.json`. O tamanho visual padrão para novos monstros é **80 px no maior eixo** (25% acima do personagem de 64 px); os quadros fonte permanecem intactos. Novas integrações usam `DEFAULT_MONSTER_RENDER_SIZE` em `new-islands-art.js`, mantendo os pés no mesmo ponto do chão em todos os quadros e posicionando a barra de vida acima do limite superior calculado. Cocox, Dawn e Orange Town usam o mesmo padrão.

Validação: `node --test tests/new-islands.test.cjs tests/rare-world.test.cjs tests/archipelago.test.cjs`, demais suítes Node pertinentes, navegação visual no navegador e `python tools/build_pages.py`.

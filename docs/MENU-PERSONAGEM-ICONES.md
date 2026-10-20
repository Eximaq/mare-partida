# Ícones do menu Personagem — 20/10/2026

Talentos, Conquistas e Akuma no Mi passam de símbolos de fonte para PNGs PixelLab nativos 24×24 com transparência. Personagem e Haki mantêm os ícones anteriores. Nenhuma alteração de layout, regras, catálogo de frutas ou save.

## Origem

- MCP `create_image_pixen`, três chamadas aprovadas, cobrança informada de 1 geração cada: **3 gerações consumidas**, sem retries.
- Cada chamada: `width:24`, `height:24`, `no_background:true`, `detail:low detail`, `outline:single color black outline`, `view:side`; seed omitido e nenhuma imagem de referência enviada.
- Prompts elaborados pelo agente, apresentados e aprovados pelo proprietário. Arquivos originais copiados sem redimensionamento ou pintura para `assets/ui/character-menu/`.
- Originais, manifest e receita reproduzível em `pixellab-pip-generations/menu-personagem-20261020/` (fora do Git); a folha local 72×24 é uma montagem transparente dos pixels originais.

### talents

`description`: “Bronze branching talent tree with three glowing emerald nodes, nautical RPG menu icon, chunky crisp pixels, simple stepped shading.”

Tradução: Árvore de talentos de bronze com três nós esmeralda, pixels definidos e sombreamento simples.

Job: `a315c2ad-031b-48af-b1eb-2ff6dc76ea0d`; asset: `9c636ee9-2785-54eb-98b5-52df8b4a7a74`.

SHA-256: `4956be15fb34bc2475da9b8ead1f7adc6b6e5704c909288f64dd820c9b9c0679`.

### achievements

`description`: “Golden trophy with small laurel branches and a red ribbon, nautical RPG menu icon, chunky crisp pixels, simple stepped shading.”

Tradução: Troféu dourado com louros e fita vermelha, no mesmo acabamento.

Job: `9ae9463b-335d-4d6b-ad8b-75b5333b7b24`; asset: `11c8dad6-660b-5cde-9176-01016b70fae3`.

SHA-256: `42193a8c649c62c140e7049e8bfd5facc0a146f47f715c7de91d3c237070c453`.

### akuma

`description`: “Purple magical fruit covered in spiral patterns with a curled green stem, nautical RPG menu icon, chunky crisp pixels, simple stepped shading.”

Tradução: Fruta roxa com espirais e caule verde curvado.

Job: `a0379477-7e46-44bf-9047-19e16bff8c26`; asset: `51136f7f-c700-5d68-bc61-556c7ee062e0`.

SHA-256: `7d7f8d6d92d468a93983b14b2c26735b59dbfe80e166e117d6f0cceb742b28b0`.

## Integração e validação

Somente os três glifos do submenu em `index.html` foram substituídos. O CSS compartilhado já exibe imagens do menu em 24×24 com `image-rendering:pixelated`; os nomes acessíveis continuam no texto dos botões. O build copia a pasta `assets` por caminhos relativos. Conferir as cinco opções por mouse/teclado e os PNGs no build antes do merge.

Validação realizada: suítes Node `character-quick-menu` e `ui-system` aprovadas; build Pages aprovado e cópias dos três PNGs idênticas. Chromium nas sete resoluções (1920, 1366, 1280, 1024, 393, 360 e 320 de largura): cinco imagens carregadas, novas imagens nativas/exibidas 24×24 pixelated, menu dentro da viewport, teclado/mouse e progresso preservados. Sem erros JavaScript observados. O catálogo de Akuma depende do backend e manteve uma requisição pendente no preview estático; a checagem aguardou explicitamente as imagens e validou a navegação, sem afirmar disponibilidade dessa API.

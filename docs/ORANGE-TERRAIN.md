# Orange Town — terreno orgânico (20/10/2026)

## Antes
`orange-renderer.js` desenhava sempre a mesma quadrícula de 32 px da grama e o mesmo tile de 64 px das ruas. Não existia uma camada de transições ou decoração. As fronteiras de grama, rua e areia acompanhavam exatamente as células de 64 px.

## Agora
`orange-terrain.js` é um compositor visual **independente da física do mapa**.

1. **Subcamadas, em ordem**: água → areia (toda terra) → grama (grama e ruas) → calçamento (ruas) → madeira (piers). A vegetação fica visível nas bordas gastas do calçamento.
2. **Autotiling de oito vizinhos**: máscaras N/E/S/W + diagonais para decidir quando alterar os contornos. Bordas pixeladas variam em passos de 4 px a cada 8 px; diagonais ausentes criam recortes nos cantos internos. Não há blur nem gradientes.
3. **Texturas**: reutiliza os tilesets PixelLab de grama/areia e o sprite de calçamento atual; os recortes são espelhados deterministicamente a partir das coordenadas. A variação não depende de câmera ou de sorteios por frame.
4. **Decoração**: pequenos tufos, flores, folhas, pedras, conchas e desgaste no chão. O tipo e a densidade são escolhidos de acordo com o material da célula; nenhum elemento decorativo altera colisões.
5. **Litoral**: recortes de areia sobre a água e espuma animada nas células costeiras quando os efeitos não estão reduzidos.
6. **Performance**: o compositor é executado somente durante o preenchimento do cache de chunks de 512 px. Os chunks continuam limitados a 20 entradas, com invalidação quando texturas chegam.

A geometria, dimensões (32×32 células de 64 px), NPCs, monstros, rotas, colisões, locais de spawn, save e economia permanecem idênticos.

## Testes
- `node tests/orange-world.test.cjs` mantém navegação, câmera e colisões.
- `node tests/orange-terrain.test.cjs` confere máscara de oito vizinhos, contornos pixelados, variabilidade determinística, renderização por chunks, câmera, ordem dos scripts e integridade do mapa.
- `python3 tools/build_pages.py` precisa incluir `orange-terrain.js`.
- A workflow `Orange Town — comparação visual` renderiza duas versões da mesma câmera, usando um navegador real, e disponibiliza PNGs lado a lado para **rua, praça e cais** como artefatos do PR.

### Executar comparador visual localmente
```bash
python3 -m http.server 8765
# Acesse http://localhost:8765/tools/orange-terrain-qa.html?view=praca
# Também há view=rua e view=cais
```

Para exportar PNGs localmente, instale o Playwright e Chromium e execute `node tools/capture-orange.mjs` com o servidor ligado.

## Limites e próximos ajustes artísticos
- **Não foram consumidos créditos PixelLab nem criados sprites inéditos**: o compositor usa os tilesets PixelLab que já existiam. Isso permite demonstrar primeiro as transições e evitar aquisição de assets sem revisão da estética.
- O acabamento final do calçamento dependerá da aprovação das três capturas. Se for necessário produzir variantes artesanais de calçada quebrada, vegetação rasteira ou costa, substituir somente os elementos do compositor, sem reescrever física/colisão.
- Verificar especialmente cantos costeiros, caminhos estreitos entre casas, textura em 100% e 200% de zoom, o número de chunks após percorrer o mapa e a legibilidade dos inimigos sobre o piso.
- O teste visual compara o **terreno isolado**. Ainda é recomendável uma validação manual da cena completa do jogo (HUD, monstros, NPCs e estruturas) antes de integrar a PR.

**Este PR não deve ser mesclado automaticamente à `main`.**

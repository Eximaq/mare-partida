# HUD náutica v2

## Direção solicitada em 04/11/2026

Reconstruir a composição da HUD conforme a referência do proprietário: azul-marinho,
cordas douradas, metal, emblema à esquerda, barras largas, localização central,
menu superior, canal à esquerda e expedição à direita. Ícones proporcionais;
reaproveitar os existentes quando combinarem. Janelas continuam com o visual
atual, aguardando aprovação da HUD antes de qualquer redesign de seus interiores.

Esta solicitação substitui as restrições históricas de manter a geometria da HUD
e usar apenas materiais existentes. Não transforma a aprovação do PR anterior
em aprovação visual desta composição. Merge permanece dependente do proprietário.

## Sistema visual

- Primitivos: navy `#04131d`, `#071e2b`, `#123545`; brass `#edc77c`, `#bc8840`;
  ivory `#fff1d2`. Superfícies opacas para separar leitura e cenário.
- Semânticos: `--hud-surface`, `--hud-text`, `--hud-muted`, `--hud-line`.
- Componentes: `--hud-edge`, `--hud-profile`, `--hud-chat`, `--hud-side`;
  medidas explícitas por composição, sem escala global que diminua os textos.
- Georgia nos títulos; Alegreya Sans nos controles e números. Títulos principais
  20–22 px, valores de recursos 14–16 px, nível 26 px. Títulos longos quebram linha.
- Espaçamento de 8/12/16/24 px, com 6/7/10 px nos detalhes internos de barras.
  Ícones do menu 30–32 px dentro de alvos de 44–48 px.
- Moldura de corda em nove fatias. Faixas usam o centro do PNG transparente.
  Leme é ornamento da hotbar, sem alvo interativo. Origem e hashes em
  `assets/ui/hud-nautical-v2/manifest.json` (três gerações, PNGs originais).

## Implementação e limites

`hud-nautical.css` carrega por último e possui a composição da HUD.
`gameplay-harmony.css` mantém apenas os acabamentos anteriores das janelas.
`index.html` e `ui-preview.html` compartilham a estrutura nova e os mesmos scripts.
IDs, listeners, dados, saves, regras de combate, posição dos NPCs e renderização
do mundo permanecem nos sistemas existentes. O cartaz continua funcional.

Desktop usa três âncoras inferiores independentes. Tablets colocam a localização
sob o menu e reservam a faixa inferior para habilidades. Smartphones usam menu
horizontal, diário recolhível e canal sob demanda. Não há trabalho dedicado a
320×568 ou 568×320; o contrato desta revisão cobre smartphones atuais a partir de
390 CSS px em retrato e 844×390 em paisagem, além de tablets e desktops.

As verificações visuais com todas as habilidades forçam somente a apresentação
dos slots de terceira habilidade/transformação/Haki. Regras de desbloqueio e uso
continuam cobertas pelos testes de gameplay; essa fixture não concede habilidades
nem é incluída no jogo publicado.

## Validação

- `npm test`: suítes Node de fundação e legado.
- `python tests/hud_nautical_browser.py`: composição, fontes mínimas, limites,
  ausência de sobreposição, alvos de ação e capturas em nove resoluções,
  com canal aberto, diário expandido na horizontal, todos os slots e combate (21 estados).
- `node tests/character_hud_browser.cjs`: 32 títulos canônicos, barras reais,
  cartaz, aparência, teclado, toque, movimento reduzido e recarga do save.
- `node tests/gameplay_harmony_controls_browser.cjs`: menus, notas locais,
  atalhos, pausa/retomada, eficiência e diário recolhível.
- `node tests/main-menu-reachability-browser.cjs`: cliques reais nos quatro menus.
- `python tests/hud_responsive_browser.py`: acesso às 16 janelas existentes,
  preservação de progresso e HUD durante combate em sete resoluções.
- `python tools/build_pages.py`: pacote estático com caminhos relativos.

Capturas e fixtures ficam em `tmp/`, ignorado pelo Git. A comparação histórica
que exigia geometria idêntica à base foi substituída no CI pelo contrato acima:
igualdade de pixels impediria o redesign expressamente solicitado.

Resultado local em 04/11/2026: 223 testes de fundação e 152/152 arquivos Node de
legado passaram. Também passaram os 21 estados da composição no pacote `dist`,
a regressão de personagem em oito resoluções, os controles, a navegação dos
menus e as 16 janelas em sete resoluções. O build estático foi gerado. Esta
validação funcional não substitui a aprovação visual do proprietário.

O teste de Dawn também passou após preservar os comandos de caça no diário
recolhido: cinco resoluções atuais, sete rotas, pausa/retomada, chefe, recompensa,
recarga e fidelidade dos pixels do mapa. Em smartphones, a linha redundante de
próximo nível do XP/h fica oculta; a barra XP do perfil continua mostrando o valor.

CI: os jobs rankA/rankS encontraram a inconsistência preexistente de
`tests/sprite_combat_v2_assets_test.py:12`: espera 26 conjuntos não-dungeon,
mas a própria base `25cd9d05` já contém 27 arquivos de metadados nessa categoria.
Esta revisão não altera os sprites nem esse contrato; a pendência está registrada
no PR, sem declarar que o CI completo está verde.

## Aprovação e preparação da publicação

O proprietário aprovou merge e publicação. A branch foi integrada à `main`
`d1e05694`, preservando os novos materiais e armas. Essa atualização da base já
corrige a contagem histórica de sprites: a validação de 8.327 frames em 36
personagens passou. Conchas passa a testar 412×915 no lugar de 320×568, conforme
o escopo de telas aprovado, mantendo as verificações de mapa, rotas e saves.

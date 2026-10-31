> Registro histórico. A [sprint HUD HD](HUD-HD-HIERARCHY.md) substitui a composição abaixo: nome/retrato apenas no cartaz, Bounty vazia e hierarquia acima do HP.

# HUD de personagem — cartaz de pergaminho

Atualização solicitada em 31/10/2026. Branch feature/character-parchment-hud, base 132b54f (PR163 já incorporado).

## Comportamento

O perfil superior esquerdo utiliza o painel fornecido pelo proprietário: HP vermelho, energia violeta, XP dourado, nível, poder e dobrões reais. Os preenchimentos desenhados na arte são cobertos por trilhos dinâmicos dentro das molduras, evitando uma barra estática atrás do valor atual. Os mesmos IDs e fórmulas do jogo atualizam os valores e as informações acessíveis dos medidores.

O botão de seta expande um cartaz com o retrato e o nome atuais. O cartaz é uma divulgação não modal: não pausa a partida nem desloca os demais widgets. Em telas pequenas recebe rolagem própria. Escape, botão Recolher cartaz, clique fora e transições de cena o recolhem; Escape e o botão devolvem o foco ao acionador. O retrato compacto continua abrindo os atributos.

Bounty permanece **0**, por orientação expressa do proprietário. O campo mostra Recompensa · Em breve, sem cálculo por moedas, abates, hierarquia ou eventos; nenhum sistema de recompensas foi implementado.

## Fonte e arte

Sete PNGs do pacote Pirate_status_panel_Wanted_poster.zip e o arquivo Alabasta_Pirate.ttf foram preservados byte a byte em assets/ui/character-hud. Origem, nomes de entrada e SHA-256 estão no manifesto dessa pasta. O painel e o cartaz originais permanecem inalterados; a composição é feita por HTML/CSS, com texto e controles reais. Não houve geração de arte ou consumo PixelLab.

Alabasta Pirate local, peso Bold/700, carregamento swap e preload, aplicada aos nomes do perfil e do cartaz. O tamanho do nome adapta-se ao espaço disponível; nomes muito longos conservam o texto completo no atributo title. O arquivo fornecido contém letras latinas básicas e pontuação, sem glifos acentuados: Alegreya Sans fornece esses caracteres, preservando o nome original e os acentos. Números, classe e demais textos mantêm a fonte de leitura existente.

O retrato expandido copia o canvas atual de 72px, com nearest-neighbor, sem criar outro renderizador. Mudanças de aparência, equipamentos, capacete e transformações continuam no caminho compartilhado de renderPortrait. O canvas extra só é desenhado quando o cartaz está aberto.

## Arquivos e compatibilidade

- character-hud.js: divulgação, nome, retrato compartilhado e acessibilidade dos recursos.
- index.html e ui-preview.html: mesma estrutura de perfil e carregamento local da fonte.
- ui-hud.css e ui-responsive.css: composição isolada em .parchment-profile, sem mudar o tema dos outros painéis.
- game.js: três integrações de apresentação no retrato, updateMiniHud e transição de cena; removido o glifo de moeda redundante junto ao ícone desenhado.
- tools/build_pages.py: inclui o módulo no pacote com versão de conteúdo; assets são copiados pelo fluxo existente.
- tests/character_hud_browser.cjs e .github/workflows/character-hud.yml: validação reprodutível no pacote estático.

Nenhuma migração de save, alteração de chave, fórmula, equipamento, sprite, mapa, combate ou catálogo. A preferência de abrir o cartaz é temporária e volta recolhida ao carregar. Rollback: reverter os commits desta branch, preservando o save existente.

## Validação

Resultados finais locais: **218/218 testes Node e 144/144 testes Python aprovados**. Build estático concluído. A suíte da HUD passou na distribuição, incluindo toque e movimento reduzido.

Navegador Chromium: oito viewports (1920×1080, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568 e 844×390), preenchimentos 0/25/100%, XP, fonte, acentos, nomes como texto, recompensa zero mesmo com moedas alteradas, retrato, foco/teclado/clique externo, atributos, Haki, transição e persistência. Execução no código fonte e na distribuição gerada; sem erros JavaScript ou assets ausentes. Chat em paisagem baixa conserva sua regra existente de ocultar o perfil enquanto aberto. No celular, o relógio recolhe temporariamente com o chat para não cobrir seu controle. A expedição expandida tem altura limitada e rolagem própria, mantendo Rota & recompensas acima da navegação inferior mesmo em 320×568.

Testes comprovados em vermelho/verde: divulgação inexistente, nome cortado no celular, transição sem recolhimento, cartaz abaixo da navegação e botão de rotas encoberto na tela de 320px. O CI detectou a última regressão nos testes Dawn/Conchas; o ajuste foi verificado no navegador da HUD e nesses consumidores. As capturas atuais e bancos de teste ficam fora do repositório na pasta privada Sprint-Character-HUD. Captura adicional em execução normal: hud-live-expanded.png, 31/10/2026. Limite: validação de navegador em Chromium; não houve teste físico em todos os aparelhos.

Pendência deliberada: sistema de Bounty. Próximo escopo opcional: somente quando houver regras de produto para recompensa, conectar esse campo mantendo-o separado das moedas.

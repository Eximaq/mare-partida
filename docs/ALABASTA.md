# Deserto de Alabasta

28/10/2026. Região Alabasta disponível, entrada no nível40, recomendação40–50, sem limite superior de entrada. IDs antigos e saves preservados.

Mapa original PixelLab Alabasta mapa1, a6da583d-86dc-443e-becc-d5f2457e3bab:81×72 células64,5184×4608px. Importação de36 recortes nativos, sem geração ou alteração de pixels. Os111 objetos válidos foram preservados; nove máscaras novas e duas existentes são usadas no Y-sorting. Somente o alpha original dos objetos pode ocluir atores; chão não é copiado no primeiro plano.

Terreno2 Sand walls, typical of the Egyptian pyramids e transições a/o são sólidos, inclusive quinas com margem4px. Água/exterior têm varredura contínua de pés e deixam tiros passar; muros e construções altas bloqueiam tiros. Cinco setores de combate e retorno ao porto:12/12 trajetos,um componente transitável.

Bananawani:nível45,4244HP,212ATQ,89DEF física,25DEF mágica,velocidade68,alcance72,intervalo1,7s. Usa crescimento existente desde Cocox, com multiplicadores1,25/1,04/1,08/1,1. XP/ouro/loot seguem as regras atuais; nenhum chefe ou prêmio único inventado. Catálogo compartilhado Python/JS atualizado.

Arte original:f41faf53-de02-481a-b594-76c0c1b88380. Quatro direções,4 poses idle,16 de caminhada e36 de mordida. As telas originais80/104/112 foram alinhadas por transparência em112×112,sem redimensionar pixels. Renderização168×168, aumento final de50% solicitado pelo proprietário, constante em todos os estados e sem ampliar a pegada física. Atlas e frames.json registram origem, hashes e transformação.

Validação:tests/alabasta-world.test.cjs,tests/alabasta_browser.cjs,tests/monsters_backend_test.py,suíte Node completa,auditoria de navegação e build Pages. Navegador verifica gate39/40,atributos fixos,24 colisões com jogador/monstro,80 máscaras e429844 pixels transparentes,20 abates reais com XP/ouro,retorno e reload. Capturas desktop/móvel ficam em diretório temporário fora do Git.

Limite conhecido do ambiente:servidor HTTP local padrão sofreu falhas intermitentes de carregamento sob concorrência; validação final usa HTTP1.1 com fila ampliada, sem modificar o jogo para ocultar erros.

Principais arquivos:alabasta-map-data.js,alabasta-world.js,assets/alabasta,archipelago.js,hunt-system.js,game.js,world-depth.js,catálogos de monstros,new-islands-art.js e registros HTML/build. Reversão:reverter commit e preservar backup do save; o catálogo permanece append-only e nenhuma chave de save foi alterada. Sem gerações pagas ou merge automático.

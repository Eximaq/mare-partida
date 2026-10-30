# Alubarna 01–05 e Skypiea — 29/10/2026

Branch feature/alubarna-alabasta-maps, base inicial df7aa55 (PR#148 publicado). Candidato para revisão; sem merge/deploy automático.

## Destinos

| Destino | Entrada / faixa | Monstro | Nível | Escala aparente |
|---|---|---|---|---|
| Alubarna 01 | 50 / 50–55 | Puppu | 53 | 110 px |
| Alubarna 02 | 55 / 55–60 | Miss Valentine | 58 | 135 px |
| Alubarna 03 | 60 / 60–65 | Miss Merry Christmas | 63 | 120 px |
| Alubarna 04 | 65 / 65–70 | Miss Double Finger | 68 | 150 px |
| Alubarna 05 | 70 / 70–75 | Mr.1 | 75 | 170 px |

Alabasta mantém o Deserto anterior e acrescenta esses cinco destinos. Skypiea está habilitada com “Novas ilhas em breve”; nenhum destino foi inventado para ela. Não existe limite máximo de nível para visitar uma área já liberada.

O proprietário escolheu expressamente **o mapa completo nos cinco destinos**, autorizando a exceção ao padrão32×32: cada instância usa103×82 tiles64, ou6592×5248px. Imagem e geometria são compartilhadas; não existem cinco PNGs duplicados nem prédios reduzidos. Monstros, abates e respawns têm IDs separados por destino.

## Arte, física e animações

- PNG composto e208 objetos do ZIP Alubarna-export.zip fornecido pelo proprietário. Os208 PNGs foram decodificados e conferidos.
- Mapa copiado byte por byte; hashes e proveniência em assets/alubarna/provenance.json. Sem pintura, espelhamento, interpolação ou geração paga.
- O export não contém as células de terreno. O grid completo do mesmo mapa foi obtido pelo getter PixelLab em três consultas de leitura e salvo em assets/alubarna/terrain.json. O manifesto do ZIP fornece boundingBox e groundBounds exatos dos objetos.
- Água, vazio e paredes não são navegáveis. Paredes e bases sólidas bloqueiam projéteis; água mantém a regra existente de permitir disparos.
- O retângulo automático do portão norte fechava o vão do arco. Uma regressão reproduziu a falta de rota para o palácio. A colisão foi dividida nas duas colunas, mantendo a passagem central e todos os pixels. O teste também confere disparos pelo vão e bloqueio nas colunas.
- Cinco setores e dez spawns fixos por instância:50 pontos novos. Chegada segura, rotas até todos os encontros e avenida do palácio. Patrulha neutra, reação após dano, limite de perseguição e respawn mínimo30s reutilizam as regras existentes.
- Máscaras originais alimentam a profundidade do jogo sem reaplicar retângulos de chão sobre os personagens.

Importação reproduzível: python tools/import_alubarna.py <Alubarna-export.zip>. ZIP e caches locais não entram no commit.

Os cinco monstros foram baixados pelos exports existentes do PixelLab. IDs, hashes dos arquivos e hashes RGBA por frame ficam nos metadados. Idle possui oito poses; caminhada/ataque cobrem as quatro direções do jogo. Hurt usa South em qualquer orientação, como já aprovado, por180ms e quatro quadros nativos.

Contato visual inspecionado, em índice zero: Puppu10, Valentine4, Merry Christmas23, Double Finger6, Mr.1 7. Hurt começa em0,1,2,3,2, respectivamente. Os exports de Puppu/Valentine tinham variantes repetidas para leste/sul; o importador seleciona a mais recente identificada pelo getter, registrada na configuração. Puppu norte tem9frames de caminhada no ZIP; demais caminhadas têm29. Ataques podem ter28/29 e Hurt8/9/29. Valem as contagens reais do export.

Escala proporcional pela maior dimensão opaca do Idle, com nearest-neighbor. A ordem Mr.1 > Double Finger > Valentine > Merry Christmas > Puppu foi conferida nas quatro direções; arredondamento varia até2px. Cabeçalhos acompanham a arte; alcance e colisão lógica permanecem existentes. Atributos novos seguem a progressão de Cocox e ficam sincronizados no JSON, frontend e servidor Python. Comparação semântica confirmou zero mudanças em atributos antigos.

## Validação

- Teste Node falhou antes por destino inexistente; depois passaram cinco grupos: catálogo, níveis/saves, rotas, animações/escalas e arco.
-107 arquivos Node autônomos aprovados. E2E Supa excluído conforme o CI existente.
- monster-behavior.test.cjs conferiu todos os spawns e rotas. hunt-system.test.cjs inclui as cinco faixas novas e preserva as antigas.
- alubarna_browser.cjs passou no fonte e no pacote Pages final: viagens aos cinco destinos, dez monstros corretos por mapa,25 abates por execução com XP/ouro, retorno e reload com os cinco progressos separados. Vinte medidas reais conferem escala, caminhada, ataque, Hurt South e cabeçalhos; desenho não causa dano.
- Alabasta/Skypiea conferidas em1920×1080,1366×768,1280×720 e390×844. Fixtures existem somente na resposta interceptada pelo teste; saves do proprietário não foram acessados.
- sprite_combat_v2_assets_test.py:7.285 frames RGBA preservados,26 conjuntos. Os21 conjuntos anteriores mantêm seus pixels.
- sprite_combat_v2_browser.cjs no dist:1.410 poses,31 chamadas de renderizadores, sete especiais com dano único,20 abates, nove mapas antigos e reload aprovados.
- monsters_backend_test.py: dois testes aprovados.
- Build Pages, paper_doll_pages_test.py, sintaxe JS e diff check aprovados.

Capturas locais e ignoradas pelo Git em docs/evidence-alubarna/ e docs/evidence-alubarna/dist/. monster-scales.png compara os cinco sprites; alubarna-01.png até alubarna-05.png mostram o jogo.

## Compatibilidade e limites

Deserto e oito destinos East Blue preservados. Nenhuma chave de save nem índice de item renomeado; migração acrescenta áreas idempotentemente. Economia antiga, fórmulas de dano e flags Paper Doll preservadas.

A imagem nativa tem34,6MP e é compartilhada, mas sua decodificação ainda custa memória. Chromium/viewports simulados foram usados; sem ensaio prolongado, aparelho físico ou certificação em outros motores. FPS autoral não veio no export. A falha antiga documentada de cadência humana não foi alterada.

Merge e Pages desta atualização exigem aprovação específica após revisão. Rollback por reversão dos commits e rebuild, preservando saves.

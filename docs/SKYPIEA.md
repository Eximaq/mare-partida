# Ilha dos Anjos — Skypiea

Integração de 03/11/2026, sem geração de mapa ou personagem.

- Mapa PixelLab existente: Skypeia 1, ID 12f52cdc-a386-41b3-9da4-def671ad8a99; export nativo 2752 × 2688, tiles 64 px. Catálogo único skypiea-01, primeiro destino de Skypiea, recomendado 75–80 e entrada 75.
- Satori: ea69180d-a29c-4297-9ca3-8a0b7e34d88c, nível 77 normal. Fórmula oficial de server/monsters.py: HP 25469, ataque 1130, defesa física 391, defesa mágica 81. Sem multiplicador de masmorra. Seis encontros alcançáveis.
- Walking e Attack nativos nas quatro direções, incluindo West adicionado pelo proprietário; Hurt frontal existente, conforme política compartilhada de reação. Atlas 88 px sem reamostragem, altura aparente 120 px.
- 26 objetos decorativos de nuvem identificados por UUID de origem, sem colisão de movimento ou projéteis, desenhados à frente dos atores com deslocamento visual suave. Árvores e ruínas mantêm colisão e profundidade.
- A reconstrução do terreno a partir dos tiles nativos coincidiu com os 6.151.518 pixels descobertos do export. Células encobertas usam as transições Wang originais. Por solicitação do proprietário, buracos associados às nuvens receberam o upperTerrain original; dados de navegação e colisão acompanham o preenchimento. assets/skypiea/provenance.json registra os pontos e tiles reparados; terreno original separado. O céu externo permanece não caminhável.
- ambient-weather.js: pool único de 64 partículas, 48 pontos/traços azul-celeste ascendentes em Skypiea e 40 pontos dourados nos mapas de Alabasta. Delta time limitado, três lotes de desenho, densidade adaptativa, suspensão fora dos mapas/quando oculto, respeito à qualidade baixa, movimento reduzido do jogo e preferência do sistema. Sem imagens/requisições por frame; apenas canvas do mundo.
- Única imagem nova: assets/ui/voyage-hd/skypiea-01.png, paisagem ilustrativa gerada com ChatGPT para a HUD; não usada como chão jogável.

## Reimportação

Com Python, Pillow e NumPy: execute tools/import_skypiea.py passando o ZIP original do proprietário e assets/skypiea/terrain-original.json (identidades de terreno do mapa PixelLab). O ZIP não é incluído no repositório. tools/import_satori.py baixa o export público existente do personagem e empacota seus frames sem geração. Não há credenciais nestes scripts.

## Validação executada

- Node: tests/skypiea.test.cjs, archipelago.test.cjs, hunt-system.test.cjs, alubarna.test.cjs, new-islands.test.cjs e world-depth.test.cjs: 14 testes aprovados.
- Chrome local, tests/skypiea_browser.cjs: destino único, trava de nível, entrada, seis Satori nível 77, rotas, quatro facings de Walking/Attack, Hurt, dano, vitória, nuvens transponíveis em movimento à frente, partículas em ambos os ambientes, movimento reduzido, saída e ausência de novas requisições após preload. Sem erro de página ou recurso faltante da sprint. Capturas locais excluídas do Git.
- Amostra local de 180 frames com mapa renderizado, simulação e combate ativos: mediana 16,7 ms, P95 16,8 ms, máximo 16,9 ms. Não é garantia de 60 FPS em outros aparelhos ou carga multiplayer.
- python tools/build_pages.py: concluído com caminhos relativos.

O catálogo confiável de mapas do servidor reconhece o destino e a navegação foi testada isoladamente. Não foi realizada sessão multiplayer contra o servidor do colaborador.

## Compatibilidade de integração

As checagens do PR identificaram consumidores adicionais do catálogo. tools/audit_maps.cjs e o pacote Docker passaram a incluir os dois módulos de Skypiea. Os testes de preservação continuam verificando os hashes dos perfis/monstros anteriores, separados da nova adição. A meta persistida de Cartógrafo permanece em 14, compatível com a migração SQL existente, em vez de crescer implicitamente ao adicionar uma ilha. Mais 11 testes de monstros/navegação, 14 verificações foundation e o arquivo de conquistas/passivas foram aprovados localmente. Docker real depende do CI; não foi executado neste PC.

A migração aditiva 0035_skypiea_catalog.sql promove somente as assinaturas auditadas da versão anterior para as atuais, sem tocar nos demais campos das partidas ou personagens. Identificações desconhecidas continuam bloqueadas. As listas de versões esperadas dos testes de migração incluem a nova etapa, sem reescrever migrações históricas.

Atualização solicitada pelo proprietário: substituição pelo export Skypeia_1-export (1).zip, 2752 × 2752, com caminho de ruínas e 26 nuvens móveis preservadas. Partículas ampliadas para 56 em Skypiea e 48 em Alabasta: pontos luminosos contornados e traços de vento mais claros, sem ocupar a HUD. Conferência visual rápida; sem nova rodada extensa de testes, conforme solicitado.

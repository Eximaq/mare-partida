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

Entrega após o merge do PR #234: atualização isolada em nova branch. A migração 0035 mesclada foi preservada integralmente; a nova 0036 promove apenas a identificação conhecida do mapa anterior para o novo export. Sem nova bateria extensa de testes, conforme solicitação do proprietário.

## Expansão: quatro Ilhas dos Anjos

A edição do proprietário `Skypiea.zip` substitui o cenário da rota `skypiea-01` e é reutilizada em três mapas independentes, com chegadas, setores, encontros e progresso separados. O export 7616 × 4736 fornece 137 objetos. A reconstrução tem 31.753.830 de 31.758.612 pixels descobertos idênticos ao export; as margens transparentes mostram o tile de céu. A navegação usa os vértices do atlas original, não uma classificação por cor. Bordas de céu não são piso. As oito pontes têm piso sem bloquear projéteis; o portão dourado tem colisão apenas nos dois pilares. Uma malha de 16 px, apenas nesta família, permite que o clique encontre as passagens estreitas sem alargar o piso.

| Destino | Faixa | Encontro | Nv. | HP | Ataque | Defesa física | Defesa mágica | XP |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ilha dos Anjos 2 | 80–85 | Shura | 84 | 61.979 | 2.356 | 1.024 | 127 | 7.812 |
| Ilha dos Anjos 3 | 85–90 | Gendatsu | 88 | 79.112 | 2.877 | 1.216 | 150 | 11.116 |
| Ilha dos Anjos 4 | 90–95 | Ohm | 95 | 121.646 | 4.099 | 1.655 | 197 | 18.596 |

Valores efetivos após os multiplicadores existentes, XP por vitória no mesmo nível do atacante e sem bônus. Satori continua no nível 77 e mantém os seis identificadores de encontro da primeira ilha. A migração 0061 reconhece apenas a assinatura imediatamente anterior para reposicionar saves que estavam no mapa substituído. Os sacerdotes fazem parte das caçadas do arquipélago, não da rotação de Impel Down. As artes têm 6 quadros por faixa, nas quatro direções; Oeste já vem espelhado no arquivo.

Reproduzir com `python3 tools/import_skypiea_expansion.py caminho/para/Skypiea.zip`. O ZIP do autor não é publicado junto com o jogo. O mapa compilado, as imagens do pacote e a proveniência estão em `assets/skypiea/anjos/`. O teste `node --test tests/skypiea-expansion.test.cjs` percorre todos os cruzamentos de ponte e valida o céu externo, a passagem pelo portão e as rotas de combate.

# Equipamentos 56 — 04/11/2026

56 cadastros únicos, IDs **129–184**, em oito conjuntos. Os 129 registros anteriores foram preservados integralmente. O pacote enviado continha manifesto e referências; não continha mapa_56_itens.json nem CJSON. O mapa conciliado está em [mapa_56_itens.json](mapa_56_itens.json), com caminho completo de origem, ID, nome, raridade, ícone e recursos de cada corpo.

## Arte e encaixe

- PixelLab Image Pro recebeu os 56 PNGs originais como referências, as duas bases reais e o acabamento das armas aprovadas. 16 saídas 2×2 forneceram os 56 ícones independentes de 128×128, com alfa e sem moldura.
- 40 folhas vestíveis têm variantes masculina e feminina independentes. Oeste espelha a vista leste do próprio corpo. As peças usam grade nativa 128, pivôs e poses atuais; a resolução do ícone não amplia o personagem.
- Registro offline corrige translações da geração, remove manequins e separa mangas, luvas, pernas e botas antes do transporte pelas superfícies nativas. Os ornamentos vêm dos pixels da própria peça. Não há recurso feminino substituído por masculino.
- A variante feminina das Botas de Maré Serena (148) foi a única regeneração parcial. A saída inicial e a correção constam na proveniência.
- Chapéus ocultam cabelo e protegem a máscara da íris; ocultar o capacete restaura penteado e cor. As sandálias 141/169 preservam os dedos expostos; botas fechadas e luvas cobrem seus membros.

## Cintos e capas

A política é por **slot**, antes da seleção/carregamento da textura e novamente no compositor: belt, cloak e cloakFront não desenham. Cadastros, atributos, inventário e saves continuam válidos, inclusive nos itens antigos. Os mantos 144 e 158 pertencem a coat/torso e continuam visíveis. Não foram removidos recursos antigos nem criados bônus de conjunto.

## Integração

Arquivos principais: item-catalog.js, item-art.js, appearance-catalog.json, player-pack.json, paper-doll-96-lobby.js, wardrobe.js, torso.js, surface.js e weapons.js. Importação reproduzível: tools/import_equipment56.cjs e tools/equipment56_materials.cjs. Fontes autorais em pixellab-pip-generations/equipment-56; não entram no pacote estático. Importação: node tools/import_equipment56.cjs pixellab-pip-generations/equipment-56 CAMINHO_DO_MODULO_SHARP INDICE_DO_CONJUNTO (0–7). A reimportação dos 1.088 recursos entregues foi conferida por hash, com resultados idênticos. Uma reimportação marca os encaixes como não revisados até repetir a validação. As capturas e os saves de teste também ficam fora da distribuição e do Git.

O catálogo do servidor lê a mesma fonte: 185 definições, hash 86937408e6991af54b9f511e16968cf94efda18f438bfdcf39e43d1a41f2290b. Atualizar cliente e processo do servidor a partir da mesma revisão. Não há alteração de esquema de banco. Não houve sessão multiplayer com PostgreSQL remoto nesta validação.

## Validação executada

- 19 testes Node de catálogo, arte, composição, lobby, torso, aparência e armas anteriores; 2 testes TypeScript do catálogo autoritativo.
- Chrome: 3.840 quadros de conjuntos completos, 960 de peças isoladas, 192 de misturas, nas duas bases/quatro direções; idle, caminhada e seis famílias de ataque.
- 64 comparações de ocultar capacete/restaurar cabelo; 144 comparações de pele sob botas fechadas e 192 sob luvas, usando a anatomia do membro: nenhuma fresta detectada.
- Jogo real em contexto isolado: 32 estados de prévia, 16 estados de mapa e 16 recargas de save; cintos/capas novos e antigos comparados equipados, retirados e em conjunto. Diferença **zero pixels na região do avatar**. Barras de atributos podem variar porque os itens continuam concedendo atributos.
- Pranchas dos oito conjuntos incluem referências, ícones, masculino/feminino e quatro direções em repouso/caminhada/ataque. GIFs contêm ciclos completos de caminhada e ataque. Evidências fora do repositório.
- Pacote nativo native96-267d7eee3b4236d4, com 2.114 recursos registrados, refeito e python tools/build_pages.py concluído; o jogo da distribuição também abriu e passou pelas comparações dos dois corpos. Não houve publicação automática nem merge automático.

## Créditos e retomada

57 trabalhos concluídos: 16 folhas de ícones, 40 folhas vestíveis e uma correção feminina. **770 gerações cobradas**, de 933,65 disponíveis; **163,65 restantes** ao concluir o lote. Recibos e prompts em [geracoes_pixellab.json](geracoes_pixellab.json). Nenhuma geração pendente ou parada por créditos. Reexecutar a importação offline não consome gerações.

Rollback: reverter os commits desta branch; nenhum ID anterior foi renumerado e nenhum save foi migrado destrutivamente. O trabalho visual anteriormente suspenso do Protocolo Serafim permanece fora deste escopo.

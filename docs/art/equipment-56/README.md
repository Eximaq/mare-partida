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

O catálogo do servidor lê a mesma fonte: 185 definições, hash 86937408e6991af54b9f511e16968cf94efda18f438bfdcf39e43d1a41f2290b. Atualizar cliente e processo do servidor a partir da mesma revisão. Não há alteração de esquema de banco. Não houve sessão multiplayer com PostgreSQL remoto nesta validação. O smoke do contêiner do servidor passou no CI com o novo tamanho e hash do catálogo.

## Validação executada

- 19 testes Node de catálogo, arte, composição, lobby, torso, aparência e armas anteriores; 2 testes TypeScript do catálogo autoritativo.
- Chrome: 3.840 quadros de conjuntos completos, 960 de peças isoladas, 192 de misturas, nas duas bases/quatro direções; idle, caminhada e seis famílias de ataque.
- Inventário no Chrome: 12 slots, filtros, equipar/retirar, venda/bloqueio, poções, mochila cheia/vazia, paginação, persistência, nove resoluções e quatro facções nos níveis 49/50/51. A amostra mantém frutas explicitamente, sem depender dos últimos itens do catálogo.
- 64 comparações de ocultar capacete/restaurar cabelo; 144 comparações de pele sob botas fechadas e 192 sob luvas, usando a anatomia do membro: nenhuma fresta detectada.
- Jogo real em contexto isolado: 32 estados de prévia, 16 estados de mapa e 16 recargas de save; cintos/capas novos e antigos comparados equipados, retirados e em conjunto. Diferença **zero pixels na região do avatar**. Barras de atributos podem variar porque os itens continuam concedendo atributos.
- Pranchas dos oito conjuntos incluem referências, ícones, masculino/feminino e quatro direções em repouso/caminhada/ataque. GIFs contêm ciclos completos de caminhada e ataque. Evidências fora do repositório.
- Pacote nativo native96-267d7eee3b4236d4, com 2.114 recursos registrados, refeito e python tools/build_pages.py concluído; o jogo da distribuição também abriu e passou pelas comparações dos dois corpos. Não houve publicação automática nem merge automático.

## Créditos e retomada

57 trabalhos concluídos: 16 folhas de ícones, 40 folhas vestíveis e uma correção feminina. **770 gerações cobradas**, de 933,65 disponíveis; **163,65 restantes** ao concluir o lote. Recibos e prompts em [geracoes_pixellab.json](geracoes_pixellab.json). Nenhuma geração pendente ou parada por créditos. Reexecutar a importação offline não consome gerações.

Rollback: reverter os commits desta branch; nenhum ID anterior foi renumerado e nenhum save foi migrado destrutivamente. O trabalho visual anteriormente suspenso do Protocolo Serafim permanece fora deste escopo.

## Ajuste posterior dos capacetes

O registro de cabeça passou de proteção somente da íris para abertura de todos os modelos de olhos; recortes do Corsário, capuz, tiara e halo do tricórnio foram corrigidos sem novas gerações. Ver [encaixe e validação](../../CAPACETES-E-VISIBILIDADE.md#correção-de-encaixe--04112026). As roupas e os demais itens desta entrega permanecem na revisão anterior.

## Correção local das Vestes do Santuário Oceânico — 04/11/2026

O item 165 tinha mangas autorais afastadas dos ossos da base. A amostragem sobre esses ossos lia o contorno escuro em vez do tecido branco. A receita `tools/equipment56_oceanic_sleeves.cjs` registra cada manga da mesma variante nos ombros, cotovelos e punhos reais; o painel `DRAPE` separa a barra/corpo das cópias estáticas das mangas. O compositor rejeita fragmentos desse painel que não tenham contato com a anatomia, preservando barras conectadas. As outras roupas continuam sem esse painel e conservam sua montagem.

48 recursos do item foram preparados offline a partir da geração original (oito vistas completas, 32 painéis de braço e oito painéis de caimento); os ícones e os demais itens permanecem intactos. Os 36 painéis de Sul/Norte/Leste foram reproduzidos diretamente da fonte com igualdade de pixels, e Oeste deriva do mesmo espelho. Nenhuma nova geração ou cobrança. O mapa de recursos do item foi atualizado. Validação no compositor compartilhado: 480 quadros, 43.213 pixels internos de braço conferidos, sem frestas de pele ou componentes de roupa soltos. O proprietário autorizou a entrega em PR após a conclusão.

A regressão das mangas integra `tests/equipment-56-browser.cjs` e percorre todas as oito famílias nativas, nos dois corpos e quatro direções, mantendo livres os centros reais das palmas. No jogo estático, as prévias, o mapa e a recarga dos dois corpos preservaram diferença zero de pixels ao trocar cintos e capas. Build estático concluído.

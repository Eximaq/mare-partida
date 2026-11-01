# Compêndio de Akuma no Mi HD

Atualização de 01/11/2026. Branch `feature/compendium-hd`, base `022004b` (PR #179 integrado). Referência: “Compêndio de Frutas do Diabo.png”, fornecida pelo proprietário.

## Auditoria e fontes

- Catálogo único: `MareAkuma.catalog`, em `akuma-system.js`, alimentado pelos módulos de cada rank. São 30 frutas, cinco por rank, com os mesmos IDs e posições em `itemDefs`.
- Registro por personagem: `game.akumaCompendium`, conjunto permanente de IDs conhecidos. Não depende de ainda possuir a cópia.
- Registro atual: demonstração sem custo de Berry, com uma cópia concedida quando o jogador ainda não a possui. Exige espaço na mochila nesse caso. O cliente e `server/akuma.py` permitem os seis ranks existentes; a antiga frase “Ranks E e D disponíveis” estava desatualizada.
- Bônus: cada ID único concede +0,1% de Vida máxima base e Força base. A fórmula existente em `character-system.js` foi extraída para `compendiumMultiplier`, usada tanto pelo cálculo de atributos quanto pela apresentação. Não houve alteração do multiplicador.
- Artes oficiais da interface: `MareItemArt.path` e `assets/ui/items-hd/`, exatamente como no inventário. As artes nativas de combate continuam em seus módulos; não são carregadas pelo compêndio.
- A versão antiga mostrava sprites de transformação no lugar da silhueta das frutas Zoan, utilizava ícones legados e apresentava espaços vazios fictícios. O componente novo usa somente as 30 entradas reais.

## Composição e interação

Cabeçalho Kaizoku Idle com a ilustração cobrindo toda a largura, conforme o último ajuste solicitado. A imagem usa recorte proporcional, sem deformar os objetos. Abas Todas/Paramecia/Zoan/Logia, coluna de ranks, galeria e detalhes seguem a composição aprovada. Madeira, metal escuro, molduras, botões e tipografia reutilizam os materiais das HUDs anteriores.

Busca sem distinção de acentuação, tipo, rank, raridade e ordenação combinam o mesmo estado de visualização. Abas e seletor de tipo permanecem sincronizados. A coluna de ranks conta registradas/total do catálogo completo; o número de resultados da busca é separado. Ao remover a fruta selecionada por filtro, o painel seleciona a primeira entrada válida ou mostra o estado vazio.

Na resolução principal há cinco cards por linha. Em resoluções menores, a grade reduz as colunas e os painéis são empilhados. A galeria e o conteúdo longo dos detalhes possuem rolagem; a ação contextual permanece fora da rolagem dos detalhes. Por toque, selecionar um card leva ao painel de detalhes quando ele está empilhado.

Os tooltips pertencem ao sistema compartilhado e ficam fora do recorte da galeria. Funcionam com mouse e foco de teclado, sem registrar, equipar ou consumir itens. O toque tem como alternativa o próprio painel lateral. Selecionar outro card atualiza somente o painel e o destaque, sem reconstruir toda a janela.

## Raridade e compatibilidade

| Rank | Raridade |
|---|---|
| S | Supremo |
| A, B | Lendário |
| C, D | Épico |
| E | Raro |

`MareAkuma.rarityFor` centraliza a classificação. Letras e contadores continuam separados por rank. Cores vêm da paleta existente de `MareForge.rarity`; Supremo mantém o vermelho. O inventário, seus filtros e tooltips consultam a mesma classificação, inclusive para cópias antigas.

Raridade de apresentação não recalcula atributos de frutas. A forja já exclui Akuma no Mi de rolagens de equipamentos; venda não usa raridade; bônus próprios continuam em `MareAkuma.bonusStats`. Não foram alterados danos, custos, recargas, famílias, drops, disponibilidade ou IDs.

As cinco descrições antigas das frutas iniciais foram movidas do fallback da HUD para o catálogo, evitando uma segunda lista de textos. Foram corrigidas 22 strings com codificação corrompida em Rank A. As descrições genéricas de Gura, Hie e Phoenix foram completadas no cadastro oficial a partir dos efeitos já implementados. Uma comparação estrutural confirmou que os números dessas duas bases de dados permaneceram iguais.

## Silhuetas, arte e desempenho

Cada fruta usa seu próprio ícone HD e canal alfa. Margens transparentes são medidas uma vez; uma cópia de cor e uma máscara escura são preparadas por asset. O tamanho visual é ajustado proporcionalmente. Zoan nunca consulta a transformação para desenhar o card ou o painel.

O cache é limitado a 64 entradas, com 30 em uso nesta versão. A preparação de pixels não ocorre em frames, hover ou seleção. Promessas antigas verificam se o canvas ainda pertence ao item antes de desenhar. Falha de imagem mantém o item selecionável com aviso “Arte indisponível”, sem substituir sua silhueta por um quadrado opaco.

Foram gerados somente:

- `header.png`: PixelLab AI Pro, 688×256, 25 gerações.
- `types-atlas.png`: PixelLab AI Pro Flash, 192×64, três símbolos de 64×64 com alfa, 6 gerações.

Total: **31 gerações**. Prompts, IDs, dimensões e hashes estão em `assets/ui/compendium-hd/manifest.json`. Os 30 ícones oficiais das frutas, transformações, habilidades e moeda foram preservados.

## Registro e persistência

A ação mantém o registro manual já existente. Registros permanentes ficam desabilitados; cópia possuída, item equipado, disponibilidade e registro são apresentados separadamente. Há proteção contra solicitações simultâneas do mesmo ID.

A gravação local ocorre antes de aplicar o novo estado em memória. Falha de armazenamento não entrega cópia nem bônus localmente. Quando a API estiver conectada, ela continua validando seu registro único; se a gravação local falhar após o servidor aceitar, a inscrição no servidor permanece e uma nova tentativa local é idempotente. A troca de identidade do personagem durante uma requisição impede aplicar a resposta ao outro personagem.

Filtros e seleção são estado de interface, preservados ao fechar/reabrir e reiniciados ao recarregar. Não foram criadas novas tabelas, migrações de save ou alterações de atributos persistidos.

## Validação

- 58 testes Node aprovados nas suítes de compêndio, Akuma, atributos, tooltips, forja, ranks A/B/S e componentes/raridades do inventário.
- Seis testes Python do serviço de Akuma aprovados.
- Integrações reais de Supa, Doru, Neko, Ushi e Lobo aprovadas após atualizar somente os seletores da navegação. O teste adicional do Ryu falha por diferença de 1 px entre idle/walk frontal (largura 89 contra 90), reproduzida com game.js e teste originais da base 022004b. Os sprites e a asserção foram preservados.
- Chromium real na fonte e no pacote `dist/`: 30 frutas, silhuetas específicas, estados colorido/oculto, ausência de blocos opacos, tooltip por hover/foco, seleção, filtros combinados e contadores globais.
- Registro único, cópia, bônus, reabertura, recarga e permanência sem cópia; falha simulada de armazenamento sem mutação; raridade Raro de Rank E conferida no inventário.
- Troca rápida de 100 seleções, máscara alfa de Zoan, limite de cache e ausência de requisições de transformações ao abrir o compêndio.
- Oito resoluções: 1920×1080, 1672×990, 1366×768, 1280×720, 1024×768, 393×852, 360×800 e 320×568. Toque real em contexto móvel e falha simulada de imagem também validados.
- `python tools/build_pages.py` e caminhos relativos aprovados.
- Capturas reais ficam em diretório temporário fora do Git; a comparação anterior fica em `tmp/compendium-hd/baseline.png`.

O ensaio local de 100 atualizações de seleção ficou na ordem de dezenas de milissegundos com a simulação pausada. Isso verifica o custo das atualizações da interface; não constitui medição de FPS ou dos picos de frames do combate.

## Arquivos e manutenção

`compendium-ui.js` e `compendium-hd.css` concentram a interface. `game.js` integra abertura, descarte de listeners, registro e classificação compartilhada. `game-tooltips.js/css` adicionam o formato compacto de descrição. Os HTMLs e o build incluem o componente. Os testes e `.github/workflows/compendium-hd.yml` validam fonte e versão pública.

Rollback: reverter o commit desta sprint. Saves e registros continuam compatíveis. Não há nova mecânica. A diferença visual preexistente do Ryu permanece fora do escopo desta interface; aprovação visual do compêndio permanece com o proprietário.

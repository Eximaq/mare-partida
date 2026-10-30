# Sprint 2 — equipamentos de cabeça e visibilidade

> Atualização de 30/10/2026: a regra vigente está em [Sprites atuais — fonte única](SPRITES-ATUAIS-FONTE-UNICA.md). O jogador usa exclusivamente native96 (inclusive DEV); `paperDoll96=0` não reativa o modelo antigo. Referências abaixo a rollback/fallback84 ou ensaio temporário no mundo são históricas e foram substituídas. Bancadas antigas continuam isoladas.

Base: merge do PR154, `ed73c27`. Branch `feature/headgear-visibility`.

## Comportamento

O botão de olho fica no **canto inferior direito da prévia do personagem no inventário**, conforme o ajuste do proprietário. Oferece “Ocultar capacete” ou “Mostrar capacete”, tem estado pressionado, tooltip, foco de teclado e área maior em dispositivos de toque. Sem item na cabeça, fica desabilitado. Também controla bandanas e chapéus no mesmo slot.

| Estado | Equipamento desenhado | Cabelo |
| --- | --- | --- |
| Sem item ou item oculto | Não | Penteado selecionado |
| Capacete do Corsário, ID19, visível | Sim | Totalmente oculto |
| Bandana das Correntes, ID18, visível | Sim | Preservado |

`headgear-visibility.js` centraliza a política. Modelos futuros podem declarar `hairOcclusion: all/none/crown` ou `hideHair`, sem regras por personagem. O compositor existente decide as camadas antes do desenho final. Ocultar não apaga cabelo, muda equipamento ou substitui o personagem por um sprite antigo.

`preferences.hideHeadgear` aceita somente o booleano `true` como oculto; saves antigos continuam visíveis. O botão grava a preferência antes de substituir o estado vivo. Falha de armazenamento mantém a preferência anterior. Equipamento, mochila, raridade, refino, atributos, defesa e efeitos funcionais permanecem iguais. As chaves de save normal e DEV não mudam.

## Base padrão de 96 px

O proprietário autorizou explicitamente nesta sprint o uso de 96 px como visual padrão. `tools/paper-doll-96-v3/player-pack.json` é a autorização de lançamento separada, vinculada às revisões dos materiais e armas atuais. Os manifests históricos da bancada conservam suas flags de estudo; não há aprovação retroativa de outros drafts.

O jogo normal usa o compositor nativo existente no lobby, combate, retrato, inventário e prévias já existentes. A escolha antiga de cabelo preto/sem cabelo e roupa-base continua respeitada. Nenhum menu novo de criação ou personalização completa foi desenvolvido. O seletor de corpos/cabelos da bancada continua disponível para avaliação das duas anatomias.

- `?paperDoll96=0`: retorno explícito ao conjunto anterior, também usado pela regressão histórica de 84 px.
- DEV continua isolado; só usa a bancada nativa com `?dev=1&paperDoll96=1`.
- `?paperDoll96=1` conserva o ensaio com escolhas temporárias, sem gravar kits ou aparência no personagem.
- Erro ou ausência do manifesto de lançamento mantém o fallback anterior. Formas Zoan conservam seu renderizador próprio.

Para alternância imediata após a preparação, cada conjunto com equipamento de cabeça conserva versões visível/oculta dos mesmos quadros. A preferência seleciona a versão pronta; não modifica tempo, pivô ou gesto. Os limites de cache continuam em 48 imagens, dois conjuntos e oito prévias, com no máximo seis cargas simultâneas.

## Arte e reutilização

Sprites, rostos, cabelos, máscaras e animações atuais foram reutilizados sem modificar PNGs. Não houve nova geração PixelLab nem consumo de créditos nesta sprint. A regra vale para qualquer penteado e cor selecionados, nos dois corpos e quatro direções, incluindo todos os gestos existentes. Corrida sem sequência própria não é anunciada como nova animação.

## Verificação

- `tests/headgear-visibility.test.cjs`: política configurável, preferência imutável, labels/estado acessível, liberação padrão, fallback e isolamento DEV.
- `tests/headgear_visibility_browser.cjs`: 480 poses; capacete independente do cabelo/cor, oculto idêntico ao estado sem equipamento e bandana preservando cabelo. Inventário real nos dois corpos, equipar/retirar, alternância rápida, atributos/mochila preservados, reload, falha de armazenamento, teclado/ícone e posição desktop/móvel.
- Regressões de lobby, armas, composição estrutural, personagem anterior e publicação complementam a validação. Resultados executados ficam no changelog; capturas e logs em massa ficam fora do Git e nos artifacts de CI.

Para um futuro chapéu, reutilizar as camadas e o socket da cabeça, declarar sua política e repetir a comparação visível/oculto/sem item em todas as poses. Somente produzir novas variantes no PixelLab se a arte atual não atender ao encaixe.

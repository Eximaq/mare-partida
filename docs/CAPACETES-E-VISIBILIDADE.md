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

## Correção de encaixe — 04/11/2026

Os oito equipamentos de cabeça do lote 56 usam o registro offline `head-aperture-v1`. O encaixe considera os pixels completos dos oito modelos de olhos (incluindo contornos e uma margem), em vez de proteger somente a íris. Cada corpo e direção mantém seu próprio registro; Oeste espelha Leste do mesmo corpo. A animação continua usando a translação inteira compartilhada da cabeça, sem ajuste de posição por quadro.

O Corsário conserva a aba traseira opaca, sem o recorte indevido da máscara facial. O capuz abre sobre a silhueta real do rosto e mantém as dobras laterais e o lenço inferior. A tiara traseira conserva a faixa dourada, sem o manequim preenchido. O tricórnio feminino remove também o halo do manequim branco antes de medir o chapéu. Não foram alterados ícones, IDs, atributos, roupas, armas, saves ou os modelos anteriores 18/19.

Importação: `tools/import_equipment56.cjs`, `tools/equipment56_materials.cjs` e `tools/equipment56_headfit.cjs`. Nenhuma nova geração ou cobrança PixelLab. A ocultação permanece por `preferences.hideHeadgear` e restaura o penteado/cor escolhidos.

Validação: 17 testes Node relacionados; Chrome, 480 poses dos modelos anteriores e 3.840 quadros dos oito novos, 64.112 comparações de pixels de olhos e 64 restaurações de cabelo; quatro direções, dois corpos, repouso, caminhada e seis famílias de ataque. Capturas de inspeção e evidências permanecem fora do Git. A revisão das mangas de Vestes do Santuário Oceânico foi solicitada separadamente e aguarda a validação do proprietário sobre estes capacetes.

A distribuição estática também foi conferida no Chrome: 32 estados de prévia, 16 estados reais no mapa e 16 recargas de save. Cintos/capas continuam com diferença zero na região do avatar.

## Revisão do proprietário e editor manual — 04/11/2026

Esta revisão substitui os encaixes da seção anterior nos casos abaixo. O item 136 mantém o Norte e retorna **exatamente aos PNGs anteriores** em Sul/Leste/Oeste dos dois corpos, por orientação do proprietário. Sua abertura original fica explicitamente fora da asserção de olhos desobstruídos; o teste confere os arquivos restaurados por hash.

Os deslocamentos ficam em `appearance-catalog.json > headAdjustments`, separados por item, corpo e direção. X negativo move para a esquerda; Y positivo desce; tamanho é uma porcentagem com amostragem de pixels inteiros. Oeste acompanha o espelho de Leste. Não há mudança de pose do corpo ou arma, nem ajuste automático que desfaça a orientação manual.

| Item | Corpo | Vista | X | Y | Tamanho |
|---|---|---|---:|---:|---:|
|150|Masculino|Leste|−3|+2|100%|
|150|Feminino|Leste|−2|0|100%|
|150|Feminino|Sul|+1|+2|100%|
|150|Ambos|Norte|0|−2|100%|
|157|Masculino|Sul|−2|0|100%|
|157|Masculino|Norte|−3|0|100%|
|157|Ambos|Leste|−3|0|100%|
|164|Masculino|Leste|−3|+7|100%|
|164|Feminino|Leste|+1|+5|100%|
|171|Ambos|Norte|−3|0|100%|
|171|Masculino|Leste|−2|0|100%|
|171|Feminino|Leste|−2|−1|100%|
|178|Masculino|Norte|−8|+2|115%|
|178|Feminino|Norte|−10|−1|115%|
|178|Ambos|Leste|−3|0|100%|

### Uso da bancada

Abra `tools/paper-doll-96-v3/` por HTTP. O painel **Ajuste manual · peças de cabeça** permite escolher os dez modelos existentes, corpo, direção e movimento; arrastar a peça, mover de um em um pixel, ajustar tamanho, pausar ou inspecionar cada quadro. O rosto/corpo continuam usando os mesmos pixels e o mesmo compositor do jogo.

**Salvar rascunho** conserva os ajustes apenas nesta bancada, na chave local `mare-head-fit-editor-v1`; não lê nem modifica saves do jogo. **Exportar para integração** baixa `kaizoku-encaixes-cabeca.json`. Envie esse arquivo para integrar os valores no jogo publicado. Importar aceita somente itens de cabeça, corpos/direções válidos e a mesma revisão artística; Oeste é editado como espelho. Um arquivo antigo permanece disponível para conciliação e não sobrescreve silenciosamente a revisão nova. Restaurar esta vista e descartar rascunho recuperam os valores publicados.

Integração do arquivo: `node tools/apply_headgear_adjustments.cjs CAMINHO_DO_JSON`. O comando valida e atualiza somente as calibrações do catálogo; em seguida executar `python tools/player96_release.py --write` e `python tools/build_pages.py`, validar e publicar pelo fluxo normal. A opção de ajuste temporário do compositor está habilitada exclusivamente na bancada. No jogo os valores vêm do catálogo versionado.

Nenhuma geração ou crédito PixelLab utilizado nesta revisão. As Vestes do Santuário Oceânico continuam pendentes da validação destes capacetes.

Validação desta revisão: 21 testes Node aprovados; distribuição estática no Chrome com 480 poses legadas e 3.840 quadros novos, 56.098 comparações de olhos, 64 restaurações de cabelo e 480 quadros do capuz original separados da asserção facial. Os nove controles funcionais do editor passaram também na distribuição estática (prévia, arraste, corpos independentes, espelho, salvar/recarregar, exportar/importar, rejeição de revisão antiga e preservação de save/catálogo). No jogo: 32 estados de prévia, 16 estados no mapa e 16 recargas sem diferença visual de cintos/capas. A instabilidade inicial do servidor HTTP local foi resolvida reiniciando apenas a prévia de teste; as verificações foram repetidas com sucesso.

## Encaixes manuais recebidos e cobertura do cabelo — 04/11/2026

Aplicado o JSON exportado pelo proprietário sobre `headfit-owner-pass-2`, mantendo os números de X, Y e tamanho exatamente como recebidos. A revisão normalizada e seu hash ficam no catálogo; o arquivo pessoal de Downloads não é incluído no repositório. A inspeção de feições respeita somente os pixels de aba ocupados pela geometria manual no repouso, verificando que não aparecem invasões adicionais durante a animação. A antiga asserção de nenhuma sobreposição em qualquer contorno/sobrancelha não descreve esse encaixe autoral; não se altera a posição escolhida para satisfazê-la. O capuz 136 conserva a exceção original já documentada.

A tiara 164 expunha o couro cabeludo por causa da ocultação universal. A política agora é explícita por modelo: `none` nos diademas/coroas abertos 157/164/178; `partial` na bandana 18 e nos chapéus 129/143/150/171; `full` no capacete 19 e no capuz 136. Peças desconhecidas preservam o comportamento anterior até receberem metadados próprios. A cobertura parcial reaproveita o corte da região superior do cabelo, com linha própria de corpo/direção, transportada pelo mesmo pivô e pelo encaixe da peça; franjas/laterais/nuca permitidas permanecem. Peças abertas usam a ordem normal e o alfa do metal, sem máscara adicional. Nenhum PNG de cabelo, rosto ou cabeça foi alterado.

Ocultar/desequipar restaura integralmente o cabelo; escolha careca permanece sem cabelo. Nenhum atributo, preferência de aparência ou formato de save foi alterado. As famílias existentes incluem repouso, caminhada e os ataques, incluindo canalização; o pacote native96 não contém uma animação Hurt separada para acrescentar a este ensaio. Sem geração PixelLab. O proprietário autorizou a entrega em PR após a conclusão, mantendo a validação visual final sob seu controle. Nesta revisão passaram 23 testes Node; 480 poses legadas e 3.840 quadros de capacetes; 320 combinações de política de cabelo, 72 variantes adicionais de penteado e os nove controles do editor.

# Bancada de encaixe HD

Abra **bancada-hd.html** na mesma origem do jogo. Para executar localmente, use Python e sirva o diretório publicado.

```sh
python tools/build_pages.py
python -m http.server 8000 --directory dist
```

Acesse [a bancada local](http://localhost:8000/bancada-hd.html). O personagem de teste usa um inventário em memória. A bancada lê os nomes, IDs, classes e opções de aparência dos catálogos de produção.

## Ajustar uma peça

1. Busque pelo nome, ID ou categoria. Clique na peça para equipá-la. Ao escolher uma arma, a bancada seleciona sua classe.
2. Selecione movimento e direção. A barra percorre as posições do relógio. As setas da reprodução pulam até a fase distinta anterior ou seguinte. O indicador identifica as posições que compartilham aquela fase.
3. Em **Peça em edição**, escolha a peça inteira ou uma parte registrada. Arraste a arte ou use X, Y e as quatro setas. Use Shift + arraste para mover a câmera. **Original** mostra a composição antes dos ajustes. **Isolar no corpo** mantém a arma que define a pose. As guias usam o pivô e as articulações disponíveis na fonte.
4. **Tamanho (%)** amplia ou reduz a arte em torno do centro da peça. **100%** recupera o tamanho original. **Rotação (°)** aceita graus inteiros de −180 a 180. **Espelhar item** inverte a peça horizontalmente. Ao selecionar a peça inteira, as subpartes que compartilham o mesmo plano giram e mudam de tamanho em torno de um centro comum. O ajuste de uma parte tem seu próprio centro.
5. Em **Camada**, escolha **Atrás do corpo** para levar a peça ao fundo da composição. Quando o desenho daquela pose separa a anatomia, também aparecem destinos como **Atrás do punho** ou **Atrás do antebraço e punho**. Só a região de sobreposição muda. Use **Ordem original** para restaurar a profundidade da arte.
6. Na direção Leste, **Espelhar oeste** copia o ajuste para a arte do Oeste e abre essa direção. **Espelhar leste** faz a cópia inversa. X e o ângulo mudam de sinal. Tamanho, Y, camada e a opção de espelho local são preservados. A peça inteira copia as subpartes ajustadas. A parte selecionada copia somente seus próprios registros. A cópia exige poses e fases correspondentes e pode ser desfeita.
7. **Ciclo inteiro** vale para todas as fases. **Fase atual** acrescenta uma exceção. **Restaurar parte** remove o ajuste de ciclo e todas as exceções da parte escolhida. Desfazer e refazer abrangem o rascunho desta sessão.
8. **Exportar rascunho** grava o documento completo, inclusive as peças, direções e fases fora da seleção atual. **Importar JSON** confere as identidades e os limites antes de substituir o rascunho. Ele fica guardado neste navegador entre sessões.

### Posição por item e movimento

O X/Y de **Ciclo inteiro** vale imediatamente para o corpo, o movimento, a direção e o ID em edição. Por exemplo, ajuste a bota 148 na caminhada para Leste e troque o peitoral ou a arma. A bota conserva o deslocamento em pixels na caminhada para Leste. Marque **Manter peça em edição ao trocar o conjunto** para continuar vendo seus valores enquanto experimenta outras roupas. A troca preserva a posição da timeline no mesmo movimento.

- Para definir quatro posições diferentes, edite o X/Y em cada direção. Cada edição já vale para todos os conjuntos.
- **Aplicar posições a todos os conjuntos** usa o X/Y definido para cada direção do item, corpo e movimento selecionados. Se o capacete tem Leste (5, 19) e Sul (1, 4), outros conjuntos recebem Leste (5, 19) e Sul (1, 4). Uma direção sem ajuste conserva a posição da arte. O botão também permite usar as posições do conjunto atual como padrão, preservando as exceções já criadas. Em rascunhos antigos que gravaram uma única posição nas quatro direções, a abertura ou importação recupera a direção de origem da cópia e mantém os demais valores direcionais ainda registrados.
- Para adaptar só o conjunto equipado, clique em **Criar exceção para este conjunto** e edite X/Y. A exceção pode valer zero. Trocar uma peça vizinha devolve o padrão e reequipá-la recupera a exceção. **Remover exceção deste conjunto** volta ao padrão. Repouso e caminhada mantêm coordenadas independentes mesmo na mesma direção.
- A peça inteira acompanha as diferentes artes do mesmo ID. Um pé individual acompanha as montagens que identificam esse mesmo pé. Um painel técnico exige uma fonte correspondente. Os ajustes de fase, tamanho, rotação, espelho e camada continuam ligados à montagem original.

Para editar uma bota, escolha **Botas** e depois o pé em **Parte**. O nome acompanha a identificação da pose: esquerda/direita, próxima/distante ou bota 1/2. Frente, traseira e forro do pé escolhido se movem juntos. Para ajustar os dois pés, selecione **Par de botas**. Há poses de ataque em que a montagem só fornece os planos do par. A bancada sinaliza essas poses e pede uma nova seleção se o pé que você editava ficar indisponível.

Para aprovar ajustes para o jogo, revise o ciclo completo, substitua `hd-position-approved.json` no repositório pela exportação e publique o build normal. A edição privada usa a chave `kaizoku-hd-position-draft-v1` da bancada. O mapa lê o arquivo publicado.

## Formato do arquivo

| Campo | Significado |
| --- | --- |
| `schema`, `reference`, `revision` | Versão do formato, commit de referência da arte e revisão do documento |
| `space` | `native-screen-px`. Coordenadas inteiras da composição na direção exibida. X positivo aponta à direita e Y positivo aponta para baixo |
| `records` | Ajustes independentes por item, receptor e parte |
| `body`, `weapon`, `action`, `direction`, `receiver` | Corpo, arma da pose (ou `null`), ação resolvida, direção, dimensões, pivô e assinatura da montagem. Para roupas, a arma serve de referência para reabrir a pose na importação. Outra arma com a mesma montagem aceita o ajuste |
| `slot`, `item`, `part` | Slot, ID de catálogo e parte do desenho. `*` agrupa as operações próprias registradas para a peça |
| `source` | SHA-256 das referências de origem, geometria da montagem e relógio capturados pelo compositor |
| `range` | No esquema 3, um registro de X/Y pode definir `motion` (cópia antiga nas quatro direções), `direction` (todos os conjuntos naquela direção) ou `outfit` (exceção explícita deste conjunto). A leitura também aceita `pose` para a montagem assinada. Corpo, ação, slot, item e parte identificam o dono da posição. Direção, arma, receptor e fonte guardam a referência de origem para a importação. |
| `cycle` | Par inteiro `[dx,dy]` do ciclo |
| `phases` | Mapa da fase de origem para o par adicional. Por exemplo, `{"3":[0,-1]}` |
| `style` | Opcional no esquema 2. Contém `cycle` e `phases` com propriedades opcionais `angle` (graus), `size` (percentual inteiro positivo), `flip` (booleano) e `layer` (ordem original ou destino anatômico) |

Os esquemas 1 e 2 continuam aceitos. Ao reconhecer a fonte de um rascunho antigo, a bancada reaproveita o X/Y de ciclo como padrão daquela direção se os registros antigos concordarem. Valores antigos divergentes permanecem vinculados às suas montagens. A precedência do X/Y é conjunto, montagem assinada, direção e depois o registro antigo da montagem. O arquivo exportado inclui os padrões e as exceções. O primeiro ajuste visual além de X/Y grava o esquema 2. Uma exceção de fase substitui somente as propriedades visuais presentes naquela fase. Os valores iniciais são 0°, 100%, espelho desligado e ordem original. O ajuste local da subparte é aplicado antes do ajuste geral da peça. A camada da parte tem precedência. Cada direção utiliza sua própria fonte e assinatura.

O deslocamento de uma parte soma o ciclo da peça, a exceção da peça, o ciclo da parte e a exceção da parte. Zoom e panorâmica só alteram a câmera. A distância em pixels CSS do arraste é dividida pelo zoom e arredondada ao pixel nativo. O mapa usa sua projeção habitual sobre esses mesmos quadros. Cada direção tem seu próprio registro. Máscaras de anatomia e pegadas continuam no espaço da pose.

A importação verifica o esquema, as duplicatas, o item, as fontes e as fases. O compositor verifica o contorno da parte após escala, giro, espelho e deslocamento contra os limites do plano nativo. Os limites usam o suporte alfa, o recorte e a matriz da operação real. O contato artístico entre mão e arma exige inspeção do movimento. Uma assinatura publicada que deixou de corresponder à fonte preserva o desenho original da peça e gera um diagnóstico.

## Reprodução da validação

Em um checkout com as dependências do projeto instaladas e `HD_PUBLISHED_ROOT` apontando para o caminho absoluto do build:

```sh
node --test tests/hd-position.test.cjs tests/hd-position-style.test.cjs tests/character-appearance.test.cjs tests/rework-wardrobe-map-action.test.cjs
node tests/hd-position-render.cjs
node tests/hd-position-render.cjs --census
```

Com o servidor da bancada em execução, `node tests/hd-position-browser.cjs --boots` usa `MARE_TEST_URL` e `MARE_EVIDENCE_DIR` para conferir no navegador a edição e a restauração de cada pé dos dez modelos em repouso, nas quatro direções e nos dois corpos.

A opção `--positions` do teste de navegador verifica trocas de peitoral e arma durante a caminhada, quatro direções para calça, bota e peitoral, isolamento por ID e exceção de montagem.

O teste `node --expose-gc tests/hd-position-outfits.cjs` percorre o catálogo em caminhada para Leste. Ele registra o X/Y de cada ID em um conjunto, troca as peças vizinhas e compara os pixels do ajuste herdado com os de um ajuste direto na nova montagem. `HD_WEAPON_IDS` permite dividir a execução em lotes com pelo menos dez armas. A opção `--poses` testa o peitoral 151 nos movimentos usados pelo catálogo, nas quatro direções e no poder de mãos livres. Repouso em combate, guarda, ferimento e queda usam o repouso quando o controlador HD os encaminha para essa animação.

O comando `--census` mede o repouso Sul dos dois corpos para as 42 armas, alternando os dez itens de cada categoria. A variante `--cycles` inclui caminhada e ataque. Para dividir por lote, defina `HD_WEAPON_IDS` (IDs separados por vírgula) e `HD_DIRECTIONS` (direções em inglês separadas por vírgula). A saída é JSON. Uma peça sem diferença visível no ciclo produz uma falha.

O teste `node tests/hd-position-helmet.cjs` compara o capacete 18 com X=5 e Y=19 com uma montagem independente pelo pivô do corpo. Percorre as seis espadas, o mosquete 4, a adaga 73 e o foco 31, em repouso e caminhada masculinos nas quatro direções. A opção `--hair` desenha os dez capacetes com cabelo Chanel nos dois corpos e confere o deslocamento e a restauração no primeiro quadro de uma caminhada por combinação.

O arquivo de referência guarda hashes RGBA e do contrato de desenho em quatro ciclos baseados no build independente de `36c68a6`, com 26 posições. Nas duas poses de espada com margem, a referência desenha o capacete no centro do quadro do corpo. Para reproduzir a origem, execute o teste com `HD_PUBLISHED_ROOT` apontando para aquele build e `--reference` seguido do caminho de um arquivo temporário. O teste normal lê o arquivo versionado.

Para o navegador, execute o build com `--renderer-fixture`, sirva a pasta e configure `MARE_TEST_URL` e `MARE_EVIDENCE_DIR`. Execute `node tests/hd-position-browser.cjs` com Chromium e Playwright. O teste cria uma sessão descartável, exporta e reimporta alterações distintas, verifica o rascunho após recarga e compara o quadro nativo mostrado na bancada com o desenhado na caçada, com a mesma aprovação. As capturas ficam no diretório de evidências.

As contagens do catálogo indicam opções disponíveis. O censo mede desenho e deslocamento individual em conjuntos escolhidos. A comparação no mapa e a equivalência quadro a quadro abrangem os cenários identificados acima.

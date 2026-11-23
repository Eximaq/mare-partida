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
4. **Ciclo inteiro** vale para todas as fases. **Fase atual** acrescenta uma exceção. **Restaurar parte** remove o ajuste de ciclo e todas as exceções da parte escolhida. Desfazer e refazer abrangem o rascunho desta sessão.
5. **Exportar rascunho** grava o documento completo, inclusive as peças, direções e fases fora da seleção atual. **Importar JSON** confere as identidades e os limites antes de substituir o rascunho. Ele fica guardado neste navegador entre sessões.

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
| `cycle` | Par inteiro `[dx,dy]` do ciclo |
| `phases` | Mapa da fase de origem para o par adicional. Por exemplo, `{"3":[0,-1]}` |

O deslocamento de uma parte soma o ciclo da peça, a exceção da peça, o ciclo da parte e a exceção da parte. Zoom e panorâmica só alteram a câmera. A distância em pixels CSS do arraste é dividida pelo zoom e arredondada ao pixel nativo. O mapa usa sua projeção habitual sobre esses mesmos quadros. Cada direção tem seu próprio registro. Máscaras de anatomia e pegadas continuam no espaço da pose.

Campos desconhecidos, duplicatas, transformações diferentes de X/Y, fases inválidas e deslocamentos que excedam a área disponível são rejeitados. Os limites usam o suporte alfa, o recorte e a matriz da operação real. O contato artístico entre mão e arma exige inspeção do movimento. Uma assinatura publicada que deixou de corresponder à fonte preserva o desenho original da peça e gera um diagnóstico.

## Reprodução da validação

Em um checkout com as dependências do projeto instaladas e `HD_PUBLISHED_ROOT` apontando para o caminho absoluto do build:

```sh
node --test tests/hd-position.test.cjs tests/character-appearance.test.cjs tests/rework-wardrobe-map-action.test.cjs
node tests/hd-position-render.cjs
node tests/hd-position-render.cjs --census
```

O último comando mede o repouso Sul dos dois corpos para as 42 armas, alternando os dez itens de cada categoria. A variante `--cycles` inclui caminhada e ataque. Para dividir por lote, defina `HD_WEAPON_IDS` (IDs separados por vírgula) e `HD_DIRECTIONS` (direções em inglês separadas por vírgula). A saída é JSON. Uma peça sem diferença visível no ciclo produz uma falha.

O arquivo de referência guarda hashes RGBA e do contrato de desenho em quatro ciclos gerados no build independente de `36c68a6`, com 26 posições. Para reproduzir a origem, execute o teste com `HD_PUBLISHED_ROOT` apontando para aquele build e `--reference` seguido do caminho de um arquivo temporário. O teste normal lê o arquivo versionado.

Para o navegador, execute o build com `--renderer-fixture`, sirva a pasta e configure `MARE_TEST_URL` e `MARE_EVIDENCE_DIR`. Execute `node tests/hd-position-browser.cjs` com Chromium e Playwright. O teste cria uma sessão descartável, exporta e reimporta alterações distintas, verifica o rascunho após recarga e compara o quadro nativo mostrado na bancada com o desenhado na caçada, com a mesma aprovação. As capturas ficam no diretório de evidências.

As contagens do catálogo indicam opções disponíveis. O censo mede desenho e deslocamento individual em conjuntos escolhidos. A comparação no mapa e a equivalência quadro a quadro abrangem os cenários identificados acima.

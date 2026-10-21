# Paper Doll — conjunto modular Idle/sul

Em21/10/2026, após a aprovação “prossiga” do lote apresentado com teto12 e sem retries, foram executadas duas chamadas MCP `inpaint_image_pro_flash`. Cabelo e roupa passaram na inspeção estrutural e visual do protótipo. O conjunto reúne corpo, cabelo, roupa e espada em quatro poses reais de Idle/sul. A fase completa em quatro direções, caminhada e ataque continua pendente.

## Arte e consumo

|Peça|Job|Asset|Gerações cobradas|
|---|---|---|---|
|Cabelo|25d32b2c-03fe-4982-8a40-4280f36f9376|619f2dc1-9dbe-5190-97c0-6070a2ae8dca|6|
|Roupa|1d265e5c-5eff-4d86-8362-20df025bd312|07b0778f-ff8d-5b90-86d7-7822698b5556|6|

Total confirmado deste lote:12 gerações. Não houve retries. Corpo e espada vieram dos pilotos existentes sem novas cobranças. O custo histórico desses pilotos não está somado novamente aqui.

Cada chamada recebeu o atlas128×128 com quatro poses64×64, máscara binária própria, transparência, seed1612130099 e contexto192×128. A referência visual de camisa clara/colete azul/cabelo preto orientou somente a aparência. Prompts exatos, traduções, parâmetros e uso por chamada estão no [manifesto](../pixellab-pip-generations/paper-doll-hair-outfit-20261021/manifest.json). A [receita](../pixellab-pip-generations/paper-doll-hair-outfit-20261021/hair-outfit.blueprint.json) registra as chamadas e o gate de cabelo antes da roupa. Os originais permanecem intactos.

## Verificação artística e composição

Os quatro cabelos ficam ligados às cabeças, sem cabeça duplicada ou peças soltas. A camisa clara e o colete azul acompanham os quatro torsos sem substituir mãos, antebraços, shorts ou pés. Pequenas diferenças geradas de brilho, contorno e botões foram preservadas, sem pintura de reparo. A aprovação do personagem completo pelo proprietário permanece pendente.

Cada atlas é dividido na ordem original, sem redimensionamento. Padding transparente10/13 coloca as camadas em84×84, pivô42/65. As folhas de corpo, cabelo e roupa têm336×84, quatro frames a4FPS. A espada permanece uma única imagem64×64, presa às posições inteiras autorizadas da mão. GIF transparente com loop0/disposal2 é comparado em RGBA visível com as quatro composições nativas.

As auditorias confirmam zero pixels fora das máscaras e zero mudanças na anatomia fora das regiões autorizadas. Cabelo/roupa cobrem naturalmente pixels do couro cabeludo/torso dentro das máscaras; isso não é contado como erro de preservação. Os arquivos do corpo-base permanecem inalterados.

## Uso da prévia e da bancada

Abra a [prévia interativa](../pixellab-pip-generations/paper-doll-hair-outfit-20261021/preview.html), reproduza o ciclo, escolha um frame e alterne corpo, cabelo, roupa ou espada. Ela compara o corpo original, o ensaio anterior de corpo/arma e o conjunto atual. As guias de pivô/encaixe são somente auxiliares de inspeção, não fazem parte dos sprites.

Para importar na bancada principal, selecione juntos `review-pack.json`, `body-idle-south.png`, `hair-idle-south.png`, `outfit-idle-south.png` e `rigid-weapon.png`. O pacote declara o rig humano compartilhado completo, com os quatro slots obrigatórios e `approved:false`; as peças cobrem somente Idle/sul. A bancada deve indicar pacote parcial, renderizar sul e usar o sprite original nas outras direções, Walk e Attack. Nenhum frame/direção é inventado ou emprestado.

O catálogo de produção não recebe as peças de revisão. Classes, facções, combate, impactos, movimentação, equipamentos/Forja, Haki, Zoan e saves permanecem no fluxo existente.

## Testes reproduzíveis

```text
python pixellab-pip-generations/paper-doll-hair-outfit-20261021/assemble_review.py
python tests/paper_doll_fit_audit_test.py
python tests/paper_doll_batch_audit_test.py
node --test tests/paper-doll.test.cjs tests/paper-doll-attachment.test.cjs
python tools/build_pages.py
python tests/paper_doll_modular_idle_browser.py
```

O teste Chromium confere composição RGBA nas quatro poses,16 combinações de camadas, ciclo, pivô, desktop/mobile, importação dos PNGs reais na bancada, fallback das poses ausentes e save sentinela preservado. O workflow recompõe o pacote a partir das fontes e repete as verificações. Capturas em `docs/evidence-paper-doll/modular-idle-*.png`, fora do Git.

Resultados locais:33 suítes Node,11 testes Python de camada,5 de lote e3 de portabilidade passaram. Build Pages e Chromium da nova prévia/importação passaram em1366×900 e393×852. O cache permaneceu dentro de96 composições/4MiB durante as combinações de camadas. A verificação Pages conferiu60 recursos versionados e save preservado. A bancada mostra agora o encaixe real da arma rígida junto à mão, com tipo e sockets expostos nas transformações; as guias não alteram os PNGs.

## Assets ainda ausentes

**Levantamento histórico deste lote frontal.** Idle norte/oeste/leste foi produzido posteriormente; consulte o [estado multidirecional atualizado](PAPER-DOLL-EXPANSAO.md). Os resultados e custos deste relatório permanecem preservados.

Para o escopo mínimo do Espadachim (Idle4/Walk8/Attack8 em quatro direções), faltam camadas próprias de corpo/cabelo/roupa:

- Idle norte/oeste/leste:36 frames, sendo4 frames ×3 direções ×3 camadas.
- Walk nas quatro direções:96 frames, sendo8 ×4 ×3.
- Attack com espada nas quatro direções:96 frames, sendo8 ×4 ×3.

São228 frames de camadas ainda não validados, além das vistas e encaixes apropriados da arma nessas poses. Esse levantamento não autoriza gerações nem determina preço: o custo depende do pipeline escolhido. Outras categorias de ataque das seis classes restantes ampliam o escopo e não estão contabilizadas nesse mínimo. A Fase1 completa não está declarada concluída, nem há merge/publicação automática.

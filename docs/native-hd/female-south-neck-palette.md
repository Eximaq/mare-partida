# Pescoço feminino SOUTH: preservação da personalização

Candidato sobre `a06bd6c99526fa35c0cc6e798b5a827573d7aa2d`, árvore equivalente ao PR `6c69201`. Não é nova arte nem mudança de animação.

A restauração do walkHead fundido devolvia pixels originais do pescoço após a personalização de pele. A correção aplica a paleta anatômica existente somente a pixels opacos que coincidem exatamente com a camada autoral `chest-neck-rigid`, nas diferenças já delimitadas de SOUTH. Guardas exigem os dois SHAs autorais, binding NECK/NOSE, ausência de frames alternativos, densidade 4 e frame 128×128. Gola e cabelo não são recoloridos por aproximação.

## Provas executadas

- `rework-female-south-neck-guards.test.cjs`: 403 pixels mudados para a paleta anatômica exata, alpha preservado; seis guardas negativos (SHA de pescoço, binding, frames, densidade, largura, altura); mesma instância dark→olive→dark sem clear, retorno byte a byte.
- `rework-female-south-neck-world.test.cjs`: WorldVisual normal, mesmo ator e instância, uma pose walk SOUTH por aparência, dark→olive→dark sem clear intermediário. Executado com `NECK_COAT=130`, `151` e `158`; calça175, cropped loiro e face-gentle/olhos amber. Hash inicial recuperado e registro desenhado igual ao selecionado.
- Prova serial anterior em scratch: 24 combinações/240 poses com peitorais130/151, oito tons e original, cropped/original e amostras de elmos18/19. 15.444 comparações exatas de paleta, alpha e área externa preservados. Não confundir este artefato anterior com teste completo executado novamente nesta revisão.
- Ambos os novos testes estão no workflow native-hd-visual, em execução serial.

## Preservação e pendências

Nenhum sprite, quatro JSONs de cabelo/capacete, timing, combate ou permissão de classe foi alterado. Densidade e resolução permanecem intactas. O diff contém apenas helper, testes, workflow, documentação e linha adicional de matriz.

Não comprova todos os capacetes/penteados, todas as combinações de roupa ou todo o ciclo em WorldVisual. Não há nova prova de navegador/mapa implantado. NORTH/EAST/WEST e masculino não receberam esta correção: falta propriedade anatômica equivalente. Não houve build/suite global nesta rodada, publicação, merge ou deploy.

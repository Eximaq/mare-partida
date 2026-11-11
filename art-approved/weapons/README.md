# Armas aprovadas: arquivo incremental

Este diretório preserva as versões visuais aprovadas, sem ativá-las no jogo.
Cada versão possui arquivos imutáveis e SHA-256 no `manifest.json`.

## Primeiro lote (11/11/2026)

- **Braço 117 v1:** EAST/WEST, oito poses por direção. Inclui composições finais, bases, equipamento e máscaras preservadas. As revisões NORTH anteriores foram rejeitadas; a versão v3 aprovada foi adicionada em lote separado.
- **Orbe 122 v1:** EAST/WEST, oito composições finais por direção, versão com orbe na palma e definição revisada. A aprovação lateral não é estendida para NORTH.

As 32 composições finais são PNG RGBA de 640 × 640. WEST é o espelho exato de EAST. Os demais PNGs do 117 são camadas de suporte, não poses adicionais. Esta primeira entrega contém 80 PNGs no total.

## Limites de integração

Estes arquivos são arte de bancada, não um pacote native96 pronto para produção. O compositor, bindings, `player-pack.json`, catálogo, saves, lógica de combate e allowlist de Pages permanecem inalterados. Não redimensionar nem ativar automaticamente estas imagens como substitutas dos sprites atuais.

Ainda faltam adaptação ao contrato de produção, integração e testes reais no jogo antes de habilitar qualquer versão. Nenhuma aprovação de SOUTH do117, NORTH/SOUTH do122, do item119 ou das demais armas é inferida por este registro. O lote inicial não representa uma contagem completa das aprovações históricas.

## Acrescentar uma aprovação

1. Confirmar item, revisão e direções efetivamente aprovados.
2. Preservar somente os arquivos correspondentes em nova pasta de versão; não sobrescrever a versão anterior.
3. Acrescentar ao manifesto os caminhos, dimensões, SHA-256 e escopo aprovado. Aprovação artística e integração são estados separados.
4. Conferir integridade dos PNGs, poses, espelhamento e exclusão de versões rejeitadas. Executar os testes pertinentes antes do commit.
5. Acrescentar o commit à mesma branch de trabalho. Não abrir PR, fazer merge ou publicar o jogo sem nova orientação.

Os arquivos foram copiados byte a byte dos conjuntos congelados aprovados. Não houve nova geração de arte nem consumo de créditos.

## Segundo lote: Braço 117 NORTH v3

Oito poses finais NORTH da revisão v3, aprovadas em11/11/2026, arquivadas em `117/v3/north/frames/`. Não inclui as revisões NORTH v1/v2 rejeitadas. EAST/WEST v1 permanece byte a byte igual. Total acumulado:88PNGs,40composições finais. Integração no jogo continua pendente.

## Terceiro lote: ciclos frontais históricos

Luvas de Marfim3 e Manopla de Aço14:12poses SOUTH de cada ciclo aprovado em09/11/2026. Katana da Maelstrom67:9poses SOUTH do ciclo aprovado em10/11/2026. As33composições são byte a byte iguais às seleções preservadas nas respectivas aprovações. Não se estende aprovação às outras direções ou combinações de inventário. Total acumulado:121PNGs,73composições finais.

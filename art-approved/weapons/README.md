# Armas aprovadas: arquivo incremental

Este diretório preserva as versões visuais aprovadas, sem ativá-las no jogo.
Cada versão possui arquivos imutáveis e SHA-256 no `manifest.json`.

## Primeiro lote (11/11/2026)

- **Braço 117 v1:** EAST/WEST, oito poses por direção. Inclui composições finais, bases, equipamento e máscaras preservadas. NORTH foi rejeitado e não faz parte deste lote.
- **Orbe 122 v1:** EAST/WEST, oito composições finais por direção, versão com orbe na palma e definição revisada. A aprovação lateral não é estendida para NORTH.

As 32 composições finais são PNG RGBA de 640 × 640. WEST é o espelho exato de EAST. Os demais PNGs do 117 são camadas de suporte, não poses adicionais. Esta primeira entrega contém 80 PNGs no total.

## Limites de integração

Estes arquivos são arte de bancada, não um pacote native96 pronto para produção. O compositor, bindings, `player-pack.json`, catálogo, saves, lógica de combate e allowlist de Pages permanecem inalterados. Não redimensionar nem ativar automaticamente estas imagens como substitutas dos sprites atuais.

Ainda faltam adaptação ao contrato de produção, integração e testes reais no jogo antes de habilitar qualquer versão. Nenhuma aprovação de NORTH/SOUTH, do item 119 ou das demais armas é inferida por este registro. O lote inicial não representa uma contagem completa das aprovações históricas.

## Acrescentar uma aprovação

1. Confirmar item, revisão e direções efetivamente aprovados.
2. Preservar somente os arquivos correspondentes em nova pasta de versão; não sobrescrever a versão anterior.
3. Acrescentar ao manifesto os caminhos, dimensões, SHA-256 e escopo aprovado. Aprovação artística e integração são estados separados.
4. Conferir integridade dos PNGs, poses, espelhamento e exclusão de versões rejeitadas. Executar os testes pertinentes antes do commit.
5. Acrescentar o commit à mesma branch de trabalho. Não abrir PR, fazer merge ou publicar o jogo sem nova orientação.

Os arquivos foram copiados byte a byte dos conjuntos congelados aprovados. Não houve nova geração de arte nem consumo de créditos.

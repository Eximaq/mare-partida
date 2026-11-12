# Ajustes e fontes de acessórios preservados

Importação dos quatro pacotes de ajustes fornecidos pelo proprietário e autorizados para arquivo. Contém 837 ajustes de cabelos/capacetes M/F e 292 PNGs distintos (468 ocorrências deduplicadas por SHA-256). Os 96 registros hideHair=true permanecem intactos.

- Catálogos, offsets, políticas e identidades originais não foram modificados.
- O índice associa cada ajuste ao alvo exato, direção e contrato. Não deve aplicar um ajuste a uma versão de corpo diferente.
- Os flags source-only/previewOnly/productionReady:false originais são preservados. A presença destes arquivos não demonstra integração ou encaixe em todas as animações.
- As imagens residem na pasta assets comum. Os catálogos originais permanecem byte-idênticos; consumidores devem resolver hashes de source pela tabela assets do manifest, não por diretórios históricos.
- Esta pasta fica fora do build de produção. O runtime não seleciona automaticamente estas fontes.

Teste: `node --test tests/rework-accessory-import.test.cjs`.
Reimportação: `python tools/rework-import/import_accessories.py <diretorio-normalizado> tools/rework-accessories`.

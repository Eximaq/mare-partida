# Original F182 SN packaging

`python package.py --source F182_SN_material_v3_candidate.zip --selected-index Indice_Retomada_Calca182_Quatro_Vistas_Colecao79.zip --output OUTPUT`

Requires Pillow and numpy. The exact input hashes are asserted, as are all22 selected reference PNG hashes. The source's original `sn-material-v3/render.cjs` restores original base bytes under the conjunction `cloth.alpha == 0 && owners.alpha == 0`. This recipe partitions only the original anatomy into complementary RGBA masks and preserves original garment/owner bytes, so the existing compositor implements the same ordering without an engine change. Both anatomy masks union exactly to the original. Output contains100 deduplicated source/component PNGs and22 original reference PNGs, with portable per-frame proof and authored durations. No final composite is used as a runtime layer.

Historical candidate labels in source metadata are not a general promotion. Only the separately approved EW38_SN3 source and exact original appearance/legs-alone scope are bound. Source body identity is independently verified against registered130 s36/n39 originals in the regression test.

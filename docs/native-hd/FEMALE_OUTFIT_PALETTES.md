# Female wardrobe palettes

Both exact families (6/147/152/155 and 151/154/152/155) support authored original hairstyle hair colors through all idle/walk/unarmed states. The native 512/640 source PNGs are untouched. Ten small masks identify original isolated hair by exact spatial RGBA ownership (maximum two-channel Canvas roundtrip tolerance), with explicit original-coordinate anatomical traces excluding embedded ears, forehead and neck. Black outlines remain protected. Garment sources are never selected for recoloring.

`paletteSupportedMaterials: ["hair"]` is intentional. Skin colors other than `original` remain unsupported for these outfits. Forty-state derived walking anatomy cannot yet be proven completely by matching the eight-state base class alone. This is not permission to alias `light` to `original`, and hair support does not imply arbitrary cuts or headgear compatibility.

Rebuild: `python tools/build_female_outfit_palette_masks.py`. Evidence: `female-outfit-palette-mask-proof.json`. Regression: `player-rework-female-outfit-palettes-hd.test.cjs` verifies every 392 state, all unmasked pixels and alpha, complete normal-provider families and unchanged saves. Hair pink contact sheet is generated in `/tmp/female-outfit-hair-pink.png` for inspection only, not gameplay evidence.

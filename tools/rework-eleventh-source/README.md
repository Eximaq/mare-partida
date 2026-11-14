# Exact source reproduction

These recipes replay original supplied layers only. Python dependencies: Pillow, numpy, scipy (pants ownership component rule). No credentials or private paths.

Pants: `python package-pants.py --source-dir INPUTS --output OUT`. INPUTS contains `Calca147_SN_Runtime_84.zip` and `Calca168_SN_Runtime_81.zip`; SHA256 and original members are recorded in `tests/fixtures/eleventh-source-proof.json`. Output `components.zip` and `references.zip` match the shipped pants archive/fixture byte for byte under the original Pillow encoder. Original packaging leaves appearance unresolved; the production resolution is independently recorded and tested by exact registered body hashes.

Coats: `python package-sword-coats.py --source-zip ORIGINAL.zip --bare-proof-dir BARE --output OUT`. BARE contains original ninth-lot `manifest.json` and `sword1-68-independent-components.zip`. Original source SHA and per-layer ownership/cloth/reference hashes are in the fixture proof. Output `coat-components.zip` matches production assets. `approved-references.zip` is the original combined reference receipt; its128 original PNG members are preserved in the two test-only transport partitions described below. `original-cloth-ownership.zip` is a reproducible audit receipt, not a runtime input.

PNG byte hashes and original RGBA proof remain distinct from Canvas rendering tolerances. No source artwork is synthesized, recolored, resized or extracted from a flat final image.

The approved sword source filename is `Sabre1_Nodachi68_Masculinos_Quatro_Trajes_EW_Editavel.zip` (SHA256 `3b3ff09ef98716f5d4b0faff6c9b90c3d3b366a7822c33a137ecb5981056ad84`). Keep source and output directories separate.

Reproduction environment measured: Pillow13.0.0, numpy2.3.5, scipy1.17.0, zlib1.3.2. All four production/reference ZIPs were reproduced byte-identically in the final local validation.

## Test-only transport partition

Run `python split-sword-references.py --input OUT/approved-references.zip --proof tests/fixtures/eleventh-source-proof.json --output PARTS`. It validates the original combined SHA256, copies each original PNG byte-for-byte, partitions strictly by weapon1/68 (64 members each), asserts their disjoint union equals all128 originals, and emits `eleventh-reference-transport.json`. Production ZIPs and the original source recipe are unchanged. The two resulting ZIPs replace only the oversized test fixture; no individual PNG is split. SHA256/member lists are tested by the raster reader. The original combined receipt is reproducible, not required as a tracked fixture.

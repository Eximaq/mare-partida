# Native female boot attack layer reproduction

Run from the repository root with dependencies installed:

```sh
mkdir -p /tmp/frozen-boot-reproduction
export REWORK_OUTPUT_DIR=/tmp/frozen-boot-reproduction
node tools/frozen-boot-native/build.cjs east
node tools/frozen-boot-native/build.cjs west
node tools/frozen-boot-native/build-sn.cjs
node tools/frozen-boot-native/build-lower.cjs
```

These commands reproduce the 32 upper-body frames and 40 boot-specific lower-body layers used by the frozen female boot attack contracts. Original source PNGs are loaded through the repository archive loader. Source dimensions are retained: no downsampling or garment recoloring. Derived layers are 640×640; lower-body pixels are translated 1:1 from their own frozen 512×512 source compositions. Arm rotations follow the existing 151 sleeve registration recipe, without scaling. Original class bare hands are retained rather than substituting glove item 152.

All 72 reproduced PNGs were SHA256 byte-identical to the packaged derived layers. Contact sheets and registration JSON are diagnostic output and not runtime images. Static lower-body positioning during attack remains a calibration candidate; it does not imply a new visual approval or arbitrary outfit compatibility.

The walk/idle imports preserve the selected portable pack's original PNG bytes, transforms, poses, masks and timing. Their source receipt hashes are recorded in `docs/native-hd/FROZEN_BOOT_SELECTION_PROOF.json`.

# Frozen v47 boots integrated

The explicit male and female `CURRENT_*WALK_BOOTS_INDEX` selections resolve to 76 directions (36 male,40female),67 source packs. All were recovered through the frozen restoration index, checked against archive/member hashes, and imported with their exact original PNG bytes, frame dimensions, pose transforms, timing, masks and depth order. No approval or fitting was reconsidered. Original candidate/review limitations remain metadata, not claims of new approval. Existing matching runtime contracts retain priority.

134 additional exact walk/idle contracts complement18 already registered. Male identity is torso151/pants133/gloves152 plus the chosen boot. Female identity is torso151 plus chosen boot, original base shorts and bare hands. Female packs are NOT mislabeled as pants154 or gloves152.

Forty female attack contracts close ten exact boot families. They reuse the original female class hands, the previously registered own151 sleeve recipe, and each boot's own initial lowerbody at native1:1 pixel density. Their upperbody/lowerbody layers are lossless derived640 composites, not byte-identical original source PNGs. Static attack foot positioning remains a calibration candidate for later adjustment. No artwork was newly generated, downsampled, or borrowed from another boot.

Integrity and normal gameplay provider checks are in `player-rework-frozen-boots-hd.test.cjs`:174 contracts/2419states, native512/640, ten female families, all four directions, idle/walk/attack, saved equipment unchanged. This does not claim arbitrary mixed outfits or personalized skin/hair support. These exact boot families currently retain original appearance only.

## Male attack completion

32 additional male attack contracts close all nine selected boot families (8,9,134,141,148,162,169,176,183); the four previously registered boot9 attacks retain priority. Each new contract uses the registered male151/133/152 attack upper body and the same boot's frozen idle lowerbody, translated 1:1 from source crop `[0,336,512,176]` to `[64,400]` on the native640 canvas. The original source packs remain intact. This is a lossless derived composite with static attack foot placement marked as a calibration candidate, not a new approval.

`player-rework-male-frozen-boots-attack-hd.test.cjs` passes three checks: all32 contracts/256frames load and render, all nine complete families prepare/draw through the normal game provider without mutating saves, and lower-body decoded pixels match their own frozen source crop exactly. Four additional archives contain256 PNGs (64 PNGs per archive; each below5.8MB). Reproduce with `REWORK_OUTPUT_DIR=/tmp/male-boots node tools/frozen-boot-native/build-male-attacks.cjs`; the builder also reproduces boot9 for reference, but that duplicate is not installed.

## Barehanded boot148 historical partials

Twelve EAST/WEST contracts close both older pants133+boots148 sets, with torso151 and without a torso item. The upper-body donor is the exact already registered no-glove/no-boot counterpart for the same torso, action and direction; glove152 is never imported or erased from fused artwork. Native own boot148 lower-body pixels replace only the lower crop at1:1 scale. All16 authored walk states keep their matching16-state/16fps source timing; the eight-frame attack uses its own registered upper-body cycle plus own initial boot pose (calibration candidate). The twelve records total100states and96unique PNGs in two archives. `player-rework-bare-boot148-hd.test.cjs` checks source identities, timing, resolution, saves and both complete normal-provider families.

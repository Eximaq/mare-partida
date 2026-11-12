# Native-density rework in the actual player renderer

The normal `paper-doll-96-lobby.js` path calls `MareReworkNativeHD.drawStable`. This is not a gallery-only replacement. Approved source PNGs remain512/640 pixels, composed and drawn at physical scale1 without native96 conversion. Character-size calibration is deferred as requested.

## Current coverage, not a claim of universal completion

- All41 equipped weapon IDs now have male original-appearance idle/walk/attack families in all4directions. ID0 is the separate unarmed base.
- Female original equipment families:2,3,14,15,109,110,111,112,117. Existing item rasters are registered on the female class base; derived registrations remain explicit calibration candidates, not new artistic approvals.
- Native bases include both genders. Exact registered clothing contracts and anatomical palette masks remain separate from arbitrary wardrobe combinations.
- A mirrored-WEST proof bug previously disabled otherwise compatible male head families. Native mirrored pixels and anchors are now checked against authored WEST heads before activation. No Original-to-cropped substitution is made.
- Four full male clothing sets support unarmed idle/walk/attack. Partial clothing sets are preserved and not represented as full world coverage. See `OUTFIT_CONTRACT_AUDIT.json`.
- Four firearm families4/5/113/115 now have mask-owned skin/hair recoloring. Attachment and unmasked pixels remain unchanged. Other source ownership restrictions remain explicit.

`RENDERER_FAMILY_MATRIX.json` records actual resolver/family coverage by item, gender, palette and exact registered outfit. `HEAD_FAMILY_COVERAGE.json`, when present, independently checks named hair/headgear families. These are resolver proofs, not claims that all visual combinations were approved.

## Identity and stability

Saves, equipped item IDs, collision/gameplay and user appearance are not rewritten. Unknown identities are not wildcards. The full idle/walk/attack family gate prevents switching between the rework and the rejected old body during attacks. A ready family holds its last native frame while loading the next frame. Unsupported combinations remain explicitly uncovered rather than changing clothes or hiding equipment.

115S retains the approved historical dressed source in the archive, but uses an isolated-item original-body registration for original avatars.128N uses a separately labeled recomposition rather than the rejected shaky historical cycle.69 preserves the entire blade with transparent margins and compensated pivot, not scaling/cropping.

## Source packaging and verification

Original bytes are delivered through same-origin ZIPs with ZIP SHA256, CRC and per-PNG SHA256 checks. Frames request bounded dependencies rather than loading all animation frames into a64-slot cache. No remote raw-GitHub dependency is needed for the native providers.

`npm run test:rework-hd` checks source dimensions, actual ZIP loading, rendering, identity guards, anatomical palette ownership and full-family gates. `npm run test:foundation`, `npm run test:legacy`, typecheck, shared/server build and Pages build cover regression. Native browser evidence is captured through the actual game renderer by `.github/workflows/native-hd-visual.yml`, not by presenting a source collage as game implementation. Each capture's commit must be checked: previous e43 evidence does not prove later changes.

## Remaining true boundaries

Female fused head+hair sources do not yet have a proven removable ownership mask matching named hairstyles. Original male hairstyle is not pixel-identical to named adjusted styles. Head18/19 lack four-direction records. Some female clothing attack ownership/identity contracts are unresolved even though their approved walking PNGs exist. These are not silently relabeled as mere calibration or completed replacement. Source catalogs are preserved for continued recovery without unnecessary regeneration.

PR307 remains a draft integration checkpoint, without merge. Full task completion is distinct from publication of this checkpoint.

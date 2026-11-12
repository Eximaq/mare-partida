# Native-density rework in the actual player renderer

This change starts from main after PR305. It does not merge or reuse the rejected PR306 head-on-legacy-body bridge.

## What is actually connected

`paper-doll-96-lobby.js` calls `MareReworkNativeHD.drawStable` before its existing renderer. This is the normal player path, not a query-only gallery. Full authored 512×512 or640×640 sources are composed into equally sized canvases and drawn with the three-argument `drawImage(canvas,x,y)` form. Physical pivots are preserved. Character art is not reduced to128pixels and then enlarged.

The source registry contains160 source variants covering64 body/action/direction slots. This is **source coverage**, not proof that every saved equipment/cosmetic combination works. Historical studies,8 idles derived from walking frame0, mirrored male WEST walk, and new clothing/carry fits retain explicit candidate status. They are not relabeled as individually approved art.

The integrated providers include:
- Whole masculine/feminine bases and authored animation sources, including drawn attacks.
- Native head families, only when exact head-source pixels and registration prove compatibility. No guessed Original→cropped mapping.
- Gauntlet109 attacks in four directions, and candidate carried/idle/walk gauntlets following authored arm bindings.
- Rifle115 SOUTH original five-state layers and NORTH three original-body states. Its fused backing cannot silently accept arbitrary hair/clothing changes.
- Orb17 SOUTH eight authored states recovered as native640 layers, pixel-exact against approved source composites. This does not claim complete four-direction idle/walk/attack coverage.
- Isolated pants133 with authored body layers. SOUTH/NORTH walking references are pixel-exact; E/W and attack adaptations are explicitly candidates.
-109+133 attacks use an identity-checked pants overlay, not replacement of the body or weapon with a screenshot.

## Stable family and saved appearance

The world renderer checks idle, walk and the relevant attack in all four directions before taking over an actor. It does not activate a lone SOUTH attack and then switch back to the old body when walking. While a ready native actor loads its next frame it holds its last native frame instead of flashing the old renderer. Uncovered combinations retain the existing complete renderer and expose a reason in `snapshot().nativeHD`; this is not reported as rework completion.

The actual save fields (`gender`, `hairStyle`, `hairColor`, `eyeStyle`, `eyeColor`, `skinColor`) are read. Source palettes may be applied without changing raster size or alpha. Fused heads without a verified mask reject incompatible palette/head changes. Equipment identities are matched explicitly; an unknown slot is not a wildcard. Zoan and complete-character overrides keep their prior precedence. Gameplay stats, saves, hit timing and collision dimensions are not rewritten.

## Assets and performance

Original PNG bytes are retained in verified same-origin ZIP archives. ZIP SHA256, CRC and each PNG SHA256 are checked before decoding. There is no dependency on raw.githubusercontent.com for these new body/equipment providers. The original PR304 review catalog remains separate.

The base distribution groups assets by usage rather than by random SHA order: each source needs about0.3–3.2MB cold, instead of fetching the whole71.8MB collection. Frames load their needed layers, not every frame of every animation. Source/image/frame caches are bounded. The preview viewport expands and scrolls rather than shrinking the source into a72pixel portrait.

## Known calibration and coverage limits

- The raster is intentionally shown1:1, per the instruction to defer character-size reduction. This is larger than the previous native96 character; collision and world scale remain unchanged.
-109 EAST/WEST retains an approximately2physical-pixel head-registration difference versus the earlier composite preview. This is not claimed pixel-exact.
-109 carry remains a calibration candidate: small SOUTH skin contours and an absent far-hand layer in lateral sources need visual follow-up. No floating invented far glove is inserted.
-109 NORTH frames1/6 retain the source's absent right gauntlet; the pants overlay does not cause that absence.
- Rifle115's incomplete full-family coverage is not silently promoted to a complete equipped character.
- Arbitrary helmets, hair, outfits and weapons are not certified merely because their files exist. Other approved compositions remain in the prior catalog; fused screenshots are not claimed independently interchangeable layers.
- Browser/in-game playtesting has not been completed in this environment. Tests and supplied screenshots are from the actual Canvas providers offline, not a claim of browser validation.

## Verification

`npm run test:rework-hd` exercises original-raster preservation, palette/source identity guards, real provider draws, family gating, stable loading, archive corruption rejection and weapon/carry composition. `npm run test:legacy` protects the existing game. `python tools/build_pages.py` includes source archives and runtime modules in the deployed build. Generated runtime screenshots and their metadata are under this directory.

## Publication checkpoint

All approved source catalogs from main remain included; this PR does not discard completed items. Archival presence, native modular recovery, and activation in normal gameplay are distinct. The exhaustive weapon audit is in `ALL_WEAPON_ITEMS_AUDIT.md`. Missing compatible families are reported rather than silently substituting different equipment, changing saved appearance, or reducing original pixels. Further recovered pieces can be added to this same branch.

Build of shared/server and Pages succeeded. The native suite passed27checks plus the8-state Orb17 pixel-exact check. Browser/in-game verification remains pending.

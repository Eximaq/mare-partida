# Fifth attack-only candidate: original ordered layers

Local base615de01 has the same tree as published fourth8bc52fd24833f1c9f37ca932b4265c4de5d639e0. This document describes the attack lane; the final consolidated candidate also includes independent F168 EW41 EAST/WEST pants (80 exact ticks), documented in fifth-independent-pants-staging.md. Profiles are male original appearance only, with weapon and no additional equipment:14 SOUTH attack-unarmed (cyborg),16/31 EAST/WEST attack-focus (strategist/healer). No new palette, wardrobe, carry or opposite-view support is claimed.

14 preserves12 poses and20 authored ticks `[0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,8,9,10,11,11]`, nominal24fps/contact8. 16/31 preserve8 poses/ticks, nominal12fps/contact4. Layer order is source-owned:16 weapon behind body in0/7 and distal-hand original mask;31 grip remains anatomy above gear. WEST16/31 mirrors approved EAST inputs individually, preserving depth. Recovered nonmatching own-WEST31 is not used. PNG bytes are unchanged; production ZIP members use the loader-required root SHA filename rather than the portable package's assets/ prefix.

## Visual timing, not gameplay timing

Only `orderedAttack` profiles with `authored-contact-progress-v1` opt in. The existing controller supplies normalized progress p and hit ratio h. Source contact c=contactTick/timelineLength. The renderer samples p*c/h before hit, then c+(p-h)*(1-c)/(1-h). It never writes controller duration, cadence, cooldown, impact latch, inventory or network state. Invalid/missing/unlocked timing does not invent a hit ratio: existing linear sampling remains. Preview time sampling uses nominal source fps; actual gameplay animation is variable-rate and must not be described as literal24/12fps at arbitrary speed. Long dt/display gaps can skip poses; no queue or gameplay hold is introduced.

The same sampler is used by the retained world bundle and direct HD drawing; the lobby passes through the existing timing snapshot. Prior records remain unopted and unchanged. Exact signature selection precedes old flats; subset fallback cannot opt in.

## Source and raster proof

44 original approved references are preserved in the test-only ZIP with SHA per frame.16 is RGBA-exact;31 has exact alpha and RGB≤1.14 alpha is exact and opaque RGB≤1. Only source phases9/10 have known Canvas premultiplication drift:9 channels (maxRGB4, maxpremul1.7960784314) and21 channels (maxRGB7, maxpremul1.9686274510). The regression fixes those counts, alpha distributions and phase locations; translucent premultiplied error≤2. No pixels are repaired and no tolerance is expanded for16/31 or older sources.

## Integration gates

The actual lobby requestWorldVisual path is tested headlessly with original native96 and HD compositors. Full idle/walk/attack/four-direction bundles become ready for correct classes; intended coverage IDs and rendered contact phase are asserted. Added gloves152 and removed weapons create distinct identities/bundles and do not claim the new routes. Player objects remain unchanged. This is not browser equip/reload/map evidence.

Two real combat controllers run A/B at six speeds per item with400 samples each: snapshots, duration, impacts and unlock are equal; one impact per attack and all authored poses observed under fine sampling. That does not guarantee every frame is displayed at low frame rates. The four adjustment JSONs and all previous weapon-index keys remain identical. F168 is included in the consolidated candidate; final browser verification remains a distinct pending gate.

Reproduction: package-authored-ordered-attacks.py requires --prototype-dir, --output-dir and --source-archives (JSON mapping original source keys to ZIP paths); use --root-members for production. Both production and fixture ZIPs reproduce byte-for-byte.

## Final consolidated local verification

F16880 ticks and44 attack reference frames pass, with prior equipment regressions preserved. Foundation243 and243/243 legacy files pass. The focused serial group passes27 tests; the exact final native-HD workflow command passes67 tests with --test-concurrency=1. The initial overlapping parallel run recorded one child-process failure without an assertion/signal detail; no unsupported OOM claim is made. Assertions were not relaxed, and both sequential gates passed. Dedicated heavy Canvas tests now run serially.

Archive audit:285 ZIPs,18,374 original PNGs and179 head PNGs verified. Build and lossless index transport pass. All prior index records and the four adjustment JSONs are unchanged; player-pack changes only its required runtime fingerprint. Both original worktrees are preserved. This is one consolidated local candidate for F168/14/16/31, not a publication or browser-map claim.

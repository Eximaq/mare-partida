# Fruit visual integration

Base: 8458c468. Owner authorized implementation of the supplied previews on 2026-11-07. This branch has not been merged or published.

## Rank S sources

The new assets are from the owner-requested preview packages, generated with OpenAI image generation and/or original procedural effects. No external asset pack was copied. Existing project art remains under its existing rights.

- Yami: 24-pose Vortex/Hole/Liberation atlases, remapped onto the original 41 logical frames so hit timing stays unchanged. Centered-feet aura v4, 35 frames; its foreground begins at the feet.
- Gura revision 3: spatial fracture atlases plus the original earth effects on both attacks. Quebra-Crânio is drawn entirely behind the actor. Buff atlas updated; durations and damage unchanged.
- Hie: reviewed spears/bird/freeze sheets; five visual spear instances, horizontal mirror for west, explicit front/rear bird perspectives, opaque target-following cocoon at foot pivot. Recovered aura preview uses its common crop and frame translations, 16 poses at 83ms.
- Phoenix v2: flame, restoration and energy sheets, procedural feather aura and contact effects. Cosmetic tails allow final hit/heal signals to finish after the gameplay job, and are cleared on cancellation. Body idle and transformation changes are documented with Zoans.
- Mera: four source atlases recovered and integrated with reconstructed fixed-scale crops and pivots; see `MERA-RECOVERED-SOURCES.md`. HUD icons are integrated.
- Kuku: recovered HUD icon integrated. Complete new VFX source was not located; existing gameplay VFX deliberately remains unchanged. Its VFX rework is not complete.

`rank-s-rework-data.js` only overrides artwork; `rank-s-rework.js` only draws. The separate scheduler fix processes the final logical Energy/Totem timestamp before removing expired jobs. No damage, cost, range, cooldown, save or server rule was changed.

## Verification and limits

Focused regression tests include Rank S behavior, final ticks, direction/anchoring, cancellation plus recast, and cosmetic tails. Asset rectangles were checked against PNG bounds. Production draw modules were rendered using Node canvas and inspected.

Real Chromium CI smoke passed on the release revision 89b6677f: 72 renderer scenarios at 1366px and 393px, 863 Paramecia frame rectangles against decoded images, nonempty Canvas output, and no page errors or failed image/script requests. The artifact includes screenshots and `reworks/summary.json`. This verifies production renderers in a browser, not complete gameplay or performance.

The existing Rank S gameplay fixture reached its reload check, which still expected the retired Mera aura path. That exact expectation was updated to the integrated path. Its earlier field screenshots showed “Preparando o mapa”: freezing RAF also froze the timestamp used to incrementally build navigation. The test now builds navigation and waits for map readiness before every screenshot, with an assertion that simulation time remains unchanged. Fresh CI evidence of the in-game field is still required after this fixture correction.

Captain equipment decoding also needs a fresh CI run. All 179 item-HD PNGs in source and dist decode locally and are unchanged from the base. The test now explicitly requests lazy images, waits for loaded dimensions, and retains strict decode checks with source-URL diagnostics; a missing or corrupt image still fails. The earlier log did not identify the failed image, so a lazy-load race remains a diagnosis to verify rather than a proven asset defect.

Local Chromium still aborts with socket operation not permitted, and the connected browser cannot reach the local server. Database integration tests require a configured test service and were not claimed as passed.

## Reversibility

New VFX live under `assets/akuma/reworks/` and versioned Zoan paths. Original atlas and HUD icon files remain intact; new visual paths are resolved by adapters. Reverting this branch restores previous visuals and the previous scheduler behavior. Do not mix the Ryu north atlas (which includes its Haki treatment) with the obsolete v1 overlay.

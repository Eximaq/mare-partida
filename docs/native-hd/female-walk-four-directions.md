# Female WALK HD: pants21, weapon0/5/17, four directions

This increment replaces the remaining native96 fallback combinations N/E/W for this scope. SOUTH retains the same selection, authored pixels, and 10-pose/40-tick composer. Other actions, cosmetics files, weapon artwork, gameplay timings, and class/equipment permissions are unchanged.

## Layer contract

- One pants21 route per body/direction/walk, with the original N r13 and separate E/W r3 cloth/ownership. The three carry items reuse the same garment and the same body rig; their different attachment matrices do not select a garment image. Removing weapon, pants, or both does not change that rig.
- NORTH uses the original 12-pose schedule and authored contact permissions. The 72 changed arm/leg-contact pixels match the authorial apex source exactly; this is anatomy/occlusion of the motion, not a garment. Reused eight-phase weapon anchors match the hand and native scale; no SOUTH sword translation was copied.
- EAST/WEST retain the irregular 12-pose/40-tick authorial schedule and the original differing upper-body WEST. The common lower material is reflected only where the reference does so. The 2A/6A seam masks are geometrically derived material boundaries, not original artist labels; they do not modify original neutral RGBA. The individually hashed PNG parts are transported in one ZIP, not a combined wearable image.
- Weapon sources keep their matrix, depth, native dimensions and alpha. Orbe17 changes only the SHA-bound skin domain by existing palette: 482 NORTH, 489 EAST and WEST, 503 SOUTH. Sword output is padded640, the rest512; no pixel resolution reduction.
- The modular head chooses saved hairstyle, skin, eyes and face. The neck repair translates existing neck material only within the measured gap (N 52 newly opaque pixels with cropped; E/W 77 each). RGB repairs are confined to the existing neck junction. It does not move the head/camera anchors, alter the four owner-supplied JSONs or repaint the original clothing edge.
- Bundles retain one native canvas per authored pose for NORTH/EAST/WEST and keep all40 ticks addressable. When configurations change, the existing bundle remains drawn until the new one is ready.

## Verification and boundaries

- Combined WorldVisual consumer uses actual application factories with saved UI gender and valid classes, initializes idle/walk/attack/skill, and draws walking at 13 representative ticks (including E/W temporal boundaries). Four directions × three combinations, no fallback. No new attack proof.
- Focused direction/source/ownership tests check all40 ticks on lateral routes and all12 authored source poses; named-appearance palette and same-actor A→B→A separate from cross-class game permissions. A selector sweep varied each available cosmetic setting individually (516 selections); it does not prove every combination of appearance values visually.
- This work does not add a route for 151/155 mixed with an active weapon or prove weapon + coat + boots in other directions. NORTH's authentic coat and boot layers reproduce the original mixed no-weapon control at four sample poses; combining them with pants and weapon requires its own ownership gates. A cut of the visible anatomy cannot recover what is hidden behind a default shirt/shorts.
- Unsupported equipment variants and non-WALK actions still have their existing routes. Interactive browser/map coverage is distinct from this local renderer proof. No merge or production deployment.
